import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import { readableApiError } from '../../services/helpers/apiErrors';
import auditService from '../../services/auditService';

export default function CancelAuditModal({ open, audit, onClose, onCancelled }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 5) {
      setError('Cancellation reason must be at least 5 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auditService.cancelAudit(audit._id, { cancelReason: reason.trim() });
      toast.success('Audit cycle cancelled.');
      setReason('');
      onCancelled?.();
      onClose();
    } catch (e) {
      setError(readableApiError(e));
      toast.error(readableApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Cancel audit cycle">
      {audit && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">{audit.auditName}</p>
          <p className="text-slate-500">{audit.auditCode}</p>
        </div>
      )}
      <p className="mb-3 text-sm text-slate-600">
        Existing audit items are preserved and locked. Completed audits cannot be cancelled.
      </p>
      <label className="block">
        <span className="label">Cancellation reason <span className="text-red-500">*</span></span>
        <textarea className="field" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this audit is being cancelled…" />
        <FormError error={error ? { message: error } : null} />
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Keep audit</button>
        <Button variant="danger" loading={loading} onClick={submit}>Cancel audit</Button>
      </div>
    </Modal>
  );
}
