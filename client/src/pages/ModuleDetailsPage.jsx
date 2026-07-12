import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil, RefreshCw, Wrench } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import TextArea from '../components/common/TextArea';
import { readableApiError } from '../services/helpers/apiErrors';

const unwrapRecord = (response) => {
  if (!response) return null;
  if (response.asset) return response.asset;
  if (response.data?.asset) return response.data.asset;
  if (response.data) return response.data;
  return response;
};

const formatValue = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.map(formatValue).join(', ') : '—';
  if (typeof v === 'object') {
    if (v.name) return v.name;
    if (v.code) return v.code;
    if (v.label) return v.label;
    return '—';
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const LIFECYCLE_STATUSES = ['Available', 'Reserved', 'Allocated', 'Under Maintenance', 'Lost', 'Retired', 'Disposed'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Damaged', 'Unusable'];

export default function ModuleDetailsPage({ title, base, service }) {
  const { id } = useParams();
  const [item, setItem] = useState();
  const [timeline, setTimeline] = useState();
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const isAsset = typeof service.getAssetHistory === 'function';
  const canChangeStatus = isAsset && typeof service.changeStatus === 'function';
  const canChangeCondition = isAsset && typeof service.changeCondition === 'function';

  const loadItem = () => {
    service.getById(id)
      .then((result) => setItem(unwrapRecord(result)))
      .catch(() => setItem(null));
  };

  useEffect(() => {
    loadItem();
  }, [id, service]);

  useEffect(() => {
    if (typeof service.getAssetHistory !== 'function') return undefined;
    let active = true;
    setTimelineLoading(true);
    service.getAssetHistory(id, { limit: 20 })
      .then((response) => {
        if (!active) return;
        setTimeline(response?.history || []);
      })
      .catch(() => active && setTimeline([]))
      .finally(() => active && setTimelineLoading(false));
    return () => { active = false; };
  }, [id, service]);

  const openDialog = (type) => {
    setTarget(type === 'status' ? item.lifecycleStatus : item.condition);
    setReason('');
    setDialog(type);
  };

  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
  };

  const submitDialog = async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      if (dialog === 'status') {
        await service.changeStatus(id, { newStatus: target, reason: reason.trim() });
      } else {
        await service.changeCondition(id, { condition: target, reason: reason.trim() });
      }
      toast.success(`${dialog === 'status' ? 'Status' : 'Condition'} updated successfully`);
      setDialog(null);
      loadItem();
      if (typeof service.getAssetHistory === 'function') {
        service.getAssetHistory(id, { limit: 20 }).then((response) => setTimeline(response?.history || [])).catch(() => setTimeline([]));
      }
    } catch (error) {
      toast.error(readableApiError(error));
    } finally {
      setBusy(false);
    }
  };

  if (!item) return <LoadingSpinner />;

  return (
    <>
      <PageHeader title={item.name || item.assetTag || item.asset || item.auditName || item.requestNumber || title} description={`${title} record details`} action={<Link className="btn-secondary" to={base}><ArrowLeft size={16} /> Back</Link>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-5 font-semibold text-slate-900">Overview</h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            {Object.entries(item).filter(([k]) => !['id', '_id', 'password', 'createdBy', 'updatedBy', 'allocationHistoryCount', 'maintenanceHistoryCount', 'auditHistoryCount'].includes(k)).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k.replace(/([A-Z])/g, ' $1')}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{k.toLowerCase().includes('status') || k.toLowerCase().includes('condition') ? <StatusBadge status={v} /> : formatValue(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <aside className="space-y-5">
          {(canChangeStatus || canChangeCondition) && (
            <div className="card">
              <h3 className="font-semibold text-slate-900">Lifecycle actions</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Status</dt>
                  <dd><StatusBadge status={item.lifecycleStatus} /></dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Condition</dt>
                  <dd><StatusBadge status={item.condition} /></dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-col gap-2">
                {canChangeStatus && (
                  <Button variant="secondary" onClick={() => openDialog('status')}>
                    <RefreshCw size={16} /> Change status
                  </Button>
                )}
                {canChangeCondition && (
                  <Button variant="secondary" onClick={() => openDialog('condition')}>
                    <Wrench size={16} /> Update condition
                  </Button>
                )}
              </div>
            </div>
          )}
          <div className="card">
            <h3 className="font-semibold text-slate-900">Record activity</h3>
            <div className="mt-4 space-y-4 border-l-2 border-indigo-100 pl-4 text-sm">
              {timelineLoading && <p className="text-slate-400">Loading activity…</p>}
              {!timelineLoading && timeline && timeline.length === 0 && <p className="text-slate-500">No activity recorded yet.</p>}
              {!timelineLoading && timeline && timeline.length > 0 && timeline.map((entry) => (
                <div key={entry._id || entry.id}>
                  <p className="font-medium text-slate-700">{entry.action}</p>
                  <p className="text-slate-500">{entry.performedBy?.name ? `by ${entry.performedBy.name}` : 'by system'} · {formatDate(entry.createdAt)}</p>
                  {entry.reason && <p className="mt-1 text-slate-600">Reason: {entry.reason}</p>}
                  {entry.newStatus && entry.newStatus !== entry.previousStatus && (
                    <p className="mt-1"><StatusBadge status={entry.newStatus} /></p>
                  )}
                </div>
              ))}
              {timeline === undefined && (
                <>
                  <p>Record created and registered</p>
                  <p>Information verified by system</p>
                  <p>Last reviewed today</p>
                </>
              )}
            </div>
          </div>
          {!['/allocations', '/maintenance', '/audits'].includes(base) && <Link className="btn-primary w-full" to={`${base}/${id}/edit`}><Pencil size={16} /> Edit record</Link>}
        </aside>
      </div>

      <Modal open={dialog === 'status'} onClose={closeDialog} title="Change lifecycle status">
        <div className="space-y-4">
          <Select label="New status" value={target} onChange={(e) => setTarget(e.target.value)} options={LIFECYCLE_STATUSES.map((s) => ({ value: s, label: s }))} />
          <TextArea label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the reason for this status change" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeDialog} disabled={busy}>Cancel</Button>
            <Button onClick={submitDialog} loading={busy}>Update status</Button>
          </div>
        </div>
      </Modal>

      <Modal open={dialog === 'condition'} onClose={closeDialog} title="Update condition">
        <div className="space-y-4">
          <Select label="New condition" value={target} onChange={(e) => setTarget(e.target.value)} options={CONDITIONS.map((c) => ({ value: c, label: c }))} />
          <TextArea label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the reason for this condition change" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeDialog} disabled={busy}>Cancel</Button>
            <Button onClick={submitDialog} loading={busy}>Update condition</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
