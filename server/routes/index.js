const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const departmentRoutes = require("./departmentRoutes");
const categoryRoutes = require("./categoryRoutes");
const employeeRoutes = require("./employeeRoutes");

const router = express.Router();

router.use("/health", healthRoutes);

module.exports = router;
