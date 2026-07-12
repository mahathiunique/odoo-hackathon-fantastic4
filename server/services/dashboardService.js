const mongoose = require("mongoose");
const dashboardChartService = require("./dashboardChartService");
const notificationService = require("./notificationService");
const maintenanceAdapter = require("../integrations/maintenanceNotificationAdapter");
const auditAdapter = require("../integrations/auditNotificationAdapter");

// Safely resolve a model that may not be present (e.g. Maintenance, Audit).
const getModel = (name) => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

const MANAGER_ROLES = ["Admin", "Asset Manager", "Maintenance Manager", "Auditor"];

const isManagerOrAuditor = (user) => MANAGER_ROLES.includes(user?.role);

const safeAggregate = async (fn, fallback) => {
  try {
    return await fn();
  } catch (error) {
    console.warn(`[dashboard] chart skipped: ${error.message}`);
    return fallback;
  }
};

const buildKpis = ({ assets, allocations, bookings, employees, maintenance, audits }) => {
  const kpis = [
    { key: "totalAssets", label: "Total Assets", value: assets.totalAssets, icon: "Package" },
    { key: "availableAssets", label: "Available Assets", value: assets.availableAssets, icon: "CircleCheck" },
    { key: "allocatedAssets", label: "Allocated Assets", value: allocations.openAllocations, icon: "UserCheck" },
    { key: "overdueAllocations", label: "Overdue Allocations", value: allocations.overdueAllocations, icon: "Clock" },
    { key: "totalBookings", label: "Total Bookings", value: bookings.totalBookings, icon: "Calendar" },
    { key: "upcomingBookings", label: "Upcoming Bookings", value: bookings.upcomingBookings, icon: "CalendarClock" },
    { key: "activeEmployees", label: "Active Employees", value: employees.activeEmployees, icon: "Users" },
  ];
  if (maintenance.available) {
    kpis.push({ key: "openMaintenance", label: "Open Maintenance", value: maintenance.openRequests, icon: "Wrench" });
  }
  if (audits.available) {
    kpis.push({ key: "activeAudits", label: "Active Audits", value: audits.activeAudits, icon: "ScanSearch" });
  }
  return kpis;
};

const buildRecentAssets = async (Asset) => {
  if (!Asset) return [];
  const assets = await Asset.find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("category", "name code")
    .populate("department", "name code")
    .lean();
  return assets.map((a) => ({
    _id: a._id,
    assetTag: a.assetTag,
    name: a.name,
    lifecycleStatus: a.lifecycleStatus,
    condition: a.condition,
    category: a.category?.name || null,
    department: a.department?.name || null,
    createdAt: a.createdAt,
  }));
};

const buildRecentAllocations = async (AssetAllocation) => {
  if (!AssetAllocation) return [];
  const allocations = await AssetAllocation.find({ isOpen: true })
    .sort({ expectedReturnDate: 1 })
    .limit(5)
    .populate("asset", "name assetTag")
    .populate("employee", "name employeeId")
    .lean();
  return allocations.map((a) => ({
    _id: a._id,
    assetName: a.asset?.name || null,
    assetTag: a.asset?.assetTag || null,
    allocatedToType: a.allocatedToType,
    employeeName: a.employee?.name || null,
    status: a.status,
    expectedReturnDate: a.expectedReturnDate,
    createdAt: a.createdAt,
  }));
};

const buildRecentBookings = async (ResourceBooking) => {
  if (!ResourceBooking) return [];
  const bookings = await ResourceBooking.find({})
    .sort({ startTime: -1 })
    .limit(5)
    .populate("resource", "name resourceCode")
    .populate("bookedBy", "name")
    .lean();
  return bookings.map((b) => ({
    _id: b._id,
    title: b.title,
    resourceName: b.resource?.name || b.resource?.resourceCode || null,
    bookedByName: b.bookedBy?.name || null,
    status: b.status,
    startTime: b.startTime,
    createdAt: b.createdAt,
  }));
};

const buildRecentActivity = async (ActivityLog) => {
  if (!ActivityLog) return [];
  const activities = await ActivityLog.find({})
    .sort({ createdAt: -1 })
    .limit(12)
    .populate("user", "name")
    .lean();
  return activities.map((a) => ({
    _id: a._id,
    action: a.action,
    entityType: a.entityType,
    description: a.description,
    userName: a.user?.name || "System",
    createdAt: a.createdAt,
  }));
};

const buildEmployeeSummary = async (user) => {
  const Employee = getModel("Employee");
  let employee = null;
  if (Employee) {
    employee = await Employee.findOne({ userAccount: user._id }).lean();
  }
  if (!employee) return null;

  const AssetAllocation = getModel("AssetAllocation");
  const ResourceBooking = getModel("ResourceBooking");
  const now = new Date();

  const [openAllocations, upcomingBookings] = await Promise.all([
    AssetAllocation
      ? AssetAllocation.countDocuments({ employee: employee._id, isOpen: true })
      : Promise.resolve(0),
    ResourceBooking
      ? ResourceBooking.countDocuments({
          bookedBy: user._id,
          status: { $in: ["Pending", "Confirmed"] },
          endTime: { $gt: now },
        })
      : Promise.resolve(0),
  ]);

  return {
    employeeId: employee.employeeId,
    name: employee.name,
    designation: employee.designation,
    openAllocations,
    upcomingBookings,
  };
};

