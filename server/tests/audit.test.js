const test = require("node:test");
const assert = require("node:assert/strict");
const { validateCycle, validateVerification } = require("../validators/auditValidator");

const validObjectId = "507f1f77bcf86cd799439011";
const otherObjectId = "507f1f77bcf86cd799439012";

const validCyclePayload = () => ({
  auditName: "Quarterly Inventory Audit",
  description: "Physical verification of assets.",
  departments: [validObjectId],
  categories: [otherObjectId],
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  assignedAuditors: [validObjectId],
});

test("validateCycle accepts a well-formed Audit Cycle payload", () => {
  assert.doesNotThrow(() => validateCycle(validCyclePayload()));
});

test("validateCycle rejects an audit name shorter than three characters", () => {
  const payload = { ...validCyclePayload(), auditName: "ab" };
  assert.throws(() => validateCycle(payload), /Validation failed/);
});

test("validateCycle rejects when no scope is selected", () => {
  const payload = {
    ...validCyclePayload(),
    departments: [],
    categories: [],
    includeUnassignedAssets: false,
  };
  assert.throws(() => validateCycle(payload));
});

test("validateCycle accepts include-unassigned as the only scope", () => {
  const payload = {
    ...validCyclePayload(),
    departments: [],
    categories: [],
    includeUnassignedAssets: true,
  };
  assert.doesNotThrow(() => validateCycle(payload));
});

test("validateCycle rejects an end date before the start date", () => {
  const payload = { ...validCyclePayload(), startDate: "2026-02-01", endDate: "2026-01-01" };
  assert.throws(() => validateCycle(payload));
});

test("validateCycle rejects an empty auditor list", () => {
  const payload = { ...validCyclePayload(), assignedAuditors: [] };
  assert.throws(() => validateCycle(payload));
});

test("validateCycle rejects an invalid department id", () => {
  const payload = { ...validCyclePayload(), departments: ["not-an-id"] };
  assert.throws(() => validateCycle(payload));
});

test("validateVerification accepts a Verified item with no discrepancies", () => {
  assert.doesNotThrow(() =>
    validateVerification({
      verificationStatus: "Verified",
      actualLocation: "IT Store Room",
      physicalCondition: "Good",
      discrepancyTypes: [],
    })
  );
});

test("validateVerification rejects a Verified item that carries discrepancies", () => {
  assert.throws(() =>
    validateVerification({
      verificationStatus: "Verified",
      actualLocation: "IT Store Room",
      physicalCondition: "Good",
      discrepancyTypes: ["Location Mismatch"],
    })
  );
});

test("validateVerification rejects a Discrepancy without any discrepancy types", () => {
  assert.throws(() =>
    validateVerification({
      verificationStatus: "Discrepancy",
      physicalCondition: "Damaged",
      discrepancyTypes: [],
      auditorNotes: "Asset relocated.",
    })
  );
});

test("validateVerification rejects a Discrepancy without auditor notes", () => {
  assert.throws(() =>
    validateVerification({
      verificationStatus: "Discrepancy",
      physicalCondition: "Damaged",
      discrepancyTypes: ["Condition Mismatch"],
      auditorNotes: "",
    })
  );
});

test("validateVerification accepts a valid Discrepancy item", () => {
  assert.doesNotThrow(() =>
    validateVerification({
      verificationStatus: "Discrepancy",
      actualLocation: "Storage B",
      physicalCondition: "Damaged",
      discrepancyTypes: ["Location Mismatch", "Condition Mismatch"],
      auditorNotes: "Asset moved and damaged.",
    })
  );
});

test("validateVerification rejects a Missing item without the Missing Asset type", () => {
  assert.throws(() =>
    validateVerification({
      verificationStatus: "Missing",
      discrepancyTypes: [],
      auditorNotes: "Could not locate the asset.",
    })
  );
});

test("validateVerification rejects a Missing item without auditor notes", () => {
  assert.throws(() =>
    validateVerification({
      verificationStatus: "Missing",
      discrepancyTypes: ["Missing Asset"],
      auditorNotes: "",
    })
  );
});

test("validateVerification accepts a valid Missing item", () => {
  assert.doesNotThrow(() =>
    validateVerification({
      verificationStatus: "Missing",
      discrepancyTypes: ["Missing Asset"],
      auditorNotes: "Asset could not be located during the audit.",
    })
  );
});

test("validateVerification rejects an invalid verification status", () => {
  assert.throws(() =>
    validateVerification({
      verificationStatus: "Pending",
      discrepancyTypes: [],
    })
  );
});
