import { User, ArrowLeftRight, CalendarCheck } from 'lucide-react';

// Personalized employee view: allocations and bookings tied to the logged-in
// user. Only rendered when the dashboard scope is "employee".
export default function PersonalizedDashboard({ employee }) {
  if (!employee) return null;

  const cards = [
    {
      label: 'Your open allocations',
      value: employee.openAllocations,
      icon: ArrowLeftRight,
      to: '/my-allocations',
    },
    {
      label: 'Your upcoming bookings',
      value: employee.upcomingBookings,
      icon: CalendarCheck,
      to: '/my-bookings',
    },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-3 border-b p-4">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary-600">
          <User size={20} />
        </span>
        <div>
          <b className="text-slate-900">{employee.name}</b>
          <p className="text-xs text-slate-500">
            {employee.designation} · {employee.employeeId}
          </p>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-lg border bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Icon size={16} />
                <span className="text-xs font-medium">{c.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{c.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
