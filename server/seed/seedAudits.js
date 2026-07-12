const path = require("path");
// Load server/.env reliably whether the script runs from the repository root
// (npm run seed:audits) or from inside the server directory. dotenv does not
// override variables that are already present in the environment.
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const AuditCycle = require("../models/AuditCycle");
const AuditItem = require("../models/AuditItem");
const AuditCounter = require("../models/AuditCounter");
const Asset = require("../models/Asset");
const Department = require("../models/Department");
const AssetCategory = require("../models/AssetCategory");
const Employee = require("../models/Employee");
const User = require("../models/User");
const { recalculateAuditSummary } = require("../services/auditReportService");

// Generate an audit code using the real atomic counter, exactly like the service.
const generateAuditCode = async () => {
  const year = new Date().getFullYear();
  const counter = await AuditCounter.findOneAndUpdate(
    { key: "audit", year },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true }
  );
  return `AUD-${year}-${String(counter.sequence).padStart(4, "0")}`;
};

const daysFromNow = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(9, 0, 0, 0);
  return date;
};

// Build the immutable expected snapshot from an already-populated Asset.
const snapshotFor = (asset) => ({
  assetTag: asset.assetTag,
  assetName: asset.name,
  category: asset.category?._id,
  categoryName: asset.category?.name,
  department: asset.department?._id,
  departmentName: asset.department?.name,
  assignedToEmployee: asset.assignedToEmployee?._id,
  assignedEmployeeName: asset.assignedToEmployee?.name,
  assignedToDepartment: asset.assignedToDepartment?._id,
  assignedDepartmentName: asset.assignedToDepartment?.name,
  currentLocation: asset.currentLocation,
  condition: asset.condition,
  lifecycleStatus: asset.lifecycleStatus,
  serialNumber: asset.serialNumber,
});

