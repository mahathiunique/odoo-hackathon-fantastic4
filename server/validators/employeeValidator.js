const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const validateBody = (type) => {
  return async (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    if (type === "create" || type === "update") {
      if (!body.employeeId || String(body.employeeId).trim() === "") {
        errors.push({ field: "employeeId", message: "Employee ID is required" });
      } else {
        const empId = String(body.employeeId).trim().toUpperCase();
        if (empId.length < 2 || empId.length > 30) {
          errors.push({ field: "employeeId", message: "Employee ID must be between 2 and 30 characters" });
        } else if (!/^[A-Z0-9_-]+$/.test(empId)) {
          errors.push({ field: "employeeId", message: "Employee ID may contain only letters, numbers, hyphens and underscores" });
        }
      }

      if (!body.name || String(body.name).trim() === "") {
        errors.push({ field: "name", message: "Name is required" });
      } else {
        const trimmed = String(body.name).trim();
        if (trimmed.length < 2 || trimmed.length > 120) {
          errors.push({ field: "name", message: "Name must be between 2 and 120 characters" });
        }
      }

      if (!body.email || String(body.email).trim() === "") {
        errors.push({ field: "email", message: "Email is required" });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        errors.push({ field: "email", message: "Please provide a valid email" });
      }

      if (body.phone && String(body.phone).trim().length > 20) {
        errors.push({ field: "phone", message: "Phone must not exceed 20 characters" });
      } else if (body.phone && !/^[0-9\s+-]+$/.test(body.phone.trim())) {
        errors.push({ field: "phone", message: "Phone may contain only digits, spaces, plus sign and hyphen" });
      }

      if (!body.designation || String(body.designation).trim() === "") {
        errors.push({ field: "designation", message: "Designation is required" });
      } else if (body.designation.trim().length > 100) {
        errors.push({ field: "designation", message: "Designation must not exceed 100 characters" });
      }

      if (!body.department) {
        errors.push({ field: "department", message: "Department is required" });
      } else if (!mongoose.Types.ObjectId.isValid(body.department)) {
        errors.push({ field: "department", message: "Invalid department ID" });
      }

      if (!body.joiningDate) {
        errors.push({ field: "joiningDate", message: "Joining date is required" });
      } else {
        const date = new Date(body.joiningDate);
        if (isNaN(date.getTime())) {
          errors.push({ field: "joiningDate", message: "Invalid joining date" });
        } else {
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          if (date > oneYearFromNow) {
            errors.push({ field: "joiningDate", message: "Joining date cannot be more than one year in the future" });
          }
        }
      }

      if (body.status && !["Active", "Inactive"].includes(body.status)) {
        errors.push({ field: "status", message: "Status must be Active or Inactive" });
      }

      if (body.userAccount !== undefined && body.userAccount !== null && String(body.userAccount).trim() !== "") {
        if (!mongoose.Types.ObjectId.isValid(body.userAccount)) {
          errors.push({ field: "userAccount", message: "Invalid user account ID" });
        }
      }
    }

    if (type === "status") {
      if (!body.status || !["Active", "Inactive"].includes(body.status)) {
        errors.push({ field: "status", message: "Status must be Active or Inactive" });
      }
    }

    if (type === "linkUser") {
      if (body.userAccount !== undefined && body.userAccount !== null && String(body.userAccount).trim() !== "") {
        if (!mongoose.Types.ObjectId.isValid(body.userAccount)) {
          errors.push({ field: "userAccount", message: "Invalid user account ID" });
        }
      }
    }

    if (errors.length > 0) {
      const err = new ApiError(400, "Validation failed", errors);
      return next(err);
    }

    next();
  };
};

module.exports = {
  validateBody,
};
