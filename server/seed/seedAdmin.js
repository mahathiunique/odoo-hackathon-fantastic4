const mongoose = require("mongoose");
const config = require("../config/environment");
const User = require("../models/User");

const seedAdmin = async () => {
  try {
    await mongoose.connect(config.mongoUri);

    const adminEmail = (process.env.ADMIN_EMAIL || "admin@assetflow.com").toLowerCase().trim();
    const existing = await User.findOne({ email: adminEmail });

    if (existing) {
      console.log("Admin already exists.");
      await mongoose.disconnect();
      return;
    }

    const admin = await User.create({
      name: process.env.ADMIN_NAME || "AssetFlow Admin",
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || "Admin@123",
      role: "Admin",
      status: "Active",
    });

    console.log(`Seeded admin user: ${admin.email}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error("Admin seeding failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();
