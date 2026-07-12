const ApiError = require("../utils/ApiError");
const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return next(new ApiError(401, "Authentication required"));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return next(new ApiError(401, "Invalid or expired token"));
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return next(new ApiError(401, "Invalid or expired token"));
    }

    if (user.status !== "Active") {
      return next(new ApiError(403, "Your account is inactive"));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;
