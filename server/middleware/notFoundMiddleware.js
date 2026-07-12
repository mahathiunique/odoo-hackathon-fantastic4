const { sendError } = require("../utils/response");

const notFoundMiddleware = (req, res) => {
  const message = `Route ${req.method} ${req.originalUrl} not found`;
  sendError(res, message, [], 404);
};

module.exports = notFoundMiddleware;
