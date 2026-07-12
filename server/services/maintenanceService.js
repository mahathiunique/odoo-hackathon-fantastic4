const mongoose = require("mongoose");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const Asset = require("../models/Asset");
const Employee = require("../models/Employee");
const ApiError = require("../utils/ApiError");
const adapter = require("../integrations/maintenanceAssetAdapter");
const MaintenanceWorkflowHistory = require("../models/MaintenanceWorkflowHistory");
const {
  escapeRegex,
  paginationFrom,
  sortFrom,
  assertObjectId,
  userIdFrom,
  roleFrom,
} = require("./organizationQuery");
const {
  MAINTENANCE_STATUSES,
  OPEN_STATUSES,
  CANCELABLE_STATUSES,
  PRIORITIES,
  MAINTENANCE_TYPES,
  MANAGER_ROLES,
} = require("../models/MaintenanceRequest");

const EDITABLE_FIELDS = ["issueTitle", "issueDescription", "priority", "maintenanceType", "scheduledDate", "assignedTo", "cost"];
const MANAGER_ROLES_SET = MANAGER_ROLES;
const FULL_VIEW_ROLES = ["Admin", "Asset Manager", "Maintenance Manager", "Auditor"];
const ALLOWED_SORT_FIELDS = ["requestNumber", "priority", "requestStatus", "scheduledDate", "createdAt", "updatedAt", "issueTitle"];
const MAX_TX_RETRIES = 3;

const isManager = (user) => MANAGER_ROLES_SET.includes(roleFrom(user));
const canViewAll = (user) => FULL_VIEW_ROLES.includes(roleFrom(user));

// ---------------------------------------------------------------------------
// Request number generation
// ---------------------------------------------------------------------------
const generateRequestNumber = async () => {
  const count = await MaintenanceRequest.countDocuments();
  return `MAINT-${String(count + 1).padStart(5, "0")}`;
};

// Retry until we land a unique request number (handles concurrent inserts).
const reserveRequestNumber = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = await generateRequestNumber();
    const exists = await MaintenanceRequest.exists({ requestNumber: candidate });
    if (!exists) return candidate;
  }
  // Extremely unlikely fallback: time-based suffix.
  return `MAINT-${Date.now()}`;
};

// ---------------------------------------------------------------------------
// Transaction helpers (mirrors bookingService)
// ---------------------------------------------------------------------------
const isTransientTxError = (error) =>
  error?.errorLabels?.includes?.("TransientTransactionError") ||
  error?.hasErrorLabel?.("TransientTransactionError") ||
  error?.code === 112;

const transactionsUnsupported = (error) => {
  const msg = String(error?.message || "");
  return (
    error?.code === 20 ||
    error?.codeName === "IllegalOperation" ||
    /Transaction numbers are only allowed/i.test(msg) ||
    /replica set/i.test(msg) ||
    /transactions are not supported/i.test(msg)
  );
};

const withTransactionRetry = async (work) => {
  let lastError;
  for (let attempt = 0; attempt < MAX_TX_RETRIES; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError) throw error;
      if (transactionsUnsupported(error)) throw error;
      if (!isTransientTxError(error)) throw error;
    } finally {
      await session.endSession();
    }
  }
  throw lastError || new ApiError(500, "Maintenance operation failed, please retry");
};

