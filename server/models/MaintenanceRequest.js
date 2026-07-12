const mongoose = require("mongoose");

const MAINTENANCE_STATUSES = [
  "Reported", // Submitted
  "Approved",
  "Rejected",
  "Technician Assigned",
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
];
const OPEN_STATUSES = ["Reported", "Approved", "Technician Assigned", "Scheduled", "In Progress"];
const CANCELABLE_STATUSES = ["Reported", "Approved", "Technician Assigned", "Scheduled", "In Progress"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const MAINTENANCE_TYPES = ["Preventive", "Corrective", "Emergency", "Inspection"];
const MANAGER_ROLES = ["Admin", "Asset Manager", "Maintenance Manager"];

const maintenanceRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: [true, "Asset is required"],
      index: true,
    },
    // Snapshot of the asset identity for fast list rendering without extra joins.
    assetTag: { type: String, trim: true, default: null },
    assetName: { type: String, trim: true, default: null },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter is required"],
    },
    reportedByEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    issueTitle: {
      type: String,
      required: [true, "Issue title is required"],
      trim: true,
      minlength: [3, "Issue title must be at least 3 characters"],
      maxlength: [150, "Issue title cannot exceed 150 characters"],
    },
    issueDescription: {
      type: String,
      required: [true, "Issue description is required"],
      trim: true,
      minlength: [5, "Issue description must be at least 5 characters"],
      maxlength: [2000, "Issue description cannot exceed 2000 characters"],
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: "Medium",
      index: true,
    },
    maintenanceType: {
      type: String,
      enum: MAINTENANCE_TYPES,
      default: "Corrective",
    },
    requestStatus: {
      type: String,
      enum: MAINTENANCE_STATUSES,
      default: "Reported",
      index: true,
    },
    scheduledDate: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelReason: {
      type: String,
      trim: true,
      maxlength: [1000, "Cancel reason cannot exceed 1000 characters"],
      default: "",
    },
    // Cost in the organization currency. Optional, tracked for reporting.
    cost: {
      type: Number,
      default: null,
      min: [0, "Cost cannot be negative"],
      validate: {
        validator: (value) => value === null || Number.isFinite(value),
        message: "Cost must be a valid number",
      },
    },
    downtimeHours: {
      type: Number,
      default: null,
      min: [0, "Downtime hours cannot be negative"],
    },
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: [2000, "Resolution notes cannot exceed 2000 characters"],
      default: "",
    },
    // The asset lifecycle status before it was moved to "Under Maintenance" by
    // this request. Used to restore the asset when the work is finished.
    assetStatusBeforeMaintenance: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy is required"],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

maintenanceRequestSchema.pre("save", function (next) {
  if (this.isModified("requestNumber")) this.requestNumber = this.requestNumber.trim().toUpperCase();
  if (this.isModified("issueTitle")) this.issueTitle = this.issueTitle.trim();
  if (this.isModified("issueDescription")) this.issueDescription = this.issueDescription?.trim() || null;
  if (this.isModified("resolutionNotes")) this.resolutionNotes = this.resolutionNotes?.trim() || null;
  if (this.isModified("cancelReason")) this.cancelReason = this.cancelReason?.trim() || null;
  next();
});

maintenanceRequestSchema.index({ requestStatus: 1, priority: 1 });
maintenanceRequestSchema.index({ assignedTo: 1 });
maintenanceRequestSchema.index({ reportedBy: 1 });
maintenanceRequestSchema.index({ scheduledDate: 1 });
maintenanceRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
module.exports.MAINTENANCE_STATUSES = MAINTENANCE_STATUSES;
module.exports.OPEN_STATUSES = OPEN_STATUSES;
module.exports.CANCELABLE_STATUSES = CANCELABLE_STATUSES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.MAINTENANCE_TYPES = MAINTENANCE_TYPES;
module.exports.MANAGER_ROLES = MANAGER_ROLES;
