const sendSuccess = (
  res,
  message = "Operation completed successfully",
  data = {},
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (
  res,
  message = "An error occurred",
  errors = [],
  statusCode = 500
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
