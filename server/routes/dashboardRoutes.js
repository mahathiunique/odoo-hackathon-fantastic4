const express = require("express");
const { authenticate } = require("../integrations/authIntegration");
const controller = require("../controllers/dashboardController");

const router = express.Router();

router.use(authenticate);
router.get("/", controller.getDashboardOverview);

module.exports = router;
