const ApiError = require("../utils/ApiError");

const assetTagPattern = /^[A-Z0-9_-]{2,50}$/;
const lifecycleStatuses = ["Available", "Reserved", "Allocated", "Under Maintenance", "Lost", "Retired", "Disposed"];
const conditions = ["Excellent", "Good", "Fair", "Damaged", "Unusable"];
const transitionMap = {
  Available: ["Reserved", "Under Maintenance", "Lost", "Retired"],
  Reserved: ["Available", "Allocated", "Under Maintenance", "Lost"],
  Allocated: ["Available", "Under Maintenance", "Lost"],
  "Under Maintenance": ["Available", "Lost", "Retired"],
  Lost: ["Available", "Retired"],
  Retired: ["Disposed"],
  Disposed: [],
};

const rolePermissions = {
  Available: {
    Reserved: ["Admin", "Asset Manager"],
    "Under Maintenance": ["Admin", "Asset Manager", "Maintenance Manager"],
    Lost: ["Admin", "Asset Manager"],
    Retired: ["Admin", "Asset Manager"],
  },
  Reserved: {
    Available: ["Admin", "Asset Manager"],
    Allocated: ["Admin"],
    "Under Maintenance": ["Admin", "Asset Manager", "Maintenance Manager"],
    Lost: ["Admin", "Asset Manager"],
  },
  Allocated: {
    Available: ["Admin"],
    "Under Maintenance": ["Admin", "Asset Manager", "Maintenance Manager"],
    Lost: ["Admin", "Asset Manager"],
  },
  "Under Maintenance": {
    Available: ["Admin", "Asset Manager", "Maintenance Manager"],
    Lost: ["Admin", "Asset Manager"],
    Retired: ["Admin", "Asset Manager"],
  },
  Lost: {
    Available: ["Admin", "Asset Manager"],
    Retired: ["Admin", "Asset Manager"],
  },
  Retired: {
    Disposed: ["Admin"],
  },
};

const ensureText = (value) => (typeof value === "string" ? value.trim() : value);
const ensureOptionalText = (value) => {
  const cleaned = ensureText(value);
  return cleaned === "" ? null : cleaned;
};
const buildValidationError = (field, message) => ({ field, message });
const toValidationErrors = (payload) => {
  if (!payload || typeof payload !== "object") return [];
  return payload;
};

const validateAssetCreatePayload = (payload = {}) => {
  const errors = [];
  const body = payload;
  const assetTag = ensureText(body.assetTag);
  if (!assetTag) errors.push(buildValidationError("assetTag", "Asset tag is required"));
  else if (!assetTagPattern.test(assetTag.toUpperCase())) errors.push(buildValidationError("assetTag", "Asset tag format is invalid"));
  else body.assetTag = assetTag.toUpperCase();

  const name = ensureText(body.name);
  if (!name) errors.push(buildValidationError("name", "Name is required"));

  const category = ensureText(body.category);
  if (!category) errors.push(buildValidationError("category", "Category is required"));

  const currentLocation = ensureText(body.currentLocation);
  if (!currentLocation) errors.push(buildValidationError("currentLocation", "Current location is required"));

  const lifecycleStatus = ensureText(body.lifecycleStatus);
  if (lifecycleStatus && !lifecycleStatuses.includes(lifecycleStatus)) errors.push(buildValidationError("lifecycleStatus", "Lifecycle status is invalid"));
  if (!lifecycleStatus) body.lifecycleStatus = "Available";
  if (lifecycleStatus === "Allocated") errors.push(buildValidationError("lifecycleStatus", "New assets cannot start as Allocated"));
  if (lifecycleStatus === "Disposed") errors.push(buildValidationError("lifecycleStatus", "New assets cannot start as Disposed"));

  const condition = ensureText(body.condition);
  if (condition && !conditions.includes(condition)) errors.push(buildValidationError("condition", "Condition is invalid"));

  const description = ensureText(body.description);
  if (description && description.length > 1000) errors.push(buildValidationError("description", "Description cannot exceed 1000 characters"));

  const notes = ensureText(body.notes);
  if (notes && notes.length > 2000) errors.push(buildValidationError("notes", "Notes cannot exceed 2000 characters"));

  if (body.purchaseDate) {
    const purchaseDate = new Date(body.purchaseDate);
    if (Number.isNaN(purchaseDate.getTime())) errors.push(buildValidationError("purchaseDate", "Purchase date is invalid"));
    else if (purchaseDate > new Date()) errors.push(buildValidationError("purchaseDate", "Purchase date cannot be in the future"));
  }

  if (body.warrantyExpiry) {
    const warrantyDate = new Date(body.warrantyExpiry);
    if (Number.isNaN(warrantyDate.getTime())) errors.push(buildValidationError("warrantyExpiry", "Warranty expiry is invalid"));
  }

  if (body.purchaseDate && body.warrantyExpiry) {
    const purchaseDate = new Date(body.purchaseDate);
    const warrantyDate = new Date(body.warrantyExpiry);
    if (!Number.isNaN(purchaseDate.getTime()) && !Number.isNaN(warrantyDate.getTime()) && warrantyDate < purchaseDate) errors.push(buildValidationError("warrantyExpiry", "Warranty expiry cannot be before purchase date"));
  }

  if (body.isSharedResource !== undefined && typeof body.isSharedResource !== "boolean") errors.push(buildValidationError("isSharedResource", "isSharedResource must be a boolean"));

  return errors;
};

