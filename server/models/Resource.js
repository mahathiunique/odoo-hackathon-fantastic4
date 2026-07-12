const mongoose = require("mongoose");

const CODE_PATTERN = /^[A-Z0-9_-]+$/;

const RESOURCE_TYPES = ["Room", "Vehicle", "Equipment", "Workspace", "Other"];
const AVAILABILITY_STATUSES = ["Available", "Unavailable"];
const RESOURCE_STATUSES = ["Active", "Inactive"];

const bookingRulesSchema = new mongoose.Schema(
  {
    minimumDurationMinutes: {
      type: Number,
      default: 30,
      min: [15, "Minimum booking duration must be at least 15 minutes"],
    },
    maximumDurationMinutes: {
      type: Number,
      default: 480,
      min: [15, "Maximum booking duration must be at least 15 minutes"],
    },
    maximumAdvanceDays: {
      type: Number,
      default: 90,
      min: [1, "Maximum advance days must be at least 1"],
      max: [365, "Maximum advance days must not exceed 365"],
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    allowWeekendBookings: {
      type: Boolean,
      default: true,
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [1000, "Instructions must not exceed 1000 characters"],
      default: "",
    },
  },
  { _id: false }
);

bookingRulesSchema.pre("validate", function (next) {
  if (
    this.maximumDurationMinutes !== undefined &&
    this.minimumDurationMinutes !== undefined &&
    this.maximumDurationMinutes < this.minimumDurationMinutes
  ) {
    this.invalidate(
      "maximumDurationMinutes",
      "Maximum duration must be greater than or equal to minimum duration"
    );
  }
  next();
});

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Resource name is required"],
      trim: true,
      minlength: [2, "Resource name must be at least 2 characters"],
      maxlength: [150, "Resource name must not exceed 150 characters"],
    },
    resourceCode: {
      type: String,
      required: [true, "Resource code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, "Resource code must be at least 2 characters"],
      maxlength: [30, "Resource code must not exceed 30 characters"],
      match: [CODE_PATTERN, "Resource code may contain only letters, numbers, hyphens and underscores"],
    },
    resourceType: {
      type: String,
      required: [true, "Resource type is required"],
      enum: {
        values: RESOURCE_TYPES,
        message: "Resource type must be one of Room, Vehicle, Equipment, Workspace or Other",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description must not exceed 1000 characters"],
      default: "",
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
      max: [10000, "Capacity must not exceed 10,000"],
      validate: {
        validator: Number.isInteger,
        message: "Capacity must be a whole number",
      },
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: [200, "Location must not exceed 200 characters"],
    },
    // Optional link to a Stage 6 Asset. The Asset model is NOT required to be
    // registered for resources to work. Never import the Asset model here.
    linkedAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      default: null,
    },
    availabilityStatus: {
      type: String,
      enum: {
        values: AVAILABILITY_STATUSES,
        message: "Availability status must be Available or Unavailable",
      },
      default: "Available",
    },
    // A short, human-readable note recording why the resource was last made
    // unavailable. Optional and informational only.
    unavailabilityReason: {
      type: String,
      trim: true,
      maxlength: [1000, "Unavailability reason must not exceed 1000 characters"],
      default: "",
    },
    bookingRules: {
      type: bookingRulesSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: {
        values: RESOURCE_STATUSES,
        message: "Status must be Active or Inactive",
      },
      default: "Active",
    },
    // Internal counter used to serialize concurrent booking operations against
    // the same resource inside a transaction. Clients must never set this.
    bookingVersion: {
      type: Number,
      default: 0,
      select: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes (resourceCode already has a unique index via `unique: true` above)
resourceSchema.index({ name: 1 });
resourceSchema.index({ resourceType: 1 });
resourceSchema.index({ location: 1 });
resourceSchema.index({ availabilityStatus: 1 });
resourceSchema.index({ status: 1 });
resourceSchema.index({ createdAt: -1 });
// Partial unique index: one Asset can only ever be linked to one Resource,
// but many resources may have linkedAsset = null.
resourceSchema.index(
  { linkedAsset: 1 },
  { unique: true, partialFilterExpression: { linkedAsset: { $type: "objectId" } } }
);

resourceSchema.pre("save", function (next) {
  if (this.isModified("resourceCode") && this.resourceCode) {
    this.resourceCode = this.resourceCode.trim().toUpperCase();
  }
  if (this.isModified("name") && this.name) {
    this.name = this.name.trim();
  }
  if (this.isModified("linkedAsset") && this.linkedAsset === "") {
    this.linkedAsset = null;
  }
  next();
});

module.exports = mongoose.model("Resource", resourceSchema);
module.exports.RESOURCE_TYPES = RESOURCE_TYPES;
module.exports.AVAILABILITY_STATUSES = AVAILABILITY_STATUSES;
module.exports.RESOURCE_STATUSES = RESOURCE_STATUSES;
