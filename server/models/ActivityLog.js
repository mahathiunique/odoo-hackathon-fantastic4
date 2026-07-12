const mongoose = require("mongoose");

const SENSITIVE_KEY_FRAGMENTS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "mongodb",
  "connectionstring",
];

const isSensitiveKey = (key) => {
  const normalized = String(key).toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
};

// Strip values whose keys look like secrets. Recurses one level into plain
// objects but never expands arrays to keep the helper cheap and safe.
const sanitizeActivityMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") return {};
  const result = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (isSensitiveKey(key)) continue;
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      const nested = {};
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (isSensitiveKey(nestedKey)) continue;
        nested[nestedKey] = nestedValue;
      }
      result[key] = nested;
      continue;
    }
    result[key] = value;
  }
  return result;
};

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: [true, "Activity action is required"],
      trim: true,
      maxlength: [150, "Action must not exceed 150 characters"],
      index: true,
    },
    entityType: {
      type: String,
      default: "System",
      trim: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Activity description is required"],
      trim: true,
      maxlength: [1000, "Description must not exceed 1000 characters"],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      set: sanitizeActivityMetadata,
    },
    ipAddress: {
      type: String,
      default: null,
      trim: true,
    },
    userAgent: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, "User agent must not exceed 500 characters"],
    },
    requestMethod: {
      type: String,
      default: null,
      trim: true,
    },
    requestPath: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
module.exports.sanitizeActivityMetadata = sanitizeActivityMetadata;