// ---------------------------------------------------------------------------
// Populate helper
// ---------------------------------------------------------------------------
const populateRequest = (query) =>
  query
    .populate("asset", "_id assetTag name condition lifecycleStatus currentLocation")
    .populate("reportedBy", "_id name email role")
    .populate("reportedByEmployee", "_id employeeId name designation")
    .populate("assignedTo", "_id employeeId name designation department")
    .populate("createdBy", "_id name email")
    .populate("updatedBy", "_id name email")
    .populate("cancelledBy", "_id name email role");

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
const buildCreateDoc = async (payload, user) => {
  const asset = await Asset.findById(payload.asset).lean();
  if (!asset) throw new ApiError(404, "Selected asset does not exist");

  let reportedByEmployee = null;
  const employee = await Employee.findOne({ userAccount: userIdFrom(user) }).select("_id").lean();
  if (employee) reportedByEmployee = employee._id;

  if (payload.assignedTo) {
    const technician = await Employee.findById(payload.assignedTo).lean();
    if (!technician) throw new ApiError(400, "Assigned employee does not exist");
  }

  return {
    requestNumber: await reserveRequestNumber(),
    asset: asset._id,
    assetTag: asset.assetTag,
    assetName: asset.name,
    reportedBy: userIdFrom(user),
    reportedByEmployee,
    assignedTo: payload.assignedTo || null,
    issueTitle: payload.issueTitle,
    issueDescription: payload.issueDescription,
    priority: payload.priority || "Medium",
    maintenanceType: payload.maintenanceType || "Corrective",
    requestStatus: "Reported",
    scheduledDate: payload.scheduledDate ? new Date(payload.scheduledDate) : null,
    cost: payload.cost ?? null,
    createdBy: userIdFrom(user),
    updatedBy: userIdFrom(user),
  };
};

const create = async (payload, user) => {
  const doc = await buildCreateDoc(payload, user);
  const request = await MaintenanceRequest.create(doc);
  return getById(String(request._id), user, { bypassAccess: true });
};

// ---------------------------------------------------------------------------
// Listing + filters + role visibility
// ---------------------------------------------------------------------------
const buildListFilter = async (query, user) => {
  const filter = {};

  if (!canViewAll(user)) {
    // Employees only see requests they reported.
    filter.reportedBy = userIdFrom(user);
  }

  if (query.asset && mongoose.isValidObjectId(query.asset)) filter.asset = query.asset;
  if (MAINTENANCE_STATUSES.includes(query.status)) filter.requestStatus = query.status;
  if (PRIORITIES.includes(query.priority)) filter.priority = query.priority;
  if (MAINTENANCE_TYPES.includes(query.maintenanceType)) filter.maintenanceType = query.maintenanceType;
  if (query.assignedTo && mongoose.isValidObjectId(query.assignedTo)) filter.assignedTo = query.assignedTo;

  if (query.openOnly === "true") filter.requestStatus = { $in: OPEN_STATUSES };

  if (query.startFrom || query.startTo) {
    filter.createdAt = {};
    if (query.startFrom && !Number.isNaN(new Date(query.startFrom).getTime()))
      filter.createdAt.$gte = new Date(query.startFrom);
    if (query.startTo && !Number.isNaN(new Date(query.startTo).getTime()))
      filter.createdAt.$lte = new Date(query.startTo);
    if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
  }

  if (query.search?.trim()) {
    const term = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [
      { requestNumber: term },
      { issueTitle: term },
      { issueDescription: term },
      { assetTag: term },
      { assetName: term },
    ];
  }

  return filter;
};

const list = async (query, user) => {
  const { page, limit } = paginationFrom(query);
  const filter = await buildListFilter(query, user);
  const sort = sortFrom(
    { ...query, sortBy: ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : "createdAt" },
    ALLOWED_SORT_FIELDS
  );

  const [records, totalRecords] = await Promise.all([
    populateRequest(MaintenanceRequest.find(filter).sort(sort).skip((page - 1) * limit).limit(limit)).lean(),
    MaintenanceRequest.countDocuments(filter),
  ]);

  return {
    requests: records,
    pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) },
  };
};

const listMine = async (query, user) => {
  const { page, limit } = paginationFrom(query);
  const filter = { reportedBy: userIdFrom(user) };
  if (MAINTENANCE_STATUSES.includes(query.status)) filter.requestStatus = query.status;
  if (query.openOnly === "true") filter.requestStatus = { $in: OPEN_STATUSES };

  const sort = sortFrom(
    { ...query, sortBy: ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : "createdAt" },
    ALLOWED_SORT_FIELDS
  );

  const [records, totalRecords] = await Promise.all([
    populateRequest(MaintenanceRequest.find(filter).sort(sort).skip((page - 1) * limit).limit(limit)).lean(),
    MaintenanceRequest.countDocuments(filter),
  ]);

  return {
    requests: records,
    pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) },
  };
};

