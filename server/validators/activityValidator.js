const { add, failIfInvalid } = require("./validationHelpers");
const mongoose = require("mongoose");

// Validates query params for GET /api/activity.
const validateActivityQuery = (req, res, next) => {
  try {
    const q = req.query || {};
    const errors = [];

    if (q.page !== undefined && (Number.isNaN(Number(q.page)) || Number(q.page) < 1))
      add(errors, "page", "Page must be a positive number");
    if (q.limit !== undefined && (Number.isNaN(Number(q.limit)) || Number(q.limit) < 1 || Number(q.limit) > 100))
      add(errors, "limit", "Limit must be between 1 and 100");
    if (q.action !== undefined && (typeof q.action !== "string" || !q.action.trim()))
      add(errors, "action", "Action must be a non-empty string");
    if (q.entityType !== undefined && (typeof q.entityType !== "string" || !q.entityType.trim()))
      add(errors, "entityType", "entityType must be a non-empty string");
    if (q.userId !== undefined && !mongoose.isValidObjectId(q.userId))
      add(errors, "userId", "Invalid user ID");
    if (q.fromDate !== undefined && Number.isNaN(new Date(q.fromDate).getTime()))
      add(errors, "fromDate", "fromDate must be a valid date");
    if (q.toDate !== undefined && Number.isNaN(new Date(q.toDate).getTime()))
      add(errors, "toDate", "toDate must be a valid date");
    if (q.sortBy !== undefined && !["createdAt", "updatedAt", "action"].includes(q.sortBy))
      add(errors, "sortBy", "Unsupported sort field");
    if (q.sortOrder !== undefined && !["asc", "desc"].includes(q.sortOrder))
      add(errors, "sortOrder", "sortOrder must be asc or desc");

    failIfInvalid(errors);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validateActivityQuery };
