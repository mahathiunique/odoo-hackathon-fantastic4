import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import { readableApiError } from '../../services/helpers/apiErrors';
import auditService from '../../services/auditService';

export default function CompleteAuditModal({ open, audit, onClose, onCompleted }) {
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pending = Number(audit?.summary?.pendingItems) || 0;

  const submit = async () => {
    if (pending > 0 && !override) {
      setError('There are pending items. Enable the override to complete anyway.');
      return;
    }
    if (override && reason.trim().length < 10) {
      setError('Override reason must be at least 10 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auditService.completeAudit(audit._id, override ? { overridePendingItems: true, overrideReason: reason.trim() } : {});
      toast.success('Audit completed and items locked.');
      onCompleted?.();
      onClose();
    } catch (e) {
      setError(readableApiError(e));
      toast.error(readableApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Complete audit cycle">
      {audit && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">{audit.auditName}</p>
          <p className="text-slate-500">{audit.auditCode} · {pending} pending item{pending === 1 ? '' : 's'}</p>
        </div>
      )}
      {pending > 0 ? (
        <>
          <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            This audit has {pending} pending item{pending === 1 ? '' : 's'}. You can override and complete
            it with a documented reason.
          </p>
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
            Override pending items
          </label>
          {override && (
            <label className="block">
              <span className="label">Override reason <span className="text-red-500">*</span></span>
              <textarea className="field" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why the audit is completed with pending items…" />
            </label>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-600">All items are verified. Completing will lock every audit item permanently.</p>
      )}
      <FormError error={error ? { message: error } : null} />
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <Button variant="primary" loading={loading} onClick={submit}>Complete audit</Button>
      </div>
    </Modal>
  );
}
