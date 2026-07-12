import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { readableApiError } from '../../services/helpers/apiErrors';
import auditService from '../../services/auditService';

export default function StartAuditModal({ open, audit, onClose, onStarted }) {
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await auditService.startAudit(audit._id);
      toast.success('Audit started. Asset snapshots captured.');
      onStarted?.();
      onClose();
    } catch (e) {
      toast.error(readableApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Start audit cycle">
      {audit && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">{audit.auditName}</p>
          <p className="text-slate-500">{audit.auditCode}</p>
        </div>
      )}
      <p className="text-sm text-slate-600">
        Starting the audit captures the current expected snapshot of every in-scope asset and
        distributes audit items across the assigned auditors. Disposed assets are excluded. This
        action cannot be undone.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <Button variant="primary" loading={loading} onClick={submit}>Start audit</Button>
      </div>
    </Modal>
  );
}