// Deterministically decide how a given item should be resolved so that the
// seed produces a realistic mix of Verified, Discrepancy and Missing items.
const resolutionFor = (index, snapshot, auditorId, when) => {
  const bucket = index % 5;
  if (bucket === 4) {
    return {
      verificationStatus: "Missing",
      actualLocation: null,
      actualDepartment: null,
      actualEmployee: null,
      physicalCondition: null,
      discrepancyTypes: ["Missing Asset"],
      auditorNotes: "Asset could not be located at the expected location during the physical audit.",
      verifiedBy: auditorId,
      verifiedAt: when,
    };
  }
  if (bucket === 2) {
    return {
      verificationStatus: "Discrepancy",
      actualLocation: `${snapshot.currentLocation || "Unknown"} (relocated)`,
      actualDepartment: snapshot.department || null,
      actualEmployee: snapshot.assignedToEmployee || null,
      physicalCondition: "Damaged",
      discrepancyTypes: ["Location Mismatch", "Condition Mismatch"],
      auditorNotes: "Asset found in a different location and shows visible physical damage.",
      verifiedBy: auditorId,
      verifiedAt: when,
    };
  }
  return {
    verificationStatus: "Verified",
    actualLocation: snapshot.currentLocation || "Verified on-site",
    actualDepartment: snapshot.department || null,
    actualEmployee: snapshot.assignedToEmployee || null,
    physicalCondition: snapshot.condition || "Good",
    discrepancyTypes: [],
    auditorNotes: "",
    verifiedBy: auditorId,
    verifiedAt: when,
  };
};

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not set. Add it to server/.env before running the Audit seed.");
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(mongoUri);

  const admin = await User.findOne({ role: "Admin", status: "Active" }).select("_id").lean();
  if (!admin) {
    console.error("Create an active Admin user (npm run seed:admin) before running the Audit seed.");
    return;
  }

  const auditors = await User.find({ role: "Auditor", status: "Active" }).select("_id").lean();
  if (!auditors.length) {
    console.error("Create an active user with the Auditor role before running the Audit seed.");
    return;
  }

  const departments = await Department.find({ status: "Active" }).select("_id").lean();
  const categories = await AssetCategory.find({ status: "Active" }).select("_id").lean();

  // Read-only: never modify Asset records. Disposed assets are out of scope.
  const assets = await Asset.find({ lifecycleStatus: { $ne: "Disposed" } })
    .populate("category department assignedToEmployee assignedToDepartment")
    .limit(60);

  if (!assets.length) {
    console.error("No Assets are available to audit. Seed Assets before running the Audit seed.");
    return;
  }

  const auditorIds = auditors.map((a) => a._id);
  const deptIds = departments.map((d) => d._id);
  const catIds = categories.map((c) => c._id);
  const nextAuditor = (i) => auditorIds[i % auditorIds.length];

  // Fixed audit names keep the seed idempotent — existing cycles are skipped.
  const plans = [
    {
      auditName: "Annual Inventory Audit — Planned",
      description: "Planned organization-wide physical verification for the current cycle.",
      status: "Planned",
      startDate: daysFromNow(7),
      endDate: daysFromNow(21),
      itemCount: 0,
    },
    {
      auditName: "Quarterly Asset Audit — In Progress",
      description: "Active quarterly audit with partially verified findings.",
      status: "In Progress",
      startDate: daysFromNow(-5),
      endDate: daysFromNow(10),
      itemCount: Math.min(15, assets.length),
      partial: true,
    },
    {
      auditName: "Prior Period Audit — Completed",
      description: "Historical completed audit with locked verification results.",
      status: "Completed",
      startDate: daysFromNow(-45),
      endDate: daysFromNow(-20),
      itemCount: Math.min(12, assets.length),
      partial: false,
    },
  ];

  let createdCycles = 0;
  let createdItems = 0;
  let skipped = 0;

  for (const plan of plans) {
    const existing = await AuditCycle.findOne({ auditName: plan.auditName }).select("_id").lean();
    if (existing) {
      skipped += 1;
      continue;
    }

    const auditCode = await generateAuditCode();
    const cycle = await AuditCycle.create({
      auditName: plan.auditName,
      auditCode,
      description: plan.description,
      departments: deptIds,
      categories: catIds,
      includeUnassignedAssets: true,
      startDate: plan.startDate,
      endDate: plan.endDate,
      assignedAuditors: auditorIds,
      status: "Planned",
      createdBy: admin._id,
    });

    if (plan.status !== "Planned") {
      const scopedAssets = assets.slice(0, plan.itemCount);
      const startedAt = plan.startDate;

      const itemDocs = scopedAssets.map((asset, index) => {
        const snapshot = snapshotFor(asset);
        const auditorId = nextAuditor(index);
        const base = {
          auditCycle: cycle._id,
          asset: asset._id,
          assignedAuditor: auditorId,
          expectedSnapshot: snapshot,
          verificationStatus: "Pending",
          isLocked: false,
        };

        // In Progress: leave roughly a third Pending. Completed: resolve all.
        const leavePending = plan.partial && index % 3 === 0;
        if (leavePending) return base;

        return {
          ...base,
          ...resolutionFor(index, snapshot, auditorId, startedAt),
          isLocked: plan.status === "Completed",
        };
      });

      const inserted = await AuditItem.insertMany(itemDocs);
      createdItems += inserted.length;

      cycle.status = plan.status;
      cycle.startedAt = startedAt;
      cycle.startedBy = admin._id;
      cycle.scopeSnapshot = {
        departments: deptIds.map((id) => ({ id })),
        categories: catIds.map((id) => ({ id })),
        includeUnassignedAssets: true,
        totalAssets: scopedAssets.length,
        startedAt,
      };

      if (plan.status === "Completed") {
        cycle.completedAt = plan.endDate;
        cycle.completedBy = admin._id;
        cycle.completionOverride = { overridePendingItems: false, overrideReason: "" };
      }

      await cycle.save();
      // Keep the stored summary consistent with the generated items.
      await recalculateAuditSummary(cycle._id);
    }

    createdCycles += 1;
  }

  const totalCycles = await AuditCycle.countDocuments();
  const totalItems = await AuditItem.countDocuments();

  console.log("Stage 10 Audit seed complete.");
  console.log(`  Audit Cycles created:  ${createdCycles}`);
  console.log(`  Audit Cycles skipped:  ${skipped} (already present)`);
  console.log(`  Audit Items created:   ${createdItems}`);
  console.log(`  Audit Cycles total:    ${totalCycles}`);
  console.log(`  Audit Items total:     ${totalItems}`);
};

run()
  .catch((error) => {
    console.error(`Audit seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
