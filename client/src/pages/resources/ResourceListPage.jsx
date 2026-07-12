import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, CalendarPlus, Eye, Pencil, Plus, Power, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/tables/DataTable';
import Pagination from '../../components/common/Pagination';
import ConfirmModal from '../../components/common/ConfirmModal';
import ErrorState from '../../components/common/ErrorState';
import ResourceAvailabilityModal from '../../components/resources/ResourceAvailabilityModal';
import useDebounce from '../../hooks/useDebounce';
import useAuth from '../../hooks/useAuth';
import { readableApiError } from '../../services/helpers/apiErrors';
import resourceService from '../../services/resourceService';

const roleOf = (user) => user?.role?.name || user?.role;
const RESOURCE_TYPES = ['Room', 'Vehicle', 'Equipment', 'Workspace', 'Other'];

export default function ResourceListPage() {
  const { user } = useAuth();
  const role = roleOf(user);
  const canEdit = ['Admin', 'Asset Manager'].includes(role);
  const canStatus = role === 'Admin';
  const canBook = ['Admin', 'Asset Manager', 'Employee'].includes(role);

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [availability, setAvailability] = useState('');
  const [status, setStatus] = useState('');
  const [assetIntegration, setAssetIntegration] = useState(true);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [availabilityTarget, setAvailabilityTarget] = useState(null);

  const debounced = useDebounce(search, 350);

  const params = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      search: debounced || undefined,
      resourceType: resourceType || undefined,
      availabilityStatus: availability || undefined,
      status: status || undefined,
    }),
    [pagination.page, pagination.limit, debounced, resourceType, availability, status]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await resourceService.getResources(params);
      setRecords(result.resources);
      setPagination(result.pagination);
      setAssetIntegration(result.assetIntegrationAvailable);
    } catch (e) {
      setError(readableApiError(e));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPagination((p) => ({ ...p, page: 1 })); }, [debounced, resourceType, availability, status]);

  const toggleStatus = async () => {
    const row = pendingStatus;
    if (!row) return;
    const next = row.status === 'Active' ? 'Inactive' : 'Active';
    try {
      if (next === 'Inactive') await resourceService.deactivateResource(row._id);
      else await resourceService.changeResourceStatus(row._id, next);
      toast.success(`Resource ${next.toLowerCase() === 'active' ? 'activated' : 'deactivated'} successfully`);
      setPendingStatus(null);
      load();
    } catch (e) {
      toast.error(readableApiError(e));
    }
  };

  const columns = [
    { key: 'name', label: 'Resource' },
    { key: 'resourceCode', label: 'Code' },
    { key: 'resourceType', label: 'Type' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'location', label: 'Location' },
    { key: 'availabilityStatus', label: 'Availability', render: (v) => <StatusBadge status={v} /> },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'linkedAsset', label: 'Linked Asset', render: (v) => (v ? 'Linked' : 'None') },
    {
      key: 'nextBooking',
      label: 'Next Booking',
      render: (v) => (v ? new Date(v.startTime).toLocaleString() : '—'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <Link className="rounded p-2 hover:bg-slate-100" aria-label="View resource" to={`/resources/${row._id}`}><Eye size={16} /></Link>
          {canBook && row.status === 'Active' && row.availabilityStatus === 'Available' && (
            <Link className="rounded p-2 text-primary-600 hover:bg-primary-50" aria-label="Book resource" to={`/bookings/new?resource=${row._id}`}><CalendarPlus size={16} /></Link>
          )}
          {canEdit && (
            <Link className="rounded p-2 hover:bg-slate-100" aria-label="Edit resource" to={`/resources/${row._id}/edit`}><Pencil size={16} /></Link>
          )}
          {canEdit && (
            <button className="rounded p-2 text-amber-600 hover:bg-amber-50" aria-label="Change availability" onClick={() => setAvailabilityTarget(row)}><ArrowLeftRight size={16} /></button>
          )}
          {canStatus && (
            <button className={`rounded p-2 ${row.status === 'Active' ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`} aria-label="Toggle status" onClick={() => setPendingStatus(row)}><Power size={16} /></button>
          )}
        </div>
      ),
    },
  ];

  if (error && !records.length) {
    return (
      <>
        <PageHeader title="Shared resources" />
        <ErrorState retry={load} />
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Shared resources"
        description="Bookable rooms, vehicles, workspaces and equipment."
        action={canEdit && <Link className="btn-primary" to="/resources/new"><Plus size={17} /> Add resource</Link>}
      />
      {!assetIntegration && (
        <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          Asset integration (Stage 6) is not available yet. Resources work independently; asset linking becomes available after Stage 6 is merged.
        </p>
      )}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources…" />
        <select className="field lg:max-w-40" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
          <option value="">All types</option>
          {RESOURCE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="field lg:max-w-44" value={availability} onChange={(e) => setAvailability(e.target.value)}>
          <option value="">All availability</option>
          <option>Available</option>
          <option>Unavailable</option>
        </select>
        {canEdit && (
          <select className="field lg:max-w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        )}
        <button className="btn-secondary" onClick={load}><RefreshCw size={16} /> Refresh</button>
        {(search || resourceType || availability || status) && (
          <button className="btn-secondary" onClick={() => { setSearch(''); setResourceType(''); setAvailability(''); setStatus(''); }}><X size={16} /> Clear</button>
        )}
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="mb-3 text-sm text-slate-500">{pagination.totalRecords} result{pagination.totalRecords === 1 ? '' : 's'}</p>
      <DataTable columns={columns} data={records} loading={loading} emptyTitle="No resources match the selected filters" />
      {pagination.totalPages > 1 && (
        <Pagination page={pagination.page} setPage={(page) => setPagination((p) => ({ ...p, page }))} total={pagination.totalRecords} pageSize={pagination.limit} />
      )}
      <ConfirmModal
        open={Boolean(pendingStatus)}
        onClose={() => setPendingStatus(null)}
        onConfirm={toggleStatus}
        title={`${pendingStatus?.status === 'Active' ? 'Deactivate' : 'Activate'} resource`}
        message={`Are you sure you want to ${pendingStatus?.status === 'Active' ? 'deactivate' : 'activate'} this resource? Booking history is preserved.`}
      />
      <ResourceAvailabilityModal
        open={Boolean(availabilityTarget)}
        resource={availabilityTarget}
        onClose={() => setAvailabilityTarget(null)}
        onChanged={load}
      />
    </>
  );
}
