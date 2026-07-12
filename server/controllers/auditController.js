const auditService = require("../services/auditService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { auditLog, userIdFrom } = require("../services/organizationQuery");

const getAudits = asyncHandler(async (req, res) => {
  sendSuccess(res, "Audit Cycles retrieved successfully", await auditService.list(req.query, req.user));
});

const getMyAudits = asyncHandler(async (req, res) => {
  sendSuccess(res, "Assigned Audit Cycles retrieved successfully", await auditService.mine(req.query, req.user));
});

const getAuditStats = asyncHandler(async (req, res) => {
  sendSuccess(res, "Audit statistics retrieved successfully", { stats: await auditService.stats(req.user) });
});

const getAuditorOptions = asyncHandler(async (req, res) => {
  sendSuccess(res, "Auditor options retrieved successfully", { auditors: await auditService.auditorOptions() });
});

const getAuditById = asyncHandler(async (req, res) => {
  sendSuccess(res, "Audit Cycle retrieved successfully", {
    audit: await auditService.get(req.params.id, req.user),
  });
});

const getAuditItems = asyncHandler(async (req, res) => {
  sendSuccess(res, "Audit Items retrieved successfully", await auditService.items(req.params.id, req.query, req.user));
});

const getAuditReport = asyncHandler(async (req, res) => {
  // Reuse the access rules enforced by get() before building the report.
  await auditService.get(req.params.id, req.user);
  sendSuccess(res, "Audit report generated successfully", await auditService.reports.report(req.params.id));
});

const createAudit = asyncHandler(async (req, res) => {
  const audit = await auditService.create(req.body, req.user);
  auditLog("audit.created", audit._id, userIdFrom(req.user));
  sendSuccess(res, "Audit Cycle created successfully", { audit }, 201);
});

const updateAudit = asyncHandler(async (req, res) => {
  const audit = await auditService.update(req.params.id, req.body, req.user);
  auditLog("audit.updated", audit._id, userIdFrom(req.user));
  sendSuccess(res, "Audit Cycle updated successfully", { audit });
});

const startAudit = asyncHandler(async (req, res) => {
  const audit = await auditService.start(req.params.id, req.user);
  auditLog("audit.started", audit._id, userIdFrom(req.user));
  sendSuccess(res, "Audit Cycle started successfully", { audit });
});

const cancelAudit = asyncHandler(async (req, res) => {
  const audit = await auditService.cancel(req.params.id, req.body.cancelReason, req.user);
  auditLog("audit.cancelled", audit._id, userIdFrom(req.user));
  sendSuccess(res, "Audit Cycle cancelled successfully", { audit });
});

const completeAudit = asyncHandler(async (req, res) => {
  const audit = await auditService.complete(req.params.id, req.body, req.user);
  auditLog("audit.completed", audit._id, userIdFrom(req.user));
  sendSuccess(res, "Audit Cycle completed successfully", { audit });
});

const assignAuditItem = asyncHandler(async (req, res) => {
  const item = await auditService.assign(req.params.id, req.params.itemId, req.body.assignedAuditor);
  auditLog("audit.item.assigned", item._id, userIdFrom(req.user));
  sendSuccess(res, "Audit Item assigned successfully", { item });
});

const verifyAuditItem = asyncHandler(async (req, res) => {
  const item = await auditService.verify(req.params.id, req.params.itemId, req.body, req.user);
  auditLog("audit.item.verified", item._id, userIdFrom(req.user));
  sendSuccess(res, "Audit Item verified successfully", { item });
});

const createUnregisteredFinding = asyncHandler(async (req, res) => {
  const finding = await auditService.createFinding(req.params.id, req.body, req.user);
  auditLog("audit.finding.created", req.params.id, userIdFrom(req.user));
  sendSuccess(res, "Unregistered Asset finding recorded successfully", { finding }, 201);
});

module.exports = {
  getAudits,
  getMyAudits,
  getAuditStats,
  getAuditorOptions,
  getAuditById,
  getAuditItems,
  getAuditReport,
  createAudit,
  updateAudit,
  startAudit,
  cancelAudit,
  completeAudit,
  assignAuditItem,
  verifyAuditItem,
  createUnregisteredFinding,
};
