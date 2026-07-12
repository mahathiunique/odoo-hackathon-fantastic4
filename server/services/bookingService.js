const mongoose = require("mongoose");
const Resource = require("../models/Resource");
const ResourceBooking = require("../models/ResourceBooking");
const Employee = require("../models/Employee");
const ApiError = require("../utils/ApiError");
const adapter = require("../integrations/resourceAssetAdapter");
const {
  escapeRegex,
  paginationFrom,
  sortFrom,
  assertObjectId,
  userIdFrom,
  roleFrom,
} = require("./organizationQuery");

const BLOCKING = ResourceBooking.BLOCKING_STATUSES; // ["Pending", "Confirmed"]
const MANAGER_ROLES = ["Admin", "Asset Manager"];
const FULL_VIEW_ROLES = ["Admin", "Asset Manager", "Maintenance Manager", "Auditor"];
const ALLOWED_SORT_FIELDS = ["startTime", "endTime", "status", "title", "createdAt", "updatedAt"];
const MAX_TX_RETRIES = 3;

const isManager = (user) => MANAGER_ROLES.includes(roleFrom(user));
const canViewAll = (user) => FULL_VIEW_ROLES.includes(roleFrom(user));

// ---------------------------------------------------------------------------
// Booking-rule helpers
// ---------------------------------------------------------------------------
const formatDuration = (minutes) => {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const validateBookingRules = (resource, startTime, endTime, attendeesCount) => {
  const rules = resource.bookingRules || {};
  const now = new Date();

  if (endTime <= now) {
    throw new ApiError(400, "Bookings cannot be created entirely in the past");
  }

  if (attendeesCount > resource.capacity) {
    throw new ApiError(400, "Attendee count exceeds the resource capacity", [
      { field: "attendeesCount", message: "Attendee count exceeds the resource capacity" },
    ]);
  }

  const durationMinutes = Math.round((endTime - startTime) / 60000);

  if (rules.minimumDurationMinutes && durationMinutes < rules.minimumDurationMinutes) {
    throw new ApiError(
      400,
      `The minimum booking duration is ${formatDuration(rules.minimumDurationMinutes)}`
    );
  }
  if (rules.maximumDurationMinutes && durationMinutes > rules.maximumDurationMinutes) {
    throw new ApiError(
      400,
      `The maximum booking duration is ${formatDuration(rules.maximumDurationMinutes)}`
    );
  }

  if (rules.maximumAdvanceDays) {
    const latest = new Date(now);
    latest.setDate(latest.getDate() + rules.maximumAdvanceDays);
    // Compare against the end of that day to be forgiving of time-of-day.
    latest.setHours(23, 59, 59, 999);
    if (startTime > latest) {
      throw new ApiError(
        400,
        `This resource can only be booked ${rules.maximumAdvanceDays} days in advance`
      );
    }
  }

  if (rules.allowWeekendBookings === false && (isWeekend(startTime) || isWeekend(endTime))) {
    throw new ApiError(400, "Weekend bookings are not allowed for this resource");
  }
};

// ---------------------------------------------------------------------------
// Overlap detection
// ---------------------------------------------------------------------------
// Overlap rule: existing.start < new.end AND existing.end > new.start.
// Boundary-touching bookings (e.g. 10-11 and 11-12) are allowed.
const buildOverlapQuery = (resourceId, startTime, endTime, excludeId) => {
  const query = {
    resource: resourceId,
    status: { $in: BLOCKING },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return query;
};

const findOverlaps = async (resourceId, startTime, endTime, { session = null, excludeId = null } = {}) => {
  let q = ResourceBooking.find(buildOverlapQuery(resourceId, startTime, endTime, excludeId))
    .sort({ startTime: 1 })
    .select("startTime endTime title bookedBy status");
  if (session) q = q.session(session);
  return q.lean();
};

const maskConflict = (booking, user) => {
  const ownIt = String(booking.bookedBy) === String(userIdFrom(user));
  if (isManager(user) || canViewAll(user) || ownIt) {
    return { startTime: booking.startTime, endTime: booking.endTime, title: booking.title };
  }
  // Employees viewing someone else's booking only see the occupied range.
  return { startTime: booking.startTime, endTime: booking.endTime, title: "Reserved" };
};

// ---------------------------------------------------------------------------
// Resource preconditions
// ---------------------------------------------------------------------------
const loadBookableResource = async (resourceId) => {
  assertObjectId(resourceId, "resource");
  const resource = await Resource.findById(resourceId);
  if (!resource) throw new ApiError(404, "Resource not found");
  if (resource.status !== "Active") {
    throw new ApiError(400, "This resource is not active and cannot be booked");
  }
  if (resource.availabilityStatus !== "Available") {
    throw new ApiError(400, "This resource is currently unavailable for booking");
  }
  const assetCheck = await adapter.validateLinkedAssetBookable(resource.linkedAsset);
  if (!assetCheck.bookable) {
    throw new ApiError(400, assetCheck.reason);
  }
  return resource;
};

// ---------------------------------------------------------------------------
// Availability check
// ---------------------------------------------------------------------------
const checkAvailability = async ({ resource, startTime, endTime }, user) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const resourceDoc = await loadBookableResource(resource);
  validateBookingRules(resourceDoc, start, end);

  const overlaps = await findOverlaps(resource, start, end);
  const available = overlaps.length === 0;
  return {
    available,
    conflicts: overlaps.map((b) => maskConflict(b, user)),
  };
};

// ---------------------------------------------------------------------------
// Concurrency-safe creation
// ---------------------------------------------------------------------------
const isTransientTxError = (error) =>
  error?.errorLabels?.includes?.("TransientTransactionError") ||
  error?.hasErrorLabel?.("TransientTransactionError") ||
  error?.code === 112; // WriteConflict

const transactionsUnsupported = (error) => {
  const msg = String(error?.message || "");
  return (
    error?.code === 20 ||
    error?.codeName === "IllegalOperation" ||
    /Transaction numbers are only allowed/i.test(msg) ||
    /replica set/i.test(msg) ||
    /transactions are not supported/i.test(msg)
  );
};

const buildBookingDoc = async (resource, payload, user) => {
  const requiresApproval = Boolean(resource.bookingRules?.requiresApproval);
  const status = requiresApproval ? "Pending" : "Confirmed";

  // Optional Employee profile for the acting user.
  let employeeId = null;
  const employee = await Employee.findOne({ userAccount: userIdFrom(user) }).select("_id").lean();
  if (employee) employeeId = employee._id;

  const doc = {
    resource: resource._id,
    bookedBy: userIdFrom(user),
    employee: employeeId,
    title: payload.title,
    purpose: payload.purpose,
    startTime: new Date(payload.startTime),
    endTime: new Date(payload.endTime),
    attendeesCount: payload.attendeesCount,
    notes: payload.notes || "",
    status,
  };
  if (status === "Confirmed") {
    doc.approvedBy = userIdFrom(user);
    doc.approvedAt = new Date();
  }
  return doc;
};

const createBookingTransactional = async (resource, payload, user) => {
  const start = new Date(payload.startTime);
  const end = new Date(payload.endTime);

  let lastError;
  for (let attempt = 0; attempt < MAX_TX_RETRIES; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      let created;
      await session.withTransaction(async () => {
        // 1. Create a write dependency on the resource document so that two
        //    concurrent bookings for the same resource conflict.
        await Resource.updateOne({ _id: resource._id }, { $inc: { bookingVersion: 1 } }).session(session);

        // 2. Re-check for overlaps within the transaction.
        const overlaps = await findOverlaps(resource._id, start, end, { session });
        if (overlaps.length > 0) {
          throw new ApiError(409, "The selected resource is already booked for this time slot");
        }

        // 3. Create the booking.
        const doc = await buildBookingDoc(resource, payload, user);
        const [booking] = await ResourceBooking.create([doc], { session });
        created = booking;
      });
      return created;
    } catch (error) {
      lastError = error;
      // Deterministic business conflict — do not retry.
      if (error instanceof ApiError) throw error;
      if (transactionsUnsupported(error)) throw error;
      if (!isTransientTxError(error)) throw error;
      // else retry
    } finally {
      await session.endSession();
    }
  }
  throw lastError || new ApiError(409, "The selected resource is already booked for this time slot");
};

