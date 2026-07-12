const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const departmentRoutes = require("./departmentRoutes");
const categoryRoutes = require("./categoryRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/departments", departmentRoutes);
router.use("/categories", categoryRoutes);

module.exports = router;
