const mongoose = require("mongoose");
const config = require("./environment");

const connectionStates = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

const connectDatabase = async () => {
  try {
    await mongoose.connect(config.mongoUri);

    const { host, name } = mongoose.connection;
    console.log("MongoDB connected successfully");
    console.log(`MongoDB host: ${host}`);
    console.log(`Database: ${name}`);

    mongoose.connection.on("connected", () => {
      console.log("MongoDB connection established");
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB connection disconnected");
    });
  } catch (error) {
    console.error("MongoDB initial connection failed:", error.message);
    throw error;
  }
};

module.exports = {
  connectDatabase,
  connectionStates,
};
