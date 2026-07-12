const mongoose = require("mongoose");

const maintenanceWorkflowHistorySchema = new mongoose.Schema(
  {
    maintenanceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaintenanceRequest",
      required: true,
      index: true,
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "eventType cannot exceed 100 characters"],
      index: true,
    },
    fromStatus: {
      type: String,
      default: null,
      trim: true,
    },
    toStatus: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [2000, "note cannot exceed 2000 characters"],
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

maintenanceWorkflowHistorySchema.index({ maintenanceRequest: 1, createdAt: -1 });

module.exports = mongoose.model(
  "MaintenanceWorkflowHistory",
  maintenanceWorkflowHistorySchema
);

