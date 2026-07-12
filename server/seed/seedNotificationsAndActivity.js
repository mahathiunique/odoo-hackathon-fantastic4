const mongoose = require("mongoose");
const config = require("../config/environment");
const User = require("../models/User");
const Notification = require("../models/Notification");
const ActivityLog = require("../models/ActivityLog");
const activityService = require("../services/activityService");

const run = async () => {
  await mongoose.connect(config.mongoUri);

  const admin = await User.findOne({ role: "Admin", status: { $ne: "Inactive" } })
    .select("_id")
    .lean();
  if (!admin) {
    console.error("Run `npm run seed:admin` before seeding notifications/activity.");
    return;
  }

  const employee = await User.findOne({ role: "Employee", status: "Active" })
    .select("_id")
    .lean();

  // --- Activity seeds (idempotent by description + day) -----------------------
  const baseActivity = [
    {
      action: "System Initialized",
      entityType: "System",
      description: "AssetFlow activity logging enabled.",
      metadata: { scope: "system" },
    },
    {
      action: "Department Created",
      entityType: "Department",
      description: "Created department Information Technology (IT).",
      metadata: { code: "IT" },
    },
    {
      action: "Category Created",
      entityType: "AssetCategory",
      description: "Created asset category Laptops (LAPTOP).",
      metadata: { code: "LAPTOP" },
    },
  ];

  let activityCreated = 0;
  for (const entry of baseActivity) {
    const exists = await ActivityLog.exists({ description: entry.description });
    if (exists) continue;
    await activityService.recordActivity({ ...entry, user: admin._id });
    activityCreated += 1;
  }

  // --- Notification seeds (idempotent by deduplicationKey) -------------------
  const sampleNotifications = [
    {
      recipient: admin._id,
      title: "Welcome to AssetFlow",
      message: "Your workspace is ready. Explore the dashboard to see live operational data.",
      type: "System",
      priority: "Normal",
      deduplicationKey: "seed:welcome:admin",
      metadata: {},
    },
    {
      recipient: admin._id,
      title: "Weekly asset review due",
      message: "Review open allocations and upcoming resource bookings for the week.",
      type: "System",
      priority: "Low",
      deduplicationKey: "seed:weekly-review:admin",
      metadata: {},
    },
  ];

  if (employee) {
    sampleNotifications.push({
      recipient: employee._id,
      title: "Complete your profile",
      message: "Link your employee record to view personalized allocations and bookings.",
      type: "System",
      priority: "Low",
      deduplicationKey: "seed:profile:employee",
      metadata: {},
    });
  }

  let notificationCreated = 0;
  for (const n of sampleNotifications) {
    const exists = await Notification.exists({ recipient: n.recipient, deduplicationKey: n.deduplicationKey });
    if (exists) continue;
    await Notification.create(n);
    notificationCreated += 1;
  }

  console.log("Stage 11 seed complete.");
  console.log(`  Activity logs added:     ${activityCreated}`);
  console.log(`  Notifications added:     ${notificationCreated}`);
};

run()
  .catch((error) => {
    console.error(`Notification/activity seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
