import { useEffect, useState, useCallback } from 'react';
import { Activity, Search } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { activityService } from '../../services/activityService';

const ENTITY_TYPES = [
  'User', 'Department', 'AssetCategory', 'Employee', 'Asset', 'AssetAllocation',
  'Resource', 'ResourceBooking', 'Notification', 'MaintenanceRequest', 'AuditCycle',
  'AuditItem', 'System',
];

export default function ActivityLogPage() {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalRecords: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ action: '', entityType: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const query = { page, limit: 20 };
      if (filters.action.trim()) query.action = filters.action.trim();
      if (filters.entityType) query.entityType = filters.entityType;
      const res = await activityService.getAll(query);
      setActivities(res?.data?.activities || []);
      setPagination(res?.data?.pagination || { page: 1, limit: 20, totalRecords: 0, totalPages: 0 });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load(1);
  }, [load]);

  const onFilter = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  return (
    <>
      <PageHeader title="Activity log" description="A read-only, tamper-evident history of system and user actions." />

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="flex flex-1 items-center gap-2">
          <Search size={16} className="text-slate-400" />
          <input
            name="action"
            value={filters.action}
            onChange={onFilter}
            placeholder="Filter by action (e.g. Asset Allocated)"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary-400"
          />
        </div>
        <select
          name="entityType"
          value={filters.entityType}
          onChange={onFilter}
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary-400"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button onClick={() => load(1)} className="btn-secondary">Apply</button>
      </div>

      {loading ? (
        <div className="card"><LoadingSkeleton /></div>
      ) : error ? (
        <ErrorState retry={() => load(pagination.page)} />
      ) : activities.length ? (
        <>
          <div className="overflow-hidden rounded-xl border bg-white shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activities.map((a) => (
                  <tr key={a._id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{a.action}</td>
                    <td className="px-4 py-3 text-slate-500">{a.entityType}</td>
                    <td className="px-4 py-3 text-slate-600">{a.description}</td>
                    <td className="px-4 py-3 text-slate-500">{a.user?.name || 'System'}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => load(p)}
          />
        </>
      ) : (
        <div className="card">
          <EmptyState icon={<Activity size={40} />} title="No activity found" description="Try adjusting your filters." />
        </div>
      )}
    </>
  );
}
