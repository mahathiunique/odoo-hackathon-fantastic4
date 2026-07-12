const AssetCategory = require("../models/AssetCategory");
const ApiError = require("../utils/ApiError");
const { escapeRegex, paginationFrom, sortFrom, assertObjectId, userIdFrom, roleFrom, canViewInactive } = require("./organizationQuery");

const allowedSortFields = ["name", "code", "defaultUsefulLife", "requiresMaintenance", "status", "createdAt", "updatedAt"];
const writableFields = ["name", "code", "description", "defaultUsefulLife", "requiresMaintenance", "status"];
const withCount = (category) => ({ ...category.toObject(), assetCount: 0 });
const duplicateError = () => new ApiError(409, "An asset category with this code already exists", [{ field: "code", message: "An asset category with this code already exists" }]);

const list = async (query, user) => {
  const { page, limit } = paginationFrom(query);
  const filter = {};
  if (!canViewInactive(user)) filter.status = "Active";
  else if (["Active", "Inactive"].includes(query.status)) filter.status = query.status;
  if (query.requiresMaintenance === "true") filter.requiresMaintenance = true;
  if (query.requiresMaintenance === "false") filter.requiresMaintenance = false;
  if (query.search?.trim()) {
    const term = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ name: term }, { code: term }, { description: term }];
  }
  const [records, totalRecords] = await Promise.all([
    AssetCategory.find(filter).sort(sortFrom(query, allowedSortFields)).skip((page - 1) * limit).limit(limit),
    AssetCategory.countDocuments(filter),
  ]);
  return { categories: records.map(withCount), pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) } };
};

const options = async () => ({ categories: await AssetCategory.find({ status: "Active" }).select("name code requiresMaintenance defaultUsefulLife").sort({ name: 1 }).lean() });

const getById = async (id, user) => {
  assertObjectId(id, "category");
  const record = await AssetCategory.findById(id).populate("createdBy", "name email").populate("updatedBy", "name email");
  if (!record) throw new ApiError(404, "Asset category not found");
  if (record.status === "Inactive" && !canViewInactive(user)) throw new ApiError(404, "Asset category not found");
  return withCount(record);
};

const create = async (payload, user) => {
  const code = payload.code.toUpperCase();
  if (await AssetCategory.exists({ code })) throw duplicateError();
  const safePayload = { ...payload };
  if (roleFrom(user) !== "Admin") safePayload.status = "Active";
  try { return withCount(await AssetCategory.create({ ...safePayload, code, createdBy: userIdFrom(user) })); }
  catch (error) { if (error?.code === 11000) throw duplicateError(); throw error; }
};

const update = async (id, payload, user) => {
  assertObjectId(id, "category");
  const changes = Object.fromEntries(writableFields.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]));
  if (roleFrom(user) !== "Admin") delete changes.status;
  if (changes.code) {
    changes.code = changes.code.toUpperCase();
    if (await AssetCategory.exists({ code: changes.code, _id: { $ne: id } })) throw duplicateError();
  }
  changes.updatedBy = userIdFrom(user);
  try {
    const record = await AssetCategory.findByIdAndUpdate(id, changes, { new: true, runValidators: true });
    if (!record) throw new ApiError(404, "Asset category not found");
    return withCount(record);
  } catch (error) { if (error?.code === 11000) throw duplicateError(); throw error; }
};

const changeStatus = async (id, status, user) => {
  assertObjectId(id, "category");
  // Later Asset integration must prevent deactivation while active Assets use this category.
  const record = await AssetCategory.findByIdAndUpdate(id, { status, updatedBy: userIdFrom(user) }, { new: true, runValidators: true });
  if (!record) throw new ApiError(404, "Asset category not found");
  return withCount(record);
};

module.exports = { list, options, getById, create, update, changeStatus };
