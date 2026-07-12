const service = require("../services/allocationService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getAllocations = asyncHandler(async (req, res) => sendSuccess(res, "Allocations retrieved successfully", await service.list(req.query)));
const getMyAllocations = asyncHandler(async (req, res) => sendSuccess(res, "My allocations retrieved successfully", await service.listMine(req.query, req.user)));
const getOverdueAllocations = asyncHandler(async (req, res) => sendSuccess(res, "Overdue allocations retrieved successfully", await service.listOverdue(req.query)));
const getAllocationStats = asyncHandler(async (req, res) => sendSuccess(res, "Allocation statistics retrieved successfully", { stats: await service.stats() }));
const getAllocationById = asyncHandler(async (req, res) => sendSuccess(res, "Allocation retrieved successfully", { allocation: await service.getById(req.params.id, req.user) }));
const createAllocation = asyncHandler(async (req, res) => sendSuccess(res, "Asset allocated successfully", { allocation: await service.create(req.body, req.user) }, 201));
const returnAllocation = asyncHandler(async (req, res) => sendSuccess(res, "Asset returned successfully", await service.returnAsset(req.params.id, req.body, req.user)));

module.exports = { getAllocations, getMyAllocations, getOverdueAllocations, getAllocationStats, getAllocationById, createAllocation, returnAllocation };
