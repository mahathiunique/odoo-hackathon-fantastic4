const mongoose = require("mongoose");
const { lifecycleStatuses, conditions, assetTagPattern } = require("../validators/assetValidator");

const assetSchema = new mongoose.Schema(
  {
    assetTag: {
      type: String,
      required: [true, "Asset tag is required"],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, "Asset tag must be at least 2 characters"],
      maxlength: [50, "Asset tag cannot exceed 50 characters"],
      match: [assetTagPattern, "Asset tag format is invalid"],
    },
    name: {
      type: String,
      required: [true, "Asset name is required"],
      trim: true,
      minlength: [2, "Asset name must be at least 2 characters"],
      maxlength: [150, "Asset name cannot exceed 150 characters"],
    },
    description: { type: String, trim: true, maxlength: [1000, "Description cannot exceed 1000 characters"], default: "" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "AssetCategory", required: [true, "Category is required"] },
    serialNumber: {
      type: String,
      trim: true,
      maxlength: [100, "Serial number cannot exceed 100 characters"],
      default: null,
    },
    manufacturer: { type: String, trim: true, maxlength: [100, "Manufacturer cannot exceed 100 characters"], default: null },
    model: { type: String, trim: true, maxlength: [100, "Model cannot exceed 100 characters"], default: null },
    purchaseDate: { type: Date, default: null },
    warrantyExpiry: { type: Date, default: null },
    condition: { type: String, enum: conditions, default: "Good" },
    lifecycleStatus: { type: String, enum: lifecycleStatuses, default: "Available" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    currentLocation: { type: String, required: [true, "Current location is required"], trim: true, maxlength: [200, "Current location cannot exceed 200 characters"] },
    assignedToEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    assignedToDepartment: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    expectedReturnDate: { type: Date, default: null },
    isSharedResource: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: [2000, "Notes cannot exceed 2000 characters"], default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: [true, "createdBy is required"] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

assetSchema.pre("save", function (next) {
  if (this.isModified("assetTag")) {
    this.assetTag = this.assetTag.trim().toUpperCase();
  }
  if (this.isModified("name")) {
    this.name = this.name.trim();
  }
  if (this.isModified("description")) {
    this.description = this.description?.trim() || null;
  }
  if (this.isModified("serialNumber")) {
    this.serialNumber = this.serialNumber?.trim() || null;
  }
  if (this.isModified("manufacturer")) {
    this.manufacturer = this.manufacturer?.trim() || null;
  }
  if (this.isModified("model")) {
    this.model = this.model?.trim() || null;
  }
  if (this.isModified("currentLocation")) {
    this.currentLocation = this.currentLocation?.trim();
  }
  if (this.isModified("notes")) {
    this.notes = this.notes?.trim() || null;
  }
  if (this.isModified("department") && this.department === "") {
    this.department = null;
  }
  if (this.isModified("category") && this.category === "") {
    this.category = null;
  }
  if (this.isModified("assignedToEmployee") && this.assignedToEmployee === "") {
    this.assignedToEmployee = null;
  }
  if (this.isModified("assignedToDepartment") && this.assignedToDepartment === "") {
    this.assignedToDepartment = null;
  }
  if (this.isModified("expectedReturnDate") && this.expectedReturnDate === "") {
    this.expectedReturnDate = null;
  }
  next();
});

assetSchema.index({ assetTag: 1 }, { unique: true });
assetSchema.index({ serialNumber: 1 }, { unique: true, sparse: true });
assetSchema.index({ name: 1 });
assetSchema.index({ category: 1 });
assetSchema.index({ department: 1 });
assetSchema.index({ condition: 1 });
assetSchema.index({ lifecycleStatus: 1 });
assetSchema.index({ currentLocation: 1 });
assetSchema.index({ isSharedResource: 1 });
assetSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Asset", assetSchema);
