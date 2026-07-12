const test = require("node:test");
const assert = require("node:assert/strict");
const Department = require("../models/Department");
const AssetCategory = require("../models/AssetCategory");
const { validateDepartment } = require("../validators/departmentValidator");
const { validateCategory } = require("../validators/categoryValidator");
const { escapeRegex, paginationFrom, sortFrom } = require("../services/organizationQuery");

const runValidator = (middleware, body, method = "POST") => new Promise((resolve) => {
  middleware({ body, method }, {}, (error) => resolve(error));
});

test("department validator normalizes valid codes", async () => {
  const body = { name: "Information Technology", code: " it ", location: "Block A" };
  assert.equal(await runValidator(validateDepartment, body), undefined);
  assert.equal(body.code, "IT");
});

test("department validator returns structured code errors", async () => {
  const error = await runValidator(validateDepartment, { name: "IT", code: "bad code", location: "HQ" });
  assert.equal(error.statusCode, 400);
  assert.equal(error.message, "Validation failed");
  assert.deepEqual(error.errors[0], { field: "code", message: "Code may contain only letters, numbers, hyphens and underscores" });
});

test("category useful life must be an integer from 1 to 600", async () => {
  const error = await runValidator(validateCategory, { name: "Laptop", code: "LAPTOP", defaultUsefulLife: 12.5, requiresMaintenance: true });
  assert.equal(error.errors[0].field, "defaultUsefulLife");
});

test("organization schemas expose required unique and filter indexes", () => {
  assert.ok(Department.schema.indexes().some(([keys, options]) => keys.code === 1 && options.unique));
  assert.ok(AssetCategory.schema.indexes().some(([keys]) => keys.requiresMaintenance === 1));
});

test("query helpers escape search text and constrain paging/sorting", () => {
  assert.equal(escapeRegex("IT.*"), "IT\\.\\*");
  assert.deepEqual(paginationFrom({ page: "2", limit: "1000" }), { page: 2, limit: 100 });
  assert.deepEqual(sortFrom({ sortBy: "unsafe", sortOrder: "asc" }, ["name"]), { createdAt: 1 });
});
