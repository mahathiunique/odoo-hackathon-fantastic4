const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const departmentRoutes = require("./departmentRoutes");
const categoryRoutes = require("./categoryRoutes");
const employeeRoutes = require("./employeeRoutes");
const assetRoutes = require("./assetRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/departments", departmentRoutes);
router.use("/categories", categoryRoutes);
router.use("/employees", employeeRoutes);
router.use("/assets", assetRoutes);

module.exports = router;
