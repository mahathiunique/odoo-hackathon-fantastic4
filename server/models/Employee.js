const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, "Employee ID must be at least 2 characters"],
      maxlength: [30, "Employee ID must not exceed 30 characters"],
      match: [/^[A-Za-z0-9_-]+$/, "Employee ID may contain only letters, numbers, hyphens and underscores"],
    },
    name: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [120, "Name must not exceed 120 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone must not exceed 20 characters"],
      default: "",
    },
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
      maxlength: [100, "Designation must not exceed 100 characters"],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },
    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ designation: 1 });
employeeSchema.index(
  { userAccount: 1 },
  { unique: true, partialFilterExpression: { userAccount: { $type: "objectId" } } }
);

employeeSchema.pre("save", function (next) {
  if (this.isModified("employeeId")) {
    this.employeeId = this.employeeId.trim().toUpperCase();
  }
  if (this.isModified("email")) {
    this.email = this.email.trim().toLowerCase();
  }
  if (this.isModified("name")) {
    this.name = this.name.trim();
  }
  if (this.isModified("designation")) {
    this.designation = this.designation.trim();
  }
  if (this.isModified("phone")) {
    this.phone = this.phone.trim();
    if (this.phone === "") this.phone = null;
  }
  if (this.isModified("userAccount") && this.userAccount === "") {
    this.userAccount = null;
  }
  next();
});

module.exports = mongoose.model("Employee", employeeSchema);
