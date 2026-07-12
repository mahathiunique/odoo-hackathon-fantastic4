const User = require("../models/User");
const { comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");

const loginUser = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user || !(await comparePassword(password, user.password))) {
    throw new ApiError(401, "Invalid email or password", []);
  }

  if (user.status !== "Active") {
    throw new ApiError(403, "Your account is inactive");
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken({ userId: user._id.toString(), role: user.role });
  const safeUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLogin: user.lastLogin,
  };

  return { token, user: safeUser };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.status !== "Active") {
    throw new ApiError(403, "Your account is inactive");
  }

  return user;
};

module.exports = {
  loginUser,
  getCurrentUser,
};
