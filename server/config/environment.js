require("dotenv").config();

const requiredVars = ["MONGODB_URI"];

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}. Please check your .env file.`
    );
  }
});

const parseInteger = (raw, fallback, { min, max }, name) => {
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }
  const num = Number(raw);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new Error(
      `Invalid ${name} value "${raw}". Expected an integer between ${min} and ${max}.`
    );
  }
  return num;
};

const port = parseInteger(process.env.PORT, 5000, { min: 1, max: 65535 }, "PORT");
const nodeEnv = process.env.NODE_ENV || "development";
const mongoUri = process.env.MONGODB_URI;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5174";
const apiPrefix = process.env.API_PREFIX || "/api";
const rateLimitWindowMs = parseInteger(
  process.env.RATE_LIMIT_WINDOW_MS,
  900000,
  { min: 1, max: Number.MAX_SAFE_INTEGER },
  "RATE_LIMIT_WINDOW_MS"
);
const rateLimitMaxRequests = parseInteger(
  process.env.RATE_LIMIT_MAX_REQUESTS,
  200,
  { min: 1, max: Number.MAX_SAFE_INTEGER },
  "RATE_LIMIT_MAX_REQUESTS"
);

module.exports = {
  port,
  nodeEnv,
  mongoUri,
  clientUrl,
  apiPrefix,
  rateLimitWindowMs,
  rateLimitMaxRequests,
};
