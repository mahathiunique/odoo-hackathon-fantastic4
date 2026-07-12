const service = require("../services/allocationService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const activityService = require("../services/activityService");

const getAllocations = asyncHandler(async (req, res) => sendSuccess(res, "Allocations retrieved successfully", await service.list(req.query)));
const getMyAllocations = asyncHandler(async (req, res) => sendSuccess(res, "My allocations retrieved successfully", await service.listMine(req.query, req.user)));
const getOverdueAllocations = asyncHandler(async (req, res) => sendSuccess(res, "Overdue allocations retrieved successfully", await service.listOverdue(req.query)));
const getAllocationStats = asyncHandler(async (req, res) => sendSuccess(res, "Allocation statistics retrieved successfully", { stats: await service.stats() }));
const getAllocationById = asyncHandler(async (req, res) => sendSuccess(res, "Allocation retrieved successfully", { allocation: await service.getById(req.params.id, req.user) }));
const createAllocation = asyncHandler(async (req, res) => {
  const allocation = await service.create(req.body, req.user);
  activityService.recordActivityFromRequest(req, { action: "Asset Allocated", entityType: "AssetAllocation", entityId: allocation._id, description: `Allocated asset ${allocation.asset?.assetTag || ""} to ${allocation.employee?.name || allocation.department?.name || "department"}`, metadata: { assetTag: allocation.asset?.assetTag, allocatedToType: allocation.allocatedToType } });
  sendSuccess(res, "Asset allocated successfully", { allocation: allocation }, 201);
});
const returnAllocation = asyncHandler(async (req, res) => {
  const result = await service.returnAsset(req.params.id, req.body, req.user);
  activityService.recordActivityFromRequest(req, { action: "Asset Returned", entityType: "AssetAllocation", entityId: result.allocation._id, description: `Returned asset ${result.allocation.asset?.assetTag || ""}`, metadata: { assetTag: result.allocation.asset?.assetTag, returnCondition: result.allocation.returnCondition } });
  sendSuccess(res, "Asset returned successfully", result);
});

module.exports = { getAllocations, getMyAllocations, getOverdueAllocations, getAllocationStats, getAllocationById, createAllocation, returnAllocation };
