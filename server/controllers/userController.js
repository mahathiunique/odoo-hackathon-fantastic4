const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const userService = require("../services/userService");

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
  return sendSuccess(res, "User created successfully", { user }, 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user);
  return sendSuccess(res, "User updated successfully", { user }, 200);
});

const changeUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.changeUserStatus(req.params.id, req.body.status, req.user);
  return sendSuccess(res, "User status updated successfully", { user }, 200);
});

const resetUserPassword = asyncHandler(async (req, res) => {
  await userService.resetUserPassword(req.params.id, req.body.newPassword);
  return sendSuccess(res, "Password reset successfully", {}, 200);
});

const deactivateUser = asyncHandler(async (req, res) => {
  const user = await userService.deactivateUser(req.params.id, req.user);
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
