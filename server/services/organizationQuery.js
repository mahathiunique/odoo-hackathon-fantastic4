const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const positiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};
const paginationFrom = (query) => ({
  page: positiveInteger(query.page, 1),
  limit: positiveInteger(query.limit, 10, 100),
});
const sortFrom = (query, allowed) => {
  const sortBy = allowed.includes(query.sortBy) ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;
  return { [sortBy]: sortOrder };
};
const assertObjectId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label} ID`);
};
const userIdFrom = (user) => user?._id || user?.id;
const roleFrom = (user) => user?.role?.name || user?.role;
const canViewInactive = (user) => ["Admin", "Asset Manager"].includes(roleFrom(user));
const auditLog = (action, recordId, userId) => {
  console.info(JSON.stringify({ scope: "organization", action, recordId: String(recordId), actingUserId: String(userId), timestamp: new Date().toISOString() }));
};

module.exports = { escapeRegex, paginationFrom, sortFrom, assertObjectId, userIdFrom, roleFrom, canViewInactive, auditLog };
