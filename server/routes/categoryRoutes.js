const express = require("express");
const controller = require("../controllers/categoryController");
const { authenticate, authorize } = require("../integrations/authIntegration");
const { validateCategory, validateCategoryStatus } = require("../validators/categoryValidator");

const router = express.Router();
router.use(authenticate);
router.get("/options", controller.getCategoryOptions);
router.get("/", controller.getCategories);
router.get("/:id", controller.getCategoryById);
router.post("/", authorize("Admin", "Asset Manager"), validateCategory, controller.createCategory);
router.put("/:id", authorize("Admin", "Asset Manager"), validateCategory, controller.updateCategory);
router.patch("/:id/status", authorize("Admin"), validateCategoryStatus, controller.changeCategoryStatus);
router.delete("/:id", authorize("Admin"), controller.deactivateCategory);

module.exports = router;
