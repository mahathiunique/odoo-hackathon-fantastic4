const mongoose = require("mongoose");
const config = require("../config/environment");
const Department = require("../models/Department");
const Employee = require("../models/Employee");
const User = require("../models/User");

const employees = [
  {
    employeeId: "EMP-001",
    name: "Aarav Mehta",
    email: "aarav.mehta@assetflow.com",
    phone: "+1-555-0100",
    designation: "Systems Administrator",
    departmentCode: "IT",
    joiningDateOffsetDays: -400,
    status: "Active",
    userAccount: true,
  },
  {
    employeeId: "EMP-002",
    name: "Diya Nair",
    email: "diya.nair@assetflow.com",
    phone: "+1-555-0101",
    designation: "HR Coordinator",
    departmentCode: "HR",
    joiningDateOffsetDays: -260,
    status: "Active",
    userAccount: true,
  },
  {
    employeeId: "EMP-003",
    name: "Rohan Gupta",
    email: "rohan.gupta@assetflow.com",
    phone: "+1-555-0102",
    designation: "Operations Analyst",
    departmentCode: "OPS",
    joiningDateOffsetDays: -190,
    status: "Active",
    userAccount: true,
  },
  {
    employeeId: "EMP-004",
    name: "Neha Kapoor",
    email: "neha.kapoor@assetflow.com",
    phone: "+1-555-0103",
    designation: "Finance Associate",
    departmentCode: "FIN",
    joiningDateOffsetDays: -120,
    status: "Active",
    userAccount: true,
  },
];

const run = async () => {
  await mongoose.connect(config.mongoUri);

  const admin = await User.findOne({ role: "Admin", status: "Active" })
    .select("_id")
    .lean();
  if (!admin) {
    console.error("Run `npm run seed:admin` before seeding employees.");
    return;
  }

  const deptCodes = [...new Set(employees.map((e) => e.departmentCode))];
  const departments = await Department.find({
    code: { $in: deptCodes },
    status: "Active",
  }).lean();
  const departmentByCode = Object.fromEntries(
    departments.map((d) => [d.code, d]),
  );

  // If organization seed wasn't run, exit cleanly.
  const missing = deptCodes.filter((c) => !departmentByCode[c]);
  if (missing.length) {
    console.error(
      `Missing active departments for codes: ${missing.join(", ")}. Run \`npm run seed:organization\` first.`,
    );
    return;
  }

  let employeeCreated = 0;
  let userCreated = 0;

  for (const e of employees) {
    const dept = departmentByCode[e.departmentCode];
    if (!dept) continue;

    // Upsert employee by employeeId.
    const existingEmployee = await Employee.findOne({
      employeeId: e.employeeId,
    }).lean();

    let userId = null;
    if (e.userAccount) {
      const existingUser = await User.findOne({
        email: e.email.toLowerCase().trim(),
      }).lean();
      if (existingUser) {
        userId = existingUser._id;
      } else {
        const employeeUser = await User.create({
          name: e.name,
          email: e.email.toLowerCase().trim(),
          password: process.env.EMPLOYEE_PASSWORD || "Employee@123",
          role: "Employee",
          status: "Active",
          phone: e.phone,
          createdBy: admin._id,
        });
        userId = employeeUser._id;
        userCreated += 1;
      }
    }

    if (existingEmployee) {
      // Idempotent: update mutable fields only.
      await Employee.updateOne(
        { _id: existingEmployee._id },
        {
          $set: {
            name: e.name,
            email: e.email.toLowerCase().trim(),
            phone: e.phone,
            designation: e.designation,
            department: dept._id,
            joiningDate: new Date(
              Date.now() + e.joiningDateOffsetDays * 86400000,
            ),
            status: e.status || "Active",
            userAccount: userId,
            updatedBy: admin._id,
          },
        },
      );
      continue;
    }

    await Employee.create({
      employeeId: e.employeeId,
      name: e.name,
      email: e.email.toLowerCase().trim(),
      phone: e.phone,
      designation: e.designation,
      department: dept._id,
      joiningDate: new Date(Date.now() + e.joiningDateOffsetDays * 86400000),
      status: e.status || "Active",
      userAccount: userId,
      createdBy: admin._id,
      updatedBy: admin._id,
    });
    employeeCreated += 1;
  }

  console.log(
    `Employees seed complete. Employees created/updated: ${employeeCreated}. Users created: ${userCreated}.`,
  );
};

run()
  .catch((error) => {
    console.error(`Employees seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
