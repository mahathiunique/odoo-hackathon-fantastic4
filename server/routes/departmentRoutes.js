const express = require("express");
const controller = require("../controllers/departmentController");
const { authenticate, authorize } = require("../integrations/authIntegration");
const { validateDepartment, validateDepartmentStatus } = require("../validators/departmentValidator");

const router = express.Router();
router.use(authenticate);
router.get("/options", controller.getDepartmentOptions);
router.get("/", controller.getDepartments);
router.get("/:id", controller.getDepartmentById);
router.post("/", authorize("Admin"), validateDepartment, controller.createDepartment);
router.put("/:id", authorize("Admin"), validateDepartment, controller.updateDepartment);
router.patch("/:id/status", authorize("Admin"), validateDepartmentStatus, controller.changeDepartmentStatus);
router.delete("/:id", authorize("Admin"), controller.deactivateDepartment);

module.exports = router;
