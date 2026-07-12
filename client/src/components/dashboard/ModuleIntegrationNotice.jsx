import { Wrench, ScanSearch, Info } from 'lucide-react';

// Surfaces which optional Stage 9 / Stage 10 modules are integrated. The
// dashboard still works fully without them; this is a transparency notice.
export default function ModuleIntegrationNotice({ integrations }) {
  if (!integrations) return null;
  const missing = [];
  if (integrations.maintenance === false) missing.push({ label: 'Maintenance', icon: Wrench });
  if (integrations.audit === false) missing.push({ label: 'Audit', icon: ScanSearch });

  if (!missing.length) return null;

  return (
    <div className="card flex items-start gap-3 border-amber-200 bg-amber-50/60">
      <Info className="mt-0.5 shrink-0 text-amber-500" size={18} />
      <div className="text-sm text-amber-800">
        <b className="font-semibold">Optional modules not yet connected.</b>{' '}
        {missing.map((m) => m.label).join(' and ')}{' '}
        {missing.length === 1 ? 'is' : 'are'} part of later stages (Maintenance / Audit). Dashboard
        statistics for those areas will appear automatically once merged.
      </div>
    </div>
  );
}
