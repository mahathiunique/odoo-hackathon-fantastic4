const mongoose = require("mongoose");
const AssetAllocation = require("../models/AssetAllocation");
const ResourceBooking = require("../models/ResourceBooking");
const notificationService = require("./notificationService");

// Configurable thresholds (hours/days). Day math uses whole-day offsets.
const UPCOMING_RETURN_DAYS = Number(process.env.UPCOMING_RETURN_DAYS || 3);
const BOOKING_REMINDER_HOURS = Number(process.env.BOOKING_REMINDER_HOURS || 2);

const startOfDayKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const loadAllocationContext = async (allocations) => {
  await AssetAllocation.populate(allocations, {
    path: "asset",
    select: "name assetTag",
  });
  await AssetAllocation.populate(allocations, {
    path: "employee",
    select: "name employeeId userAccount",
    populate: { path: "userAccount", select: "_id" },
  });
  return allocations;
};

const recipientsForAllocation = (allocation, adminManagers) => {
  const recipients = [...adminManagers];
  const employee = allocation.employee;
  const userAccount = employee?.userAccount;
  if (
    allocation.allocatedToType === "Employee" &&
    userAccount &&
    mongoose.isValidObjectId(userAccount._id || userAccount)
  ) {
    recipients.push(userAccount._id || userAccount);
  }
  return recipients;
};

const assetLabel = (allocation) => {
  const asset = allocation.asset;
  if (asset && asset.name) return asset.name;
  return "the allocated asset";
};

const generateOverdueAllocationNotifications = async () => {
  const adminManagers = await notificationService.getAdminManagerUsers();
  if (!adminManagers.length) return 0;

  try {
    await require("./allocationService").refreshOverdueAllocations();
  } catch {
    // best-effort refresh
  }

  const now = new Date();
  const overdue = await AssetAllocation.find({
    isOpen: true,
    status: "Overdue",
    expectedReturnDate: { $lt: now },
  }).lean();
  if (!overdue.length) return 0;

  await loadAllocationContext(overdue);
  let created = 0;
  for (const allocation of overdue) {
    const recipients = recipientsForAllocation(allocation, adminManagers);
    const due = allocation.expectedReturnDate
      ? new Date(allocation.expectedReturnDate).toLocaleDateString()
      : "the scheduled date";
    created += await notificationService.createForRecipients(recipients, {
      type: "Overdue Allocation",
      priority: "High",
      title: "Asset return overdue",
      message: `${assetLabel(allocation)} was due for return on ${due}.`,
      relatedEntityType: "Allocation",
      relatedEntityId: allocation._id,
      actionUrl: `/allocations/${allocation._id}`,
      deduplicationKey: `overdue-allocation:${allocation._id}`,
      metadata: {
        assetName: assetLabel(allocation),
        assetTag: allocation.asset?.assetTag || null,
        expectedReturnDate: allocation.expectedReturnDate,
      },
    });
  }
  return created;
};

const generateUpcomingReturnNotifications = async () => {
  const adminManagers = await notificationService.getAdminManagerUsers();
  if (!adminManagers.length) return 0;

  const now = new Date();
  const horizon = new Date(now.getTime() + UPCOMING_RETURN_DAYS * 86400000);
  const upcoming = await AssetAllocation.find({
    isOpen: true,
    status: { $in: ["Active", "Overdue"] },
    expectedReturnDate: { $gte: now, $lte: horizon },
  }).lean();
  if (!upcoming.length) return 0;

  await loadAllocationContext(upcoming);
  let created = 0;
  for (const allocation of upcoming) {
    const recipients = recipientsForAllocation(allocation, adminManagers);
    const due = allocation.expectedReturnDate
      ? new Date(allocation.expectedReturnDate).toLocaleDateString()
      : "soon";
    const dateKey = startOfDayKey(allocation.expectedReturnDate);
    created += await notificationService.createForRecipients(recipients, {
      type: "Upcoming Return",
      priority: "Normal",
      title: "Asset return due soon",
      message: `${assetLabel(allocation)} is due for return on ${due}.`,
      relatedEntityType: "Allocation",
      relatedEntityId: allocation._id,
      actionUrl: `/allocations/${allocation._id}`,
      deduplicationKey: `upcoming-return:${allocation._id}:${dateKey}`,
      metadata: {
        assetName: assetLabel(allocation),
        assetTag: allocation.asset?.assetTag || null,
        expectedReturnDate: allocation.expectedReturnDate,
      },
    });
  }
  return created;
};

