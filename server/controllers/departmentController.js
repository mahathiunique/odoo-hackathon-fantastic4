const departmentService = require("../services/departmentService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { auditLog, userIdFrom } = require("../services/organizationQuery");
const activityService = require("../services/activityService");

const getDepartments = asyncHandler(async (req, res) => {
  sendSuccess(res, "Departments retrieved successfully", await departmentService.list(req.query, req.user));
});
const getDepartmentOptions = asyncHandler(async (req, res) => {
  sendSuccess(res, "Department options retrieved successfully", await departmentService.options());
});
const getDepartmentById = asyncHandler(async (req, res) => {
  sendSuccess(res, "Department retrieved successfully", { department: await departmentService.getById(req.params.id, req.user) });
});
const createDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.create(req.body, req.user);
  auditLog("department.created", department._id, userIdFrom(req.user));
  activityService.recordActivityFromRequest(req, { action: "Department Created", entityType: "Department", entityId: department._id, description: `Created department ${department.name} (${department.code})`, metadata: { code: department.code } });
  sendSuccess(res, "Department created successfully", { department }, 201);
});
const updateDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.update(req.params.id, req.body, req.user);
  auditLog("department.updated", department._id, userIdFrom(req.user));
  activityService.recordActivityFromRequest(req, { action: "Department Updated", entityType: "Department", entityId: department._id, description: `Updated department ${department.name}`, metadata: { code: department.code } });
  sendSuccess(res, "Department updated successfully", { department });
});
const changeDepartmentStatus = asyncHandler(async (req, res) => {
  const department = await departmentService.changeStatus(req.params.id, req.body.status, req.user);
  auditLog("department.status_changed", department._id, userIdFrom(req.user));
  activityService.recordActivityFromRequest(req, { action: "Department Status Changed", entityType: "Department", entityId: department._id, description: `Department ${department.name} set to ${req.body.status}`, metadata: { status: department.status } });
  sendSuccess(res, `Department ${req.body.status.toLowerCase()} successfully`, { department });
});
const deactivateDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.changeStatus(req.params.id, "Inactive", req.user);
  auditLog("department.status_changed", department._id, userIdFrom(req.user));
  activityService.recordActivityFromRequest(req, { action: "Department Status Changed", entityType: "Department", entityId: department._id, description: `Department ${department.name} set to Inactive`, metadata: { status: department.status } });
  sendSuccess(res, "Department deactivated successfully", { department });
});

module.exports = { getDepartments, getDepartmentOptions, getDepartmentById, createDepartment, updateDepartment, changeDepartmentStatus, deactivateDepartment };
