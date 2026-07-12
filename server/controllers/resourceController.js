const resourceService = require("../services/resourceService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { auditLog, userIdFrom } = require("../services/organizationQuery");

const getResources = asyncHandler(async (req, res) => {
  sendSuccess(res, "Resources retrieved successfully", await resourceService.list(req.query, req.user));
});

const getResourceOptions = asyncHandler(async (req, res) => {
  sendSuccess(res, "Resource options retrieved successfully", await resourceService.options(req.query));
});

const getResourceById = asyncHandler(async (req, res) => {
  sendSuccess(res, "Resource retrieved successfully", {
    resource: await resourceService.getById(req.params.id, req.user),
  });
});

const createResource = asyncHandler(async (req, res) => {
  const resource = await resourceService.create(req.body, req.user);
  auditLog("resource.created", resource._id, userIdFrom(req.user));
  sendSuccess(res, "Resource created successfully", { resource }, 201);
});

const updateResource = asyncHandler(async (req, res) => {
  const { resource, warning } = await resourceService.update(req.params.id, req.body, req.user);
  auditLog("resource.updated", resource._id, userIdFrom(req.user));
  sendSuccess(res, "Resource updated successfully", { resource, warning });
});

const changeResourceStatus = asyncHandler(async (req, res) => {
  const { resource, warning } = await resourceService.changeStatus(req.params.id, req.body.status, req.user);
  auditLog("resource.status_changed", resource._id, userIdFrom(req.user));
  const message = req.body.status === "Active" ? "Resource activated successfully" : "Resource deactivated successfully";
  sendSuccess(res, message, { resource, warning });
});

const changeResourceAvailability = asyncHandler(async (req, res) => {
  const { resource, warning } = await resourceService.changeAvailability(
    req.params.id,
    { availabilityStatus: req.body.availabilityStatus, reason: req.body.reason },
    req.user
  );
  auditLog("resource.availability_changed", resource._id, userIdFrom(req.user));
  const message =
    req.body.availabilityStatus === "Available"
      ? "Resource marked as available"
      : "Resource marked as unavailable";
  sendSuccess(res, message, { resource, warning });
});

const deactivateResource = asyncHandler(async (req, res) => {
  const { resource, warning } = await resourceService.deactivate(req.params.id, req.user);
  auditLog("resource.deactivated", resource._id, userIdFrom(req.user));
  sendSuccess(res, "Resource deactivated successfully", { resource, warning });
});

module.exports = {
  getResources,
  getResourceOptions,
  getResourceById,
  createResource,
  updateResource,
  changeResourceStatus,
  changeResourceAvailability,
  deactivateResource,
};