// Fallback path for environments without transaction support (e.g. a local
// standalone MongoDB). Still performs an overlap check but without a session.
const createBookingNonTransactional = async (resource, payload, user) => {
  const start = new Date(payload.startTime);
  const end = new Date(payload.endTime);
  const overlaps = await findOverlaps(resource._id, start, end);
  if (overlaps.length > 0) {
    throw new ApiError(409, "The selected resource is already booked for this time slot");
  }
  const doc = await buildBookingDoc(resource, payload, user);
  return ResourceBooking.create(doc);
};

const createBooking = async (payload, user) => {
  const resource = await loadBookableResource(payload.resource);
  const start = new Date(payload.startTime);
  const end = new Date(payload.endTime);
  validateBookingRules(resource, start, end, payload.attendeesCount);

  let booking;
  try {
    booking = await createBookingTransactional(resource, payload, user);
  } catch (error) {
    if (transactionsUnsupported(error)) {
      booking = await createBookingNonTransactional(resource, payload, user);
    } else {
      throw error;
    }
  }

  return getBookingById(booking._id, user, { bypassAccess: true });
};

// ---------------------------------------------------------------------------
// Auto-completion
// ---------------------------------------------------------------------------
// Marks Confirmed bookings whose end time has passed as Completed. Called before
// list/calendar/stats reads. No cron required.
const refreshCompletedBookings = async () => {
  const now = new Date();
  const result = await ResourceBooking.updateMany(
    { status: "Confirmed", endTime: { $lt: now } },
    { $set: { status: "Completed", completedAt: now } }
  );
  return result.modifiedCount || 0;
};

