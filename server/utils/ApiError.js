class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.success = false;
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

module.exports = ApiError;
