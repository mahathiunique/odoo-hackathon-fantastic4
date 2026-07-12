const mongoose = require("mongoose");

const allocationSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
    allocatedToType: { type: String, enum: ["Employee", "Department"], required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    allocatedDate: { type: Date, required: true, default: Date.now },
    expectedReturnDate: { type: Date, required: true },
    actualReturnDate: { type: Date, default: null },
    purpose: { type: String, required: true, trim: true, minlength: 3, maxlength: 500 },
    returnCondition: { type: String, enum: ["Excellent", "Good", "Fair", "Damaged", "Unusable"], default: null },
    status: { type: String, enum: ["Active", "Returned", "Overdue"], default: "Active", index: true },
    isOpen: { type: Boolean, default: true, index: true },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    returnNotes: { type: String, trim: true, maxlength: 1000, default: "" },
    returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

allocationSchema.index({ asset: 1 }, { unique: true, partialFilterExpression: { isOpen: true } });
allocationSchema.index({ employee: 1, status: 1 });
allocationSchema.index({ department: 1, status: 1 });
allocationSchema.index({ expectedReturnDate: 1, isOpen: 1 });

allocationSchema.pre("validate", function validateAllocation(next) {
  const employeeTarget = this.allocatedToType === "Employee" && this.employee && !this.department;
  const departmentTarget = this.allocatedToType === "Department" && this.department && !this.employee;
  if (!employeeTarget && !departmentTarget) this.invalidate("allocatedToType", "Select exactly one allocation target: employee or department");
  if (this.expectedReturnDate && this.allocatedDate && this.expectedReturnDate < this.allocatedDate) this.invalidate("expectedReturnDate", "Expected return date cannot be earlier than allocated date");
  if (this.status === "Returned" && this.isOpen) this.invalidate("isOpen", "Returned allocations must be closed");
  if (["Active", "Overdue"].includes(this.status) && !this.isOpen) this.invalidate("isOpen", "Active and overdue allocations must remain open");
  next();
});

module.exports = mongoose.model("AssetAllocation", allocationSchema);