// ---------------------------------------------------------------------------
// Single request + access control
// ---------------------------------------------------------------------------
const getById = async (id, user, { bypassAccess = false } = {}) => {
  assertObjectId(id, "maintenance request");
  const request = await populateRequest(MaintenanceRequest.findById(id)).lean();
  if (!request) throw new ApiError(404, "Maintenance request not found");

  if (!bypassAccess && !canViewAll(user)) {
    if (String(request.reportedBy?._id || request.reportedBy) !== String(userIdFrom(user))) {
      throw new ApiError(403, "You do not have permission to view this maintenance request");
    }
  }

  return request;
};

// ---------------------------------------------------------------------------
// Update details (managers only)
// ---------------------------------------------------------------------------
const update = async (id, payload, user) => {
  assertObjectId(id, "maintenance request");
  const request = await MaintenanceRequest.findById(id);
  if (!request) throw new ApiError(404, "Maintenance request not found");
  if (["Completed", "Cancelled"].includes(request.requestStatus)) {
    throw new ApiError(400, "Completed or cancelled maintenance requests cannot be edited");
  }

  if (payload.assignedTo) {
    const technician = await Employee.findById(payload.assignedTo).lean();
    if (!technician) throw new ApiError(400, "Assigned employee does not exist");
  }

  const updatable = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) updatable[field] = payload[field];
  });

  const updated = await MaintenanceRequest.findByIdAndUpdate(
    id,
    { ...updatable, updatedBy: userIdFrom(user) },
    { new: true, runValidators: true }
  );
  return getById(String(updated._id), user, { bypassAccess: true });
};

// ---------------------------------------------------------------------------
// Transition helpers
// ---------------------------------------------------------------------------
const loadRequest = async (id, session = null) => {
  assertObjectId(id, "maintenance request");
  const request = await MaintenanceRequest.findById(id).session(session);
  if (!request) throw new ApiError(404, "Maintenance request not found");
  return request;
};

const addWorkflowHistory = async ({ request, performedBy, eventType, fromStatus, toStatus, note, metadata }, session) => {
  await MaintenanceWorkflowHistory.create(
    [
      {
        maintenanceRequest: request._id,
        asset: request.asset,
        eventType,
        fromStatus: fromStatus ?? request.requestStatus,
        toStatus,
        performedBy,
        note: note ?? null,
        metadata: metadata ?? {},
      },
    ],
    { session }
  );
};

const approve = async (id, payload, user) => {
  const request = await loadRequest(id);
  if (request.requestStatus !== "Reported") {
    throw new ApiError(400, "Only reported requests can be approved");
  }

  const work = async (session) => {
    const fromStatus = request.requestStatus;
    request.requestStatus = "Approved";
    request.updatedBy = userIdFrom(user);
    await request.save({ session });

    await addWorkflowHistory(
      {
        request,
        performedBy: userIdFrom(user),
        eventType: "Maintenance Approved",
        fromStatus,
        toStatus: "Approved",
        note: payload?.note,
        metadata: {},
      },
      session
    );

    return request;
  };

  let result;
  try {
    result = await withTransactionRetry(work);
  } catch (error) {
    if (transactionsUnsupported(error)) result = await work(null);
    else throw error;
  }

  return getById(String(result._id), user, { bypassAccess: true });
};

const reject = async (id, payload, user) => {
  const request = await loadRequest(id);
  if (request.requestStatus !== "Reported") {
    throw new ApiError(400, "Only reported requests can be rejected");
  }

  const work = async (session) => {
    const fromStatus = request.requestStatus;
    request.requestStatus = "Rejected";
    request.updatedBy = userIdFrom(user);
    request.cancelledAt = new Date();
    request.cancelledBy = userIdFrom(user);
    request.cancelReason = payload.rejectionReason;

    await request.save({ session });

    await addWorkflowHistory(
      {
        request,
        performedBy: userIdFrom(user),
        eventType: "Maintenance Rejected",
        fromStatus,
        toStatus: "Rejected",
        note: payload.rejectionReason,
        metadata: {},
      },
      session
    );

    return request;
  };

  let result;
  try {
    result = await withTransactionRetry(work);
  } catch (error) {
    if (transactionsUnsupported(error)) result = await work(null);
    else throw error;
  }

  return getById(String(result._id), user, { bypassAccess: true });
};

