import { CalendarCheck, CalendarClock, CheckCircle2, XCircle, CalendarDays, Clock } from 'lucide-react';

const CARDS = [
  { key: 'totalBookings', label: 'Total', icon: CalendarDays, color: 'text-slate-600 bg-slate-100' },
  { key: 'pendingBookings', label: 'Pending', icon: CalendarClock, color: 'text-amber-600 bg-amber-50' },
  { key: 'confirmedBookings', label: 'Confirmed', icon: CalendarCheck, color: 'text-indigo-600 bg-indigo-50' },
  { key: 'completedBookings', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'cancelledBookings', label: 'Cancelled', icon: XCircle, color: 'text-slate-500 bg-slate-100' },
  { key: 'todayBookings', label: 'Today', icon: Clock, color: 'text-blue-600 bg-blue-50' },
];

export default function BookingSummaryCards({ stats }) {
  if (!stats) return null;
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {CARDS.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="card flex items-center gap-3 !p-4">
          <span className={`grid h-10 w-10 place-items-center rounded-lg ${color}`}><Icon size={18} /></span>
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-lg font-bold text-slate-900">{stats[key] ?? 0}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
