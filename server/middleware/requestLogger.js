const config = require("../config/environment");

const requestLogger = (req, res, next) => {
  if (config.nodeEnv === "development") {
    return next();
  }

  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const responseTimeMs = (diff[0] * 1e3 + diff[1] / 1e6).toFixed(2);
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${responseTimeMs}ms`
    );
  });

  next();
};

module.exports = requestLogger;
