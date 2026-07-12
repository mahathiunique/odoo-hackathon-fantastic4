const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { loginValidation } = require("../validators/authValidator");
const rateLimit = require("express-rate-limit");
const config = require("../config/environment");

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again later.",
      errors: [],
    });
  },
});

router.post("/login", loginLimiter, loginValidation, validateRequest, authController.login);
router.get("/me", authMiddleware, authController.getCurrentUser);
router.post("/logout", authMiddleware, authController.logout);

module.exports = router;
