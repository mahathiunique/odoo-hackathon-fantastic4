const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateAssetCreatePayload,
  validateAssetUpdatePayload,
  validateAssetStatusPayload,
  validateAssetConditionPayload,
  isValidTransition,
  getTransitionAllowedRoles,
  validateTransitionReason,
} = require("../validators/assetValidator");

const validObjectId = "507f1f77bcf86cd799439011";

test("create asset validation rejects initial allocated and disposed statuses", () => {
  const errors = validateAssetCreatePayload({
    assetTag: " lap-001 ",
    name: "Dell Laptop",
    category: validObjectId,
    currentLocation: "IT Block A",
    lifecycleStatus: "Allocated",
  });

  assert.ok(errors.some((error) => error.field === "lifecycleStatus"));
  assert.ok(errors.some((error) => error.message.includes("cannot start as Allocated")));
});

test("create asset validation normalizes the asset tag", () => {
  const payload = {
    assetTag: " lap-001 ",
    name: "Dell Laptop",
    category: validObjectId,
    currentLocation: "IT Block A",
    lifecycleStatus: "Available",
  };
  const errors = validateAssetCreatePayload(payload);

  assert.equal(errors.length, 0);
  assert.equal(payload.assetTag, "LAP-001");
});

test("status validation blocks invalid transitions and requires reasons for lost and retired", () => {
  assert.equal(isValidTransition("Available", "Disposed"), false);
  assert.deepEqual(getTransitionAllowedRoles("Available", "Under Maintenance"), ["Admin", "Asset Manager", "Maintenance Manager"]);
  assert.equal(validateTransitionReason("Lost", "   "), false);
  assert.equal(validateTransitionReason("Retired", "Needs replacement"), true);
});

test("update asset validation rejects lifecycle status and assignment fields", () => {
  const errors = validateAssetUpdatePayload({
    lifecycleStatus: "Retired",
    assignedToEmployee: validObjectId,
    name: "Updated Asset",
  });

  assert.ok(errors.some((error) => error.field === "lifecycleStatus"));
  assert.ok(errors.some((error) => error.field === "assignedToEmployee"));
});

test("condition validation requires a reason for damaged or unusable", () => {
  const errors = validateAssetConditionPayload({ condition: "Damaged" });
  assert.ok(errors.some((error) => error.field === "reason"));
});
