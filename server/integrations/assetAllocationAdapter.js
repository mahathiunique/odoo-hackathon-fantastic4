const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

const unavailable = (name) => new ApiError(503, `${name} module is not available. Merge Stage 6 before using asset allocations.`);
const getModel = (name) => { try { return mongoose.model(name); } catch { throw unavailable(name === "Asset" ? "Asset" : "Asset history"); } };
const getAssetModel = () => getModel("Asset");
const getAssetHistoryModel = () => getModel("AssetHistory");

const getAssetById = async (assetId, session) => {
  const asset = await getAssetModel().findById(assetId).session(session || null);
  if (!asset) throw new ApiError(404, "Selected asset does not exist");
  return asset;
};
const validateAssetAvailable = async (assetId, session) => {
  const asset = await getAssetById(assetId, session);
  if (asset.lifecycleStatus !== "Available") throw new ApiError(400, "The selected asset is not available for allocation");
  if (asset.assignedToEmployee || asset.assignedToDepartment || asset.expectedReturnDate) throw new ApiError(400, "The selected asset still contains assignment information");
  return asset;
};
const markAssetAllocated = async (data, session) => {
  const asset = await getAssetModel().findOneAndUpdate(
    { _id: data.assetId, lifecycleStatus: "Available" },
    { $set: { lifecycleStatus: "Allocated", assignedToEmployee: data.employee || null, assignedToDepartment: data.department || null, expectedReturnDate: data.expectedReturnDate, updatedBy: data.updatedBy } },
    { new: true, session, runValidators: true }
  );
  if (!asset) throw new ApiError(409, "The asset is no longer available for allocation");
  return asset;
};
const markAssetReturned = async (data, session) => {
  const asset = await getAssetModel().findOneAndUpdate(
    { _id: data.assetId, lifecycleStatus: "Allocated" },
    { $set: { lifecycleStatus: "Available", assignedToEmployee: null, assignedToDepartment: null, expectedReturnDate: null, updatedBy: data.returnedBy } },
    { new: true, session, runValidators: true }
  );
  if (!asset) throw new ApiError(409, "The asset is no longer marked as allocated");
  return asset;
};
const createHistory = async (payload, session) => (await getAssetHistoryModel().create([payload], { session }))[0];
const recordAllocationHistory = (data, session) => createHistory({ asset: data.assetId, previousStatus: "Available", newStatus: "Allocated", action: "Asset Allocated", reason: data.purpose, changes: { assignedToEmployee: { from: null, to: data.employee || null }, assignedToDepartment: { from: null, to: data.department || null }, expectedReturnDate: { from: null, to: data.expectedReturnDate } }, performedBy: data.allocatedBy, metadata: { allocationId: data.allocationId } }, session);
const recordReturnHistory = (data, session) => createHistory({ asset: data.assetId, previousStatus: "Allocated", newStatus: "Available", action: "Asset Returned", reason: data.returnNotes || "Asset returned", changes: { returnCondition: { to: data.returnCondition }, actualReturnDate: { to: data.actualReturnDate } }, performedBy: data.returnedBy, metadata: { allocationId: data.allocationId } }, session);

module.exports = { getAssetModel, getAssetHistoryModel, getAssetById, validateAssetAvailable, markAssetAllocated, markAssetReturned, recordAllocationHistory, recordReturnHistory };
