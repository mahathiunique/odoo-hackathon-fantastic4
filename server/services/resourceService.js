const mongoose = require("mongoose");
const Resource = require("../models/Resource");
const ResourceBooking = require("../models/ResourceBooking");
const ApiError = require("../utils/ApiError");
const adapter = require("../integrations/resourceAssetAdapter");
const {
  escapeRegex,
  paginationFrom,
  sortFrom,
  assertObjectId,
  userIdFrom,
  canViewInactive,
} = require("./organizationQuery");

const ALLOWED_SORT_FIELDS = [
  "name",
  "resourceCode",
  "resourceType",
  "capacity",
  "location",
  "availabilityStatus",
  "status",
  "createdAt",
  "updatedAt",
];

const WRITABLE_FIELDS = [
  "name",
  "resourceCode",
  "resourceType",
  "description",
  "capacity",
  "location",
  "availabilityStatus",
  "bookingRules",
  "status",
];

const duplicateCodeError = () =>
  new ApiError(409, "A resource with this code already exists", [
    { field: "resourceCode", message: "A resource with this code already exists" },
  ]);

const duplicateAssetError = () =>
  new ApiError(409, "This asset is already linked to another resource", [
    { field: "linkedAsset", message: "This asset is already linked to another resource" },
  ]);

const translateDuplicate = (error) => {
  if (error?.code === 11000) {
    if (error.keyPattern?.linkedAsset) return duplicateAssetError();
    return duplicateCodeError();
  }
  return error;
};

// Returns a map of resourceId -> next upcoming blocking booking (start/end/title)
const nextBookingMap = async (resourceIds) => {
  if (!resourceIds.length) return {};
  const now = new Date();
  const bookings = await ResourceBooking.aggregate([
    {
      $match: {
        resource: { $in: resourceIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
        status: { $in: ResourceBooking.BLOCKING_STATUSES },
        endTime: { $gt: now },
      },
    },
    { $sort: { startTime: 1 } },
    {
      $group: {
        _id: "$resource",
        startTime: { $first: "$startTime" },
        endTime: { $first: "$endTime" },
        title: { $first: "$title" },
        status: { $first: "$status" },
      },
    },
  ]);
  const map = {};
  for (const b of bookings) {
    map[String(b._id)] = {
      startTime: b.startTime,
      endTime: b.endTime,
      title: b.title,
      status: b.status,
    };
  }
  return map;
};

const buildListFilter = (query, user) => {
  const filter = {};

  if (!canViewInactive(user)) {
    filter.status = "Active";
  } else if (["Active", "Inactive"].includes(query.status)) {
    filter.status = query.status;
  }

  if (["Available", "Unavailable"].includes(query.availabilityStatus)) {
    filter.availabilityStatus = query.availabilityStatus;
  }
  if (query.resourceType) filter.resourceType = query.resourceType;
  if (query.location) filter.location = new RegExp(escapeRegex(String(query.location)), "i");

  if (query.linkedAsset === "true") filter.linkedAsset = { $ne: null };
  else if (query.linkedAsset === "false") filter.linkedAsset = null;
  else if (query.linkedAsset && mongoose.isValidObjectId(query.linkedAsset))
    filter.linkedAsset = query.linkedAsset;

  if (query.search?.trim()) {
    const term = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ name: term }, { resourceCode: term }, { description: term }, { location: term }];
  }

  return filter;
};

const list = async (query, user) => {
  const { page, limit } = paginationFrom(query);
  const filter = buildListFilter(query, user);
  const sort = sortFrom({ ...query, sortBy: ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : "createdAt" }, ALLOWED_SORT_FIELDS);

  const [records, totalRecords] = await Promise.all([
    Resource.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean(),
    Resource.countDocuments(filter),
  ]);

  const nextBookings = await nextBookingMap(records.map((r) => r._id));
  const resources = records.map((r) => ({
    ...r,
    nextBooking: nextBookings[String(r._id)] || null,
  }));

  return {
    resources,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
    },
    assetIntegrationAvailable: adapter.isAssetModuleAvailable(),
  };
};

