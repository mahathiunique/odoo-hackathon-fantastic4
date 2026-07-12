const mongoose = require("mongoose");
const config = require("../config/environment");
const Resource = require("../models/Resource");
const ResourceBooking = require("../models/ResourceBooking");
const User = require("../models/User");

// Stage 8 resources. linkedAsset intentionally stays null so this seed never
// requires the Stage 6 Asset module.
const resources = [
  {
    name: "Conference Room A",
    resourceCode: "ROOM-A101",
    resourceType: "Room",
    description: "Conference room with projector and video conferencing.",
    capacity: 20,
    location: "Block A - First Floor",
    bookingRules: { minimumDurationMinutes: 30, maximumDurationMinutes: 240, maximumAdvanceDays: 60, requiresApproval: false, allowWeekendBookings: true, instructions: "Switch off equipment after use." },
  },
  {
    name: "Training Hall",
    resourceCode: "ROOM-B201",
    resourceType: "Room",
    description: "Large hall for workshops and training sessions.",
    capacity: 60,
    location: "Block B - Second Floor",
    bookingRules: { minimumDurationMinutes: 60, maximumDurationMinutes: 480, maximumAdvanceDays: 90, requiresApproval: true, allowWeekendBookings: true, instructions: "Requires facilities approval." },
  },
  {
    name: "HR Meeting Room",
    resourceCode: "ROOM-HR01",
    resourceType: "Room",
    description: "Private meeting room for HR discussions.",
    capacity: 10,
    location: "Block B - First Floor",
    bookingRules: { minimumDurationMinutes: 30, maximumDurationMinutes: 180, maximumAdvanceDays: 45, requiresApproval: false, allowWeekendBookings: false },
  },
  {
    name: "Shared Development Workspace",
    resourceCode: "WORKSPACE-01",
    resourceType: "Workspace",
    description: "Open workspace with hot desks for project teams.",
    capacity: 12,
    location: "Block A - Ground Floor",
    bookingRules: { minimumDurationMinutes: 60, maximumDurationMinutes: 480, maximumAdvanceDays: 30, requiresApproval: false, allowWeekendBookings: true },
  },
  {
    name: "Multimedia Presentation Kit",
    resourceCode: "EQUIP-MEDIA-01",
    resourceType: "Equipment",
    description: "Portable projector, speakers and screen kit.",
    capacity: 1,
    location: "IT Store Room",
    bookingRules: { minimumDurationMinutes: 30, maximumDurationMinutes: 240, maximumAdvanceDays: 30, requiresApproval: false, allowWeekendBookings: true },
  },
  {
    name: "Staff Transport Vehicle",
    resourceCode: "VEHICLE-POOL-01",
    resourceType: "Vehicle",
    description: "7-seater vehicle for staff travel and site visits.",
    capacity: 7,
    location: "Basement Parking",
    bookingRules: { minimumDurationMinutes: 60, maximumDurationMinutes: 480, maximumAdvanceDays: 30, requiresApproval: true, allowWeekendBookings: true },
  },
];

// Build a Date at a future day offset with a specific hour (local time).
const futureAt = (dayOffset, hour, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const run = async () => {
  await mongoose.connect(config.mongoUri);

  const admin = await User.findOne({ role: "Admin", status: { $ne: "Inactive" } }).select("_id").lean();
  if (!admin) {
    console.error("Run `npm run seed:admin` before seeding resources and bookings.");
    return;
  }

  // Upsert resources without ever touching Assets.
  const resourceResult = await Resource.bulkWrite(
    resources.map((item) => ({
      updateOne: {
        filter: { resourceCode: item.resourceCode },
        update: {
          $setOnInsert: {
            ...item,
            linkedAsset: null,
            availabilityStatus: "Available",
            status: "Active",
            bookingVersion: 0,
            createdBy: admin._id,
            updatedBy: admin._id,
          },
        },
        upsert: true,
      },
    }))
  );

  // Prefer a non-admin active user as the booker when available.
  const booker =
    (await User.findOne({ role: "Employee", status: "Active" }).select("_id").lean()) || admin;

  const roomA = await Resource.findOne({ resourceCode: "ROOM-A101" }).lean();
  const workspace = await Resource.findOne({ resourceCode: "WORKSPACE-01" }).lean();
  const trainingHall = await Resource.findOne({ resourceCode: "ROOM-B201" }).lean();

  // Non-overlapping sample bookings. Idempotent via resource+title+startTime.
  const sampleBookings = [
    roomA && {
      resource: roomA._id,
      title: "Sprint Planning Meeting",
      purpose: "Plan the upcoming sprint and allocate tasks.",
      startTime: futureAt(2, 10, 0),
      endTime: futureAt(2, 11, 0),
      attendeesCount: 8,
      status: "Confirmed",
    },
    roomA && {
      resource: roomA._id,
      title: "Client Demo",
      purpose: "Product demonstration for a prospective client.",
      startTime: futureAt(2, 11, 0),
      endTime: futureAt(2, 12, 0),
      attendeesCount: 6,
      status: "Confirmed",
    },
    workspace && {
      resource: workspace._id,
      title: "Team Working Session",
      purpose: "Collaborative development session for the platform team.",
      startTime: futureAt(3, 9, 30),
      endTime: futureAt(3, 12, 30),
      attendeesCount: 5,
      status: "Confirmed",
    },
    trainingHall && {
      resource: trainingHall._id,
      title: "Onboarding Workshop",
      purpose: "New joiner onboarding and orientation.",
      startTime: futureAt(5, 14, 0),
      endTime: futureAt(5, 17, 0),
      attendeesCount: 25,
      status: "Pending",
    },
  ].filter(Boolean);

  let createdBookings = 0;
  for (const b of sampleBookings) {
    const exists = await ResourceBooking.exists({
      resource: b.resource,
      title: b.title,
      startTime: b.startTime,
    });
    if (exists) continue;
    await ResourceBooking.create({
      ...b,
      bookedBy: booker._id,
      approvedBy: b.status === "Confirmed" ? admin._id : null,
      approvedAt: b.status === "Confirmed" ? new Date() : null,
    });
    createdBookings += 1;
  }

  const totalResources = await Resource.countDocuments();
  console.log("Stage 8 seed complete.");
  console.log(`  Resources upserted (new): ${resourceResult.upsertedCount}`);
  console.log(`  Resources total:          ${totalResources}`);
  console.log(`  Sample bookings created:  ${createdBookings}`);
};

run()
  .catch((error) => {
    console.error(`Resource and booking seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
