const express = require("express");
const controller = require("../controllers/bookingController");
const { authenticate, authorize } = require("../integrations/authIntegration");
const {
  validateBooking,
  validateAvailabilityCheck,
  validateCancel,
  validateCalendarRange,
} = require("../validators/bookingValidator");

const router = express.Router();

router.use(authenticate);

// Static routes must be registered before "/:id".
router.get("/my", controller.getMyBookings);
router.get("/calendar", validateCalendarRange, controller.getCalendarBookings);
router.get("/stats", authorize("Admin", "Asset Manager"), controller.getBookingStats);
router.get(
  "/",
  authorize("Admin", "Asset Manager", "Maintenance Manager", "Auditor"),
  controller.getBookings
);

router.post("/check-availability", validateAvailabilityCheck, controller.checkAvailability);
router.post("/", authorize("Admin", "Asset Manager", "Employee"), validateBooking, controller.createBooking);

router.get("/:id", controller.getBookingById);
router.patch("/:id/confirm", authorize("Admin", "Asset Manager"), controller.confirmBooking);
router.patch("/:id/cancel", validateCancel, controller.cancelBooking);
router.patch("/:id/complete", authorize("Admin", "Asset Manager"), controller.completeBooking);

module.exports = router;
