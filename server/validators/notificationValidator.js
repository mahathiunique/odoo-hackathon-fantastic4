const { text, add, failIfInvalid } = require("./validationHelpers");
const Notification = require("../models/Notification");

// Validates query params for GET /api/notifications.
const validateNotificationQuery = (req, res, next) => {
  try {
    const q = req.query || {};
    const errors = [];

    if (q.page !== undefined && (Number.isNaN(Number(q.page)) || Number(q.page) < 1))
      add(errors, "page", "Page must be a positive number");
    if (q.limit !== undefined && (Number.isNaN(Number(q.limit)) || Number(q.limit) < 1 || Number(q.limit) > 100))
      add(errors, "limit", "Limit must be between 1 and 100");
    if (q.isRead !== undefined && !["true", "false"].includes(q.isRead))
      add(errors, "isRead", "isRead must be true or false");
    if (q.type !== undefined && !Notification.NOTIFICATION_TYPES.includes(q.type))
      add(errors, "type", "Unsupported notification type");
    if (q.priority !== undefined && !Notification.NOTIFICATION_PRIORITIES.includes(q.priority))
      add(errors, "priority", "Unsupported priority");
    if (q.sortBy !== undefined && !["createdAt", "updatedAt", "priority", "type", "title"].includes(q.sortBy))
      add(errors, "sortBy", "Unsupported sort field");
    if (q.sortOrder !== undefined && !["asc", "desc"].includes(q.sortOrder))
      add(errors, "sortOrder", "sortOrder must be asc or desc");

    failIfInvalid(errors);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validateNotificationQuery };
