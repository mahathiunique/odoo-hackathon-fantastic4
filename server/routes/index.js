const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const departmentRoutes = require("./departmentRoutes");
const categoryRoutes = require("./categoryRoutes");
const employeeRoutes = require("./employeeRoutes");
const assetRoutes = require("./assetRoutes");
const allocationRoutes = require("./allocationRoutes");
const resourceRoutes = require("./resourceRoutes");
const bookingRoutes = require("./bookingRoutes");
const auditRoutes = require("./auditRoutes");
const maintenanceRoutes = require("./maintenanceRoutes");
// Stage 11 — Notifications, Activity Logs and Dashboard APIs
const notificationRoutes = require("./notificationRoutes");
const activityRoutes = require("./activityRoutes");
const dashboardRoutes = require("./dashboardRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/departments", departmentRoutes);
router.use("/categories", categoryRoutes);
router.use("/employees", employeeRoutes);
router.use("/assets", assetRoutes);
router.use("/allocations", allocationRoutes);

// Stage 8 — Shared Resources and Resource Booking
router.use("/resources", resourceRoutes);
router.use("/bookings", bookingRoutes);
router.use("/audits", auditRoutes);

// Stage 9 — Maintenance workflow
router.use("/maintenance", maintenanceRoutes);

// Stage 11 — Notifications, Activity Logs and Dashboard APIs
router.use("/notifications", notificationRoutes);
router.use("/activity", activityRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
