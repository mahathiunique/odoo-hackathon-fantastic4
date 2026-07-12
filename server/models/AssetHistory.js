const mongoose = require("mongoose");
const { lifecycleStatuses } = require("../validators/assetValidator");

const assetHistorySchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true, index: true },
    previousStatus: { type: String, enum: [...lifecycleStatuses, null], default: null },
    newStatus: { type: String, enum: lifecycleStatuses, required: true },
    action: { type: String, required: true, trim: true, maxlength: [200, "Action cannot exceed 200 characters"] },
    reason: { type: String, trim: true, maxlength: [1000, "Reason cannot exceed 1000 characters"], default: null },
    changes: { type: mongoose.Schema.Types.Mixed, default: {} },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

assetHistorySchema.index({ asset: 1, createdAt: -1 });
assetHistorySchema.index({ performedBy: 1 });
assetHistorySchema.index({ newStatus: 1 });

module.exports = mongoose.model("AssetHistory", assetHistorySchema);
