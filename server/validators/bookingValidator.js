const mongoose = require("mongoose");
const { text, add, failIfInvalid } = require("./validationHelpers");

const isValidDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const validateBooking = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];

    if (!body.resource) add(errors, "resource", "Resource is required");
    else if (!mongoose.isValidObjectId(body.resource))
      add(errors, "resource", "Invalid resource ID");

    body.title = text(body.title);
    if (!body.title) add(errors, "title", "Booking title is required");
    else if (body.title.length < 3 || body.title.length > 150)
      add(errors, "title", "Title must be between 3 and 150 characters");

    body.purpose = text(body.purpose);
    if (!body.purpose) add(errors, "purpose", "Purpose is required");
    else if (body.purpose.length < 3 || body.purpose.length > 1000)
      add(errors, "purpose", "Purpose must be between 3 and 1000 characters");

    if (!isValidDate(body.startTime)) add(errors, "startTime", "A valid start time is required");
    if (!isValidDate(body.endTime)) add(errors, "endTime", "A valid end time is required");
    if (isValidDate(body.startTime) && isValidDate(body.endTime)) {
      if (new Date(body.endTime) <= new Date(body.startTime))
        add(errors, "endTime", "End time must be after start time");
    }

    const attendees = Number(body.attendeesCount);
    if (!Number.isInteger(attendees) || attendees < 1)
      add(errors, "attendeesCount", "Attendees count must be a positive whole number");
    else body.attendeesCount = attendees;

    if (body.notes !== undefined) {
      body.notes = text(body.notes) || "";
      if (body.notes.length > 1000)
        add(errors, "notes", "Notes must not exceed 1000 characters");
    }

    failIfInvalid(errors);
    req.body = body;
    next();
  } catch (error) {
    next(error);
  }
};

const validateAvailabilityCheck = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];

    if (!body.resource) add(errors, "resource", "Resource is required");
    else if (!mongoose.isValidObjectId(body.resource))
      add(errors, "resource", "Invalid resource ID");

    if (!isValidDate(body.startTime)) add(errors, "startTime", "A valid start time is required");
    if (!isValidDate(body.endTime)) add(errors, "endTime", "A valid end time is required");
    if (isValidDate(body.startTime) && isValidDate(body.endTime)) {
      if (new Date(body.endTime) <= new Date(body.startTime))
        add(errors, "endTime", "End time must be after start time");
    }

    failIfInvalid(errors);
    req.body = body;
    next();
  } catch (error) {
    next(error);
  }
};

const validateCancel = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];
    body.cancelReason = text(body.cancelReason);
    if (!body.cancelReason) add(errors, "cancelReason", "A cancellation reason is required");
    else if (body.cancelReason.length < 3 || body.cancelReason.length > 1000)
      add(errors, "cancelReason", "Cancellation reason must be between 3 and 1000 characters");
    failIfInvalid(errors);
    req.body = body;
    next();
  } catch (error) {
    next(error);
  }
};

const MAX_CALENDAR_DAYS = 90;

const validateCalendarRange = (req, res, next) => {
  try {
    const { start, end } = req.query;
    const errors = [];
    if (!isValidDate(start)) add(errors, "start", "A valid start date is required");
    if (!isValidDate(end)) add(errors, "end", "A valid end date is required");
    if (isValidDate(start) && isValidDate(end)) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (endDate <= startDate) add(errors, "end", "End date must be after start date");
      else {
        const days = (endDate - startDate) / (1000 * 60 * 60 * 24);
        if (days > MAX_CALENDAR_DAYS)
          add(errors, "end", `The calendar range must not exceed ${MAX_CALENDAR_DAYS} days`);
      }
    }
    failIfInvalid(errors);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateBooking,
  validateAvailabilityCheck,
  validateCancel,
  validateCalendarRange,
  MAX_CALENDAR_DAYS,
};