const options = async (query = {}) => {
  const filter = { status: "Active" };
  if (query.includeUnavailable !== "true") filter.availabilityStatus = "Available";
  if (query.resourceType) filter.resourceType = query.resourceType;
  if (query.location) filter.location = new RegExp(escapeRegex(String(query.location)), "i");

  let resources = await Resource.find(filter)
    .sort({ name: 1 })
    .select("_id name resourceCode resourceType capacity location availabilityStatus bookingRules")
    .lean();

  // Optional time-slot availability filtering.
  const { startTime, endTime } = resolveOptionWindow(query);
  if (startTime && endTime) {
    const busy = await ResourceBooking.distinct("resource", {
      resource: { $in: resources.map((r) => r._id) },
      status: { $in: ResourceBooking.BLOCKING_STATUSES },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });
    const busySet = new Set(busy.map((id) => String(id)));
    resources = resources.map((r) => ({ ...r, availableForSlot: !busySet.has(String(r._id)) }));
  }

  return { resources, assetIntegrationAvailable: adapter.isAssetModuleAvailable() };
};

const resolveOptionWindow = (query) => {
  if (query.startTime && query.endTime) {
    const s = new Date(query.startTime);
    const e = new Date(query.endTime);
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e > s) {
      return { startTime: s, endTime: e };
    }
  }
  return { startTime: null, endTime: null };
};

const getBookingSummary = async (resourceId) => {
  const now = new Date();
  const [upcoming, totalBookingCount] = await Promise.all([
    ResourceBooking.find({
      resource: resourceId,
      status: { $in: ResourceBooking.BLOCKING_STATUSES },
      endTime: { $gt: now },
    })
      .sort({ startTime: 1 })
      .limit(10)
      .populate("bookedBy", "name email role")
      .lean(),
    ResourceBooking.countDocuments({ resource: resourceId }),
  ]);

  return {
    upcomingBookings: upcoming,
    upcomingBookingCount: upcoming.length,
    nextBooking: upcoming[0] || null,
    totalBookingCount,
  };
};

const getById = async (id, user) => {
  assertObjectId(id, "resource");
  const resource = await Resource.findById(id)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .lean();

  if (!resource) throw new ApiError(404, "Resource not found");
  if (resource.status === "Inactive" && !canViewInactive(user)) {
    throw new ApiError(404, "Resource not found");
  }

  const summary = await getBookingSummary(resource._id);
  const linkedAssetSummary = resource.linkedAsset
    ? await adapter.getLinkedAssetSummary(resource.linkedAsset)
    : null;

  return {
    ...resource,
    linkedAssetSummary,
    assetIntegrationAvailable: adapter.isAssetModuleAvailable(),
    ...summary,
  };
};

const create = async (payload, user) => {
  const resourceCode = payload.resourceCode.toUpperCase();
  if (await Resource.exists({ resourceCode })) throw duplicateCodeError();

  const doc = {};
  for (const field of WRITABLE_FIELDS) {
    if (payload[field] !== undefined) doc[field] = payload[field];
  }
  doc.resourceCode = resourceCode;
  doc.createdBy = userIdFrom(user);
  doc.updatedBy = userIdFrom(user);

  if (payload.linkedAsset) {
    // Throws 503 when Stage 6 is unavailable, 400/404/409 otherwise.
    await adapter.validateLinkedAsset(payload.linkedAsset);
    if (await Resource.exists({ linkedAsset: payload.linkedAsset })) throw duplicateAssetError();
    doc.linkedAsset = payload.linkedAsset;
  } else {
    doc.linkedAsset = null;
  }

  try {
    const resource = await Resource.create(doc);
    return await getById(resource._id, user);
  } catch (error) {
    throw translateDuplicate(error);
  }
};

