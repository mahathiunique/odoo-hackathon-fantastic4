import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import SearchInput from '../components/common/SearchInput';
import DataTable from '../components/tables/DataTable';
import TableActions from '../components/tables/TableActions';
import Pagination from '../components/common/Pagination';
import useDebounce from '../hooks/useDebounce';

const getRecordId = (record) => record?.id || record?._id;
const unwrapListResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (response?.assets) return response.assets;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.data?.assets) return response.data.assets;
  if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
  return [];
};

export default function ModuleListPage({ title, description, base, service, columns, statusKey = 'status', add = true }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalRecords: 0, limit: 10 });

  const search = useDebounce(q);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await service.getAll({ search, page, limit: 10, status });
        const items = unwrapListResponse(response);
        setData(items);
        const paginationPayload = response?.pagination || response?.data?.pagination || { page, totalPages: 1, totalRecords: items.length, limit: 10 };
        setPagination(paginationPayload);
      } catch (error) {
        setData([]);
        setPagination({ page, totalPages: 1, totalRecords: 0, limit: 10 });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [page, search, service, status]);

  const filtered = useMemo(() => data.filter((x) => (!search || Object.values(x).join(' ').toLowerCase().includes(search.toLowerCase())) && (!status || x[statusKey] === status)), [data, search, status, statusKey]);

  const cols = [...columns, { key: 'actions', label: 'Actions', render: (_, r) => <TableActions base={base} id={getRecordId(r)} edit={!['/allocations', '/maintenance', '/audits'].includes(base)} /> }];

  return (
    <>
      <PageHeader title={title} description={description} action={add && <Link className="btn-primary" to={`${base}/new`}><Plus size={17} /> Add new</Link>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="field sm:max-w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {[...new Set(data.map((x) => x[statusKey]).filter(Boolean))].map((x) => <option key={x}>{x}</option>)}
        </select>
        {(q || status) && <button className="btn-secondary" onClick={() => { setQ(''); setStatus(''); setPage(1); }}><X size={16} /> Clear</button>}
      </div>
      <p className="mb-3 text-sm text-slate-500">{pagination.totalRecords} result{pagination.totalRecords === 1 ? '' : 's'}</p>
      <DataTable columns={cols} data={filtered} loading={loading} emptyTitle={`No ${title.toLowerCase()} match your filters`} />
      {pagination.totalPages > 1 && <Pagination page={page} setPage={setPage} total={pagination.totalRecords} limit={pagination.limit} />}
    </>
  );
}
