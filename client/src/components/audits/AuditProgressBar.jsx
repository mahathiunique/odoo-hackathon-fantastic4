// Renders a progress bar from an Audit summary. Handles empty/undefined data
// safely so a Planned Audit with no items never produces NaN widths.
export default function AuditProgressBar({ summary }) {
  const total = Number(summary?.totalItems) || 0;
  const pending = Number(summary?.pendingItems) || 0;
  const verified = Number(summary?.verifiedItems) || 0;
  const discrepancy = Number(summary?.discrepancyItems) || 0;
  const missing = Number(summary?.missingItems) || 0;
  const percent = total ? Math.round(((total - pending) / total) * 100) : 0;

  const seg = (count) => (total ? `${(count / total) * 100}%` : '0%');

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>Verification progress</span>
        <span className="font-semibold text-slate-700">{percent}%</span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <span className="bg-emerald-500" style={{ width: seg(verified) }} title={`Verified: ${verified}`} />
        <span className="bg-orange-400" style={{ width: seg(discrepancy) }} title={`Discrepancy: ${discrepancy}`} />
        <span className="bg-red-500" style={{ width: seg(missing) }} title={`Missing: ${missing}`} />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>{total} total</span>
        <span className="text-amber-600">{pending} pending</span>
        <span className="text-emerald-600">{verified} verified</span>
        <span className="text-orange-600">{discrepancy} discrepancy</span>
        <span className="text-red-600">{missing} missing</span>
      </div>
    </div>
  );
}