const assignTechnician = async (id, payload, user) => {
  const request = await loadRequest(id);
  if (!["Approved"].includes(request.requestStatus)) {
    throw new ApiError(400, "Only approved requests can have a technician assigned");
  }

  const technicianId = payload.assignedTo;
  const technician = await Employee.findById(technicianId).lean();
  if (!technician) throw new ApiError(400, "Assigned employee does not exist");

  const work = async (session) => {
    const fromStatus = request.requestStatus;
    request.assignedTo = technicianId;
    request.requestStatus = "Technician Assigned";
    request.updatedBy = userIdFrom(user);
    await request.save({ session });

    await addWorkflowHistory(
      {
        request,
        performedBy: userIdFrom(user),
        eventType: "Technician Assigned",
        fromStatus,
        toStatus: "Technician Assigned",
        note: payload?.note,
        metadata: { assignedTo: technicianId },
      },
      session
    );

    return request;
  };

  let result;
  try {
    result = await withTransactionRetry(work);
  } catch (error) {
    if (transactionsUnsupported(error)) result = await work(null);
    else throw error;
  }

  return getById(String(result._id), user, { bypassAccess: true });
};

const schedule = async (id, payload, user) => {
  assertObjectId(id, "maintenance request");
  const request = await loadRequest(id);
  if (!["Approved", "Technician Assigned", "Scheduled"].includes(request.requestStatus)) {
    throw new ApiError(400, "Only approved/technician-assigned/scheduled requests can be scheduled");
  }
  request.requestStatus = "Scheduled";
  request.scheduledDate = payload.scheduledDate;
  request.updatedBy = userIdFrom(user);
  await request.save();
  return getById(String(request._id), user, { bypassAccess: true });
};

const start = async (id, payload, user) => {
  const request = await loadRequest(id);
  if (!["Approved", "Technician Assigned", "Reported", "Scheduled"].includes(request.requestStatus)) {
    throw new ApiError(400, "Only approved/scheduled/reported requests can be started");
  }

  const work = async (session) => {
  // Capture and move the asset into "Under Maintenance" only if not already.
    const previousStatus = await adapter.markUnderMaintenance({
      assetId: request.asset,
      performedBy: userIdFrom(user),
      maintenanceId: request._id,
      session,
    });
    await addWorkflowHistory(
      {
        request,
        performedBy: userIdFrom(user),
        eventType: "Maintenance Started",
        fromStatus: request.requestStatus,
        toStatus: "In Progress",
        note: payload?.startedAt ? `Started at ${new Date(payload.startedAt).toISOString()}` : null,
        metadata: {},
      },
      session
    );
    request.requestStatus = "In Progress";
    request.startedAt = payload.startedAt || new Date();
    request.assetStatusBeforeMaintenance = previousStatus ?? request.assetStatusBeforeMaintenance;
    request.updatedBy = userIdFrom(user);
    await request.save({ session });
    return request;
  };

  let result;
  try {
    result = await withTransactionRetry(work);
  } catch (error) {
    if (transactionsUnsupported(error)) result = await work(null);
    else throw error;
  }

  return getById(String(result._id), user, { bypassAccess: true });
};

const complete = async (id, payload, user) => {
  const request = await loadRequest(id);
  if (request.requestStatus !== "In Progress") {
    throw new ApiError(400, "Only in-progress requests can be completed");
  }

  const work = async (session) => {
    // Restore the asset to its pre-maintenance status when applicable.
    if (request.assetStatusBeforeMaintenance && request.assetStatusBeforeMaintenance !== "Under Maintenance") {
      await adapter.restoreAssetStatus({
        assetId: request.asset,
        previousStatus: request.assetStatusBeforeMaintenance,
        performedBy: userIdFrom(user),
        maintenanceId: request._id,
        session,
      });
    }
    request.requestStatus = "Completed";
    request.completedAt = new Date();
    request.resolutionNotes = payload.resolutionNotes;
    if (payload.cost !== undefined) request.cost = payload.cost;
    if (payload.downtimeHours !== undefined) request.downtimeHours = payload.downtimeHours;
    request.updatedBy = userIdFrom(user);
    await request.save({ session });
    return request;
  };

  let result;
  try {
    result = await withTransactionRetry(work);
  } catch (error) {
    if (transactionsUnsupported(error)) result = await work(null);
    else throw error;
  }

  return getById(String(result._id), user, { bypassAccess: true });
};

