const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

const add = (errors, field, message) => errors.push({ field, message });
const validId = (value) => mongoose.isValidObjectId(value);
const validDate = (value) => value && !Number.isNaN(new Date(value).getTime());
const fail = (errors) => { if (errors.length) throw new ApiError(400, "Validation failed", errors); };
const middleware = (validator) => (req, res, next) => { try { validator(req.body || {}); next(); } catch (error) { next(error); } };

const validateCreatePayload = (body) => {
  const errors = [];
  if (!body.asset) add(errors, "asset", "Asset is required"); else if (!validId(body.asset)) add(errors, "asset", "Asset must be a valid ID");
  if (!["Employee", "Department"].includes(body.allocatedToType)) add(errors, "allocatedToType", "Allocation target type must be Employee or Department");
  const hasEmployee = Boolean(body.employee), hasDepartment = Boolean(body.department);
  if ((hasEmployee ? 1 : 0) + (hasDepartment ? 1 : 0) !== 1 || (body.allocatedToType === "Employee" && !hasEmployee) || (body.allocatedToType === "Department" && !hasDepartment)) add(errors, "allocatedToType", "Select exactly one allocation target: employee or department");
  if (hasEmployee && !validId(body.employee)) add(errors, "employee", "Employee must be a valid ID");
  if (hasDepartment && !validId(body.department)) add(errors, "department", "Department must be a valid ID");
  if (body.allocatedDate && !validDate(body.allocatedDate)) add(errors, "allocatedDate", "Allocated date must be valid");
  if (!body.expectedReturnDate) add(errors, "expectedReturnDate", "Expected return date is required"); else if (!validDate(body.expectedReturnDate)) add(errors, "expectedReturnDate", "Expected return date must be valid");
  if (validDate(body.expectedReturnDate) && validDate(body.allocatedDate || new Date()) && new Date(body.expectedReturnDate) < new Date(body.allocatedDate || new Date())) add(errors, "expectedReturnDate", "Expected return date cannot be earlier than allocated date");
  if (!body.purpose?.trim()) add(errors, "purpose", "Purpose is required"); else if (body.purpose.trim().length < 3 || body.purpose.trim().length > 500) add(errors, "purpose", "Purpose must be between 3 and 500 characters");
  if (body.notes && body.notes.length > 1000) add(errors, "notes", "Notes cannot exceed 1000 characters");
  fail(errors);
};

const validateReturnPayload = (body) => {
  const errors = [];
  if (!body.actualReturnDate) add(errors, "actualReturnDate", "Actual return date is required"); else if (!validDate(body.actualReturnDate)) add(errors, "actualReturnDate", "Actual return date must be valid");
  if (!["Excellent", "Good", "Fair", "Damaged", "Unusable"].includes(body.returnCondition)) add(errors, "returnCondition", "Return condition is required and must be valid");
  if (body.returnNotes && body.returnNotes.length > 1000) add(errors, "returnNotes", "Return notes cannot exceed 1000 characters");
  fail(errors);
};

module.exports = { validateCreatePayload, validateReturnPayload, validateCreateAllocation: middleware(validateCreatePayload), validateReturnAllocation: middleware(validateReturnPayload) };