// ---------------------------------------------------------------------------
// Populate helper
// ---------------------------------------------------------------------------
const populateBooking = (query) =>
  query
    .populate("resource", "_id name resourceCode resourceType capacity location availabilityStatus status")
    .populate("bookedBy", "_id name email role")
    .populate("employee", "_id employeeId name designation")
    .populate("approvedBy", "_id name email role")
    .populate("cancelledBy", "_id name email role")
    .populate("completedBy", "_id name email role");

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------
const buildListFilter = async (query) => {
  const filter = {};
  if (query.resource && mongoose.isValidObjectId(query.resource)) filter.resource = query.resource;
  if (ResourceBooking.BOOKING_STATUSES.includes(query.status)) filter.status = query.status;
  if (query.bookedBy && mongoose.isValidObjectId(query.bookedBy)) filter.bookedBy = query.bookedBy;

  if (query.resourceType) {
    const ids = await Resource.find({ resourceType: query.resourceType }).distinct("_id");
    filter.resource = filter.resource ? filter.resource : { $in: ids };
    if (filter.resource && !filter.resource.$in) {
      // both a specific resource and a type filter -> intersect
      filter.resource = { $in: ids.filter((id) => String(id) === String(query.resource)) };
    }
  }

  if (query.startFrom || query.startTo) {
    filter.startTime = {};
    if (query.startFrom && !Number.isNaN(new Date(query.startFrom).getTime()))
      filter.startTime.$gte = new Date(query.startFrom);
    if (query.startTo && !Number.isNaN(new Date(query.startTo).getTime()))
      filter.startTime.$lte = new Date(query.startTo);
    if (Object.keys(filter.startTime).length === 0) delete filter.startTime;
  }

  if (query.search?.trim()) {
    const term = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ title: term }, { purpose: term }, { notes: term }];
  }

  return filter;
};

