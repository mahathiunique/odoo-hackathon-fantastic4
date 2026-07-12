const mongoose = require("mongoose");
const Asset = require("../models/Asset");
const AssetHistory = require("../models/AssetHistory");
const AssetCategory = require("../models/AssetCategory");
const Department = require("../models/Department");
const Employee = require("../models/Employee");
const ApiError = require("../utils/ApiError");
const { escapeRegex, paginationFrom, sortFrom, assertObjectId, userIdFrom, roleFrom } = require("./organizationQuery");
const { normalizeAssetPayload, validateAssetPayload, validateAssetStatusPayload, validateAssetConditionPayload, isValidTransition, getTransitionAllowedRoles, validateTransitionReason } = require("../validators/assetValidator");

const safePopulate = {
  category: { path: "category", select: "_id name code requiresMaintenance status" },
  department: { path: "department", select: "_id name code status" },
  assignedToEmployee: { path: "assignedToEmployee", select: "_id employeeId name email designation status" },
  assignedToDepartment: { path: "assignedToDepartment", select: "_id name code status" },
  createdBy: { path: "createdBy", select: "name email" },
  updatedBy: { path: "updatedBy", select: "name email" },
};

const assetFields = ["assetTag", "name", "description", "category", "serialNumber", "manufacturer", "model", "purchaseDate", "warrantyExpiry", "department", "currentLocation", "isSharedResource", "notes"];
const allowedSortFields = ["assetTag", "name", "purchaseDate", "warrantyExpiry", "condition", "lifecycleStatus", "currentLocation", "createdAt", "updatedAt"];

const buildHistoryEntry = ({ assetId, previousStatus, newStatus, action, reason, changes, performedBy, metadata = {} }) => ({
  asset: assetId,
  previousStatus,
  newStatus,
  action,
  reason: reason || null,
  changes,
  performedBy,
  metadata,
});

const ensureCategoryValid = async (categoryId, isNewAssignment = true) => {
  if (!categoryId) throw new ApiError(400, "Selected asset category does not exist");
  const category = await AssetCategory.findById(categoryId).lean();
  if (!category) throw new ApiError(400, "Selected asset category does not exist");
  if (isNewAssignment && category.status !== "Active") throw new ApiError(400, "Selected asset category is inactive");
  return category;
};

const ensureDepartmentValid = async (departmentId, isNewAssignment = true) => {
  if (!departmentId) return null;
  const department = await Department.findById(departmentId).lean();
  if (!department) throw new ApiError(400, "Selected department does not exist");
  if (isNewAssignment && department.status !== "Active") throw new ApiError(400, "Selected department is inactive");
  return department;
};

const validateUniqueConstraints = async ({ assetId, assetTag, serialNumber }) => {
  if (assetTag) {
    const existingTag = await Asset.findOne({ assetTag: assetTag.toUpperCase(), _id: { $ne: assetId } }).lean();
    if (existingTag) throw new ApiError(409, "An asset with this asset tag already exists", [{ field: "assetTag", message: "An asset with this asset tag already exists" }]);
  }
  if (serialNumber) {
    const existingSerial = await Asset.findOne({ serialNumber: serialNumber.trim(), _id: { $ne: assetId } }).lean();
    if (existingSerial) throw new ApiError(409, "An asset with this serial number already exists", [{ field: "serialNumber", message: "An asset with this serial number already exists" }]);
  }
};

const buildAssetQuery = (query) => {
  const filter = {};
  if (query.search?.trim()) {
    const term = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [
      { assetTag: term },
      { name: term },
      { serialNumber: term },
      { manufacturer: term },
      { model: term },
      { currentLocation: term },
    ];
  }
  if (query.category) filter.category = query.category;
  if (query.department) filter.department = query.department;
  if (query.condition) filter.condition = query.condition;
  if (query.lifecycleStatus) filter.lifecycleStatus = query.lifecycleStatus;
  if (query.location) filter.currentLocation = new RegExp(escapeRegex(query.location.trim()), "i");
  if (query.isSharedResource === "true") filter.isSharedResource = true;
  if (query.isSharedResource === "false") filter.isSharedResource = false;
  return filter;
};

const list = async (query = {}) => {
  const { page, limit } = paginationFrom(query);
  const filter = buildAssetQuery(query);
  const sort = sortFrom(query, allowedSortFields);

  const [assets, totalRecords] = await Promise.all([
    Asset.find(filter)
      .populate(safePopulate.category)
      .populate(safePopulate.department)
      .populate(safePopulate.assignedToEmployee)
      .populate(safePopulate.assignedToDepartment)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Asset.countDocuments(filter),
  ]);

  return {
    assets: assets.map((asset) => ({
      ...asset,
      assignedTo: asset.assignedToEmployee?.name || (asset.assignedToDepartment?.name ? `${asset.assignedToDepartment.name} (Department)` : "Not allocated"),
    })),
    pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) },
  };
};

