const mongoose = require("mongoose");
const { text, add, failIfInvalid } = require("./validationHelpers");
const { RESOURCE_TYPES, AVAILABILITY_STATUSES, RESOURCE_STATUSES } = require("../models/Resource");

const CODE_PATTERN = /^[A-Z0-9_-]+$/;
const present = (body, field) => Object.prototype.hasOwnProperty.call(body, field);

const validateBookingRules = (rules, errors) => {
  if (rules === undefined || rules === null) return;
  if (typeof rules !== "object" || Array.isArray(rules)) {
    add(errors, "bookingRules", "Booking rules must be an object");
    return;
  }

  const min = rules.minimumDurationMinutes;
  const max = rules.maximumDurationMinutes;
  const advance = rules.maximumAdvanceDays;

  if (min !== undefined) {
    const value = Number(min);
    if (!Number.isInteger(value) || value < 15) {
      add(errors, "bookingRules.minimumDurationMinutes", "Minimum duration must be an integer of at least 15 minutes");
    }
  }
  if (max !== undefined) {
    const value = Number(max);
    if (!Number.isInteger(value) || value < 15) {
      add(errors, "bookingRules.maximumDurationMinutes", "Maximum duration must be an integer of at least 15 minutes");
    }
  }
  if (min !== undefined && max !== undefined) {
    const minValue = Number(min);
    const maxValue = Number(max);
    if (Number.isInteger(minValue) && Number.isInteger(maxValue) && maxValue < minValue) {
      add(errors, "bookingRules.maximumDurationMinutes", "Maximum duration must be greater than or equal to minimum duration");
    }
  }
  if (advance !== undefined) {
    const value = Number(advance);
    if (!Number.isInteger(value) || value < 1 || value > 365) {
      add(errors, "bookingRules.maximumAdvanceDays", "Maximum advance days must be an integer between 1 and 365");
    }
  }
  if (rules.requiresApproval !== undefined && typeof rules.requiresApproval !== "boolean") {
    add(errors, "bookingRules.requiresApproval", "Requires approval must be a boolean");
  }
  if (rules.allowWeekendBookings !== undefined && typeof rules.allowWeekendBookings !== "boolean") {
    add(errors, "bookingRules.allowWeekendBookings", "Allow weekend bookings must be a boolean");
  }
  if (rules.instructions !== undefined) {
    rules.instructions = text(rules.instructions) || "";
    if (rules.instructions.length > 1000) {
      add(errors, "bookingRules.instructions", "Instructions must not exceed 1000 characters");
    }
  }
};

const validateResource = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];
    const isCreate = req.method === "POST";

    if (isCreate || present(body, "name")) {
      body.name = text(body.name);
      if (!body.name) add(errors, "name", "Resource name is required");
      else if (body.name.length < 2 || body.name.length > 150)
        add(errors, "name", "Resource name must be between 2 and 150 characters");
    }

    if (isCreate || present(body, "resourceCode")) {
      body.resourceCode = text(body.resourceCode)?.toUpperCase();
      if (!body.resourceCode) add(errors, "resourceCode", "Resource code is required");
      else if (body.resourceCode.length < 2 || body.resourceCode.length > 30)
        add(errors, "resourceCode", "Resource code must be between 2 and 30 characters");
      else if (!CODE_PATTERN.test(body.resourceCode))
        add(errors, "resourceCode", "Resource code may contain only letters, numbers, hyphens and underscores");
    }

    if (isCreate || present(body, "resourceType")) {
      if (!body.resourceType) add(errors, "resourceType", "Resource type is required");
      else if (!RESOURCE_TYPES.includes(body.resourceType))
        add(errors, "resourceType", `Resource type must be one of ${RESOURCE_TYPES.join(", ")}`);
    }

    if (present(body, "description")) {
      body.description = text(body.description) || "";
      if (body.description.length > 1000)
        add(errors, "description", "Description must not exceed 1000 characters");
    }

    if (isCreate || present(body, "capacity")) {
      const value = Number(body.capacity);
      if (!Number.isInteger(value) || value < 1 || value > 10000)
        add(errors, "capacity", "Capacity must be an integer between 1 and 10,000");
      else body.capacity = value;
    }

    if (isCreate || present(body, "location")) {
      body.location = text(body.location);
      if (!body.location) add(errors, "location", "Location is required");
      else if (body.location.length > 200)
        add(errors, "location", "Location must not exceed 200 characters");
    }

    if (present(body, "linkedAsset") && body.linkedAsset !== null && body.linkedAsset !== "") {
      if (!mongoose.isValidObjectId(body.linkedAsset))
        add(errors, "linkedAsset", "Invalid linked asset ID");
    }

    if (present(body, "availabilityStatus") && !AVAILABILITY_STATUSES.includes(body.availabilityStatus))
      add(errors, "availabilityStatus", "Availability status must be Available or Unavailable");

    if (present(body, "status") && !RESOURCE_STATUSES.includes(body.status))
      add(errors, "status", "Status must be Active or Inactive");

    if (present(body, "bookingRules")) validateBookingRules(body.bookingRules, errors);

    failIfInvalid(errors);
    req.body = body;
    next();
  } catch (error) {
    next(error);
  }
};

const validateResourceStatus = (req, res, next) => {
  try {
    const errors = [];
    if (!RESOURCE_STATUSES.includes(req.body.status))
      add(errors, "status", "Status must be Active or Inactive");
    failIfInvalid(errors);
    next();
  } catch (error) {
    next(error);
  }
};

const validateResourceAvailability = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];
    if (!AVAILABILITY_STATUSES.includes(body.availabilityStatus))
      add(errors, "availabilityStatus", "Availability status must be Available or Unavailable");

    body.reason = text(body.reason) || "";
    if (body.availabilityStatus === "Unavailable" && body.reason.length < 3)
      add(errors, "reason", "A reason of at least 3 characters is required when marking a resource unavailable");
    if (body.reason.length > 1000)
      add(errors, "reason", "Reason must not exceed 1000 characters");

    failIfInvalid(errors);
    req.body = body;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateResource,
  validateResourceStatus,
  validateResourceAvailability,
};
