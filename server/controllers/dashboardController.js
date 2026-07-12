const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const dashboardService = require("../services/dashboardService");
const generationService = require("../services/notificationGenerationService");

// GET /api/dashboard — real, role-aware dashboard data.
// Runs a lightweight notification refresh first (safe + deduplicated).
const getDashboardOverview = asyncHandler(async (req, res) => {
  await generationService.refreshOperationalLightweight();
  const overview = await dashboardService.getDashboardOverview(req.user);
  return sendSuccess(res, "Dashboard data retrieved successfully", overview);
});

module.exports = { getDashboardOverview };
