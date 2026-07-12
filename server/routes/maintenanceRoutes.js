const express = require("express");
const controller = require("../controllers/maintenanceController");
const { authenticate, authorize } = require("../integrations/authIntegration");
const {
  validateCreateMaintenance,
  validateUpdateMaintenance,
  validateSchedule,
  validateStart,
  validateComplete,
  validateCancel,
  validateApprove,
  validateReject,
  validateAssignTechnician,
} = require("../validators/maintenanceValidator");

const router = express.Router();

router.use(authenticate);

// Static routes must be registered before "/:id".
router.get("/my", controller.getMyMaintenance);
router.get("/stats", authorize("Admin", "Asset Manager", "Maintenance Manager", "Auditor"), controller.getStats);
router.get("/assets", controller.getAssetOptions);
router.get("/", controller.getMaintenance);

router.post("/", validateCreateMaintenance, controller.createMaintenance);

router.get("/:id", controller.getMaintenanceById);
router.patch("/:id", authorize("Admin", "Asset Manager", "Maintenance Manager"), validateUpdateMaintenance, controller.updateMaintenance);
router.patch("/:id/approve", authorize("Admin", "Asset Manager", "Maintenance Manager"), validateApprove, controller.approveMaintenance);
router.patch("/:id/reject", authorize("Admin", "Asset Manager", "Maintenance Manager"), validateReject, controller.rejectMaintenance);
router.patch("/:id/assign-technician", authorize("Admin", "Asset Manager", "Maintenance Manager"), validateAssignTechnician, controller.assignTechnician);
router.patch("/:id/schedule", authorize("Admin", "Asset Manager", "Maintenance Manager"), validateSchedule, controller.scheduleMaintenance);
router.patch("/:id/start", authorize("Admin", "Asset Manager", "Maintenance Manager"), validateStart, controller.startMaintenance);
router.patch("/:id/complete", authorize("Admin", "Asset Manager", "Maintenance Manager"), validateComplete, controller.completeMaintenance);
router.patch("/:id/cancel", validateCancel, controller.cancelMaintenance);


module.exports = router;
