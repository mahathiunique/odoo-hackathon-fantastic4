const { sendSuccess, sendError } = require("../utils/response");
const ApiError = require("../utils/ApiError");
const { authMiddleware, authorize } = require("../middleware/auth");
const { validateBody } = require("../validators/employeeValidator");
const employeeService = require("../services/employeeService");
const activityService = require("../services/activityService");

const getEmployees = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    department,
    status,
    designation,
    sortBy,
    sortOrder,
  } = req.query;

  const userRole = req.user?.role;
  let effectiveStatus = status;
  if (userRole === "Maintenance Manager" || userRole === "Auditor") {
    effectiveStatus = "Active";
  }

  const result = await employeeService.getEmployees({
    page,
    limit,
    search,
    department,
    status: effectiveStatus,
    designation,
    sortBy,
    sortOrder,
  });
  return sendSuccess(res, "Employees retrieved successfully", result);
};

const getEmployeeOptions = async (req, res) => {
  const employees = await employeeService.getEmployeeOptions();
  return sendSuccess(res, "Employee options retrieved successfully", { employees });
};

const getMyEmployeeProfile = async (req, res) => {
  const employee = await employeeService.getMyProfile(req.user._id);
  return sendSuccess(res, "Employee profile retrieved successfully", employee);
};

const getEmployeeById = async (req, res) => {
  const userRole = req.user?.role;
  const employee = await employeeService.getEmployeeById(req.params.id);
  
  if ((userRole === "Maintenance Manager" || userRole === "Auditor") && employee.status !== "Active") {
    throw new ApiError(404, "Employee not found");
  }
  
  return sendSuccess(res, "Employee retrieved successfully", employee);
};

const createEmployee = async (req, res) => {
  const userRole = req.user?.role;
  const body = req.body;

  if (userRole === "Asset Manager" && body.userAccount) {
    throw new ApiError(403, "Asset Managers cannot link user accounts");
  }

  const allowedFields = [
    "employeeId",
    "name",
    "email",
    "phone",
    "designation",
    "department",
    "joiningDate",
    "status",
  ];
  
  if (userRole === "Admin") {
    allowedFields.push("userAccount");
  }

  const payload = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  }

  const employee = await employeeService.createEmployee(payload, req.user._id);
  activityService.recordActivityFromRequest(req, { action: "Employee Created", entityType: "Employee", entityId: employee._id, description: `Created employee ${employee.name} (${employee.employeeId})`, metadata: { employeeId: employee.employeeId, department: employee.department } });
  return sendSuccess(res, "Employee created successfully", employee, 201);
};

const updateEmployee = async (req, res) => {
  const userRole = req.user?.role;
  const body = req.body;
  const id = req.params.id;

  if (userRole === "Asset Manager" && body.userAccount !== undefined) {
    throw new ApiError(403, "Asset Managers cannot modify user account links");
  }

  const allowedFields = [
    "employeeId",
    "name",
    "email",
    "phone",
    "designation",
    "department",
    "joiningDate",
    "status",
  ];
  
  if (userRole === "Admin") {
    allowedFields.push("userAccount");
  }

  const payload = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  }

  const employee = await employeeService.updateEmployee(id, payload, req.user._id);
  activityService.recordActivityFromRequest(req, { action: "Employee Updated", entityType: "Employee", entityId: employee._id, description: `Updated employee ${employee.name} (${employee.employeeId})`, metadata: { employeeId: employee.employeeId } });
  return sendSuccess(res, "Employee updated successfully", employee);
};

const changeEmployeeStatus = async (req, res) => {
  const { status } = req.body;
  const result = await employeeService.changeStatus(req.params.id, status, req.user._id);
  const message = status === "Active" ? "Employee activated successfully" : "Employee deactivated successfully";
  const employee = result.employee || result;
  activityService.recordActivityFromRequest(req, { action: "Employee Status Changed", entityType: "Employee", entityId: req.params.id, description: `Employee ${employee.name || ""} set to ${status}`, metadata: { status } });
  return sendSuccess(res, message, result);
};

const linkUserAccount = async (req, res) => {
  const { userAccount } = req.body;
  const result = await employeeService.linkUserAccount(req.params.id, userAccount, req.user._id);
  const message = userAccount ? "User account linked successfully" : "User account unlinked successfully";
  activityService.recordActivityFromRequest(req, { action: userAccount ? "Employee User Linked" : "Employee User Unlinked", entityType: "Employee", entityId: req.params.id, description: message, metadata: { userAccount: userAccount || null } });
  return sendSuccess(res, message, result);
};

const deactivateEmployee = async (req, res) => {
  const result = await employeeService.deactivateEmployee(req.params.id, req.user._id);
  activityService.recordActivityFromRequest(req, { action: "Employee Status Changed", entityType: "Employee", entityId: req.params.id, description: "Employee deactivated", metadata: { status: "Inactive" } });
  return sendSuccess(res, "Employee deactivated successfully", result);
};

module.exports = {
  getEmployees,
  getEmployeeOptions,
  getMyEmployeeProfile,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  changeEmployeeStatus,
  linkUserAccount,
  deactivateEmployee,
};
