const http = require("http");
const app = require("./app");
const config = require("./config/environment");
const { connectDatabase } = require("./config/database");

let server;

const SHUTDOWN_TIMEOUT_MS = 10000;

const startServer = async () => {
  await connectDatabase();

  server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.on("error", (err) => {
      console.error("Server failed to start:", err.message);
      reject(err);
    });

    server.listen(config.port, () => {
      console.log(`AssetFlow server running on http://localhost:${config.port}`);
      console.log(`Frontend allowed from ${config.clientUrl}`);
      console.log(
        `Health check available at http://localhost:${config.port}${config.apiPrefix}/health`
      );
      resolve();
    });
  });
};

const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  if (server) {
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn("Forcing HTTP server close after shutdown timeout.");
        resolve();
      }, SHUTDOWN_TIMEOUT_MS);

      server.close(() => {
        clearTimeout(timer);
        console.log("HTTP server closed.");
        resolve();
      });
    });
  }

  try {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err.message);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  shutdown("unhandledRejection");
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
  shutdown("uncaughtException");
});

startServer().catch((err) => {
  console.error("Failed to start AssetFlow server:", err.message);
  process.exit(1);
});
