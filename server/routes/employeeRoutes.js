const express = require("express");
const {
  getEmployees,
  getEmployeeOptions,
  getMyEmployeeProfile,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  changeEmployeeStatus,
  linkUserAccount,
  deactivateEmployee,
} = require("../controllers/employeeController");
const { authMiddleware, authorize } = require("../middleware/auth");
const { validateBody } = require("../validators/employeeValidator");

const router = express.Router();

router.use(authMiddleware);

router.get("/options", (req, res, next) => {
  Promise.resolve(getEmployeeOptions(req, res, next)).catch(next);
});

router.get("/me", (req, res, next) => {
  Promise.resolve(getMyEmployeeProfile(req, res, next)).catch(next);
});

router.get("/", (req, res, next) => {
  Promise.resolve(getEmployees(req, res, next)).catch(next);
});

router.get("/:id", (req, res, next) => {
  Promise.resolve(getEmployeeById(req, res, next)).catch(next);
});

router.post("/", authorize("Admin", "Asset Manager"), validateBody("create"), (req, res, next) => {
  Promise.resolve(createEmployee(req, res, next)).catch(next);
});

router.put("/:id", authorize("Admin", "Asset Manager"), validateBody("update"), (req, res, next) => {
  Promise.resolve(updateEmployee(req, res, next)).catch(next);
});

router.patch("/:id/status", authorize("Admin"), validateBody("status"), (req, res, next) => {
  Promise.resolve(changeEmployeeStatus(req, res, next)).catch(next);
});

router.patch("/:id/link-user", authorize("Admin"), validateBody("linkUser"), (req, res, next) => {
  Promise.resolve(linkUserAccount(req, res, next)).catch(next);
});

router.delete("/:id", authorize("Admin"), (req, res, next) => {
  Promise.resolve(deactivateEmployee(req, res, next)).catch(next);
});

module.exports = router;