const options = async (query = {}) => {
  const filter = {};
  if (query.availableOnly === "true") filter.lifecycleStatus = "Available";
  if (query.sharedOnly === "true") filter.isSharedResource = true;
  if (query.category) filter.category = query.category;
  if (query.department) filter.department = query.department;
  if (query.status) filter.lifecycleStatus = query.status;
  const assets = await Asset.find(filter)
    .populate(safePopulate.category)
    .populate(safePopulate.department)
    .select("_id assetTag name lifecycleStatus condition category department")
    .sort({ name: 1 })
    .lean();
  return { assets };
};

const stats = async () => {
  const counts = await Asset.aggregate([
    {
      $group: {
        _id: "$lifecycleStatus",
        count: { $sum: 1 },
      },
    },
  ]);
  const summary = {
    totalAssets: await Asset.countDocuments(),
    availableAssets: 0,
    reservedAssets: 0,
    allocatedAssets: 0,
    underMaintenanceAssets: 0,
    lostAssets: 0,
    retiredAssets: 0,
    disposedAssets: 0,
    sharedResourceAssets: await Asset.countDocuments({ isSharedResource: true }),
  };
  counts.forEach((entry) => {
    const key = entry._id.replace(/ /g, "").replace(/-/g, "").toLowerCase();
    if (entry._id === "Available") summary.availableAssets = entry.count;
    if (entry._id === "Reserved") summary.reservedAssets = entry.count;
    if (entry._id === "Allocated") summary.allocatedAssets = entry.count;
    if (entry._id === "Under Maintenance") summary.underMaintenanceAssets = entry.count;
    if (entry._id === "Lost") summary.lostAssets = entry.count;
    if (entry._id === "Retired") summary.retiredAssets = entry.count;
    if (entry._id === "Disposed") summary.disposedAssets = entry.count;
  });
  return summary;
};

const getById = async (id) => {
  assertObjectId(id, "asset");
  const asset = await Asset.findById(id)
    .populate(safePopulate.category)
    .populate(safePopulate.department)
    .populate(safePopulate.assignedToEmployee)
    .populate(safePopulate.assignedToDepartment)
    .populate(safePopulate.createdBy)
    .populate(safePopulate.updatedBy)
    .lean();
  if (!asset) throw new ApiError(404, "Asset not found");
  return {
    ...asset,
    allocationHistoryCount: 0,
    maintenanceHistoryCount: 0,
    auditHistoryCount: 0,
  };
};

const getHistory = async (id, query = {}) => {
  assertObjectId(id, "asset");
  const asset = await Asset.findById(id).lean();
  if (!asset) throw new ApiError(404, "Asset not found");
  const { page, limit } = paginationFrom(query);
  const filter = { asset: asset._id };
  if (query.action) filter.action = query.action;
  if (query.newStatus) filter.newStatus = query.newStatus;
  const [history, totalRecords] = await Promise.all([
    AssetHistory.find(filter)
      .populate("performedBy", "name email role")
      .sort({ createdAt: query.sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AssetHistory.countDocuments(filter),
  ]);
  return {
    history,
    pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) },
  };
};

const create = async (payload, user) => {
  const safePayload = validateAssetPayload(payload, "create");
  const assetTag = safePayload.assetTag.toUpperCase();
  const serialNumber = safePayload.serialNumber?.trim() || null;
  const category = safePayload.category;
  const department = safePayload.department;
  await ensureCategoryValid(category, true);
  if (department) await ensureDepartmentValid(department, true);
  await validateUniqueConstraints({ assetTag, serialNumber });
  const doc = await Asset.create({
    ...safePayload,
    assetTag,
    serialNumber,
    createdBy: userIdFrom(user),
    updatedBy: userIdFrom(user),
  });
  await AssetHistory.create(buildHistoryEntry({ assetId: doc._id, previousStatus: null, newStatus: doc.lifecycleStatus, action: "Asset Created", performedBy: userIdFrom(user), changes: {} }));
  return getById(String(doc._id));
};

const update = async (id, payload, user) => {
  assertObjectId(id, "asset");
  const current = await Asset.findById(id);
  if (!current) throw new ApiError(404, "Asset not found");
  const safePayload = normalizeAssetPayload(payload);
  const errors = []; 
  const allowedFields = assetFields;
  Object.keys(safePayload).forEach((key) => {
    if (!allowedFields.includes(key)) errors.push({ field: key, message: "This field cannot be updated" });
  });
  if (errors.length) throw new ApiError(400, "Validation failed", errors);
  if (safePayload.assetTag) safePayload.assetTag = safePayload.assetTag.toUpperCase();
  if (safePayload.serialNumber) safePayload.serialNumber = safePayload.serialNumber.trim();
  if (safePayload.category) await ensureCategoryValid(safePayload.category, false);
  if (safePayload.department) await ensureDepartmentValid(safePayload.department, false);
  await validateUniqueConstraints({ assetId: id, assetTag: safePayload.assetTag, serialNumber: safePayload.serialNumber });
  const changes = {};
  allowedFields.forEach((field) => {
    if (safePayload[field] !== undefined && String(current[field] || "") !== String(safePayload[field] || "")) {
      if (field === "category" || field === "department") changes[field] = { from: current[field] ? String(current[field]) : null, to: safePayload[field] ? String(safePayload[field]) : null };
      else changes[field] = { from: current[field] || null, to: safePayload[field] || null };
    }
  });
  if (Object.keys(changes).length) {
    const updated = await Asset.findByIdAndUpdate(id, { ...safePayload, updatedBy: userIdFrom(user) }, { new: true, runValidators: true });
    await AssetHistory.create(buildHistoryEntry({ assetId: id, previousStatus: current.lifecycleStatus, newStatus: current.lifecycleStatus, action: "Asset Updated", reason: null, changes, performedBy: userIdFrom(user), metadata: {} }));
    return getById(String(updated._id));
  }
  return getById(String(current._id));
};

