const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const ApiError = require("../utils/ApiError");
const ActivityLog = require("../models/ActivityLog");
const { userIdFrom } = require("../services/organizationQuery");

const ALLOWED_SORT = ["createdAt", "updatedAt", "action"];

// GET /api/activity — list activity logs (read-only, Admin/Manager/Auditor).
const listActivity = asyncHandler(async (req, res) => {
  const q = req.query || {};
  const page = Math.max(1, Number.parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(q.limit, 10) || 20));

  const filter = {};
  if (q.action) filter.action = q.action;
  if (q.entityType) filter.entityType = q.entityType;
  if (q.userId && mongoose.isValidObjectId(q.userId)) filter.user = q.userId;
  if (q.fromDate || q.toDate) {
    filter.createdAt = {};
    if (q.fromDate) filter.createdAt.$gte = new Date(q.fromDate);
    if (q.toDate) filter.createdAt.$lte = new Date(q.toDate);
  }

  const sortBy = ALLOWED_SORT.includes(q.sortBy) ? q.sortBy : "createdAt";
  const order = q.sortOrder === "asc" ? 1 : -1;

  const [activities, totalRecords] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email role")
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  return sendSuccess(res, "Activity logs retrieved successfully", {
    activities,
    pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) },
  });
});

// GET /api/activity/:id — single activity record (read-only).
const getActivityById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid activity ID");
  const activity = await ActivityLog.findById(req.params.id)
    .populate("user", "name email role")
    .lean();
  if (!activity) throw new ApiError(404, "Activity record not found");
  return sendSuccess(res, "Activity log retrieved successfully", { activity });
});

module.exports = { listActivity, getActivityById };
