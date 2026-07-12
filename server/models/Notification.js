const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
  "Overdue Allocation",
  "Upcoming Return",
  "Booking Reminder",
  "Booking Confirmed",
  "Booking Cancelled",
  "Booking Conflict",
  "Maintenance Update",
  "Maintenance Approval",
  "Audit Assignment",
  "Audit Deadline",
  "Asset Status Update",
  "System",
];

const NOTIFICATION_PRIORITIES = ["Low", "Normal", "High", "Critical"];

const RELATED_ENTITY_TYPES = [
  "Asset",
  "Allocation",
  "Resource",
  "Booking",
  "MaintenanceRequest",
  "AuditCycle",
  "AuditItem",
  "User",
  "Employee",
  "System",
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: [150, "Title must not exceed 150 characters"],
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [1000, "Message must not exceed 1000 characters"],
    },
    type: {
      type: String,
      enum: {
        values: NOTIFICATION_TYPES,
        message: "Unsupported notification type",
      },
      default: "System",
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: NOTIFICATION_PRIORITIES,
        message: "Unsupported priority",
      },
      default: "Normal",
      index: true,
    },
    relatedEntityType: {
      type: String,
      enum: {
        values: RELATED_ENTITY_TYPES,
        message: "Unsupported related entity type",
      },
      default: "System",
      index: true,
    },
    // Stored as a generic ObjectId (no ref) so the related model may be
    // unavailable at startup (e.g. MaintenanceRequest, AuditCycle).
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    actionUrl: {
      type: String,
      trim: true,
      maxlength: [500, "Action URL must not exceed 500 characters"],
      default: null,
    },
    // Required for system-generated notifications. Enforces one record per
    // recipient + event combination. Optional only for manual System notices.
    deduplicationKey: {
      type: String,
      trim: true,
      maxlength: [250, "Deduplication key must not exceed 250 characters"],
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One notification per recipient + event. Partial unique index so records
// without a deduplicationKey (manual System notices) are not constrained.
notificationSchema.index(
  { recipient: 1, deduplicationKey: 1 },
  {
    unique: true,
    partialFilterExpression: { deduplicationKey: { $type: "string" } },
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
module.exports.NOTIFICATION_PRIORITIES = NOTIFICATION_PRIORITIES;
module.exports.RELATED_ENTITY_TYPES = RELATED_ENTITY_TYPES;
