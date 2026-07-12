// Stage 9 <-> Stage 6 integration adapter.
//
// Keeps the Maintenance module decoupled from the Asset module internals. Like
// the allocation adapter it looks the model up dynamically and records
// AssetHistory entries so maintenance activity appears in the asset's history.
const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

const unavailable = (name) => new ApiError(503, `${name} module is not available. Merge Stage 6 before using maintenance workflows.`);
const getModel = (name) => {
  try {
    return mongoose.model(name);
  } catch {
    throw unavailable(name === "Asset" ? "Asset" : "Asset history");
  }
};
const getAssetModel = () => getModel("Asset");
const getAssetHistoryModel = () => getModel("AssetHistory");

const getAssetById = async (assetId, session) => {
  const asset = await getAssetModel().findById(assetId).session(session || null);
  if (!asset) throw new ApiError(404, "Selected asset does not exist");
  return asset;
};

// Move an asset into "Under Maintenance". Only changes the status when it is not
// already under maintenance, so concurrent/maintenance-overlapping requests are safe.
// Returns the status the asset had before the change (or null when unchanged).
const markUnderMaintenance = async ({ assetId, performedBy, maintenanceId, session }) => {
  let previousStatus = null;
  const asset = await getAssetModel().findOneAndUpdate(
    { _id: assetId, lifecycleStatus: { $ne: "Under Maintenance" } },
    { $set: { lifecycleStatus: "Under Maintenance", updatedBy: performedBy } },
    { new: false, session, runValidators: true }
  );
  if (asset) {
    previousStatus = asset.lifecycleStatus;
    await recordHistory(
      {
        asset: assetId,
        previousStatus,
        newStatus: "Under Maintenance",
        action: "Maintenance Started",
        reason: "Asset placed under maintenance",
        changes: { lifecycleStatus: { from: previousStatus, to: "Under Maintenance" } },
        performedBy,
        metadata: { maintenanceId },
      },
      session
    );
  }
  return previousStatus;
};

// Restore an asset that was placed under maintenance back to its previous status.
const restoreAssetStatus = async ({ assetId, previousStatus, performedBy, maintenanceId, session }) => {
  if (!previousStatus) return null;
  const asset = await getAssetModel().findOneAndUpdate(
    { _id: assetId, lifecycleStatus: "Under Maintenance" },
    { $set: { lifecycleStatus: previousStatus, updatedBy: performedBy } },
    { new: true, session, runValidators: true }
  );
  if (asset) {
    await recordHistory(
      {
        asset: assetId,
        previousStatus: "Under Maintenance",
        newStatus: previousStatus,
        action: "Maintenance Restored",
        reason: "Asset returned from maintenance",
        changes: { lifecycleStatus: { from: "Under Maintenance", to: previousStatus } },
        performedBy,
        metadata: { maintenanceId },
      },
      session
    );
  }
  return asset;
};

const recordHistory = async (payload, session) =>
  (await getAssetHistoryModel().create([payload], { session }))[0];

module.exports = {
  getAssetModel,
  getAssetHistoryModel,
  getAssetById,
  markUnderMaintenance,
  restoreAssetStatus,
  recordHistory,
};
