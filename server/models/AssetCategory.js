const mongoose = require("mongoose");

const codePattern = /^[A-Z0-9_-]+$/;

const assetCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 20,
      match: codePattern,
    },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    defaultUsefulLife: {
      type: Number,
      required: true,
      min: 1,
      max: 600,
      validate: { validator: Number.isInteger, message: "Useful life must be an integer" },
    },
    requiresMaintenance: { type: Boolean, default: false },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

assetCategorySchema.index(
  { code: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
assetCategorySchema.index({ name: 1 });
assetCategorySchema.index({ status: 1 });
assetCategorySchema.index({ requiresMaintenance: 1 });

module.exports = mongoose.model("AssetCategory", assetCategorySchema);
