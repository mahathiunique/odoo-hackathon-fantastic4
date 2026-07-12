const mongoose = require("mongoose");
const { text, add, failIfInvalid } = require("./validationHelpers");
const {
  MAINTENANCE_STATUSES,
  PRIORITIES,
  MAINTENANCE_TYPES,
  CANCELABLE_STATUSES,
} = require("../models/MaintenanceRequest");

const isValidDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const validateCreateMaintenance = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];

    if (!body.asset) add(errors, "asset", "Asset is required");
    else if (!isValidObjectId(body.asset)) add(errors, "asset", "Invalid asset ID");

    body.issueTitle = text(body.issueTitle);
    if (!body.issueTitle) add(errors, "issueTitle", "Issue title is required");
    else if (body.issueTitle.length < 3 || body.issueTitle.length > 150)
      add(errors, "issueTitle", "Issue title must be between 3 and 150 characters");

    body.issueDescription = text(body.issueDescription);
    if (!body.issueDescription) add(errors, "issueDescription", "Issue description is required");
    else if (body.issueDescription.length < 5 || body.issueDescription.length > 2000)
      add(errors, "issueDescription", "Issue description must be between 5 and 2000 characters");

    if (body.priority && !PRIORITIES.includes(body.priority))
      add(errors, "priority", "Invalid priority");
    if (body.maintenanceType && !MAINTENANCE_TYPES.includes(body.maintenanceType))
      add(errors, "maintenanceType", "Invalid maintenance type");

    if (body.assignedTo && !isValidObjectId(body.assignedTo))
      add(errors, "assignedTo", "Invalid assigned employee ID");

    if (body.scheduledDate && !isValidDate(body.scheduledDate))
      add(errors, "scheduledDate", "A valid scheduled date is required");

    if (body.cost !== undefined && body.cost !== null && body.cost !== "") {
      const cost = Number(body.cost);
      if (Number.isNaN(cost) || cost < 0) add(errors, "cost", "Cost must be a non-negative number");
      else body.cost = cost;
    }

    failIfInvalid(errors);
    req.body = body;
    next();
  } catch (error) {
    next(error);
  }
};

const EDITABLE_FIELDS = ["issueTitle", "issueDescription", "priority", "maintenanceType", "scheduledDate", "assignedTo", "cost"];

const validateUpdateMaintenance = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];

    Object.keys(body).forEach((key) => {
      if (!EDITABLE_FIELDS.includes(key)) add(errors, key, "This field cannot be updated here");
    });

    if (body.issueTitle !== undefined) {
      body.issueTitle = text(body.issueTitle);
      if (!body.issueTitle) add(errors, "issueTitle", "Issue title is required");
      else if (body.issueTitle.length < 3 || body.issueTitle.length > 150)
        add(errors, "issueTitle", "Issue title must be between 3 and 150 characters");
    }

    if (body.issueDescription !== undefined) {
      body.issueDescription = text(body.issueDescription);
      if (!body.issueDescription) add(errors, "issueDescription", "Issue description is required");
      else if (body.issueDescription.length < 5 || body.issueDescription.length > 2000)
        add(errors, "issueDescription", "Issue description must be between 5 and 2000 characters");
    }

    if (body.priority !== undefined && !PRIORITIES.includes(body.priority))
      add(errors, "priority", "Invalid priority");
    if (body.maintenanceType !== undefined && !MAINTENANCE_TYPES.includes(body.maintenanceType))
      add(errors, "maintenanceType", "Invalid maintenance type");
    if (body.assignedTo !== undefined && body.assignedTo !== null && !isValidObjectId(body.assignedTo))
      add(errors, "assignedTo", "Invalid assigned employee ID");
    if (body.scheduledDate !== undefined && body.scheduledDate !== null && !isValidDate(body.scheduledDate))
      add(errors, "scheduledDate", "A valid scheduled date is required");
    if (body.cost !== undefined && body.cost !== null && body.cost !== "") {
      const cost = Number(body.cost);
      if (Number.isNaN(cost) || cost < 0) add(errors, "cost", "Cost must be a non-negative number");
      else body.cost = cost;
    }

    failIfInvalid(errors);
    req.body = body;
    next();
  } catch (error) {
    next(error);
  }
};

const validateSchedule = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];
    if (!isValidDate(body.scheduledDate))
      add(errors, "scheduledDate", "A valid scheduled date is required");
    failIfInvalid(errors);
    req.body = { scheduledDate: new Date(body.scheduledDate) };
    next();
  } catch (error) {
    next(error);
  }
};

const validateStart = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];
    if (body.startedAt && !isValidDate(body.startedAt))
      add(errors, "startedAt", "A valid start date is required");
    failIfInvalid(errors);
    req.body = {
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
    };
    next();
  } catch (error) {
    next(error);
  }
};

const validateComplete = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];
    body.resolutionNotes = text(body.resolutionNotes);
    if (!body.resolutionNotes) add(errors, "resolutionNotes", "Resolution notes are required");
    else if (body.resolutionNotes.length > 2000)
      add(errors, "resolutionNotes", "Resolution notes cannot exceed 2000 characters");

    if (body.cost !== undefined && body.cost !== null && body.cost !== "") {
      const cost = Number(body.cost);
      if (Number.isNaN(cost) || cost < 0) add(errors, "cost", "Cost must be a non-negative number");
      else body.cost = cost;
    }
    if (body.downtimeHours !== undefined && body.downtimeHours !== null && body.downtimeHours !== "") {
      const hours = Number(body.downtimeHours);
      if (Number.isNaN(hours) || hours < 0) add(errors, "downtimeHours", "Downtime hours must be a non-negative number");
      else body.downtimeHours = hours;
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

const validateApprove = (req, res, next) => {
  try {
    const errors = [];
    const body = req.body || {};

    // Optional note for history/audit.
    body.note = text(body.note);

    failIfInvalid(errors);
    req.body = body;
    next();
  } catch (error) {
    next(error);
  }
};

const validateReject = (req, res, next) => {
  try {
    const errors = [];
    const body = req.body || {};

    body.rejectionReason = text(body.rejectionReason);
    if (!body.rejectionReason) add(errors, "rejectionReason", "Rejection reason is required");
    else if (body.rejectionReason.length < 3 || body.rejectionReason.length > 1000)
      add(errors, "rejectionReason", "Rejection reason must be between 3 and 1000 characters");

    failIfInvalid(errors);
    req.body = body;
    next();
  } catch (error) {
    next(error);
  }
};

const validateAssignTechnician = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];

    if (!body.assignedTo) add(errors, "assignedTo", "assignedTo is required");
    else if (!isValidObjectId(body.assignedTo)) add(errors, "assignedTo", "Invalid assigned employee ID");

    body.note = text(body.note);

    failIfInvalid(errors);
    req.body = body;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateCreateMaintenance,
  validateUpdateMaintenance,
  validateSchedule,
  validateStart,
  validateComplete,
  validateCancel,
  validateApprove,
  validateReject,
  validateAssignTechnician,
  MAINTENANCE_STATUSES,
  CANCELABLE_STATUSES,
  PRIORITIES,
  MAINTENANCE_TYPES,
};