const generateBookingReminderNotifications = async () => {
  const now = new Date();
  const horizon = new Date(now.getTime() + BOOKING_REMINDER_HOURS * 3600000);
  const bookings = await ResourceBooking.find({
    status: { $in: ["Pending", "Confirmed"] },
    startTime: { $gte: now, $lte: horizon },
  })
    .populate("resource", "name resourceCode")
    .lean();
  if (!bookings.length) return 0;

  let created = 0;
  for (const booking of bookings) {
    const resourceLabel =
      booking.resource?.name || booking.resource?.resourceCode || "your resource";
    created += await notificationService.createForRecipients([booking.bookedBy], {
      type: "Booking Reminder",
      priority: "Normal",
      title: "Upcoming resource booking",
      message: `Your booking for ${resourceLabel} starts at ${new Date(
        booking.startTime
      ).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`,
      relatedEntityType: "Booking",
      relatedEntityId: booking._id,
      actionUrl: `/bookings/${booking._id}`,
      deduplicationKey: `booking-reminder:${booking._id}:${BOOKING_REMINDER_HOURS}h`,
      metadata: {
        resourceName: resourceLabel,
        bookingStartTime: booking.startTime,
      },
    });
  }
  return created;
};

const generateMaintenanceNotificationsIfAvailable = async () => {
  try {
    const maintenance = require("../integrations/maintenanceNotificationAdapter");
    if (!maintenance.isMaintenanceModuleAvailable()) return 0;
    return await maintenance.generateMaintenanceNotifications();
  } catch (error) {
    console.warn(`[notifications] maintenance generation skipped: ${error.message}`);
    return 0;
  }
};

const generateAuditNotificationsIfAvailable = async () => {
  try {
    const audit = require("../integrations/auditNotificationAdapter");
    if (!audit.isAuditModuleAvailable()) return 0;
    return await audit.generateAuditNotifications();
  } catch (error) {
    console.warn(`[notifications] audit generation skipped: ${error.message}`);
    return 0;
  }
};

// Lightweight, per-request refresh used before returning notifications or the
// dashboard. Only runs the date-bounded operational generators (no Maintenance
// / Audit adapter scans) so page loads stay cheap. Deduplication keys prevent
// duplicate creation on repeated calls.
const refreshOperationalLightweight = async () => {
  const results = await Promise.all([
    generateOverdueAllocationNotifications(),
    generateUpcomingReturnNotifications(),
    generateBookingReminderNotifications(),
  ]);
  return results.reduce((sum, n) => sum + (Number(n) || 0), 0);
};

// Full organization-wide refresh including optional Maintenance / Audit
// adapters. Used by the explicit refresh endpoint.
const refreshOperationalNotifications = async () => {
  const results = await Promise.all([
    generateOverdueAllocationNotifications(),
    generateUpcomingReturnNotifications(),
    generateBookingReminderNotifications(),
    generateMaintenanceNotificationsIfAvailable(),
    generateAuditNotificationsIfAvailable(),
  ]);
  return results.reduce((sum, n) => sum + (Number(n) || 0), 0);
};

// Convenience used by the per-user refresh endpoint. Reuses the same
// organization-wide generators because deduplication keys are per-recipient.
const refreshNotificationsForUser = async () => {
  return refreshOperationalNotifications();
};

module.exports = {
  UPCOMING_RETURN_DAYS,
  BOOKING_REMINDER_HOURS,
  refreshNotificationsForUser,
  refreshOperationalNotifications,
  refreshOperationalLightweight,
  generateOverdueAllocationNotifications,
  generateUpcomingReturnNotifications,
  generateBookingReminderNotifications,
  generateMaintenanceNotificationsIfAvailable,
  generateAuditNotificationsIfAvailable,
};
