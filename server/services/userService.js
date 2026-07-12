const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { hashPassword } = require("../utils/password");

const buildUserQuery = ({ search, role, status }) => {
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role) {
    query.role = role;
  }

  if (status) {
    query.status = status;
  }

  return query;
};

const getUsers = async ({ page = 1, limit = 10, search, role, status, sortBy = "createdAt", sortOrder = "desc" }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 10);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const query = buildUserQuery({ search, role, status });
  const totalRecords = await User.countDocuments(query);
  const users = await User.find(query)
    .select("-password")
    .sort(sort)
    .skip((safePage - 1) * safeLimit)
    .limit(safeLimit);

  return {
    users,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalRecords,
      totalPages: Math.max(1, Math.ceil(totalRecords / safeLimit)),
    },
  };
};

const getUserById = async (id) => {
  const user = await User.findById(id).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
};

const createUser = async ({ name, email, password, role, status, phone, avatar }, createdBy) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ApiError(409, "A user with this email already exists");
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role,
    status,
    phone,
    avatar,
    createdBy,
  });

  return user.toObject();
};

const updateUser = async (id, updates, currentUser) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (updates.role || updates.status) {
    const adminCount = await User.countDocuments({ role: "Admin", status: "Active" });
    const isAdminUser = user.role === "Admin";
    const willBeAdmin = updates.role === "Admin" || (updates.role ? false : isAdminUser);
    const willBeInactive = updates.status === "Inactive" || (updates.status ? false : user.status === "Inactive");

    if (isAdminUser && (willBeAdmin === false || willBeInactive)) {
      if (adminCount <= 1) {
        throw new ApiError(400, "At least one active Admin account must remain");
      }
    }
  }

  if (updates.email) {
    const existing = await User.findOne({ email: updates.email.toLowerCase().trim() });
    if (existing && existing._id.toString() !== id) {
      throw new ApiError(409, "A user with this email already exists");
    }
  }

  Object.assign(user, updates);
  await user.save();
  return user.toObject();
};

const changeUserStatus = async (id, status, currentUser) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user._id.toString() === currentUser._id.toString()) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }

  if (user.role === "Admin" && status === "Inactive") {
    const adminCount = await User.countDocuments({ role: "Admin", status: "Active" });
    if (adminCount <= 1) {
      throw new ApiError(400, "At least one active Admin account must remain");
    }
  }

  user.status = status;
  await user.save();
  return user.toObject();
};

const resetUserPassword = async (id, newPassword) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();
  return user.toObject();
};

const deactivateUser = async (id, currentUser) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user._id.toString() === currentUser._id.toString()) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }

  if (user.role === "Admin") {
    const adminCount = await User.countDocuments({ role: "Admin", status: "Active" });
    if (adminCount <= 1) {
      throw new ApiError(400, "At least one active Admin account must remain");
    }
  }

  user.status = "Inactive";
  await user.save();
  return user.toObject();
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserStatus,
  resetUserPassword,
  deactivateUser,
};
