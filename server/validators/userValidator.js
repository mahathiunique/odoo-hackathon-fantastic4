const { body, param } = require("express-validator");

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const createUserValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Please enter a valid email address"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .matches(strongPassword)
    .withMessage("Password must include uppercase, lowercase, number, and special character"),
  body("role")
    .optional()
    .isIn(["Admin", "Asset Manager", "Maintenance Manager", "Auditor", "Employee"])
    .withMessage("Please choose a valid role"),
  body("status")
    .optional()
    .isIn(["Active", "Inactive"])
    .withMessage("Please choose a valid status"),
  body("phone")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Phone must be a string"),
];

const updateUserValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().trim().isEmail().withMessage("Please enter a valid email address"),
  body("role").optional().isIn(["Admin", "Asset Manager", "Maintenance Manager", "Auditor", "Employee"]).withMessage("Please choose a valid role"),
  body("status").optional().isIn(["Active", "Inactive"]).withMessage("Please choose a valid status"),
  body("phone").optional({ values: "falsy" }).isString().withMessage("Phone must be a string"),
];

const statusValidation = [
  body("status").notEmpty().withMessage("Status is required").isIn(["Active", "Inactive"]).withMessage("Please choose a valid status"),
];

const resetPasswordValidation = [
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .matches(strongPassword)
    .withMessage("Password must include uppercase, lowercase, number, and special character"),
];

const objectIdValidation = [
  param("id").isMongoId().withMessage("Invalid user id"),
];

module.exports = {
  createUserValidation,
  updateUserValidation,
  statusValidation,
  resetPasswordValidation,
  objectIdValidation,
};
