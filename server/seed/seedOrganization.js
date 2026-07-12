const mongoose = require("mongoose");
const config = require("../config/environment");
const Department = require("../models/Department");
const AssetCategory = require("../models/AssetCategory");

const departments = [
  { name: "Information Technology", code: "IT", description: "Technology infrastructure, support and software systems.", managerName: "Arun Kumar", location: "Block A - First Floor" },
  { name: "Administration", code: "ADMIN", description: "Corporate administration and workplace coordination.", managerName: "Meera Nair", location: "Block A - Ground Floor" },
  { name: "Human Resources", code: "HR", description: "People operations, culture and employee services.", managerName: "Ritika Sharma", location: "Block B - Second Floor" },
  { name: "Operations", code: "OPS", description: "Day-to-day operational planning and delivery.", managerName: "Vikram Rao", location: "Block B - First Floor" },
  { name: "Finance", code: "FIN", description: "Financial planning, reporting and compliance.", managerName: "Ananya Bose", location: "Block A - Second Floor" },
];

const categories = [
  ["Laptop", "LAPTOP", 48, true], ["Desktop", "DESKTOP", 60, true],
  ["Printer", "PRINTER", 60, true], ["Furniture", "FURNITURE", 120, false],
  ["Vehicle", "VEHICLE", 96, true], ["Projector", "PROJECTOR", 60, true],
  ["Medical Equipment", "MEDICAL", 84, true], ["Networking Equipment", "NETWORK", 72, true],
].map(([name, code, defaultUsefulLife, requiresMaintenance]) => ({
  name, code, defaultUsefulLife, requiresMaintenance,
  description: `${name} assets managed through the AssetFlow lifecycle.`,
}));

const run = async () => {
  await mongoose.connect(config.mongoUri);
  let User;
  try { User = require("../models/User"); }
  catch (error) {
    if (error.code !== "MODULE_NOT_FOUND" || !error.message.includes("../models/User")) throw error;
    console.error("Run npm run seed:admin before seeding organization data");
    return;
  }
  const admin = await User.findOne({ role: "Admin", status: { $ne: "Inactive" } }).select("_id").lean();
  if (!admin) {
    console.error("Run npm run seed:admin before seeding organization data");
    return;
  }

  const departmentResult = await Department.bulkWrite(departments.map((item) => ({
    updateOne: { filter: { code: item.code }, update: { $setOnInsert: { ...item, status: "Active", createdBy: admin._id } }, upsert: true, collation: { locale: "en", strength: 2 } },
  })));
  const categoryResult = await AssetCategory.bulkWrite(categories.map((item) => ({
    updateOne: { filter: { code: item.code }, update: { $setOnInsert: { ...item, status: "Active", createdBy: admin._id } }, upsert: true, collation: { locale: "en", strength: 2 } },
  })));

  console.log(`Organization seed complete: ${departmentResult.upsertedCount} departments and ${categoryResult.upsertedCount} categories added.`);
};

run().catch((error) => {
  console.error(`Organization seed failed: ${error.message}`);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.connection.close();
});
