const mongoose = require("mongoose");
const config = require("../config/environment");

const unavailableMessage = "Stage 6 Asset module is not available.\n\nMerge Stage 6 and run npm run seed:assets before running npm run seed:allocations.";

const run = async () => {
  await mongoose.connect(config.mongoUri);
  // Loading the application registers models through their real feature routes after merge.
  try { require("../app"); } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
  }
  if (!mongoose.modelNames().includes("Asset") || !mongoose.modelNames().includes("AssetHistory")) {
    console.log(unavailableMessage);
    return;
  }
  const User = require("../models/User"), Employee = require("../models/Employee"), Department = require("../models/Department"), AssetAllocation = require("../models/AssetAllocation"), allocationService = require("../services/allocationService");
  const Asset = mongoose.model("Asset");
  const [admin, employees, departments, assets] = await Promise.all([User.findOne({ role: "Admin", status: "Active" }), Employee.find({ status: "Active" }).limit(2), Department.find({ status: "Active" }).limit(2), Asset.find({ lifecycleStatus: "Available" }).limit(4)]);
  if (!admin) throw new Error("Run npm run seed:admin before seeding allocations");
  let created = 0;
  for (let index = 0; index < assets.length; index += 1) {
    if (await AssetAllocation.exists({ asset: assets[index]._id, isOpen: true })) continue;
    const employeeTarget = index % 2 === 0 && employees.length;
    const target = employeeTarget ? employees[index % employees.length] : departments[index % departments.length];
    if (!target) continue;
    await allocationService.create({ asset: assets[index]._id, allocatedToType: employeeTarget ? "Employee" : "Department", employee: employeeTarget ? target._id : undefined, department: employeeTarget ? undefined : target._id, allocatedDate: new Date(), expectedReturnDate: new Date(Date.now() + (30 + index * 15) * 86400000), purpose: employeeTarget ? "Equipment issued for assigned project responsibilities." : "Equipment assigned for shared departmental operations.", notes: "Created by the Stage 7 organization seed." }, admin);
    created += 1;
  }
  console.log(`Allocation seed complete: ${created} records created.`);
};

run().catch((error) => { console.error(`Allocation seed failed: ${error.message}`); process.exitCode = 1; }).finally(async () => { await mongoose.connection.close(); });
