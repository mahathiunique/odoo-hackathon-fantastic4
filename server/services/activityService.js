const mongoose = require("mongoose");
const ActivityLog = require("../models/ActivityLog");
const { userIdFrom } = require("./organizationQuery");

const MAX_RECENT_FAILS = 5;
let recentFailureCount = 0;

// Persist a single activity log entry. Activity logging must never break the
// primary business operation: failures are logged safely and swallowed.
const recordActivity = async (data = {}) => {
  try {
    const {
      user = null,
      action,
      entityType = "System",
      entityId = null,
      description,
      metadata = {},
    } = data;

    if (!action || !description) {
      console.warn("[activity] Skipped: action and description are required");
      return null;
    }

    const entry = await ActivityLog.create({
      user: user ? userIdFrom(user) : null,
      action: String(action),
      entityType: String(entityType),
      entityId: entityId || null,
      description: String(description),
      metadata,
    });

    recentFailureCount = 0;
    return entry;
  } catch (error) {
    recentFailureCount += 1;
    if (recentFailureCount >= MAX_RECENT_FAILS) {
      console.error(
        `[activity] Repeated failures (${recentFailureCount}) recording activity logs: ${error.message}`
      );
      recentFailureCount = 0;
    } else {
      console.warn(`[activity] Failed to record activity: ${error.message}`);
    }
    return null;
  }
};

// Builds request-derived context (ip, userAgent, method, path) then persists.
const recordActivityFromRequest = async (req, data = {}) => {
  if (!req) return recordActivity(data);

  const ipAddress = req.ip || req.socket?.remoteAddress || null;
  const rawAgent = req.headers?.["user-agent"];
  const userAgent = rawAgent ? rawAgent.slice(0, 500) : null;

  return recordActivity({
    ...data,
    user: data.user || req.user || null,
    ipAddress,
    userAgent,
    requestMethod: req.method,
    requestPath: req.originalUrl || req.url,
  });
};

module.exports = {
  recordActivity,
  recordActivityFromRequest,
  sanitizeActivityMetadata: ActivityLog.sanitizeActivityMetadata,
};
