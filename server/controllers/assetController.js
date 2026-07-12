const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const assetService = require("../services/assetService");
const activityService = require("../services/activityService");

const getAssets = asyncHandler(async (req, res) => {
  sendSuccess(res, "Assets retrieved successfully", await assetService.list(req.query));
});

const getAssetOptions = asyncHandler(async (req, res) => {
  sendSuccess(res, "Asset options retrieved successfully", await assetService.options(req.query));
});

const getAssetStats = asyncHandler(async (req, res) => {
  sendSuccess(res, "Asset statistics retrieved successfully", await assetService.stats());
});

const getAssetById = asyncHandler(async (req, res) => {
  sendSuccess(res, "Asset retrieved successfully", { asset: await assetService.getById(req.params.id) });
});

const getAssetHistory = asyncHandler(async (req, res) => {
  sendSuccess(res, "Asset history retrieved successfully", await assetService.getHistory(req.params.id, req.query));
});

const createAsset = asyncHandler(async (req, res) => {
  const asset = await assetService.create(req.body, req.user);
  activityService.recordActivityFromRequest(req, { action: "Asset Created", entityType: "Asset", entityId: asset._id, description: `Created asset ${asset.name} (${asset.assetTag})`, metadata: { assetTag: asset.assetTag, category: asset.category } });
  sendSuccess(res, "Asset created successfully", { asset }, 201);
});

const updateAsset = asyncHandler(async (req, res) => {
  const asset = await assetService.update(req.params.id, req.body, req.user);
  activityService.recordActivityFromRequest(req, { action: "Asset Updated", entityType: "Asset", entityId: asset._id, description: `Updated asset ${asset.name} (${asset.assetTag})`, metadata: { assetTag: asset.assetTag } });
  sendSuccess(res, "Asset updated successfully", { asset });
});

const changeAssetStatus = asyncHandler(async (req, res) => {
  const asset = await assetService.changeStatus(req.params.id, req.body, req.user);
  activityService.recordActivityFromRequest(req, { action: "Asset Status Changed", entityType: "Asset", entityId: asset._id, description: `Asset ${asset.name} lifecycle changed to ${asset.lifecycleStatus}`, metadata: { lifecycleStatus: asset.lifecycleStatus } });
  sendSuccess(res, "Asset status updated successfully", { asset });
});

const changeAssetCondition = asyncHandler(async (req, res) => {
  const asset = await assetService.changeCondition(req.params.id, req.body, req.user);
  activityService.recordActivityFromRequest(req, { action: "Asset Condition Changed", entityType: "Asset", entityId: asset._id, description: `Asset ${asset.name} condition changed to ${asset.condition}`, metadata: { condition: asset.condition } });
  sendSuccess(res, "Asset condition updated successfully", { asset });
});

const retireAsset = asyncHandler(async (req, res) => {
  const asset = await assetService.retireAsset(req.params.id, req.body.reason, req.user);
  activityService.recordActivityFromRequest(req, { action: "Asset Retired", entityType: "Asset", entityId: asset._id, description: `Retired asset ${asset.name} (${asset.assetTag})`, metadata: { assetTag: asset.assetTag } });
  sendSuccess(res, "Asset retired successfully", { asset });
});

module.exports = {
  getAssets,
  getAssetOptions,
  getAssetStats,
  getAssetById,
  getAssetHistory,
  createAsset,
  updateAsset,
  changeAssetStatus,
  changeAssetCondition,
  retireAsset,
};
