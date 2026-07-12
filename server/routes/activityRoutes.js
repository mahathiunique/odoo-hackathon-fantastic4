const express = require("express");
const { authenticate, authorize } = require("../integrations/authIntegration");
const controller = require("../controllers/activityController");
const { validateActivityQuery } = require("../validators/activityValidator");

const router = express.Router();

// Activity logs are read-only and restricted to managers/auditors.
router.use(authenticate);
router.use(authorize("Admin", "Asset Manager", "Maintenance Manager", "Auditor"));

router.get("/", validateActivityQuery, controller.listActivity);
router.get("/:id", controller.getActivityById);

module.exports = router;
