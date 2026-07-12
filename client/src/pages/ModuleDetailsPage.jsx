import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';

export default function ModuleDetailsPage({ title, base, service }) {
  const { id } = useParams();
  const [item, setItem] = useState();

  useEffect(() => {
    service.getById(id).then((r) => setItem(r.data));
  }, [id, service]);

  if (!item) return <LoadingSpinner />;

  return (
    <>
      <PageHeader title={item.name || item.asset || item.auditName || item.requestNumber || title} description={`${title} record details`} action={<Link className="btn-secondary" to={base}><ArrowLeft size={16} /> Back</Link>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-5 font-semibold text-slate-900">Overview</h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            {Object.entries(item).filter(([k]) => !['id', '_id', 'password'].includes(k)).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k.replace(/([A-Z])/g, ' $1')}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{k.toLowerCase().includes('status') ? <StatusBadge status={v} /> : String(v ?? '—')}</dd>
              </div>
            ))}
          </dl>
        </section>
        <aside className="space-y-5">
          <div className="card">
            <h3 className="font-semibold text-slate-900">Record activity</h3>
            <div className="mt-4 space-y-4 border-l-2 border-indigo-100 pl-4 text-sm">
              <p>Record created and registered</p>
              <p>Information verified by system</p>
              <p>Last reviewed today</p>
            </div>
          </div>
          {!['/allocations', '/maintenance', '/audits'].includes(base) && <Link className="btn-primary w-full" to={`${base}/${id}/edit`}><Pencil size={16} /> Edit record</Link>}
        </aside>
      </div>
    </>
  );
}
