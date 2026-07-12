// Stage 8 <-> Stage 6 integration adapter.
//
// This module keeps the Resource/Booking modules completely decoupled from the
// Asset module (Stage 6), which is developed on a separate branch and may not be
// present. It NEVER does `require("../models/Asset")`. Instead it looks the model
// up dynamically at call time. When Stage 6 is not merged yet, every function
// degrades gracefully instead of throwing a Mongoose MissingSchemaError.
const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

// Asset lifecycle statuses that are expected once Stage 6 is merged.
const NON_LINKABLE_LIFECYCLE = ["Lost", "Retired", "Disposed"];
const NON_BOOKABLE_LIFECYCLE = ["Under Maintenance", "Lost", "Retired", "Disposed"];

const getAssetModelIfAvailable = () => {
  try {
    return mongoose.model("Asset");
  } catch {
    return null;
  }
};

const isAssetModuleAvailable = () => getAssetModelIfAvailable() !== null;

// Thrown when a caller supplies a linkedAsset while Stage 6 is unavailable.
const integrationUnavailableError = () =>
  new ApiError(
    503,
    "Asset integration is not available. Merge Stage 6 before linking resources to assets."
  );

const isValidAssetId = (assetId) => mongoose.isValidObjectId(assetId);

/**
 * Validate that an asset may be LINKED to a resource.
 * Returns a lightweight summary of the asset when valid.
 * - 503 when the Asset module is not available.
 * - 404 when the asset does not exist.
 * - 400 when the asset is not configured as a shared resource, or has a
 *   non-linkable lifecycle status.
 */
const validateLinkedAsset = async (assetId) => {
  const Asset = getAssetModelIfAvailable();
  if (!Asset) {
    throw integrationUnavailableError();
  }
  if (!isValidAssetId(assetId)) {
    throw new ApiError(400, "Invalid linked asset ID", [
      { field: "linkedAsset", message: "Invalid linked asset ID" },
    ]);
  }

  const asset = await Asset.findById(assetId).lean();
  if (!asset) {
    throw new ApiError(404, "The selected asset does not exist", [
      { field: "linkedAsset", message: "The selected asset does not exist" },
    ]);
  }

  if (asset.isSharedResource !== true) {
    throw new ApiError(400, "The selected asset is not configured as a shared resource", [
      { field: "linkedAsset", message: "The selected asset is not configured as a shared resource" },
    ]);
  }

  if (NON_LINKABLE_LIFECYCLE.includes(asset.lifecycleStatus)) {
    throw new ApiError(
      400,
      `A ${String(asset.lifecycleStatus).toLowerCase()} asset cannot be linked to a resource`,
      [
        {
          field: "linkedAsset",
          message: `A ${String(asset.lifecycleStatus).toLowerCase()} asset cannot be linked to a resource`,
        },
      ]
    );
  }

  return summarize(asset);
};

/**
 * Return a safe summary of a linked asset, or null when the module is missing
 * or the asset cannot be found. Never throws — used for read/display paths.
 */
const getLinkedAssetSummary = async (assetId) => {
  const Asset = getAssetModelIfAvailable();
  if (!Asset || !assetId || !isValidAssetId(assetId)) {
    return null;
  }
  try {
    const asset = await Asset.findById(assetId).lean();
    return asset ? summarize(asset) : null;
  } catch {
    return null;
  }
};

/**
 * Validate that a linked asset is bookable at booking time.
 * When the Asset module is unavailable OR the resource has no linked asset,
 * this resolves to { bookable: true } so standalone resources keep working.
 */
const validateLinkedAssetBookable = async (assetId) => {
  if (!assetId) {
    return { bookable: true, reason: null };
  }
  const Asset = getAssetModelIfAvailable();
  if (!Asset) {
    // Stage 6 not merged: the linked asset reference is dormant, so a standalone
    // resource should still be bookable. Do not block bookings.
    return { bookable: true, reason: null };
  }
  if (!isValidAssetId(assetId)) {
    return { bookable: true, reason: null };
  }

  const asset = await Asset.findById(assetId).lean();
  if (!asset) {
    return { bookable: true, reason: null };
  }

  if (NON_BOOKABLE_LIFECYCLE.includes(asset.lifecycleStatus)) {
    return {
      bookable: false,
      reason: `The linked asset is currently ${String(asset.lifecycleStatus).toLowerCase()} and cannot be booked`,
    };
  }

  return { bookable: true, reason: null };
};

const summarize = (asset) => ({
  _id: asset._id,
  assetTag: asset.assetTag,
  name: asset.name,
  category: asset.category,
  condition: asset.condition,
  lifecycleStatus: asset.lifecycleStatus,
  currentLocation: asset.currentLocation,
  isSharedResource: asset.isSharedResource,
});

module.exports = {
  isAssetModuleAvailable,
  validateLinkedAsset,
  getLinkedAssetSummary,
  validateLinkedAssetBookable,
  integrationUnavailableError,
  NON_LINKABLE_LIFECYCLE,
  NON_BOOKABLE_LIFECYCLE,
};
