const mongoose = require("mongoose");
const notificationService = require("../services/notificationService");

// Dynamic model lookup. Returns null when Stage 10 (Audit) is not merged.
const getAuditCycleModelIfAvailable = () => {
  try {
    return mongoose.model("AuditCycle");
  } catch {
    return null;
  }
};

const getAuditItemModelIfAvailable = () => {
  try {
    return mongoose.model("AuditItem");
  } catch {
    return null;
  }
};

const isAuditModuleAvailable = () => getAuditCycleModelIfAvailable() !== null;

const EMPTY_SUMMARY = {
  available: false,
  activeAudits: 0,
  plannedAudits: 0,
  completedAudits: 0,
};

const getAuditDashboardSummary = async () => {
  const AuditCycle = getAuditCycleModelIfAvailable();
  if (!AuditCycle) return EMPTY_SUMMARY;

  const [activeAudits, plannedAudits, completedAudits] = await Promise.all([
    AuditCycle.countDocuments({ status: "In Progress" }),
    AuditCycle.countDocuments({ status: "Planned" }),
    AuditCycle.countDocuments({ status: "Completed" }),
  ]);

  return {
    available: true,
    activeAudits,
    plannedAudits,
    completedAudits,
  };
};

const getActiveAudits = async () => {
  const AuditCycle = getAuditCycleModelIfAvailable();
  if (!AuditCycle) return [];
  return AuditCycle.find({ status: { $in: ["Planned", "In Progress"] } })
    .sort({ startDate: 1 })
    .limit(10)
    .lean();
};

// Generate notifications for auditors assigned to active/planned audits.
const generateAuditNotifications = async () => {
  const AuditCycle = getAuditCycleModelIfAvailable();
  if (!AuditCycle) return 0;

  const now = new Date();
  const inOneDay = new Date(now.getTime() + 86400000);

  const cycles = await AuditCycle.find({ status: { $in: ["Planned", "In Progress"] } })
    .populate("assignedAuditors", "_id")
    .lean();
  if (!cycles.length) return 0;

  let created = 0;
  for (const cycle of cycles) {
    const recipients = (cycle.assignedAuditors || []).filter((a) =>
      mongoose.isValidObjectId(a._id || a)
    );
    if (!recipients.length) continue;

    const auditCode = cycle.auditCode || "audit";
    const auditName = cycle.auditName || "Audit cycle";

    // Assignment notice (deduplicated by cycle + recipient set is implicit via key).
    created += await notificationService.createForRecipients(recipients, {
      type: "Audit Assignment",
      priority: "Normal",
      title: "New audit assignment",
      message: `You have been assigned to the audit cycle ${auditCode}.`,
      relatedEntityType: "AuditCycle",
      relatedEntityId: cycle._id,
      actionUrl: `/audits/${cycle._id}`,
      deduplicationKey: `audit-assignment:${cycle._id}`,
      metadata: { auditCode, auditName },
    });

    // Deadline notice within one day.
    if (cycle.endDate && new Date(cycle.endDate) >= now && new Date(cycle.endDate) <= inOneDay) {
      created += await notificationService.createForRecipients(recipients, {
        type: "Audit Deadline",
        priority: "High",
        title: "Audit deadline approaching",
        message: `The audit cycle ${auditCode} ends soon.`,
        relatedEntityType: "AuditCycle",
        relatedEntityId: cycle._id,
        actionUrl: `/audits/${cycle._id}`,
        deduplicationKey: `audit-deadline:${cycle._id}:1d`,
        metadata: { auditCode, auditName },
      });
    }
  }

  return created;
};

module.exports = {
  isAuditModuleAvailable,
  getAuditDashboardSummary,
  getActiveAudits,
  generateAuditNotifications,
  getAuditCycleModelIfAvailable,
  getAuditItemModelIfAvailable,
};
