const mongoose = require("mongoose");
const notificationService = require("../services/notificationService");

// Dynamic model lookup. Returns null when Stage 9 (Maintenance) is not merged.
const getMaintenanceModelIfAvailable = () => {
  try {
    return mongoose.model("MaintenanceRequest");
  } catch {
    return null;
  }
};

const getMaintenanceCounterModelIfAvailable = () => {
  try {
    return mongoose.model("MaintenanceCounter");
  } catch {
    return null;
  }
};

const isMaintenanceModuleAvailable = () => getMaintenanceModelIfAvailable() !== null;

const EMPTY_SUMMARY = {
  available: false,
  openRequests: 0,
  pendingApprovals: 0,
  inProgressRequests: 0,
};

// Dashboard integration. Returns safe empty values when the module is absent so
// the dashboard still loads without Stage 9.
const getMaintenanceDashboardSummary = async () => {
  const MaintenanceRequest = getMaintenanceModelIfAvailable();
  if (!MaintenanceRequest) return EMPTY_SUMMARY;

  const [openRequests, pendingApprovals, inProgressRequests] = await Promise.all([
    MaintenanceRequest.countDocuments({ requestStatus: { $in: ["Submitted", "Approved"] } }),
    MaintenanceRequest.countDocuments({ approvalStatus: "Pending" }),
    MaintenanceRequest.countDocuments({ requestStatus: "In Progress" }),
  ]);

  return {
    available: true,
    openRequests,
    pendingApprovals,
    inProgressRequests,
  };
};

const getPendingMaintenanceApprovals = async () => {
  const MaintenanceRequest = getMaintenanceModelIfAvailable();
  if (!MaintenanceRequest) return [];
  return MaintenanceRequest.find({ approvalStatus: "Pending" })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
};

// Generate notifications from MaintenanceRequest state changes. We only notify
// on deduplicated, safe events. Expected statuses/approvals are documented in
// the Stage 11 integration contract (see README).
const generateMaintenanceNotifications = async () => {
  const MaintenanceRequest = getMaintenanceModelIfAvailable();
  if (!MaintenanceRequest) return 0;

  // Notify open (submitted/approved) and in-progress requests' reporters.
  const requests = await MaintenanceRequest.find({
    requestStatus: { $in: ["Submitted", "Approved", "In Progress"] },
  })
    .populate("reportedBy", "_id")
    .populate("reportedByEmployee", "_id")
    .populate("asset", "name assetTag")
    .lean();

  const adminManagers = await notificationService.getAdminManagerUsers();
  let created = 0;

  for (const request of requests) {
    const recipients = [...adminManagers];
    const reporter = request.reportedBy || request.reportedByEmployee;
    if (reporter && mongoose.isValidObjectId(reporter._id || reporter)) {
      recipients.push(reporter._id || reporter);
    }

    const assetLabel = request.asset?.name || request.asset?.assetTag || "an asset";
    const requestNumber = request.requestNumber || "request";
    const status = request.requestStatus || "Submitted";

    created += await notificationService.createForRecipients(recipients, {
      type: "Maintenance Update",
      priority:
        request.priority === "Critical" ? "Critical" : request.priority === "High" ? "High" : "Normal",
      title: `Maintenance ${status.toLowerCase()}`,
      message: `Maintenance request ${requestNumber} for ${assetLabel} is ${status.toLowerCase()}.`,
      relatedEntityType: "MaintenanceRequest",
      relatedEntityId: request._id,
      actionUrl: `/maintenance/${request._id}`,
      deduplicationKey: `maintenance-status:${request._id}:${status}`,
      metadata: {
        requestNumber,
        assetName: assetLabel,
        assetTag: request.asset?.assetTag || null,
        newStatus: status,
      },
    });
  }

  return created;
};

module.exports = {
  isMaintenanceModuleAvailable,
  getMaintenanceDashboardSummary,
  getPendingMaintenanceApprovals,
  generateMaintenanceNotifications,
  getMaintenanceModelIfAvailable,
  getMaintenanceCounterModelIfAvailable,
};
