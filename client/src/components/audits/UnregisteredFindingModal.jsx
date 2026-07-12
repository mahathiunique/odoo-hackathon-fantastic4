import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import { readableApiError } from '../../services/helpers/apiErrors';
import auditService from '../../services/auditService';

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Damaged', 'Unusable'];

export default function UnregisteredFindingModal({ open, audit, onClose, onCreated }) {
  const [form, setForm] = useState({ temporaryReference: '', description: '', actualLocation: '', physicalCondition: '', auditorNotes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async () => {
    setError('');
    if (!form.description.trim() || !form.actualLocation.trim() || !form.auditorNotes.trim()) {
      setError('Description, actual location and auditor notes are required.');
      return;
    }
    setLoading(true);
    try {
      await auditService.createUnregisteredFinding(audit._id, {
        temporaryReference: form.temporaryReference.trim() || undefined,
        description: form.description.trim(),
        actualLocation: form.actualLocation.trim(),
        physicalCondition: form.physicalCondition || undefined,
        auditorNotes: form.auditorNotes.trim(),
      });
      toast.success('Unregistered asset finding recorded.');
      setForm({ temporaryReference: '', description: '', actualLocation: '', physicalCondition: '', auditorNotes: '' });
      onCreated?.();
      onClose();
    } catch (e) {
      setError(readableApiError(e));
      toast.error(readableApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Report unregistered asset">
      <p className="mb-4 text-sm text-slate-600">
        Record a physical asset that is not in the system. This does not create an Asset record; it is
        captured as an audit finding for follow-up.
      </p>
      <div className="grid gap-4">
        <label className="block">
          <span className="label">Temporary reference</span>
          <input className="field" value={form.temporaryReference} onChange={set('temporaryReference')} placeholder="Optional tag, e.g. UNREG-01" />
        </label>
        <label className="block">
          <span className="label">Description <span className="text-red-500">*</span></span>
          <input className="field" value={form.description} onChange={set('description')} placeholder="What is the asset?" />
        </label>
        <label className="block">
          <span className="label">Actual location <span className="text-red-500">*</span></span>
          <input className="field" value={form.actualLocation} onChange={set('actualLocation')} placeholder="Where was it found?" />
        </label>
        <label className="block">
          <span className="label">Physical condition</span>
          <select className="field" value={form.physicalCondition} onChange={set('physicalCondition')}>
            <option value="">Select condition</option>
            {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Auditor notes <span className="text-red-500">*</span></span>
          <textarea className="field" rows={3} value={form.auditorNotes} onChange={set('auditorNotes')} placeholder="Additional context…" />
        </label>
      </div>
      <FormError error={error ? { message: error } : null} />
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <Button variant="primary" loading={loading} onClick={submit}>Record finding</Button>
      </div>
    </Modal>
  );
}
