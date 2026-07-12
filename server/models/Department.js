const mongoose = require("mongoose");

const codePattern = /^[A-Z0-9_-]+$/;

const departmentSchema = new mongoose.Schema(
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
    managerName: { type: String, trim: true, maxlength: 100, default: "" },
    location: { type: String, required: true, trim: true, maxlength: 150 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Codes are normalized to uppercase and the collation keeps the database constraint
// case-insensitive if legacy or externally inserted records are encountered.
departmentSchema.index(
  { code: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
departmentSchema.index({ name: 1 });
departmentSchema.index({ status: 1 });

module.exports = mongoose.model("Department", departmentSchema);
