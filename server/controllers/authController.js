const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, sendError } = require("../utils/response");
const authService = require("../services/authService");
const activityService = require("../services/activityService");

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);
  activityService.recordActivityFromRequest(req, {
    action: "User Login",
    entityType: "User",
    entityId: result.user._id,
    description: `User ${result.user.email} logged in`,
    metadata: { email: result.user.email, role: result.user.role },
  });
  return sendSuccess(res, "Login successful", {
    token: result.token,
    user: result.user,
  }, 200);
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);
  return sendSuccess(res, "User profile retrieved successfully", { user }, 200);
});

const logout = asyncHandler(async (req, res) => {
  return sendSuccess(res, "Logout successful", {}, 200);
});

module.exports = {
  login,
  getCurrentUser,
  logout,
};