const listBookings = async (query, user) => {
  await refreshCompletedBookings();
  const { page, limit } = paginationFrom(query);
  const filter = await buildListFilter(query);
  const sort = sortFrom(
    { ...query, sortBy: ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : "startTime" },
    ALLOWED_SORT_FIELDS
  );

  const [records, totalRecords] = await Promise.all([
    populateBooking(ResourceBooking.find(filter).sort(sort).skip((page - 1) * limit).limit(limit)).lean(),
    ResourceBooking.countDocuments(filter),
  ]);

  return {
    bookings: records,
    pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) },
  };
};

const getMyBookings = async (query, user) => {
  await refreshCompletedBookings();
  const { page, limit } = paginationFrom(query);
  const filter = { bookedBy: userIdFrom(user) };
  if (ResourceBooking.BOOKING_STATUSES.includes(query.status)) filter.status = query.status;
  if (query.upcomingOnly === "true") {
    filter.status = filter.status || { $in: BLOCKING };
    filter.endTime = { $gt: new Date() };
  }

  const sort = sortFrom(
    { ...query, sortBy: ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : "startTime" },
    ALLOWED_SORT_FIELDS
  );

  const [records, totalRecords] = await Promise.all([
    populateBooking(ResourceBooking.find(filter).sort(sort).skip((page - 1) * limit).limit(limit)).lean(),
    ResourceBooking.countDocuments(filter),
  ]);

  return {
    bookings: records,
    pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) },
  };
};

const getCalendarBookings = async (query, user) => {
  await refreshCompletedBookings();
  const start = new Date(query.start);
  const end = new Date(query.end);

  const statuses = query.includeCompleted === "true" ? [...BLOCKING, "Completed"] : [...BLOCKING];
  const filter = {
    status: { $in: statuses },
    startTime: { $lt: end },
    endTime: { $gt: start },
  };
  if (query.resource && mongoose.isValidObjectId(query.resource)) filter.resource = query.resource;

  if (query.resourceType || query.location) {
    const resourceFilter = {};
    if (query.resourceType) resourceFilter.resourceType = query.resourceType;
    if (query.location) resourceFilter.location = new RegExp(escapeRegex(String(query.location)), "i");
    const ids = await Resource.find(resourceFilter).distinct("_id");
    filter.resource = filter.resource ? filter.resource : { $in: ids };
  }

  const records = await populateBooking(ResourceBooking.find(filter).sort({ startTime: 1 })).lean();

  // Mask other users' titles for employees.
  const masked = records.map((b) => {
    if (canViewAll(user) || String(b.bookedBy?._id || b.bookedBy) === String(userIdFrom(user))) {
      return b;
    }
    return { ...b, title: "Reserved", purpose: undefined, notes: undefined };
  });

  return { bookings: masked };
};

const getStats = async () => {
  await refreshCompletedBookings();
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [byStatus, todayBookings, upcomingBookings, totalBookings, mostBooked] = await Promise.all([
    ResourceBooking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ResourceBooking.countDocuments({ startTime: { $gte: startOfDay, $lte: endOfDay } }),
    ResourceBooking.countDocuments({ status: { $in: BLOCKING }, startTime: { $gt: now } }),
    ResourceBooking.countDocuments({}),
    ResourceBooking.aggregate([
      { $group: { _id: "$resource", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "resources",
          localField: "_id",
          foreignField: "_id",
          as: "resource",
        },
      },
      { $unwind: { path: "$resource", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          count: 1,
          name: "$resource.name",
          resourceCode: "$resource.resourceCode",
          resourceType: "$resource.resourceType",
        },
      },
    ]),
  ]);

  const statusMap = byStatus.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {});

  return {
    totalBookings,
    pendingBookings: statusMap.Pending || 0,
    confirmedBookings: statusMap.Confirmed || 0,
    completedBookings: statusMap.Completed || 0,
    cancelledBookings: statusMap.Cancelled || 0,
    todayBookings,
    upcomingBookings,
    mostBookedResources: mostBooked,
  };
};