const validateAssetUpdatePayload = (payload = {}) => {
  const errors = [];
  const body = { ...payload };
  const allowedFields = ["assetTag", "name", "description", "category", "serialNumber", "manufacturer", "model", "purchaseDate", "warrantyExpiry", "department", "currentLocation", "isSharedResource", "notes"];

  Object.keys(body).forEach((key) => {
    if (!allowedFields.includes(key)) errors.push(buildValidationError(key, "This field cannot be updated"));
  });

  if (body.lifecycleStatus !== undefined) errors.push(buildValidationError("lifecycleStatus", "Lifecycle status must be changed through the dedicated status endpoint"));
  if (body.assignedToEmployee !== undefined) errors.push(buildValidationError("assignedToEmployee", "Assignment fields are managed by the allocation workflow"));
  if (body.assignedToDepartment !== undefined) errors.push(buildValidationError("assignedToDepartment", "Assignment fields are managed by the allocation workflow"));
  if (body.expectedReturnDate !== undefined) errors.push(buildValidationError("expectedReturnDate", "This field is managed by the allocation workflow"));
  if (body.createdBy !== undefined) errors.push(buildValidationError("createdBy", "createdBy cannot be changed"));
  if (body.updatedBy !== undefined) errors.push(buildValidationError("updatedBy", "updatedBy cannot be changed"));

  if (body.assetTag !== undefined) {
    const assetTag = ensureText(body.assetTag);
    if (!assetTag) errors.push(buildValidationError("assetTag", "Asset tag is required"));
    else if (!assetTagPattern.test(assetTag.toUpperCase())) errors.push(buildValidationError("assetTag", "Asset tag format is invalid"));
    else body.assetTag = assetTag.toUpperCase();
  }

  if (body.name !== undefined) {
    const name = ensureText(body.name);
    if (!name) errors.push(buildValidationError("name", "Name is required"));
  }

  if (body.category !== undefined && !ensureText(body.category)) errors.push(buildValidationError("category", "Category is required"));
  if (body.currentLocation !== undefined) {
    const currentLocation = ensureText(body.currentLocation);
    if (!currentLocation) errors.push(buildValidationError("currentLocation", "Current location is required"));
  }

  if (body.description !== undefined && ensureText(body.description)?.length > 1000) errors.push(buildValidationError("description", "Description cannot exceed 1000 characters"));
  if (body.notes !== undefined && ensureText(body.notes)?.length > 2000) errors.push(buildValidationError("notes", "Notes cannot exceed 2000 characters"));

  if (body.purchaseDate !== undefined) {
    const purchaseDate = new Date(body.purchaseDate);
    if (Number.isNaN(purchaseDate.getTime())) errors.push(buildValidationError("purchaseDate", "Purchase date is invalid"));
    else if (purchaseDate > new Date()) errors.push(buildValidationError("purchaseDate", "Purchase date cannot be in the future"));
  }

  if (body.warrantyExpiry !== undefined) {
    const warrantyDate = new Date(body.warrantyExpiry);
    if (Number.isNaN(warrantyDate.getTime())) errors.push(buildValidationError("warrantyExpiry", "Warranty expiry is invalid"));
  }

  if (body.purchaseDate && body.warrantyExpiry) {
    const purchaseDate = new Date(body.purchaseDate);
    const warrantyDate = new Date(body.warrantyExpiry);
    if (!Number.isNaN(purchaseDate.getTime()) && !Number.isNaN(warrantyDate.getTime()) && warrantyDate < purchaseDate) errors.push(buildValidationError("warrantyExpiry", "Warranty expiry cannot be before purchase date"));
  }

  return errors;
};

