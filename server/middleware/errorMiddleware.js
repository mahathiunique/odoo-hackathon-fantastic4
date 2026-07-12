const ApiError = require("../utils/ApiError");
const { sendError } = require("../utils/response");

const errorMiddleware = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === "development";

  let statusCode = 500;
  let message = "Internal server error";
  let errors = [];
  let recognized = false;

  if (err instanceof ApiError) {
    recognized = true;
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === "ValidationError") {
    recognized = true;
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === "MongoServerError" && err.code === 11000) {
    recognized = true;
    statusCode = 409;
    message = "A record with this value already exists";
    errors = Object.keys(err.keyPattern || {}).map((field) => ({ field, message: `${field} must be unique` }));
  } else if (err.name === "CastError") {
    recognized = true;
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.type === "entity.parse.failed") {
    recognized = true;
    statusCode = 400;
    message = "Invalid JSON body";
  } else if (err.isCorsError) {
    recognized = true;
    statusCode = 403;
    message = "CORS error: origin not allowed";
  }

  if (!recognized) {
    statusCode = 500;
    message = "Internal server error";
    errors = [];
  }

  if (statusCode >= 500) {
    console.error(
      `[${new Date().toISOString()}] Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`
    );
    if (isDevelopment) {
      console.error(err.stack);
    }
    message = isDevelopment ? message : "Internal server error";
    errors = isDevelopment ? errors : [];
  }

  sendError(res, message, errors, statusCode);
};

module.exports = errorMiddleware;
