import * as I from "lucide-react";
import { NavLink } from "react-router-dom";
import { canAccess } from "../../utils/constants";
import useAuth from "../../hooks/useAuth";
const groups = [
  ["Workspace", [["Dashboard", "/dashboard", "LayoutDashboard"]]],
  [
    "Organization",
    [
      ["Departments", "/departments", "Building2"],
      ["Categories", "/categories", "Tags"],
      ["Employees", "/employees", "Users"],
    ],
  ],
  [
    "Asset management",
    [
      ["Assets", "/assets", "Package"],
      ["Allocations", "/allocations", "ArrowLeftRight"],
      ["Shared resources", "/resources", "Boxes"],
      ["Bookings", "/bookings", "CalendarDays"],
      ["Calendar", "/bookings/calendar", "CalendarRange"],
      ["My bookings", "/my-bookings", "CalendarCheck"],
    ],
  ],
  [
    "Operations",
    [
      ["Maintenance", "/maintenance", "Wrench"],
      ["Audits", "/audits", "ScanSearch"],
      ["My audits", "/my-audits", "ClipboardCheck"],
    ],
  ],
  [
    "System",
    [
      ["Notifications", "/notifications", "Bell"],
      ["Activity log", "/activity", "ScrollText"],
      ["Users", "/users", "ShieldCheck"],
    ],
  ],
];
export default function Sidebar({
  mobile = false,
  onClose,
  collapsed = false,
  setCollapsed,
}) {
  const { user } = useAuth();
  return (
    <aside
      className={`${mobile ? "w-72" : "hidden lg:flex"} ${collapsed ? "lg:w-20" : "lg:w-64"} h-full flex-col border-r bg-slate-950 text-slate-300 transition-all`}
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-500 font-black text-white">
          AF
        </span>
        {!collapsed && (
          <div>
            <b className="text-white">AssetFlow</b>
            <p className="text-[10px] text-slate-400">Enterprise asset suite</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {groups.map(([group, items]) => {
          const visible = items.filter(([, p]) => canAccess(user.role, p));
          if (!visible.length) return null;
          return (
            <div className="mb-5" key={group}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {group}
                </p>
              )}
              {visible.map(([label, path, icon]) => {
                const Icon = I[icon];
                return (
                  <NavLink
                    onClick={onClose}
                    title={label}
                    key={path}
                    to={path}
                    className={({ isActive }) =>
                      `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? "bg-primary-600 text-white" : "hover:bg-white/5 hover:text-white"}`
                    }
                  >
                    <Icon size={18} />
                    {!collapsed && label}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>
      {!mobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="m-3 flex items-center justify-center rounded-lg border border-white/10 p-2 hover:bg-white/5"
        >
          {collapsed ? (
            <I.ChevronsRight size={18} />
          ) : (
            <I.ChevronsLeft size={18} />
          )}
        </button>
      )}
    </aside>
  );
}
