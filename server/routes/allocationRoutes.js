const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const controller = require("../controllers/allocationController");
const { validateCreateAllocation, validateReturnAllocation } = require("../validators/allocationValidator");

const router = express.Router();
router.use(authMiddleware);
router.get("/my", authorizeRoles("Employee"), controller.getMyAllocations);
router.get("/overdue", authorizeRoles("Admin", "Asset Manager", "Auditor"), controller.getOverdueAllocations);
router.get("/stats", authorizeRoles("Admin", "Asset Manager"), controller.getAllocationStats);
router.get("/", authorizeRoles("Admin", "Asset Manager", "Maintenance Manager", "Auditor"), controller.getAllocations);
router.post("/", authorizeRoles("Admin", "Asset Manager"), validateCreateAllocation, controller.createAllocation);
router.get("/:id", authorizeRoles("Admin", "Asset Manager", "Maintenance Manager", "Auditor", "Employee"), controller.getAllocationById);
router.patch("/:id/return", authorizeRoles("Admin", "Asset Manager"), validateReturnAllocation, controller.returnAllocation);

module.exports = router;
