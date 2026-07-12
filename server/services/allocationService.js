const mongoose = require("mongoose");
const AssetAllocation = require("../models/AssetAllocation");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const ApiError = require("../utils/ApiError");
const adapter = require("../integrations/assetAllocationAdapter");

const allowedSort = ["allocatedDate", "expectedReturnDate", "actualReturnDate", "status", "createdAt", "updatedAt"];
const userId = (user) => user?._id || user?.id;
const pageValues = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10)) });
const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const duplicate = () => new ApiError(409, "This asset already has an active allocation", [{ field: "asset", message: "This asset already has an active allocation" }]);
const assertId = (id, label = "allocation") => { if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label} ID`); };

const populate = (query) => {
  if (mongoose.modelNames().includes("Asset")) query.populate("asset", "assetTag name condition lifecycleStatus currentLocation");
  return query.populate("employee", "employeeId name email designation status").populate("department", "name code status").populate("allocatedBy returnedBy", "name email role");
};

const refreshOverdueAllocations = () => AssetAllocation.updateMany({ isOpen: true, status: "Active", expectedReturnDate: { $lt: new Date() } }, { $set: { status: "Overdue" } });

const validateTarget = async (payload, session) => {
  if (payload.allocatedToType === "Employee") {
    const employee = await Employee.findById(payload.employee).session(session || null);
    if (!employee) throw new ApiError(404, "Selected employee does not exist");
    if (employee.status !== "Active") throw new ApiError(400, "Selected employee is inactive");
    return employee;
  }
  const department = await Department.findById(payload.department).session(session || null);
  if (!department) throw new ApiError(404, "Selected department does not exist");
  if (department.status !== "Active") throw new ApiError(400, "Selected department is inactive");
  return department;
};

const buildFilter = async (query) => {
  const filter = {};
  if (["Active", "Returned", "Overdue"].includes(query.status)) filter.status = query.status;
  if (["Employee", "Department"].includes(query.allocatedToType)) filter.allocatedToType = query.allocatedToType;
  for (const key of ["employee", "department", "asset"]) if (query[key] && mongoose.isValidObjectId(query[key])) filter[key] = query[key];
  if (query.expectedReturnFrom || query.expectedReturnTo) {
    filter.expectedReturnDate = {};
    if (query.expectedReturnFrom) filter.expectedReturnDate.$gte = new Date(query.expectedReturnFrom);
    if (query.expectedReturnTo) filter.expectedReturnDate.$lte = new Date(query.expectedReturnTo);
  }
  if (query.search?.trim()) {
    const regex = new RegExp(escapeRegex(query.search.trim()), "i");
    const [employees, departments] = await Promise.all([Employee.find({ $or: [{ name: regex }, { employeeId: regex }] }).select("_id").lean(), Department.find({ $or: [{ name: regex }, { code: regex }] }).select("_id").lean()]);
    const clauses = [{ purpose: regex }, { employee: { $in: employees.map((x) => x._id) } }, { department: { $in: departments.map((x) => x._id) } }];
    if (mongoose.modelNames().includes("Asset")) {
      const Asset = mongoose.model("Asset");
      const assets = await Asset.find({ $or: [{ name: regex }, { assetTag: regex }] }).select("_id").lean();
      clauses.push({ asset: { $in: assets.map((x) => x._id) } });
    }
    filter.$or = clauses;
  }
  return filter;
};

const list = async (query = {}) => {
  await refreshOverdueAllocations();
  const { page, limit } = pageValues(query), filter = await buildFilter(query);
  const sortBy = allowedSort.includes(query.sortBy) ? query.sortBy : "createdAt", order = query.sortOrder === "asc" ? 1 : -1;
  const [allocations, totalRecords] = await Promise.all([populate(AssetAllocation.find(filter).sort({ [sortBy]: order }).skip((page - 1) * limit).limit(limit)), AssetAllocation.countDocuments(filter)]);
  return { allocations, pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) } };
};

const findEmployeeForUser = async (user) => {
  const employee = await Employee.findOne({ userAccount: userId(user) });
  if (!employee) throw new ApiError(404, "No employee profile is linked to this user account");
  return employee;
};
const listMine = async (query, user) => {
  const employee = await findEmployeeForUser(user);
  return list({ ...query, employee: employee._id.toString(), allocatedToType: "Employee" });
};
const listOverdue = async (query = {}) => list({ ...query, status: "Overdue", sortBy: "expectedReturnDate", sortOrder: "asc" });

const stats = async () => {
  await refreshOverdueAllocations();
  const now = new Date(), sevenDays = new Date(now.getTime() + 7 * 86400000);
  const [totalAllocations, activeAllocations, overdueAllocations, returnedAllocations, employeeAllocations, departmentAllocations, dueWithinSevenDays] = await Promise.all([
    AssetAllocation.countDocuments(), AssetAllocation.countDocuments({ status: "Active" }), AssetAllocation.countDocuments({ status: "Overdue" }), AssetAllocation.countDocuments({ status: "Returned" }), AssetAllocation.countDocuments({ allocatedToType: "Employee" }), AssetAllocation.countDocuments({ allocatedToType: "Department" }), AssetAllocation.countDocuments({ isOpen: true, expectedReturnDate: { $gte: now, $lte: sevenDays } }),
  ]);
  return { totalAllocations, activeAllocations, overdueAllocations, returnedAllocations, employeeAllocations, departmentAllocations, dueWithinSevenDays };
};

const getById = async (id, user) => {
  assertId(id); await refreshOverdueAllocations();
  const allocation = await populate(AssetAllocation.findById(id));
  if (!allocation) throw new ApiError(404, "Allocation not found");
  if (user?.role === "Employee") {
    const employee = await findEmployeeForUser(user);
    const allocationEmployee = allocation.employee?._id || allocation.employee;
    if (!allocationEmployee || allocationEmployee.toString() !== employee._id.toString()) throw new ApiError(403, "You do not have permission to view this allocation");
  }
  return allocation;
};

const create = async (payload, user) => {
  const session = await mongoose.startSession(); let allocation;
  try {
    await session.withTransaction(async () => {
      await validateTarget(payload, session);
      await adapter.validateAssetAvailable(payload.asset, session);
      if (await AssetAllocation.exists({ asset: payload.asset, isOpen: true }).session(session)) throw duplicate();
      try {
        [allocation] = await AssetAllocation.create([{ asset: payload.asset, allocatedToType: payload.allocatedToType, employee: payload.allocatedToType === "Employee" ? payload.employee : null, department: payload.allocatedToType === "Department" ? payload.department : null, allocatedBy: userId(user), allocatedDate: payload.allocatedDate || new Date(), expectedReturnDate: payload.expectedReturnDate, purpose: payload.purpose.trim(), notes: payload.notes?.trim() || "", status: "Active", isOpen: true }], { session });
      } catch (error) { if (error?.code === 11000) throw duplicate(); throw error; }
      const data = { assetId: payload.asset, employee: allocation.employee, department: allocation.department, expectedReturnDate: allocation.expectedReturnDate, updatedBy: userId(user), allocatedBy: userId(user), allocationId: allocation._id, purpose: allocation.purpose };
      await adapter.markAssetAllocated(data, session);
      await adapter.recordAllocationHistory(data, session);
    });
    return getById(allocation._id, user);
  } finally { await session.endSession(); }
};

const returnAsset = async (id, payload, user) => {
  assertId(id); const session = await mongoose.startSession(); let allocation;
  try {
    await session.withTransaction(async () => {
      allocation = await AssetAllocation.findById(id).session(session);
      if (!allocation) throw new ApiError(404, "Allocation not found");
      if (!allocation.isOpen || !["Active", "Overdue"].includes(allocation.status)) throw new ApiError(400, "This allocation has already been returned");
      if (new Date(payload.actualReturnDate) < allocation.allocatedDate) throw new ApiError(400, "Actual return date cannot be earlier than allocated date", [{ field: "actualReturnDate", message: "Actual return date cannot be earlier than allocated date" }]);
      allocation.status = "Returned"; allocation.isOpen = false; allocation.actualReturnDate = payload.actualReturnDate; allocation.returnCondition = payload.returnCondition; allocation.returnNotes = payload.returnNotes?.trim() || ""; allocation.returnedBy = userId(user);
      await allocation.save({ session });
      const data = { assetId: allocation.asset, allocationId: allocation._id, actualReturnDate: allocation.actualReturnDate, returnCondition: allocation.returnCondition, returnNotes: allocation.returnNotes, returnedBy: userId(user) };
      await adapter.markAssetReturned(data, session);
      await adapter.recordReturnHistory(data, session);
    });
    const populated = await getById(allocation._id, user);
    return { allocation: populated, warning: ["Damaged", "Unusable"].includes(payload.returnCondition) ? "The returned asset condition requires inspection." : null };
  } finally { await session.endSession(); }
};

module.exports = { refreshOverdueAllocations, list, listMine, listOverdue, stats, getById, create, returnAsset, _helpers: { validateTarget, buildFilter, duplicate } };
