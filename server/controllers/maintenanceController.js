const maintenanceService = require("../services/maintenanceService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { auditLog, userIdFrom } = require("../services/organizationQuery");

const approveMaintenance = asyncHandler(async (req, res) => {
  const request = await maintenanceService.approve(req.params.id, req.body, req.user);
  auditLog("maintenance.approved", request._id, userIdFrom(req.user));
  sendSuccess(res, "Maintenance request approved successfully", { request });
});

const rejectMaintenance = asyncHandler(async (req, res) => {
  const request = await maintenanceService.reject(req.params.id, req.body, req.user);
  auditLog("maintenance.rejected", request._id, userIdFrom(req.user));
  sendSuccess(res, "Maintenance request rejected successfully", { request });
});

const assignTechnician = asyncHandler(async (req, res) => {
  const request = await maintenanceService.assignTechnician(req.params.id, req.body, req.user);
  auditLog("maintenance.technician_assigned", request._id, userIdFrom(req.user));
  sendSuccess(res, "Technician assigned successfully", { request });
});

const getMaintenance = asyncHandler(async (req, res) => {

  sendSuccess(res, "Maintenance requests retrieved successfully", await maintenanceService.list(req.query, req.user));
});

const getMyMaintenance = asyncHandler(async (req, res) => {
  sendSuccess(res, "My maintenance requests retrieved successfully", await maintenanceService.listMine(req.query, req.user));
});

const getStats = asyncHandler(async (req, res) => {
  sendSuccess(res, "Maintenance statistics retrieved successfully", await maintenanceService.stats());
});

const getAssetOptions = asyncHandler(async (req, res) => {
  sendSuccess(res, "Asset options retrieved successfully", await maintenanceService.getAssetOptions(req.query));
});

const getMaintenanceById = asyncHandler(async (req, res) => {
  sendSuccess(res, "Maintenance request retrieved successfully", {
    request: await maintenanceService.getById(req.params.id, req.user),
  });
});

const createMaintenance = asyncHandler(async (req, res) => {
  const request = await maintenanceService.create(req.body, req.user);
  auditLog("maintenance.created", request._id, userIdFrom(req.user));
  sendSuccess(res, "Maintenance request created successfully", { request }, 201);
});

const updateMaintenance = asyncHandler(async (req, res) => {
  const request = await maintenanceService.update(req.params.id, req.body, req.user);
  auditLog("maintenance.updated", request._id, userIdFrom(req.user));
  sendSuccess(res, "Maintenance request updated successfully", { request });
});

const scheduleMaintenance = asyncHandler(async (req, res) => {
  const request = await maintenanceService.schedule(req.params.id, req.body, req.user);
  auditLog("maintenance.scheduled", request._id, userIdFrom(req.user));
  sendSuccess(res, "Maintenance request scheduled successfully", { request });
});

const startMaintenance = asyncHandler(async (req, res) => {
  const request = await maintenanceService.start(req.params.id, req.body, req.user);
  auditLog("maintenance.started", request._id, userIdFrom(req.user));
  sendSuccess(res, "Maintenance started successfully", { request });
});

const completeMaintenance = asyncHandler(async (req, res) => {
  const request = await maintenanceService.complete(req.params.id, req.body, req.user);
  auditLog("maintenance.completed", request._id, userIdFrom(req.user));
  sendSuccess(res, "Maintenance completed successfully", { request });
});

const cancelMaintenance = asyncHandler(async (req, res) => {
  const request = await maintenanceService.cancel(req.params.id, req.body, req.user);
  auditLog("maintenance.cancelled", request._id, userIdFrom(req.user));
  sendSuccess(res, "Maintenance request cancelled successfully", { request });
});

module.exports = {
  getMaintenance,
  getMyMaintenance,
  getStats,
  getAssetOptions,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  scheduleMaintenance,
  startMaintenance,
  completeMaintenance,
  cancelMaintenance,
  approveMaintenance,
  rejectMaintenance,
  assignTechnician,
};
