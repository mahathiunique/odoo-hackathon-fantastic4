const express = require("express");
const controller = require("../controllers/auditController");
const { authenticate, authorize } = require("../integrations/authIntegration");
const {
  validateAudit,
  validateVerify,
  validateAssign,
  validateComplete,
  validateCancel,
  validateFinding,
} = require("../validators/auditValidator");

const router = express.Router();

// Read-only roles have organization-wide visibility of Audit Cycles.
const READ_ROLES = ["Admin", "Auditor", "Asset Manager", "Maintenance Manager"];

router.use(authenticate);

// Static routes must be registered before the "/:id" parameterized routes so
// that "/my", "/stats", and "/auditor-options" are never matched as an id.
router.get("/my", authorize("Admin", "Auditor"), controller.getMyAudits);
router.get("/stats", authorize(...READ_ROLES), controller.getAuditStats);
router.get("/auditor-options", authorize("Admin"), controller.getAuditorOptions);
router.get("/", authorize(...READ_ROLES), controller.getAudits);

router.post("/", authorize("Admin"), validateAudit, controller.createAudit);

router.get("/:id", authorize(...READ_ROLES), controller.getAuditById);
router.get("/:id/items", authorize(...READ_ROLES), controller.getAuditItems);
router.get("/:id/report", authorize(...READ_ROLES), controller.getAuditReport);

router.post(
  "/:id/unregistered-findings",
  authorize("Admin", "Auditor"),
  validateFinding,
  controller.createUnregisteredFinding
);

router.put("/:id", authorize("Admin"), validateAudit, controller.updateAudit);

router.patch("/:id/start", authorize("Admin"), controller.startAudit);
router.patch("/:id/cancel", authorize("Admin"), validateCancel, controller.cancelAudit);
router.patch("/:id/complete", authorize("Admin"), validateComplete, controller.completeAudit);
router.patch(
  "/:id/items/:itemId/assign",
  authorize("Admin"),
  validateAssign,
  controller.assignAuditItem
);
router.patch(
  "/:id/items/:itemId/verify",
  authorize("Admin", "Auditor"),
  validateVerify,
  controller.verifyAuditItem
);

module.exports = router;
