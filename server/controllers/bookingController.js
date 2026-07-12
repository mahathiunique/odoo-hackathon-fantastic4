const bookingService = require("../services/bookingService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { auditLog, userIdFrom } = require("../services/organizationQuery");
const activityService = require("../services/activityService");

const getBookings = asyncHandler(async (req, res) => {
  sendSuccess(res, "Bookings retrieved successfully", await bookingService.listBookings(req.query, req.user));
});

const getMyBookings = asyncHandler(async (req, res) => {
  sendSuccess(res, "My bookings retrieved successfully", await bookingService.getMyBookings(req.query, req.user));
});

const getCalendarBookings = asyncHandler(async (req, res) => {
  sendSuccess(res, "Calendar bookings retrieved successfully", await bookingService.getCalendarBookings(req.query, req.user));
});

const getBookingStats = asyncHandler(async (req, res) => {
  sendSuccess(res, "Booking statistics retrieved successfully", await bookingService.getStats());
});

const getBookingById = asyncHandler(async (req, res) => {
  sendSuccess(res, "Booking retrieved successfully", {
    booking: await bookingService.getBookingById(req.params.id, req.user),
  });
});

const checkAvailability = asyncHandler(async (req, res) => {
  const result = await bookingService.checkAvailability(req.body, req.user);
  const message = result.available ? "Resource is available" : "Resource is unavailable for the selected time";
  sendSuccess(res, message, result);
});

const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.body, req.user);
  auditLog("booking.created", booking._id, userIdFrom(req.user));
  activityService.recordActivityFromRequest(req, { action: "Booking Created", entityType: "ResourceBooking", entityId: booking._id, description: `Created booking ${booking.title} (${booking.status})`, metadata: { status: booking.status, resource: booking.resource?._id } });
  const message =
    booking.status === "Pending"
      ? "Booking created and is pending approval"
      : "Booking created and confirmed successfully";
  sendSuccess(res, message, { booking }, 201);
});

const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.confirmBooking(req.params.id, req.user);
  auditLog("booking.confirmed", booking._id, userIdFrom(req.user));
  activityService.recordActivityFromRequest(req, { action: "Booking Confirmed", entityType: "ResourceBooking", entityId: booking._id, description: `Confirmed booking ${booking.title}`, metadata: { bookedBy: booking.bookedBy?._id } });
  sendSuccess(res, "Booking confirmed successfully", { booking });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.body.cancelReason, req.user);
  auditLog("booking.cancelled", booking._id, userIdFrom(req.user));
  activityService.recordActivityFromRequest(req, { action: "Booking Cancelled", entityType: "ResourceBooking", entityId: booking._id, description: `Cancelled booking ${booking.title}`, metadata: { bookedBy: booking.bookedBy?._id, cancelledBy: booking.cancelledBy?._id } });
  sendSuccess(res, "Booking cancelled successfully", { booking });
});

const completeBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.completeBooking(req.params.id, req.user);
  auditLog("booking.completed", booking._id, userIdFrom(req.user));
  activityService.recordActivityFromRequest(req, { action: "Booking Completed", entityType: "ResourceBooking", entityId: booking._id, description: `Completed booking ${booking.title}`, metadata: { bookedBy: booking.bookedBy?._id } });
  sendSuccess(res, "Booking completed successfully", { booking });
});

module.exports = {
  getBookings,
  getMyBookings,
  getCalendarBookings,
  getBookingStats,
  getBookingById,
  checkAvailability,
  createBooking,
  confirmBooking,
  cancelBooking,
  completeBooking,
};
