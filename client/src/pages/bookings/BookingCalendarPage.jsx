import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import useAuth from '../../hooks/useAuth';
import { readableApiError } from '../../services/helpers/apiErrors';
import bookingService from '../../services/bookingService';
import resourceService from '../../services/resourceService';

const RESOURCE_TYPES = ['Room', 'Vehicle', 'Equipment', 'Workspace', 'Other'];
const roleOf = (user) => user?.role?.name || user?.role;

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const localInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function BookingCalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canBook = ['Admin', 'Asset Manager', 'Employee'].includes(roleOf(user));

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [resourceOptions, setResourceOptions] = useState([]);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    resourceService.getResourceOptions({ includeUnavailable: true }).then(setResourceOptions).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { start: weekStart.toISOString(), end: weekEnd.toISOString() };
      if (resourceId) params.resource = resourceId;
      if (resourceType) params.resourceType = resourceType;
      const result = await bookingService.getCalendarBookings(params);
      setBookings(result);
    } catch (e) {
      setError(readableApiError(e));
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, resourceId, resourceType]);

  useEffect(() => { load(); }, [load]);

  const bookingsForDay = (day) =>
    bookings
      .filter((b) => sameDay(new Date(b.startTime), day))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const newBookingOn = (day) => {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const q = new URLSearchParams({ start: localInput(start) });
    if (resourceId) q.set('resource', resourceId);
    navigate(`/bookings/new?${q.toString()}`);
  };

  const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <>
      <PageHeader title="Booking calendar" description="Weekly schedule for shared resources." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <button className="btn-secondary !px-2" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={16} /></button>
          <button className="btn-secondary" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</button>
          <button className="btn-secondary !px-2" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={16} /></button>
          <span className="ml-2 text-sm font-semibold text-slate-700">{rangeLabel}</span>
        </div>
        <select className="field lg:max-w-48" value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
          <option value="">All resources</option>
          {resourceOptions.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
        </select>
        <select className="field lg:max-w-40" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
          <option value="">All types</option>
          {RESOURCE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button className="btn-secondary lg:ml-auto" onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>

      {error ? (
        <>
          <ErrorState retry={load} />
          <p className="mt-3 text-center text-sm text-red-600">{error}</p>
        </>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <div className="grid min-w-[900px] grid-cols-7 divide-x">
            {days.map((day) => {
              const dayBookings = bookingsForDay(day);
              const isToday = sameDay(day, new Date());
              return (
                <div key={day.toISOString()} className="min-h-[24rem]">
                  <div className={`flex items-center justify-between border-b p-2 text-sm ${isToday ? 'bg-primary-50' : 'bg-slate-50'}`}>
                    <span className="font-semibold text-slate-700">{day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</span>
                    {canBook && (
                      <button className="text-primary-600 hover:underline" onClick={() => newBookingOn(day)} title="New booking">+</button>
                    )}
                  </div>
                  <div className="space-y-2 p-2">
                    {dayBookings.length === 0 && <p className="py-6 text-center text-xs text-slate-300">No bookings</p>}
                    {dayBookings.map((b) => (
                      <button
                        key={b._id}
                        onClick={() => navigate(`/bookings/${b._id}`)}
                        className="block w-full rounded-lg border-l-4 border-primary-500 bg-primary-50 p-2 text-left text-xs hover:bg-primary-100"
                      >
                        <b className="text-slate-800">{new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>{' '}
                        <span className="text-slate-700">{b.title}</span>
                        <p className="mt-1 truncate text-slate-500">{b.resource?.name}</p>
                        <StatusBadge status={b.status} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
