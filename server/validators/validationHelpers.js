const ApiError = require("../utils/ApiError");

const text = (value) => (typeof value === "string" ? value.trim() : value);
const add = (errors, field, message) => errors.push({ field, message });
const failIfInvalid = (errors) => {
  if (errors.length) throw new ApiError(400, "Validation failed", errors);
};

const validateStatus = (req, res, next) => {
  try {
    const errors = [];
    if (!["Active", "Inactive"].includes(req.body.status)) {
      add(errors, "status", "Status must be Active or Inactive");
    }
    failIfInvalid(errors);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { text, add, failIfInvalid, validateStatus };
