const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const notificationService = require("../services/notificationService");
const generationService = require("../services/notificationGenerationService");
const activityService = require("../services/activityService");

// GET /api/notifications — list the current user's notifications.
// Runs a lightweight, per-request refresh first (date-bounded + deduplicated).
const getNotifications = asyncHandler(async (req, res) => {
  await generationService.refreshOperationalLightweight();
  const data = await notificationService.listNotifications(req.query, req.user);
  const integrations = await notificationService.getIntegrationsStatus();
  return sendSuccess(res, "Notifications retrieved successfully", {
    ...data,
    integrations,
  });
});

// GET /api/notifications/unread-count
const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await notificationService.getUnreadCount(req.user);
  return sendSuccess(res, "Unread notification count retrieved successfully", {
    unreadCount,
  });
});

// POST /api/notifications/refresh — full operational refresh for the user.
const refreshNotifications = asyncHandler(async (req, res) => {
  const created = await generationService.refreshOperationalNotifications();
  const unreadCount = await notificationService.getUnreadCount(req.user);
  return sendSuccess(res, "Notifications refreshed successfully", {
    createdCount: created,
    unreadCount,
  });
});

// PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user);
  return sendSuccess(res, "Notification marked as read", { notification });
});

// PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  const updatedCount = await notificationService.markAllAsRead(req.user);
  await activityService.recordActivityFromRequest(req, {
    action: "Notifications Marked Read",
    entityType: "Notification",
    description: `Marked ${updatedCount} notification(s) as read`,
    metadata: { updatedCount },
  });
  return sendSuccess(res, "All notifications marked as read", { updatedCount });
});

module.exports = {
  getNotifications,
  getUnreadCount,
  refreshNotifications,
  markRead,
  markAllRead,
};
