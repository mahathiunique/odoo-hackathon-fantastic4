const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const userService = require("../services/userService");
const activityService = require("../services/activityService");

const getUsers = asyncHandler(async (req, res) => {
  const result = await userService.getUsers(req.query);
  return sendSuccess(res, "Users retrieved successfully", result, 200);
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  return sendSuccess(res, "User retrieved successfully", { user }, 200);
});

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user._id);
  activityService.recordActivityFromRequest(req, {
    action: "User Created",
    entityType: "User",
    entityId: user._id,
    description: `Created user ${user.email} with role ${user.role}`,
    metadata: { email: user.email, role: user.role },
  });
  return sendSuccess(res, "User created successfully", { user }, 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user);
  activityService.recordActivityFromRequest(req, {
    action: "User Updated",
    entityType: "User",
    entityId: user._id,
    description: `Updated user ${user.email}`,
    metadata: { email: user.email },
  });
  return sendSuccess(res, "User updated successfully", { user }, 200);
});

const changeUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.changeUserStatus(req.params.id, req.body.status, req.user);
  const action = req.body.status === "Active" ? "User Activated" : "User Deactivated";
  activityService.recordActivityFromRequest(req, {
    action,
    entityType: "User",
    entityId: user._id,
    description: `${action.replace("User ", "User ")}: ${user.email}`,
    metadata: { email: user.email, status: user.status },
  });
  return sendSuccess(res, "User status updated successfully", { user }, 200);
});

const resetUserPassword = asyncHandler(async (req, res) => {
  await userService.resetUserPassword(req.params.id, req.body.newPassword);
  activityService.recordActivityFromRequest(req, {
    action: "Password Reset",
    entityType: "User",
    entityId: req.params.id,
    description: "Reset password for a user account",
  });
  return sendSuccess(res, "Password reset successfully", {}, 200);
});

const deactivateUser = asyncHandler(async (req, res) => {
  const user = await userService.deactivateUser(req.params.id, req.user);
  activityService.recordActivityFromRequest(req, {
    action: "User Deactivated",
    entityType: "User",
    entityId: user._id,
    description: `Deactivated user ${user.email}`,
    metadata: { email: user.email },
  });
  return sendSuccess(res, "User deactivated successfully", { user }, 200);
});

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserStatus,
  resetUserPassword,
  deactivateUser,
};
