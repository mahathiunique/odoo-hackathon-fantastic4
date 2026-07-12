import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Eye, RefreshCw, X, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/tables/DataTable';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import BookingSummaryCards from '../../components/bookings/BookingSummaryCards';
import CancelBookingModal from '../../components/bookings/CancelBookingModal';
import ConfirmBookingModal from '../../components/bookings/ConfirmBookingModal';
import useDebounce from '../../hooks/useDebounce';
import useAuth from '../../hooks/useAuth';
import { readableApiError } from '../../services/helpers/apiErrors';
import bookingService from '../../services/bookingService';
import resourceService from '../../services/resourceService';

const roleOf = (user) => user?.role?.name || user?.role;
const RESOURCE_TYPES = ['Room', 'Vehicle', 'Equipment', 'Workspace', 'Other'];
const STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const dt = (v) => new Date(v).toLocaleString();
const time = (v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function BookingListPage() {
  const { user } = useAuth();
  const role = roleOf(user);
  const canManage = ['Admin', 'Asset Manager'].includes(role);

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [status, setStatus] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [startFrom, setStartFrom] = useState('');
  const [startTo, setStartTo] = useState('');
  const [resourceOptions, setResourceOptions] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const debounced = useDebounce(search, 350);

  useEffect(() => {
    resourceService.getResourceOptions({ includeUnavailable: true }).then(setResourceOptions).catch(() => {});
    if (canManage) bookingService.getBookingStats().then(setStats).catch(() => {});
  }, [canManage]);

  const params = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      search: debounced || undefined,
      resourceType: resourceType || undefined,
      status: status || undefined,
      resource: resourceId || undefined,
      startFrom: startFrom || undefined,
      startTo: startTo || undefined,
    }),
    [pagination.page, pagination.limit, debounced, resourceType, status, resourceId, startFrom, startTo]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await bookingService.getBookings(params);
      setRecords(result.bookings);
      setPagination(result.pagination);
    } catch (e) {
      setError(readableApiError(e));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPagination((p) => ({ ...p, page: 1 })); }, [debounced, resourceType, status, resourceId, startFrom, startTo]);

  const refreshAll = () => {
    load();
    if (canManage) bookingService.getBookingStats().then(setStats).catch(() => {});
  };

  const complete = async (row) => {
    try {
      await bookingService.completeBooking(row._id);
      refreshAll();
    } catch (e) {
      setError(readableApiError(e));
    }
  };

  const columns = [
    { key: 'resource', label: 'Resource', render: (v) => v?.name || '—' },
    { key: 'title', label: 'Title' },
    { key: 'bookedBy', label: 'Booked By', render: (v) => v?.name || '—' },
    { key: 'startTime', label: 'Start', render: (v) => dt(v) },
    { key: 'endTime', label: 'End', render: (v) => time(v) },
    { key: 'attendeesCount', label: 'Attendees' },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <Link className="rounded p-2 hover:bg-slate-100" aria-label="View booking" to={`/bookings/${row._id}`}><Eye size={16} /></Link>
          {canManage && row.status === 'Pending' && (
            <button className="rounded p-2 text-indigo-600 hover:bg-indigo-50" aria-label="Confirm booking" onClick={() => setConfirmTarget(row)}><CheckCircle2 size={16} /></button>
          )}
          {canManage && row.status === 'Confirmed' && new Date(row.startTime) <= new Date() && (
            <button className="rounded p-2 text-emerald-600 hover:bg-emerald-50" aria-label="Complete booking" onClick={() => complete(row)}><CalendarDays size={16} /></button>
          )}
          {canManage && ['Pending', 'Confirmed'].includes(row.status) && (
            <button className="rounded p-2 text-red-600 hover:bg-red-50" aria-label="Cancel booking" onClick={() => setCancelTarget(row)}><XCircle size={16} /></button>
          )}
        </div>
      ),
    },
  ];

  if (error && !records.length) {
    return (
      <>
        <PageHeader title="Bookings" />
        <ErrorState retry={load} />
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Coordinate reservations and avoid resource conflicts."
        action={<Link className="btn-primary" to="/bookings/new"><CalendarDays size={17} /> New booking</Link>}
      />
      {canManage && <BookingSummaryCards stats={stats} />}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bookings…" />
        <select className="field lg:max-w-48" value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
          <option value="">All resources</option>
          {resourceOptions.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
        </select>
        <select className="field lg:max-w-40" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
          <option value="">All types</option>
          {RESOURCE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="field lg:max-w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input type="date" className="field lg:max-w-40" value={startFrom} onChange={(e) => setStartFrom(e.target.value)} />
        <input type="date" className="field lg:max-w-40" value={startTo} onChange={(e) => setStartTo(e.target.value)} />
        <button className="btn-secondary" onClick={refreshAll}><RefreshCw size={16} /> Refresh</button>
        {(search || resourceType || status || resourceId || startFrom || startTo) && (
          <button className="btn-secondary" onClick={() => { setSearch(''); setResourceType(''); setStatus(''); setResourceId(''); setStartFrom(''); setStartTo(''); }}><X size={16} /> Clear</button>
        )}
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="mb-3 text-sm text-slate-500">{pagination.totalRecords} result{pagination.totalRecords === 1 ? '' : 's'}</p>
      <DataTable columns={columns} data={records} loading={loading} emptyTitle="No bookings match the selected filters" />
      {pagination.totalPages > 1 && (
        <Pagination page={pagination.page} setPage={(page) => setPagination((p) => ({ ...p, page }))} total={pagination.totalRecords} pageSize={pagination.limit} />
      )}
      <CancelBookingModal open={Boolean(cancelTarget)} booking={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={refreshAll} />
      <ConfirmBookingModal open={Boolean(confirmTarget)} booking={confirmTarget} onClose={() => setConfirmTarget(null)} onConfirmed={refreshAll} />
    </>
  );
}
