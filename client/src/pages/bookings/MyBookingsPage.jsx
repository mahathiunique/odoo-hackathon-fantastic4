import { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Eye, RefreshCw, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/tables/DataTable';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import CancelBookingModal from '../../components/bookings/CancelBookingModal';
import { readableApiError } from '../../services/helpers/apiErrors';
import bookingService from '../../services/bookingService';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Cancelled', label: 'Cancelled' },
];
const dt = (v) => new Date(v).toLocaleString();
const time = (v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function MyBookingsPage() {
  const [tab, setTab] = useState('upcoming');
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = { page: pagination.page, limit: pagination.limit, sortBy: 'startTime', sortOrder: tab === 'upcoming' ? 'asc' : 'desc' };
    if (tab === 'upcoming') params.upcomingOnly = 'true';
    else params.status = tab;
    try {
      const result = await bookingService.getMyBookings(params);
      setRecords(result.bookings);
      setPagination(result.pagination);
    } catch (e) {
      setError(readableApiError(e));
    } finally {
      setLoading(false);
    }
  }, [tab, pagination.page, pagination.limit]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPagination((p) => ({ ...p, page: 1 })); }, [tab]);

  const columns = [
    { key: 'resource', label: 'Resource', render: (v) => v?.name || '—' },
    { key: 'title', label: 'Title' },
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
          {['Pending', 'Confirmed'].includes(row.status) && (
            <button className="rounded p-2 text-red-600 hover:bg-red-50" aria-label="Cancel booking" onClick={() => setCancelTarget(row)}><XCircle size={16} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="My bookings"
        description="Your reservations, approvals and history."
        action={<Link className="btn-primary" to="/bookings/new"><CalendarPlus size={17} /> New booking</Link>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <button className="btn-secondary ml-auto" onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>
      {error && !records.length ? (
        <>
          <ErrorState retry={load} />
          <p className="mt-3 text-center text-sm text-red-600">{error}</p>
        </>
      ) : (
        <>
          <DataTable columns={columns} data={records} loading={loading} emptyTitle="No bookings in this view" />
          {pagination.totalPages > 1 && (
            <Pagination page={pagination.page} setPage={(page) => setPagination((p) => ({ ...p, page }))} total={pagination.totalRecords} pageSize={pagination.limit} />
          )}
        </>
      )}
      <CancelBookingModal open={Boolean(cancelTarget)} booking={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={load} />
    </>
  );
}