const validateAssetStatusPayload = (payload = {}) => {
  const errors = [];
  const newStatus = ensureText(payload.newStatus);
  if (!newStatus) errors.push(buildValidationError("newStatus", "New status is required"));
  else if (!lifecycleStatuses.includes(newStatus)) errors.push(buildValidationError("newStatus", "Lifecycle status is invalid"));
  const reason = ensureText(payload.reason);
  if (["Lost", "Retired", "Disposed"].includes(newStatus) && (!reason || reason.length < 5)) errors.push(buildValidationError("reason", "A reason is required for this status change"));
  if (newStatus === "Available" && payload.reason && ensureText(payload.reason).length < 5) errors.push(buildValidationError("reason", "Reason must be at least 5 characters"));
  return errors;
};

const validateAssetConditionPayload = (payload = {}) => {
  const errors = [];
  const condition = ensureText(payload.condition);
  if (!condition) errors.push(buildValidationError("condition", "Condition is required"));
  else if (!conditions.includes(condition)) errors.push(buildValidationError("condition", "Condition is invalid"));
  if (["Damaged", "Unusable"].includes(condition) && (!ensureText(payload.reason) || ensureText(payload.reason).length < 5)) errors.push(buildValidationError("reason", "A reason is required for this condition change"));
  return errors;
};

const isValidTransition = (fromStatus, toStatus) => Boolean(fromStatus && toStatus && transitionMap[fromStatus]?.includes(toStatus));
const getTransitionAllowedRoles = (fromStatus, toStatus) => rolePermissions[fromStatus]?.[toStatus] || [];
const validateTransitionReason = (newStatus, reason) => {
  const trimmed = ensureText(reason);
  if (["Lost", "Retired", "Disposed"].includes(newStatus)) return Boolean(trimmed && trimmed.length >= 5 && trimmed.length <= 1000);
  if (newStatus === "Available") return Boolean(trimmed && trimmed.length >= 5 && trimmed.length <= 1000);
  return true;
};

const normalizeAssetPayload = (payload = {}) => {
  const next = { ...payload };
  if (typeof next.assetTag === "string") next.assetTag = next.assetTag.trim().toUpperCase();
  if (typeof next.name === "string") next.name = next.name.trim();
  if (typeof next.description === "string") next.description = next.description.trim() || null;
  if (typeof next.serialNumber === "string") next.serialNumber = next.serialNumber.trim() || null;
  if (typeof next.manufacturer === "string") next.manufacturer = next.manufacturer.trim() || null;
  if (typeof next.model === "string") next.model = next.model.trim() || null;
  if (typeof next.currentLocation === "string") next.currentLocation = next.currentLocation.trim();
  if (typeof next.notes === "string") next.notes = next.notes.trim() || null;
  if (typeof next.department === "string" && next.department.trim() === "") next.department = undefined;
  if (typeof next.category === "string" && next.category.trim() === "") next.category = undefined;
  if (typeof next.isSharedResource !== "undefined") next.isSharedResource = Boolean(next.isSharedResource);
  if (next.assignedToEmployee === "") next.assignedToEmployee = null;
  if (next.assignedToDepartment === "") next.assignedToDepartment = null;
  if (next.expectedReturnDate === "") next.expectedReturnDate = null;
  return next;
};

const validateAssetPayload = (payload, mode = "create") => {
  const errors = mode === "create" ? validateAssetCreatePayload(payload) : validateAssetUpdatePayload(payload);
  if (errors.length) throw new ApiError(400, "Validation failed", errors);
  return normalizeAssetPayload(payload);
};

module.exports = {
  assetTagPattern,
  lifecycleStatuses,
  conditions,
  transitionMap,
  rolePermissions,
  validateAssetCreatePayload,
  validateAssetUpdatePayload,
  validateAssetStatusPayload,
  validateAssetConditionPayload,
  isValidTransition,
  getTransitionAllowedRoles,
  validateTransitionReason,
  normalizeAssetPayload,
  validateAssetPayload,
};
