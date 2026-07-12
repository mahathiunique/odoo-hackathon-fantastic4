import VerificationStatusBadge from './VerificationStatusBadge';

const assetLabel = (item) =>
  item?.asset?.assetTag || item?.expectedSnapshot?.assetTag
    ? `${item.asset?.assetTag || item.expectedSnapshot?.assetTag} — ${item.asset?.name || item.expectedSnapshot?.assetName || ''}`
    : '—';

function ItemsSection({ title, items = [], showActual = true }) {
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No records in this category.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 pr-3">Asset</th>
                <th className="py-2 pr-3">Expected location</th>
                {showActual && <th className="py-2 pr-3">Actual location</th>}
                <th className="py-2 pr-3">Discrepancy</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Auditor notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item._id} className="align-top">
                  <td className="py-2 pr-3 font-medium text-slate-800">{assetLabel(item)}</td>
                  <td className="py-2 pr-3 text-slate-600">{item.expectedSnapshot?.currentLocation || '—'}</td>
                  {showActual && <td className="py-2 pr-3 text-slate-600">{item.actualLocation || '—'}</td>}
                  <td className="py-2 pr-3 text-slate-600">{(item.discrepancyTypes || []).join(', ') || '—'}</td>
                  <td className="py-2 pr-3"><VerificationStatusBadge status={item.verificationStatus} /></td>
                  <td className="py-2 pr-3 text-slate-500">{item.auditorNotes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AuditReportPanel({ report }) {
  if (!report) return null;
  const {
    missingAssets = [],
    locationDiscrepancies = [],
    departmentDiscrepancies = [],
    employeeDiscrepancies = [],
    conditionDiscrepancies = [],
    damagedAssets = [],
    unregisteredFindings = [],
    pendingItems = [],
  } = report;

  return (
    <div className="mt-5 grid gap-5">
      <ItemsSection title="Missing assets" items={missingAssets} showActual={false} />
      <ItemsSection title="Location mismatches" items={locationDiscrepancies} />
      <ItemsSection title="Department mismatches" items={departmentDiscrepancies} />
      <ItemsSection title="Employee mismatches" items={employeeDiscrepancies} />
      <ItemsSection title="Condition mismatches" items={conditionDiscrepancies} />
      <ItemsSection title="Damaged or unusable assets" items={damagedAssets} />

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Unregistered asset findings</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{unregisteredFindings.length}</span>
        </div>
        {unregisteredFindings.length === 0 ? (
          <p className="text-sm text-slate-400">No unregistered assets were reported.</p>
        ) : (
          <ul className="divide-y">
            {unregisteredFindings.map((f) => (
              <li key={f._id || f.temporaryReference} className="py-3 text-sm">
                <p className="font-medium text-slate-800">{f.temporaryReference || 'Unregistered asset'}</p>
                <p className="text-slate-600">{f.description}</p>
                <p className="text-slate-500">Location: {f.actualLocation}{f.physicalCondition ? ` · Condition: ${f.physicalCondition}` : ''}</p>
                <p className="text-slate-400">{f.auditorNotes}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ItemsSection title="Pending items" items={pendingItems} showActual={false} />
    </div>
  );
}
