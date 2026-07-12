const express = require("express");
const controller = require("../controllers/resourceController");
const { authenticate, authorize } = require("../integrations/authIntegration");
const {
  validateResource,
  validateResourceStatus,
  validateResourceAvailability,
} = require("../validators/resourceValidator");

const router = express.Router();

router.use(authenticate);

// Static routes must be registered before "/:id".
router.get("/options", controller.getResourceOptions);
router.get("/", controller.getResources);
router.get("/:id", controller.getResourceById);

router.post("/", authorize("Admin", "Asset Manager"), validateResource, controller.createResource);
router.put("/:id", authorize("Admin", "Asset Manager"), validateResource, controller.updateResource);
router.patch("/:id/status", authorize("Admin"), validateResourceStatus, controller.changeResourceStatus);
router.patch(
  "/:id/availability",
  authorize("Admin", "Asset Manager"),
  validateResourceAvailability,
  controller.changeResourceAvailability
);
router.delete("/:id", authorize("Admin"), controller.deactivateResource);

module.exports = router;
