const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildQuery = (filters = {}) => {
  const query = {};

  if (filters.search) {
    const regex = new RegExp(escapeRegex(filters.search), "i");
    query.$or = [
      { employeeId: regex },
      { name: regex },
      { email: regex },
      { phone: regex },
      { designation: regex },
    ];
  }

  if (filters.department) {
    query.department = filters.department;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.designation) {
    query.designation = new RegExp(`^${escapeRegex(filters.designation)}$`, "i");
  }

  return query;
};

const getEmployees = async (filters = {}) => {
  const query = buildQuery(filters);

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const skip = (page - 1) * limit;
  const sortField = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder === "asc" ? 1 : -1;

  const allowedSortFields = [
    "employeeId",
    "name",
    "email",
    "designation",
    "joiningDate",
    "status",
    "createdAt",
    "updatedAt",
  ];

  const sortKey = allowedSortFields.includes(sortField) ? sortField : "createdAt";

  const [employees, total] = await Promise.all([
    Employee.find(query)
      .sort({ [sortKey]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("department", "_id name code status")
      .populate("userAccount", "_id name email role status")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean(),
    Employee.countDocuments(query),
  ]);

  const safeEmployees = employees.map((emp) => {
    const { password, ...safeUser } = emp.userAccount || {};
    return {
      ...emp,
      userAccount: emp.userAccount ? safeUser : null,
      activeAssetCount: 0,
      bookingCount: 0,
    };
  });

  return {
    employees: safeEmployees,
    pagination: {
      page,
      limit,
      totalRecords: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getEmployeeOptions = async () => {
  return await Employee.find({ status: "Active" })
    .sort({ name: 1 })
    .select("_id employeeId name email designation department")
    .populate("department", "_id name code")
    .lean();
};

const getMyProfile = async (userId) => {
  const employee = await Employee.findOne({ userAccount: userId })
    .populate("department", "_id name code status")
    .populate("userAccount", "_id name email role status")
    .lean();

  if (!employee) {
    const err = new Error("No employee profile is linked to this user account");
    err.statusCode = 404;
    throw err;
  }

  const { password, ...safeUser } = employee.userAccount || {};
  return {
    ...employee,
    userAccount: employee.userAccount ? safeUser : null,
    activeAssetCount: 0,
    allocationHistoryCount: 0,
    upcomingBookingCount: 0,
    maintenanceRequestCount: 0,
  };
};

const getEmployeeById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid employee ID");
    err.statusCode = 400;
    throw err;
  }

  const employee = await Employee.findById(id)
    .populate("department", "_id name code status")
    .populate("userAccount", "_id name email role status")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .lean();

  if (!employee) {
    const err = new Error("Employee not found");
    err.statusCode = 404;
    throw err;
  }

  const { password, ...safeUser } = employee.userAccount || {};
  return {
    ...employee,
    userAccount: employee.userAccount ? safeUser : null,
    activeAssetCount: 0,
    allocationHistory: [],
    upcomingBookings: [],
    recentActivity: [],
  };
};

const validateDepartment = async (departmentId) => {
  const department = await Department.findById(departmentId);
  if (!department) {
    const err = new Error("Selected department does not exist");
    err.statusCode = 404;
    throw err;
  }
  if (department.status !== "Active") {
    const err = new Error("Selected department is inactive");
    err.statusCode = 400;
    throw err;
  }
  return department;
};

const validateUserLink = async (userAccountId) => {
  if (!userAccountId || !mongoose.Types.ObjectId.isValid(userAccountId)) {
    return null;
  }
  const user = await User.findById(userAccountId);
  if (!user) {
    const err = new Error("User account not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
};

const checkDuplicateEmployeeId = async (employeeId, excludeId = null) => {
  const query = { employeeId: employeeId.toUpperCase() };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await Employee.findOne(query);
  if (existing) {
    const err = new Error("An employee with this employee ID already exists");
    err.statusCode = 409;
    throw err;
  }
};

const checkDuplicateEmail = async (email, excludeId = null) => {
  const query = { email: email.toLowerCase() };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await Employee.findOne(query);
  if (existing) {
    const err = new Error("An employee with this email already exists");
    err.statusCode = 409;
    throw err;
  }
};

const checkDuplicateUserLink = async (userAccountId, excludeId = null) => {
  if (!userAccountId || !mongoose.Types.ObjectId.isValid(userAccountId)) return null;
  const query = { userAccount: userAccountId };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await Employee.findOne(query);
  if (existing) {
    const err = new Error("This user account is already linked to another employee");
    err.statusCode = 409;
    throw err;
  }
  return null;
};

const createEmployee = async (payload, createdBy) => {
  await checkDuplicateEmployeeId(payload.employeeId);
  await checkDuplicateEmail(payload.email);
  await validateDepartment(payload.department);

  if (payload.userAccount) {
    await checkDuplicateUserLink(payload.userAccount);
    const user = await validateUserLink(payload.userAccount);
    if (!user) {
      const err = new Error("User account not found");
      err.statusCode = 404;
      throw err;
    }
  }

  const employee = await Employee.create({
    ...payload,
    employeeId: payload.employeeId.toUpperCase(),
    email: payload.email.toLowerCase(),
    createdBy,
    updatedBy: createdBy,
  });

  return await getEmployeeById(employee._id);
};

const updateEmployee = async (id, payload, updatedBy) => {
  const employee = await Employee.findById(id);
  if (!employee) {
    const err = new Error("Employee not found");
    err.statusCode = 404;
    throw err;
  }

  if (payload.employeeId && payload.employeeId !== employee.employeeId) {
    await checkDuplicateEmployeeId(payload.employeeId, id);
  }

  if (payload.email && payload.email.toLowerCase() !== employee.email.toLowerCase()) {
    await checkDuplicateEmail(payload.email, id);
  }

  if (payload.department && String(payload.department) !== String(employee.department)) {
    await validateDepartment(payload.department);
  }

  if (payload.userAccount !== undefined && String(payload.userAccount) !== String(employee.userAccount || "")) {
    await checkDuplicateUserLink(payload.userAccount, id);
    if (payload.userAccount) {
      await validateUserLink(payload.userAccount);
    }
  }

  Object.assign(employee, payload, { updatedBy });
  await employee.save();

  return await getEmployeeById(employee._id);
};

const changeStatus = async (id, status, updatedBy) => {
  const employee = await Employee.findById(id);
  if (!employee) {
    const err = new Error("Employee not found");
    err.statusCode = 404;
    throw err;
  }

  const wasActive = employee.status === "Active";
  employee.status = status;
  employee.updatedBy = updatedBy;
  await employee.save();

  const linkedUserStatusChanged = false;
  return {
    employee: await getEmployeeById(employee._id),
    linkedUserStatusChanged,
  };
};

const linkUserAccount = async (id, userAccountId, updatedBy) => {
  const employee = await Employee.findById(id);
  if (!employee) {
    const err = new Error("Employee not found");
    err.statusCode = 404;
    throw err;
  }

  if (userAccountId) {
    await checkDuplicateUserLink(userAccountId, id);
    const user = await validateUserLink(userAccountId);
    employee.userAccount = userAccountId;
    const warning = user.status === "Inactive" ? "The linked user account is currently inactive" : null;
    employee.updatedBy = updatedBy;
    await employee.save();
    return { employee: await getEmployeeById(employee._id), warning };
  } else {
    employee.userAccount = null;
    employee.updatedBy = updatedBy;
    await employee.save();
    return { employee: await getEmployeeById(employee._id), warning: null };
  }
};

const deactivateEmployee = async (id, updatedBy) => {
  return await changeStatus(id, "Inactive", updatedBy);
};

module.exports = {
  getEmployees,
  getEmployeeOptions,
  getMyProfile,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  changeStatus,
  linkUserAccount,
  deactivateEmployee,
};
