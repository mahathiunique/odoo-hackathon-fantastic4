const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User");

const ALLOWED_SORT = ["createdAt", "updatedAt", "priority", "type", "title"];
const PRIORITY_ORDER = { Critical: 0, High: 1, Normal: 2, Low: 3 };

const pageValues = (query) => ({
  page: Math.max(1, Number.parseInt(query.page, 10) || 1),
  limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)),
});

const assertId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const ApiError = require("../utils/ApiError");
    throw new ApiError(400, "Invalid notification ID");
  }
};

// Duplicate-safe creation. System-generated notifications carry a
// deduplicationKey; the partial unique index guarantees at most one per
// recipient + event. A duplicate-key error is swallowed (returns null).
const createNotification = async (data) => {
  try {
    return await Notification.create({
      recipient: data.recipient,
      title: data.title,
      message: data.message,
      type: data.type || "System",
      priority: data.priority || "Normal",
      relatedEntityType: data.relatedEntityType || "System",
      relatedEntityId: data.relatedEntityId || null,
      actionUrl: data.actionUrl || null,
      deduplicationKey: data.deduplicationKey || null,
      metadata: data.metadata || {},
    });
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
};

// Create one notification per recipient. Filters out invalid/duplicate users.
const createForRecipients = async (recipients, base) => {
  const ids = new Set();
  const unique = [];
  for (const recipient of recipients) {
    const id = recipient?._id || recipient;
    if (!mongoose.isValidObjectId(id)) continue;
    const str = String(id);
    if (ids.has(str)) continue;
    ids.add(str);
    unique.push(id);
  }
  const created = [];
  for (const id of unique) {
    const doc = await createNotification({ ...base, recipient: id });
    if (doc) created.push(doc);
  }
  return created.length;
};

const getAdminManagerUsers = async () => {
  return User.find({ role: { $in: ["Admin", "Asset Manager"] }, status: "Active" })
    .select("_id")
    .lean();
};

const listNotifications = async (query = {}, user) => {
  const { page, limit } = pageValues(query);
  const filter = { recipient: user._id };

  if (query.isRead === "true" || query.isRead === true) filter.isRead = true;
  if (query.isRead === "false" || query.isRead === false) filter.isRead = false;
  if (query.type) filter.type = query.type;
  if (query.priority) filter.priority = query.priority;

  const sortBy = ALLOWED_SORT.includes(query.sortBy) ? query.sortBy : "createdAt";
  const order = query.sortOrder === "asc" ? 1 : -1;
  const sort = {};
  if (sortBy === "priority") {
    // Secondary sort by createdAt for stable ordering within a priority.
    sort.priority = order;
    sort.createdAt = -1;
  } else {
    sort[sortBy] = order;
  }

  const [notifications, totalRecords, unreadCount] = await Promise.all([
    Notification.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: user._id, isRead: false }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) },
  };
};

const getUnreadCount = async (user) => {
  return Notification.countDocuments({ recipient: user._id, isRead: false });
};

const markAsRead = async (id, user) => {
  assertId(id);
  const notification = await Notification.findOne({ _id: id, recipient: user._id });
  if (!notification) {
    const ApiError = require("../utils/ApiError");
    throw new ApiError(404, "Notification not found");
  }
  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }
  return notification;
};

const markAllAsRead = async (user) => {
  const result = await Notification.updateMany(
    { recipient: user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return result.modifiedCount || 0;
};

const getIntegrationsStatus = async () => {
  const maintenance = require("../integrations/maintenanceNotificationAdapter");
  const audit = require("../integrations/auditNotificationAdapter");
  return {
    maintenance: maintenance.isMaintenanceModuleAvailable(),
    audit: audit.isAuditModuleAvailable(),
  };
};

module.exports = {
  createNotification,
  createForRecipients,
  getAdminManagerUsers,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getIntegrationsStatus,
  PRIORITY_ORDER,
};
