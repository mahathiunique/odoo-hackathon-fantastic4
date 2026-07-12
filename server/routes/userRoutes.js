const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  createUserValidation,
  updateUserValidation,
  statusValidation,
  resetPasswordValidation,
  objectIdValidation,
} = require("../validators/userValidator");
const userController = require("../controllers/userController");

const router = express.Router();

router.use(authMiddleware, authorizeRoles("Admin"));

router.get("/", userController.getUsers);
router.get("/:id", objectIdValidation, validateRequest, userController.getUserById);
router.post("/", createUserValidation, validateRequest, userController.createUser);
router.put("/:id", objectIdValidation, updateUserValidation, validateRequest, userController.updateUser);
router.patch("/:id/status", objectIdValidation, statusValidation, validateRequest, userController.changeUserStatus);
router.patch("/:id/reset-password", objectIdValidation, resetPasswordValidation, validateRequest, userController.resetUserPassword);
router.delete("/:id", objectIdValidation, validateRequest, userController.deactivateUser);

module.exports = router;
