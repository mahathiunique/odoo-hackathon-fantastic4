const { sendSuccess } = require("../utils/response");
const healthService = require("../services/healthService");

const getHealth = (req, res) => {
  const data = healthService.getHealthData();
  const httpStatus = data.status === "healthy" ? 200 : 503;
  const message =
    httpStatus === 200
      ? "AssetFlow backend is healthy"
      : "AssetFlow backend is unhealthy";
  return sendSuccess(res, message, data, httpStatus);
};

module.exports = {
  getHealth,
};
