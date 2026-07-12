import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import SearchInput from '../components/common/SearchInput';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/tables/DataTable';
import TableActions from '../components/tables/TableActions';
import Pagination from '../components/common/Pagination';
import useDebounce from '../hooks/useDebounce';

const getRecordId = (record) => record?.id || record?._id;

export default function ModuleListPage({ title, description, base, service, columns, statusKey = 'status', add = true, extraFilters = [] }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const search = useDebounce(q);

  useEffect(() => {
    setLoading(true);
    service.getAll().then((r) => setData(r.data || [])).finally(() => setLoading(false));
  }, [service]);

  const filtered = useMemo(() => data.filter((x) => (!search || Object.values(x).join(' ').toLowerCase().includes(search.toLowerCase())) && (!status || x[statusKey] === status)), [data, search, status, statusKey]);

  const cols = [...columns, { key: 'actions', label: 'Actions', render: (_, r) => <TableActions base={base} id={getRecordId(r)} edit={!['/allocations', '/maintenance', '/audits'].includes(base)} /> }];

  return (
    <>
      <PageHeader title={title} description={description} action={add && <Link className="btn-primary" to={`${base}/new`}><Plus size={17} /> Add new</Link>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="field sm:max-w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {[...new Set(data.map((x) => x[statusKey]).filter(Boolean))].map((x) => <option key={x}>{x}</option>)}
        </select>
        {(q || status) && <button className="btn-secondary" onClick={() => { setQ(''); setStatus(''); }}><X size={16} /> Clear</button>}
      </div>
      <p className="mb-3 text-sm text-slate-500">{filtered.length} result{filtered.length === 1 ? '' : 's'}</p>
      <DataTable columns={cols} data={filtered.slice((page - 1) * 10, page * 10)} loading={loading} emptyTitle={`No ${title.toLowerCase()} match your filters`} />
      {filtered.length > 10 && <Pagination page={page} setPage={setPage} total={filtered.length} />}
    </>
  );
}