const changeStatus = async (id, payload, user) => {
  assertObjectId(id, "asset");
  const asset = await Asset.findById(id);
  if (!asset) throw new ApiError(404, "Asset not found");
  const errors = validateAssetStatusPayload(payload);
  if (errors.length) throw new ApiError(400, "Validation failed", errors);
  const currentStatus = asset.lifecycleStatus;
  const nextStatus = payload.newStatus;
  if (currentStatus === nextStatus) throw new ApiError(400, `Invalid lifecycle transition from ${currentStatus} to ${currentStatus}`);
  if (!isValidTransition(currentStatus, nextStatus)) throw new ApiError(400, `Invalid lifecycle transition from ${currentStatus} to ${nextStatus}`);
  const role = roleFrom(user);
  if (!getTransitionAllowedRoles(currentStatus, nextStatus).includes(role)) throw new ApiError(403, "You do not have permission to perform this action");
  if (!validateTransitionReason(nextStatus, payload.reason)) throw new ApiError(400, "A valid reason is required for this transition");
  const update = { lifecycleStatus: nextStatus, updatedBy: userIdFrom(user) };
  if (nextStatus === "Available") {
    update.assignedToEmployee = null;
    update.assignedToDepartment = null;
    update.expectedReturnDate = null;
  }
  if (nextStatus === "Retired") update.isSharedResource = false;
  if (nextStatus === "Disposed") {
    if (currentStatus !== "Retired") throw new ApiError(400, "Disposed assets must come from Retired");
    if (role !== "Admin") throw new ApiError(403, "Only admins can dispose retired assets");
  }
  const updatedAsset = await Asset.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  await AssetHistory.create(buildHistoryEntry({ assetId: id, previousStatus: currentStatus, newStatus: nextStatus, action: "Status Changed", reason: payload.reason || null, changes: { lifecycleStatus: { from: currentStatus, to: nextStatus } }, performedBy: userIdFrom(user), metadata: {} }));
  return getById(String(updatedAsset._id));
};

const changeCondition = async (id, payload, user) => {
  assertObjectId(id, "asset");
  const asset = await Asset.findById(id);
  if (!asset) throw new ApiError(404, "Asset not found");
  const errors = validateAssetConditionPayload(payload);
  if (errors.length) throw new ApiError(400, "Validation failed", errors);
  if (asset.condition === payload.condition) throw new ApiError(400, "Condition already set to this value");
  const update = { condition: payload.condition, updatedBy: userIdFrom(user) };
  await Asset.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  await AssetHistory.create(buildHistoryEntry({ assetId: id, previousStatus: asset.lifecycleStatus, newStatus: asset.lifecycleStatus, action: "Condition Changed", reason: payload.reason || null, changes: { condition: { from: asset.condition, to: payload.condition } }, performedBy: userIdFrom(user), metadata: {} }));
  return getById(String(asset._id));
};

const retireAsset = async (id, reason, user) => {
  assertObjectId(id, "asset");
  const asset = await Asset.findById(id);
  if (!asset) throw new ApiError(404, "Asset not found");
  if (asset.lifecycleStatus === "Disposed") throw new ApiError(400, "Disposed assets cannot be retired again");
  if (asset.lifecycleStatus === "Allocated") throw new ApiError(400, "Allocated assets cannot be retired directly");
  if (!reason || reason.trim().length < 5) throw new ApiError(400, "A valid reason is required for retirement");
  const updated = await Asset.findByIdAndUpdate(id, { lifecycleStatus: "Retired", isSharedResource: false, updatedBy: userIdFrom(user) }, { new: true, runValidators: true });
  await AssetHistory.create(buildHistoryEntry({ assetId: id, previousStatus: asset.lifecycleStatus, newStatus: "Retired", action: "Asset Retired", reason: reason.trim(), changes: { lifecycleStatus: { from: asset.lifecycleStatus, to: "Retired" } }, performedBy: userIdFrom(user), metadata: {} }));
  return getById(String(updated._id));
};

module.exports = { list, options, stats, getById, getHistory, create, update, changeStatus, changeCondition, retireAsset };