const cancel = async (id, payload, user) => {
  const request = await loadRequest(id);
  if (!CANCELABLE_STATUSES.includes(request.requestStatus)) {
    throw new ApiError(400, "Only open maintenance requests can be cancelled");
  }

  // Employees may cancel only their own reported requests.
  if (!isManager(user) && String(request.reportedBy) !== String(userIdFrom(user))) {
    throw new ApiError(403, "You do not have permission to cancel this maintenance request");
  }

  const work = async (session) => {
    // If this request had placed the asset under maintenance, restore it.
    if (request.assetStatusBeforeMaintenance && request.assetStatusBeforeMaintenance !== "Under Maintenance") {
      await adapter.restoreAssetStatus({
        assetId: request.asset,
        previousStatus: request.assetStatusBeforeMaintenance,
        performedBy: userIdFrom(user),
        maintenanceId: request._id,
        session,
      });
    }
    request.requestStatus = "Cancelled";
    request.cancelledAt = new Date();
    request.cancelledBy = userIdFrom(user);
    request.cancelReason = payload.cancelReason;
    request.updatedBy = userIdFrom(user);
    await request.save({ session });
    return request;
  };

  let result;
  try {
    result = await withTransactionRetry(work);
  } catch (error) {
    if (transactionsUnsupported(error)) result = await work(null);
    else throw error;
  }

  return getById(String(result._id), user, { bypassAccess: true });
};

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
const stats = async () => {
  const [byStatus, byPriority, openByPriority, totalCost, total] = await Promise.all([
    MaintenanceRequest.aggregate([{ $group: { _id: "$requestStatus", count: { $sum: 1 } } }]),
    MaintenanceRequest.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
    MaintenanceRequest.aggregate([
      { $match: { requestStatus: { $in: OPEN_STATUSES } } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    MaintenanceRequest.aggregate([
      { $match: { requestStatus: "Completed", cost: { $ne: null } } },
      { $group: { _id: null, total: { $sum: "$cost" } } },
    ]),
    MaintenanceRequest.countDocuments({}),
  ]);

  const statusMap = byStatus.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {});
  const priorityMap = byPriority.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {});
  const openPriorityMap = openByPriority.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {});

  return {
    totalRequests: total,
    reportedRequests: statusMap.Reported || 0,
    scheduledRequests: statusMap.Scheduled || 0,
    inProgressRequests: statusMap["In Progress"] || 0,
    completedRequests: statusMap.Completed || 0,
    cancelledRequests: statusMap.Cancelled || 0,
    openRequests: OPEN_STATUSES.reduce((sum, s) => sum + (statusMap[s] || 0), 0),
    byPriority: PRIORITIES.map((p) => ({ priority: p, count: priorityMap[p] || 0, open: openPriorityMap[p] || 0 })),
    criticalOpen: openPriorityMap.Critical || 0,
    totalMaintenanceCost: totalCost[0]?.total || 0,
  };
};

// ---------------------------------------------------------------------------
// Asset integration helper for the frontend (reuses Stage 6 options)
// ---------------------------------------------------------------------------
const getAssetOptions = async (query = {}) => {
  const filter = {};
  if (query.availableOnly === "true") filter.lifecycleStatus = "Available";
  if (query.status) filter.lifecycleStatus = query.status;
  const assets = await Asset.find(filter)
    .select("_id assetTag name lifecycleStatus condition")
    .sort({ name: 1 })
    .lean();
  return { assets };
};

module.exports = {
  create,
  list,
  listMine,
  getById,
  update,
  approve,
  reject,
  assignTechnician,
  schedule,
  start,
  complete,
  cancel,
  stats,
  getAssetOptions,
  MAINTENANCE_STATUSES,
  OPEN_STATUSES,
  PRIORITIES,
  MAINTENANCE_TYPES,
};
