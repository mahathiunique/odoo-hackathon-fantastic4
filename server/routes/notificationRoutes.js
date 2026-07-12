const express = require("express");
const rateLimit = require("express-rate-limit");
const { authenticate } = require("../integrations/authIntegration");
const controller = require("../controllers/notificationController");
const { validateNotificationQuery } = require("../validators/notificationValidator");

const router = express.Router();

router.use(authenticate);

// Limit repeated full refreshes: 10 per 5 minutes per user/IP.
const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  handler: (req, res) => {
    const { sendError } = require("../utils/response");
    sendError(res, "Too many refresh requests. Please try again shortly.", [], 429);
  },
});

// Order matters: static routes must be registered before "/:id".
router.get("/", validateNotificationQuery, controller.getNotifications);
router.get("/unread-count", controller.getUnreadCount);
router.post("/refresh", refreshLimiter, controller.refreshNotifications);
router.patch("/read-all", controller.markAllRead);
router.patch("/:id/read", controller.markRead);

module.exports = router;
