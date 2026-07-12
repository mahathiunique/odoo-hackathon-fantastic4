const categoryService = require("../services/categoryService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { auditLog, userIdFrom } = require("../services/organizationQuery");

const getCategories = asyncHandler(async (req, res) => {
  sendSuccess(res, "Asset categories retrieved successfully", await categoryService.list(req.query, req.user));
});
const getCategoryOptions = asyncHandler(async (req, res) => {
  sendSuccess(res, "Asset category options retrieved successfully", await categoryService.options());
});
const getCategoryById = asyncHandler(async (req, res) => {
  sendSuccess(res, "Asset category retrieved successfully", { category: await categoryService.getById(req.params.id, req.user) });
});
const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.create(req.body, req.user);
  auditLog("category.created", category._id, userIdFrom(req.user));
  sendSuccess(res, "Asset category created successfully", { category }, 201);
});
const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.update(req.params.id, req.body, req.user);
  auditLog("category.updated", category._id, userIdFrom(req.user));
  sendSuccess(res, "Asset category updated successfully", { category });
});
const changeCategoryStatus = asyncHandler(async (req, res) => {
  const category = await categoryService.changeStatus(req.params.id, req.body.status, req.user);
  auditLog("category.status_changed", category._id, userIdFrom(req.user));
  sendSuccess(res, `Asset category ${req.body.status.toLowerCase()} successfully`, { category });
});
const deactivateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.changeStatus(req.params.id, "Inactive", req.user);
  auditLog("category.status_changed", category._id, userIdFrom(req.user));
  sendSuccess(res, "Asset category deactivated successfully", { category });
});

module.exports = { getCategories, getCategoryOptions, getCategoryById, createCategory, updateCategory, changeCategoryStatus, deactivateCategory };
