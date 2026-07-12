const Department = require("../models/Department");
const ApiError = require("../utils/ApiError");
const { escapeRegex, paginationFrom, sortFrom, assertObjectId, userIdFrom, canViewInactive } = require("./organizationQuery");

const allowedSortFields = ["name", "code", "location", "status", "createdAt", "updatedAt"];
const writableFields = ["name", "code", "description", "managerName", "location", "status"];
const withCounts = (department) => ({ ...department.toObject(), employeeCount: 0, assetCount: 0 });
const duplicateError = () => new ApiError(409, "A department with this code already exists", [{ field: "code", message: "A department with this code already exists" }]);

const list = async (query, user) => {
  const { page, limit } = paginationFrom(query);
  const filter = {};
  if (!canViewInactive(user)) filter.status = "Active";
  else if (["Active", "Inactive"].includes(query.status)) filter.status = query.status;
  if (query.search?.trim()) {
    const term = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ name: term }, { code: term }, { managerName: term }, { location: term }];
  }
  const [records, totalRecords] = await Promise.all([
    Department.find(filter).sort(sortFrom(query, allowedSortFields)).skip((page - 1) * limit).limit(limit),
    Department.countDocuments(filter),
  ]);
  return { departments: records.map(withCounts), pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) } };
};

const options = async () => ({ departments: await Department.find({ status: "Active" }).select("name code").sort({ name: 1 }).lean() });

const getById = async (id, user) => {
  assertObjectId(id, "department");
  const record = await Department.findById(id).populate("createdBy", "name email").populate("updatedBy", "name email");
  if (!record) throw new ApiError(404, "Department not found");
  if (record.status === "Inactive" && !canViewInactive(user)) throw new ApiError(404, "Department not found");
  return withCounts(record);
};

const create = async (payload, user) => {
  const code = payload.code.toUpperCase();
  if (await Department.exists({ code })) throw duplicateError();
  try { return withCounts(await Department.create({ ...payload, code, createdBy: userIdFrom(user) })); }
  catch (error) { if (error?.code === 11000) throw duplicateError(); throw error; }
};

const update = async (id, payload, user) => {
  assertObjectId(id, "department");
  const changes = Object.fromEntries(writableFields.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]));
  if (changes.code) {
    changes.code = changes.code.toUpperCase();
    if (await Department.exists({ code: changes.code, _id: { $ne: id } })) throw duplicateError();
  }
  changes.updatedBy = userIdFrom(user);
  try {
    const record = await Department.findByIdAndUpdate(id, changes, { new: true, runValidators: true });
    if (!record) throw new ApiError(404, "Department not found");
    return withCounts(record);
  } catch (error) { if (error?.code === 11000) throw duplicateError(); throw error; }
};

const changeStatus = async (id, status, user) => {
  assertObjectId(id, "department");
  // Later stages must prevent deactivation while active Employees or Assets are linked.
  const record = await Department.findByIdAndUpdate(id, { status, updatedBy: userIdFrom(user) }, { new: true, runValidators: true });
  if (!record) throw new ApiError(404, "Department not found");
  return withCounts(record);
};

module.exports = { list, options, getById, create, update, changeStatus };
