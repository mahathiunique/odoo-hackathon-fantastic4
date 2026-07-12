import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import CancelBookingModal from '../../components/bookings/CancelBookingModal';
import ConfirmBookingModal from '../../components/bookings/ConfirmBookingModal';
import useAuth from '../../hooks/useAuth';
import bookingService from '../../services/bookingService';
import { readableApiError } from '../../services/helpers/apiErrors';

const roleOf = (user) => user?.role?.name || user?.role;
const person = (v) => (v ? `${v.name}${v.email ? ` (${v.email})` : ''}` : '—');
const dt = (v) => (v ? new Date(v).toLocaleString() : '—');

export default function BookingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = roleOf(user);
  const canManage = ['Admin', 'Asset Manager'].includes(role);

  const [item, setItem] = useState();
  const [error, setError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError('');
    bookingService.getBookingById(id).then(setItem).catch((e) => setError(readableApiError(e)));
  }, [id]);
  useEffect(load, [load]);

  const complete = async () => {
    setBusy(true);
    try {
      await bookingService.completeBooking(id);
      toast.success('Booking completed successfully');
      load();
    } catch (e) {
      toast.error(readableApiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <>
        <PageHeader title="Booking details" />
        <ErrorState retry={load} />
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      </>
    );
  }
  if (!item) return <LoadingSpinner />;

  const isOwner = String(item.bookedBy?._id) === String(user?._id || user?.id);
  const canCancel = ['Pending', 'Confirmed'].includes(item.status) && (canManage || isOwner);
  const canComplete = canManage && item.status === 'Confirmed' && new Date(item.startTime) <= new Date();
  const canConfirm = canManage && item.status === 'Pending';

  const fields = [
    ['Resource', item.resource ? `${item.resource.name} (${item.resource.resourceCode})` : '—'],
    ['Location', item.resource?.location],
    ['Booked by', person(item.bookedBy)],
    ['Employee', item.employee ? `${item.employee.name} (${item.employee.employeeId})` : '—'],
    ['Start', dt(item.startTime)],
    ['End', dt(item.endTime)],
    ['Attendees', item.attendeesCount],
    ['Approved by', person(item.approvedBy)],
    ['Approved at', dt(item.approvedAt)],
    ['Cancelled by', person(item.cancelledBy)],
    ['Cancel reason', item.cancelReason],
    ['Completed by', person(item.completedBy)],
    ['Completed at', dt(item.completedAt)],
    ['Created', dt(item.createdAt)],
  ];

  return (
    <>
      <PageHeader
        title={item.title}
        description="Booking details"
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
            {canConfirm && <Button variant="primary" onClick={() => setConfirmOpen(true)}><CheckCircle2 size={16} /> Confirm</Button>}
            {canComplete && <Button variant="secondary" loading={busy} onClick={complete}><CalendarCheck size={16} /> Complete</Button>}
            {canCancel && <Button variant="danger" onClick={() => setCancelOpen(true)}><XCircle size={16} /> Cancel</Button>}
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Overview</h2>
            <StatusBadge status={item.status} />
          </div>
          <dl className="grid gap-5 sm:grid-cols-2">
            {fields.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{v || '—'}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purpose</dt>
              <dd className="mt-1 text-sm text-slate-700">{item.purpose || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</dt>
              <dd className="mt-1 text-sm text-slate-700">{item.notes || '—'}</dd>
            </div>
          </dl>
        </section>
      </div>
      <CancelBookingModal open={cancelOpen} booking={item} onClose={() => setCancelOpen(false)} onCancelled={load} />
      <ConfirmBookingModal open={confirmOpen} booking={item} onClose={() => setConfirmOpen(false)} onConfirmed={load} />
    </>
  );
}
