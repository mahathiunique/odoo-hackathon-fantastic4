const mongoose = require("mongoose");
const config = require("../config/environment");
const { connectionStates } = require("../config/database");

const getHealthData = () => {
  const readyState = mongoose.connection.readyState;
  const dbStatus = connectionStates[readyState] || "unknown";

  const memoryUsage = process.memoryUsage();

  const status = dbStatus === "connected" ? "healthy" : "unhealthy";

  return {
    status,
    uptime: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    frontendUrl: config.clientUrl,
    database: {
      status: dbStatus,
    },
    runtime: {
      nodeVersion: process.version,
      memoryUsage: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
      },
    },
  };
};

module.exports = {
  getHealthData,
};
