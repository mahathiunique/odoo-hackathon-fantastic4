const colors = {
  Pending: 'bg-amber-50 text-amber-700',
  Verified: 'bg-emerald-50 text-emerald-700',
  Discrepancy: 'bg-orange-50 text-orange-700',
  Missing: 'bg-red-50 text-red-700',
};

export default function VerificationStatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
      {status || 'Pending'}
    </span>
  );
}