// ---------------------------------------------------------------------------
// Single booking + access control
// ---------------------------------------------------------------------------
const getBookingById = async (id, user, { bypassAccess = false } = {}) => {
  assertObjectId(id, "booking");
  const booking = await populateBooking(ResourceBooking.findById(id)).lean();
  if (!booking) throw new ApiError(404, "Booking not found");

  if (!bypassAccess && !canViewAll(user)) {
    const ownerId = String(booking.bookedBy?._id || booking.bookedBy);
    if (ownerId !== String(userIdFrom(user))) {
      throw new ApiError(403, "You do not have permission to view this booking");
    }
  }

  return booking;
};

// ---------------------------------------------------------------------------
// Confirm / Cancel / Complete
// ---------------------------------------------------------------------------
const confirmBooking = async (id, user) => {
  assertObjectId(id, "booking");
  const booking = await ResourceBooking.findById(id);
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "Pending") {
    throw new ApiError(400, "Only pending bookings can be confirmed");
  }

  const resource = await loadBookableResource(booking.resource);

  const confirmTransactional = async () => {
    let lastError;
    for (let attempt = 0; attempt < MAX_TX_RETRIES; attempt += 1) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await Resource.updateOne({ _id: resource._id }, { $inc: { bookingVersion: 1 } }).session(session);
          const overlaps = await findOverlaps(resource._id, booking.startTime, booking.endTime, {
            session,
            excludeId: booking._id,
          });
          if (overlaps.length > 0) {
            throw new ApiError(409, "Another booking was confirmed for this time slot");
          }
          booking.status = "Confirmed";
          booking.approvedBy = userIdFrom(user);
          booking.approvedAt = new Date();
          await booking.save({ session });
        });
        return;
      } catch (error) {
        lastError = error;
        if (error instanceof ApiError) throw error;
        if (transactionsUnsupported(error)) throw error;
        if (!isTransientTxError(error)) throw error;
      } finally {
        await session.endSession();
      }
    }
    throw lastError || new ApiError(409, "Another booking was confirmed for this time slot");
  };

  try {
    await confirmTransactional();
  } catch (error) {
    if (!transactionsUnsupported(error)) throw error;
    const overlaps = await findOverlaps(resource._id, booking.startTime, booking.endTime, {
      excludeId: booking._id,
    });
    if (overlaps.length > 0) {
      throw new ApiError(409, "Another booking was confirmed for this time slot");
    }
    booking.status = "Confirmed";
    booking.approvedBy = userIdFrom(user);
    booking.approvedAt = new Date();
    await booking.save();
  }

  return getBookingById(booking._id, user, { bypassAccess: true });
};

const cancelBooking = async (id, cancelReason, user) => {
  assertObjectId(id, "booking");
  const booking = await ResourceBooking.findById(id);
  if (!booking) throw new ApiError(404, "Booking not found");

  // Permission: managers may cancel any; others only their own.
  if (!isManager(user) && String(booking.bookedBy) !== String(userIdFrom(user))) {
    throw new ApiError(403, "You do not have permission to cancel this booking");
  }

  if (!["Pending", "Confirmed"].includes(booking.status)) {
    throw new ApiError(400, "Only pending or confirmed bookings can be cancelled");
  }

  booking.status = "Cancelled";
  booking.cancelledBy = userIdFrom(user);
  booking.cancelledAt = new Date();
  booking.cancelReason = cancelReason;
  await booking.save();

  return getBookingById(booking._id, user, { bypassAccess: true });
};

const completeBooking = async (id, user) => {
  assertObjectId(id, "booking");
  const booking = await ResourceBooking.findById(id);
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "Confirmed") {
    throw new ApiError(400, "Only confirmed bookings can be completed");
  }
  if (booking.startTime > new Date()) {
    throw new ApiError(400, "A booking cannot be completed before it has started");
  }

  booking.status = "Completed";
  booking.completedBy = userIdFrom(user);
  booking.completedAt = new Date();
  await booking.save();

  return getBookingById(booking._id, user, { bypassAccess: true });
};

module.exports = {
  checkAvailability,
  createBooking,
  refreshCompletedBookings,
  listBookings,
  getMyBookings,
  getCalendarBookings,
  getStats,
  getBookingById,
  confirmBooking,
  cancelBooking,
  completeBooking,
};