const update = async (id, payload, user) => {
  assertObjectId(id, "resource");
  const resource = await Resource.findById(id);
  if (!resource) throw new ApiError(404, "Resource not found");

  const changes = {};
  for (const field of WRITABLE_FIELDS) {
    if (payload[field] !== undefined) changes[field] = payload[field];
  }

  if (changes.resourceCode) {
    changes.resourceCode = changes.resourceCode.toUpperCase();
    if (
      changes.resourceCode !== resource.resourceCode &&
      (await Resource.exists({ resourceCode: changes.resourceCode, _id: { $ne: id } }))
    ) {
      throw duplicateCodeError();
    }
  }

  // Handle linked asset changes explicitly (undefined means "leave unchanged").
  if (payload.linkedAsset !== undefined) {
    const nextAsset = payload.linkedAsset || null;
    const current = resource.linkedAsset ? String(resource.linkedAsset) : null;
    if (String(nextAsset || "") !== String(current || "")) {
      if (nextAsset) {
        await adapter.validateLinkedAsset(nextAsset);
        if (await Resource.exists({ linkedAsset: nextAsset, _id: { $ne: id } })) {
          throw duplicateAssetError();
        }
      }
      changes.linkedAsset = nextAsset;
    }
  }

  // Warn when a reduced capacity would be below attendees in future bookings.
  let warning = null;
  if (changes.capacity !== undefined && Number(changes.capacity) < resource.capacity) {
    const conflicting = await ResourceBooking.countDocuments({
      resource: id,
      status: { $in: ResourceBooking.BLOCKING_STATUSES },
      endTime: { $gt: new Date() },
      attendeesCount: { $gt: Number(changes.capacity) },
    });
    if (conflicting > 0) {
      warning = `This resource has ${conflicting} upcoming booking(s) with more attendees than the new capacity.`;
    }
  }

  changes.updatedBy = userIdFrom(user);

  try {
    Object.assign(resource, changes);
    await resource.save();
  } catch (error) {
    throw translateDuplicate(error);
  }

  const result = await getById(resource._id, user);
  return { resource: result, warning };
};

const upcomingBlockingCount = async (id) =>
  ResourceBooking.countDocuments({
    resource: id,
    status: { $in: ResourceBooking.BLOCKING_STATUSES },
    endTime: { $gt: new Date() },
  });

const changeStatus = async (id, status, user) => {
  assertObjectId(id, "resource");
  const resource = await Resource.findById(id);
  if (!resource) throw new ApiError(404, "Resource not found");

  resource.status = status;
  resource.updatedBy = userIdFrom(user);
  await resource.save();

  let warning = null;
  if (status === "Inactive") {
    const count = await upcomingBlockingCount(id);
    if (count > 0) {
      warning = "This resource has upcoming bookings that may require cancellation.";
    }
  }

  return { resource: await getById(resource._id, user), warning };
};

const changeAvailability = async (id, { availabilityStatus, reason }, user) => {
  assertObjectId(id, "resource");
  const resource = await Resource.findById(id);
  if (!resource) throw new ApiError(404, "Resource not found");

  resource.availabilityStatus = availabilityStatus;
  if (availabilityStatus === "Unavailable") {
    resource.unavailabilityReason = reason || "";
  }
  resource.updatedBy = userIdFrom(user);
  await resource.save();

  let warning = null;
  if (availabilityStatus === "Unavailable") {
    const count = await upcomingBlockingCount(id);
    if (count > 0) {
      warning = "This resource has upcoming bookings that may require attention.";
    }
  }

  return { resource: await getById(resource._id, user), warning };
};

const deactivate = async (id, user) => {
  assertObjectId(id, "resource");
  const resource = await Resource.findById(id);
  if (!resource) throw new ApiError(404, "Resource not found");

  resource.status = "Inactive";
  resource.availabilityStatus = "Unavailable";
  resource.updatedBy = userIdFrom(user);
  await resource.save();

  const count = await upcomingBlockingCount(id);
  const warning = count > 0 ? "This resource has upcoming bookings that may require cancellation." : null;

  return { resource: await getById(resource._id, user), warning };
};

module.exports = {
  list,
  options,
  getById,
  create,
  update,
  changeStatus,
  changeAvailability,
  deactivate,
};
