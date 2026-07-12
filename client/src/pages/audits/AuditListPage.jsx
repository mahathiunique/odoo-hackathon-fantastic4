import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Plus, RefreshCw, ScanSearch, X } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/common/SearchInput';
import DataTable from '../../components/tables/DataTable';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import AuditStatusBadge from '../../components/audits/AuditStatusBadge';
import AuditProgressBar from '../../components/audits/AuditProgressBar';
import useDebounce from '../../hooks/useDebounce';
import useAuth from '../../hooks/useAuth';
import { readableApiError } from '../../services/helpers/apiErrors';
import auditService from '../../services/auditService';

const roleOf = (user) => user?.role?.name || user?.role;
const STATUSES = ['Planned', 'In Progress', 'Completed', 'Cancelled'];
const SORTS = [
  ['createdAt', 'Newest'],
  ['startDate', 'Start date'],
  ['endDate', 'End date'],
  ['auditName', 'Name'],
  ['status', 'Status'],
];
const d = (v) => (v ? new Date(v).toLocaleDateString() : '—');

export default function AuditListPage({ mine = false }) {
  const { user } = useAuth();
  const role = roleOf(user);
  const canCreate = role === 'Admin';

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const debounced = useDebounce(search, 350);

  const params = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      search: debounced || undefined,
      status: status || undefined,
      sortBy,
      sortOrder,
    }),
    [pagination.page, pagination.limit, debounced, status, sortBy, sortOrder]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = mine ? await auditService.getMyAudits(params) : await auditService.getAudits(params);
      setRecords(result.audits || []);
      setPagination(result.pagination);
    } catch (e) {
      setError(readableApiError(e));
    } finally {
      setLoading(false);
    }
  }, [params, mine]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPagination((p) => ({ ...p, page: 1 })); }, [debounced, status, sortBy, sortOrder]);

  const columns = [
    { key: 'auditCode', label: 'Code' },
    { key: 'auditName', label: 'Audit cycle' },
    { key: 'startDate', label: 'Starts', render: (v) => d(v) },
    { key: 'endDate', label: 'Ends', render: (v) => d(v) },
    { key: 'summary', label: 'Progress', render: (v) => <div className="min-w-40"><AuditProgressBar summary={v} /></div> },
    { key: 'status', label: 'Status', render: (v) => <AuditStatusBadge status={v} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <Link className="rounded p-2 hover:bg-slate-100" aria-label="View audit" to={`/audits/${row._id}`}><Eye size={16} /></Link>
          <Link className="rounded p-2 hover:bg-slate-100" aria-label="Audit report" to={`/audits/${row._id}/report`}><FileText size={16} /></Link>
        </div>
      ),
    },
  ];

  if (error && !records.length) {
    return (
      <>
        <PageHeader title={mine ? 'My audits' : 'Audit cycles'} />
        <ErrorState retry={load} />
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={mine ? 'My audits' : 'Audit cycles'}
        description={mine ? 'Audit cycles where you are an assigned auditor.' : 'Verify physical inventory and resolve discrepancies.'}
        action={canCreate && !mine ? <Link className="btn-primary" to="/audits/new"><Plus size={17} /> New audit</Link> : null}
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search audits…" />
        <select className="field lg:max-w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="field lg:max-w-40" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="field lg:max-w-40" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        <button className="btn-secondary" onClick={load}><RefreshCw size={16} /> Refresh</button>
        {(search || status) && (
          <button className="btn-secondary" onClick={() => { setSearch(''); setStatus(''); }}><X size={16} /> Clear</button>
        )}
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="mb-3 text-sm text-slate-500">{pagination.totalRecords} result{pagination.totalRecords === 1 ? '' : 's'}</p>
      <DataTable columns={columns} data={records} loading={loading} emptyTitle={mine ? 'You have no assigned audits' : 'No audit cycles match the selected filters'} />
      {pagination.totalPages > 1 && (
        <Pagination page={pagination.page} setPage={(page) => setPagination((p) => ({ ...p, page }))} total={pagination.totalRecords} pageSize={pagination.limit} />
      )}
    </>
  );
}
