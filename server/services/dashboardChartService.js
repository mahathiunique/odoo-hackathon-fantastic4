// Chart data builders for the dashboard. Each function accepts a Mongoose model
// (already confirmed available by the caller) and returns an array of
// { name, value } chart points. Keeping these separate lets the dashboard
// service orchestrate which modules are present.

const toNamed = (counts, labelMap = {}) =>
  counts.map((entry) => ({
    name: labelMap[entry._id] || entry._id || "Other",
    value: entry.count,
  }));

const assetsByLifecycle = async (Asset) => {
  const counts = await Asset.aggregate([{ $group: { _id: "$lifecycleStatus", count: { $sum: 1 } } }]);
  return toNamed(counts);
};

const assetsByCategory = async (Asset, AssetCategory) => {
  const [counts, categories] = await Promise.all([
    Asset.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    AssetCategory.find({}).select("name _id").lean(),
  ]);
  const nameById = new Map(categories.map((c) => [String(c._id), c.name]));
  return toNamed(counts, (id) => nameById.get(String(id)) || "Uncategorized");
};

const assetsByDepartment = async (Asset, Department) => {
  const [counts, departments] = await Promise.all([
    Asset.aggregate([{ $group: { _id: "$department", count: { $sum: 1 } } }]),
    Department.find({}).select("name code _id").lean(),
  ]);
  const labelById = new Map(
    departments.map((d) => [String(d._id), `${d.code || d.name}`])
  );
  return toNamed(counts, (id) => labelById.get(String(id)) || "Unassigned");
};

const bookingsByStatus = async (ResourceBooking) => {
  const counts = await ResourceBooking.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return toNamed(counts);
};

const allocationsByStatus = async (AssetAllocation) => {
  const counts = await AssetAllocation.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return toNamed(counts);
};

const maintenanceByStatus = async (MaintenanceRequest) => {
  const counts = await MaintenanceRequest.aggregate([
    { $group: { _id: "$requestStatus", count: { $sum: 1 } } },
  ]);
  return toNamed(counts);
};

const auditsByStatus = async (AuditCycle) => {
  const counts = await AuditCycle.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return toNamed(counts);
};

// Builds a 7-day activity sparkline from ActivityLog creation counts.
const activityByDay = async (ActivityLog, days = 7) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const counts = await ActivityLog.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDay = new Map(counts.map((c) => [c._id, c.count]));
  const points = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    points.push({ name: d.toLocaleDateString([], { weekday: "short" }), value: byDay.get(key) || 0 });
  }
  return points;
};

module.exports = {
  toNamed,
  assetsByLifecycle,
  assetsByCategory,
  assetsByDepartment,
  bookingsByStatus,
  allocationsByStatus,
  maintenanceByStatus,
  auditsByStatus,
  activityByDay,
};
