const resourceService = require("../services/resourceService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { auditLog, userIdFrom } = require("../services/organizationQuery");
const activityService = require("../services/activityService");

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
  activityService.recordActivityFromRequest(req, { action: "Resource Created", entityType: "Resource", entityId: resource._id, description: `Created resource ${resource.name} (${resource.resourceCode})`, metadata: { resourceCode: resource.resourceCode, resourceType: resource.resourceType } });
  sendSuccess(res, "Resource created successfully", { resource }, 201);
});

const updateResource = asyncHandler(async (req, res) => {
  const { resource, warning } = await resourceService.update(req.params.id, req.body, req.user);
  auditLog("resource.updated", resource._id, userIdFrom(req.user));
  activityService.recordActivityFromRequest(req, { action: "Resource Updated", entityType: "Resource", entityId: resource._id, description: `Updated resource ${resource.name}`, metadata: { resourceCode: resource.resourceCode } });
  sendSuccess(res, "Resource updated successfully", { resource, warning });
});

const changeResourceStatus = asyncHandler(async (req, res) => {
  const { resource, warning } = await resourceService.changeStatus(req.params.id, req.body.status, req.user);
  auditLog("resource.status_changed", resource._id, userIdFrom(req.user));
  activityService.recordActivityFromRequest(req, { action: "Resource Status Changed", entityType: "Resource", entityId: resource._id, description: `Resource ${resource.name} set to ${req.body.status}`, metadata: { status: resource.status } });
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
  activityService.recordActivityFromRequest(req, { action: "Resource Availability Changed", entityType: "Resource", entityId: resource._id, description: `Resource ${resource.name} availability set to ${req.body.availabilityStatus}`, metadata: { availabilityStatus: req.body.availabilityStatus } });
  const message =
    req.body.availabilityStatus === "Available"
      ? "Resource marked as available"
      : "Resource marked as unavailable";
  sendSuccess(res, message, { resource, warning });
});

const deactivateResource = asyncHandler(async (req, res) => {
  const { resource, warning } = await resourceService.deactivate(req.params.id, req.user);
  auditLog("resource.deactivated", resource._id, userIdFrom(req.user));
  activityService.recordActivityFromRequest(req, { action: "Resource Status Changed", entityType: "Resource", entityId: resource._id, description: `Resource ${resource.name} deactivated`, metadata: { status: resource.status } });
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
