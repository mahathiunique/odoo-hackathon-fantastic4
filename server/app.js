const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const config = require("./config/environment");
const { sendError } = require("./utils/response");
const requestLogger = require("./middleware/requestLogger");
const notFoundMiddleware = require("./middleware/notFoundMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");
const apiRoutes = require("./routes/index");

const app = express();

app.use(helmet());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin === config.clientUrl) {
      callback(null, true);
    } else {
      const corsError = new Error(
        `CORS error: origin '${origin}' is not allowed by AssetFlow`
      );
      corsError.isCorsError = true;
      callback(corsError);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  morgan("dev", {
    skip: (req, res) => config.nodeEnv === "production",
  })
);

app.use(requestLogger);

const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(
      res,
      "Too many requests. Please try again later.",
      [],
      429
    );
  },
});

app.use(config.apiPrefix, apiLimiter);

app.get("/", (req, res) => {
  const { sendSuccess } = require("./utils/response");
  sendSuccess(res, "AssetFlow API is running", {
    name: "AssetFlow API",
    version: "1.0.0",
    environment: config.nodeEnv,
    frontendUrl: config.clientUrl,
  });
});

app.use(config.apiPrefix, apiRoutes);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

module.exports = app;
