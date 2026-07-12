const express = require("express");
const assetController = require("../controllers/assetController");
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { validateAssetCreatePayload, validateAssetUpdatePayload, validateAssetStatusPayload, validateAssetConditionPayload } = require("../validators/assetValidator");

const router = express.Router();
router.use(authMiddleware);

router.get("/options", assetController.getAssetOptions);
router.get("/stats", assetController.getAssetStats);
router.get("/:id/history", assetController.getAssetHistory);
router.get("/:id", assetController.getAssetById);
router.get("/", assetController.getAssets);

router.post("/", authorizeRoles("Admin", "Asset Manager"), (req, res, next) => {
  const errors = validateAssetCreatePayload(req.body);
  if (errors.length) return next(new (require("../utils/ApiError"))(400, "Validation failed", errors));
  req.body = req.body;
  next();
}, validateRequest, assetController.createAsset);

router.put("/:id", authorizeRoles("Admin", "Asset Manager"), (req, res, next) => {
  const errors = validateAssetUpdatePayload(req.body);
  if (errors.length) return next(new (require("../utils/ApiError"))(400, "Validation failed", errors));
  next();
}, validateRequest, assetController.updateAsset);

router.patch("/:id/status", (req, res, next) => {
  const errors = validateAssetStatusPayload(req.body);
  if (errors.length) return next(new (require("../utils/ApiError"))(400, "Validation failed", errors));
  next();
}, assetController.changeAssetStatus);

router.patch("/:id/condition", authorizeRoles("Admin", "Asset Manager", "Maintenance Manager"), (req, res, next) => {
  const errors = validateAssetConditionPayload(req.body);
  if (errors.length) return next(new (require("../utils/ApiError"))(400, "Validation failed", errors));
  next();
}, validateRequest, assetController.changeAssetCondition);

router.delete("/:id", authorizeRoles("Admin", "Asset Manager"), assetController.retireAsset);

module.exports = router;