const getDashboardOverview = async (user) => {
  const Asset = getModel("Asset");
  const AssetCategory = getModel("AssetCategory");
  const Department = getModel("Department");
  const AssetAllocation = getModel("AssetAllocation");
  const ResourceBooking = getModel("ResourceBooking");
  const Employee = getModel("Employee");
  const User = getModel("User");
  const ActivityLog = getModel("ActivityLog");
  const MaintenanceRequest = maintenanceAdapter.getMaintenanceModelIfAvailable();
  const AuditCycle = auditAdapter.getAuditCycleModelIfAvailable();

  const now = new Date();

  const [assets, allocations, bookings, employees, maintenance, audits] = await Promise.all([
    safeAggregate(async () => {
      if (!Asset) return { totalAssets: 0, availableAssets: 0 };
      const [totalAssets, availableAssets] = await Promise.all([
        Asset.countDocuments(),
        Asset.countDocuments({ lifecycleStatus: "Available" }),
      ]);
      return { totalAssets, availableAssets };
    }, { totalAssets: 0, availableAssets: 0 }),
    safeAggregate(async () => {
      if (!AssetAllocation)
        return { openAllocations: 0, overdueAllocations: 0 };
      const [openAllocations, overdueAllocations] = await Promise.all([
        AssetAllocation.countDocuments({ isOpen: true }),
        AssetAllocation.countDocuments({ isOpen: true, status: "Overdue" }),
      ]);
      return { openAllocations, overdueAllocations };
    }, { openAllocations: 0, overdueAllocations: 0 }),
    safeAggregate(async () => {
      if (!ResourceBooking)
        return { totalBookings: 0, upcomingBookings: 0 };
      const [totalBookings, upcomingBookings] = await Promise.all([
        ResourceBooking.countDocuments(),
        ResourceBooking.countDocuments({
          status: { $in: ["Pending", "Confirmed"] },
          startTime: { $gt: now },
        }),
      ]);
      return { totalBookings, upcomingBookings };
    }, { totalBookings: 0, upcomingBookings: 0 }),
    safeAggregate(async () => {
      if (!Employee) return { activeEmployees: 0 };
      return { activeEmployees: await Employee.countDocuments({ status: "Active" }) };
    }, { activeEmployees: 0 }),
    maintenanceAdapter.getMaintenanceDashboardSummary(),
    auditAdapter.getAuditDashboardSummary(),
  ]);

  const kpis = buildKpis({ assets, allocations, bookings, employees, maintenance, audits });

  const charts = {
    assetsByLifecycle: Asset ? await safeAggregate(() => dashboardChartService.assetsByLifecycle(Asset), []) : [],
    assetsByCategory: Asset && AssetCategory ? await safeAggregate(() => dashboardChartService.assetsByCategory(Asset, AssetCategory), []) : [],
    assetsByDepartment: Asset && Department ? await safeAggregate(() => dashboardChartService.assetsByDepartment(Asset, Department), []) : [],
    allocationsByStatus: AssetAllocation ? await safeAggregate(() => dashboardChartService.allocationsByStatus(AssetAllocation), []) : [],
    bookingsByStatus: ResourceBooking ? await safeAggregate(() => dashboardChartService.bookingsByStatus(ResourceBooking), []) : [],
    maintenanceByStatus: MaintenanceRequest ? await safeAggregate(() => dashboardChartService.maintenanceByStatus(MaintenanceRequest), []) : [],
    auditsByStatus: AuditCycle ? await safeAggregate(() => dashboardChartService.auditsByStatus(AuditCycle), []) : [],
    activityByDay: ActivityLog ? await safeAggregate(() => dashboardChartService.activityByDay(ActivityLog), []) : [],
  };

  const recent = {
    assets: await buildRecentAssets(Asset),
    allocations: await buildRecentAllocations(AssetAllocation),
    bookings: await buildRecentBookings(ResourceBooking),
    activity: await buildRecentActivity(ActivityLog),
  };

  const integrations = {
    maintenance: maintenance.available,
    audit: audits.available,
    maintenanceSummary: maintenance,
    auditSummary: audits,
  };

  const scope = isManagerOrAuditor(user) ? "organization" : "employee";
  const employee = scope === "employee" ? await buildEmployeeSummary(user) : null;
  const unreadNotifications = await notificationService.getUnreadCount(user);

  return {
    scope,
    generatedAt: now,
    kpis,
    charts,
    recent,
    integrations,
    employee,
    unreadNotifications,
  };
};

module.exports = { getDashboardOverview };
