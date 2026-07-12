const mongoose = require("mongoose");

const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];
// Statuses that occupy a resource's time slot and therefore block overlaps.
const BLOCKING_STATUSES = ["Pending", "Confirmed"];

const resourceBookingSchema = new mongoose.Schema(
  {
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: [true, "Resource is required"],
      index: true,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Booking user is required"],
    },
    // Optional Employee profile of the booking user, stored when available.
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Booking title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [150, "Title must not exceed 150 characters"],
    },
    purpose: {
      type: String,
      required: [true, "Purpose is required"],
      trim: true,
      minlength: [3, "Purpose must be at least 3 characters"],
      maxlength: [1000, "Purpose must not exceed 1000 characters"],
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
      validate: {
        validator: function (value) {
          return !this.startTime || value > this.startTime;
        },
        message: "End time must be after start time",
      },
    },
    attendeesCount: {
      type: Number,
      required: [true, "Attendees count is required"],
      min: [1, "Attendees count must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Attendees count must be a whole number",
      },
    },
    status: {
      type: String,
      enum: {
        values: BOOKING_STATUSES,
        message: "Status must be Pending, Confirmed, Completed or Cancelled",
      },
      default: "Confirmed",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      trim: true,
      maxlength: [1000, "Cancel reason must not exceed 1000 characters"],
      default: "",
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes must not exceed 1000 characters"],
      default: "",
    },
  },
  { timestamps: true }
);

// Indexes (resource already has an index via `index: true` above)
resourceBookingSchema.index({ bookedBy: 1 });
resourceBookingSchema.index({ employee: 1 });
resourceBookingSchema.index({ status: 1 });
resourceBookingSchema.index({ startTime: 1 });
resourceBookingSchema.index({ endTime: 1 });
resourceBookingSchema.index({ createdAt: -1 });
// Compound index that supports the overlap lookup efficiently.
resourceBookingSchema.index({ resource: 1, startTime: 1, endTime: 1, status: 1 });
// Compound index for "my bookings" listings.
resourceBookingSchema.index({ bookedBy: 1, startTime: -1 });

module.exports = mongoose.model("ResourceBooking", resourceBookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
module.exports.BLOCKING_STATUSES = BLOCKING_STATUSES;
