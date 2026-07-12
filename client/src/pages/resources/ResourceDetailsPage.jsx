import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarPlus, Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';
import useAuth from '../../hooks/useAuth';
import resourceService from '../../services/resourceService';
import { readableApiError } from '../../services/helpers/apiErrors';

const roleOf = (user) => user?.role?.name || user?.role;
const value = (v) => (v === 0 ? '0' : v || '—');
const person = (v) => (v ? `${v.name}${v.email ? ` (${v.email})` : ''}` : '—');
const dt = (v) => (v ? new Date(v).toLocaleString() : '—');

export default function ResourceDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const role = roleOf(user);
  const canEdit = ['Admin', 'Asset Manager'].includes(role);
  const canBook = ['Admin', 'Asset Manager', 'Employee'].includes(role);
  const [item, setItem] = useState();
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    resourceService.getResourceById(id).then(setItem).catch((e) => setError(readableApiError(e)));
  }, [id]);
  useEffect(load, [load]);

  if (error) {
    return (
      <>
        <PageHeader title="Resource details" />
        <ErrorState retry={load} />
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      </>
    );
  }
  if (!item) return <LoadingSpinner />;

  const rules = item.bookingRules || {};
  const fields = [
    ['Code', item.resourceCode],
    ['Type', item.resourceType],
    ['Capacity', item.capacity],
    ['Location', item.location],
    ['Availability', <StatusBadge status={item.availabilityStatus} />],
    ['Status', <StatusBadge status={item.status} />],
    ['Total bookings', item.totalBookingCount],
    ['Upcoming bookings', item.upcomingBookingCount],
    ['Created', dt(item.createdAt)],
    ['Created by', person(item.createdBy)],
    ['Last updated', dt(item.updatedAt)],
    ['Updated by', person(item.updatedBy)],
  ];

  return (
    <>
      <PageHeader
        title={item.name}
        description="Shared resource details"
        action={
          <div className="flex gap-2">
            <Link className="btn-secondary" to="/resources"><ArrowLeft size={16} /> Back</Link>
            {canBook && item.status === 'Active' && item.availabilityStatus === 'Available' && (
              <Link className="btn-secondary" to={`/bookings/new?resource=${item._id}`}><CalendarPlus size={16} /> Book</Link>
            )}
            {canEdit && <Link className="btn-primary" to={`/resources/${id}/edit`}><Pencil size={16} /> Edit</Link>}
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Overview</h2>
            <span className="text-xs text-slate-400">{item.resourceCode}</span>
          </div>
          <dl className="grid gap-5 sm:grid-cols-2">
            {fields.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{typeof v === 'object' && v !== null ? v : value(v)}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</dt>
              <dd className="mt-1 text-sm text-slate-700">{value(item.description)}</dd>
            </div>
          </dl>

          <h3 className="mb-3 mt-8 border-t pt-6 font-semibold text-slate-900">Booking rules</h3>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Minimum duration</dt><dd className="mt-1 text-sm font-medium text-slate-800">{rules.minimumDurationMinutes} min</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Maximum duration</dt><dd className="mt-1 text-sm font-medium text-slate-800">{rules.maximumDurationMinutes} min</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Advance booking</dt><dd className="mt-1 text-sm font-medium text-slate-800">{rules.maximumAdvanceDays} days</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requires approval</dt><dd className="mt-1 text-sm font-medium text-slate-800">{rules.requiresApproval ? 'Yes' : 'No'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Weekend bookings</dt><dd className="mt-1 text-sm font-medium text-slate-800">{rules.allowWeekendBookings ? 'Allowed' : 'Not allowed'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Instructions</dt><dd className="mt-1 text-sm text-slate-700">{value(rules.instructions)}</dd></div>
          </dl>
        </section>

        <aside className="flex flex-col gap-5">
          <div className="card">
            <h3 className="mb-3 font-semibold text-slate-900">Linked asset</h3>
            {item.linkedAssetSummary ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Asset tag</dt><dd className="font-medium">{item.linkedAssetSummary.assetTag}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd className="font-medium">{item.linkedAssetSummary.name}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Lifecycle</dt><dd className="font-medium">{item.linkedAssetSummary.lifecycleStatus}</dd></div>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No Asset is linked to this Resource.</p>
            )}
          </div>

          <div className="card">
            <h3 className="mb-3 font-semibold text-slate-900">Upcoming bookings</h3>
            {item.upcomingBookings?.length ? (
              <ul className="space-y-3">
                {item.upcomingBookings.map((b) => (
                  <li key={b._id} className="rounded-lg border-l-4 border-primary-500 bg-primary-50 p-3 text-xs">
                    <b className="text-slate-800">{b.title}</b>
                    <p className="mt-1 text-slate-500">{new Date(b.startTime).toLocaleString()} — {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <StatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No upcoming bookings.</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
