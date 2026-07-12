import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import { readableApiError } from '../../services/helpers/apiErrors';
import auditService from '../../services/auditService';

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Damaged', 'Unusable'];
const DISCREPANCY_TYPES = ['Location Mismatch', 'Department Mismatch', 'Employee Mismatch', 'Condition Mismatch', 'Other'];

export default function AuditVerificationModal({ open, audit, item, onClose, onVerified }) {
  const expected = item?.expectedSnapshot || {};
  const [status, setStatus] = useState('Verified');
  const [actualLocation, setActualLocation] = useState('');
  const [physicalCondition, setPhysicalCondition] = useState('');
  const [types, setTypes] = useState([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Suggest mismatch types by comparing the actual input against the snapshot.
  const suggestions = [];
  if (status !== 'Missing') {
    if (actualLocation && actualLocation !== (expected.currentLocation || '')) suggestions.push('Location Mismatch');
    if (physicalCondition && physicalCondition !== (expected.condition || '')) suggestions.push('Condition Mismatch');
  }

  const toggleType = (t) => setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const reset = () => {
    setStatus('Verified'); setActualLocation(''); setPhysicalCondition(''); setTypes([]); setNotes(''); setError('');
  };

  const submit = async () => {
    setError('');
    if (status === 'Verified' && suggestions.length) {
      setError(`The findings do not match the expected values (${suggestions.join(', ')}). Mark this item as a Discrepancy.`);
      return;
    }
    const payload = {
      verificationStatus: status,
      actualLocation: status === 'Missing' ? undefined : actualLocation.trim() || undefined,
      physicalCondition: status === 'Missing' ? undefined : physicalCondition || undefined,
      discrepancyTypes: status === 'Missing' ? ['Missing Asset'] : types,
      auditorNotes: notes.trim() || undefined,
    };
    setLoading(true);
    try {
      await auditService.verifyAuditItem(audit._id, item._id, payload);
      toast.success('Audit item verified.');
      reset();
      onVerified?.();
      onClose();
    } catch (e) {
      setError(readableApiError(e));
      toast.error(readableApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Verify audit item">
      {item && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">{expected.assetTag} — {expected.assetName}</p>
          <p className="text-slate-500">Expected location: {expected.currentLocation || '—'} · Condition: {expected.condition || '—'}</p>
        </div>
      )}

      <label className="block">
        <span className="label">Verification result</span>
        <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Verified">Verified</option>
          <option value="Discrepancy">Discrepancy</option>
          <option value="Missing">Missing</option>
        </select>
      </label>

      {status !== 'Missing' && (
        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="label">Actual location</span>
            <input className="field" value={actualLocation} onChange={(e) => setActualLocation(e.target.value)} placeholder={expected.currentLocation || 'Where was it found?'} />
          </label>
          <label className="block">
            <span className="label">Physical condition</span>
            <select className="field" value={physicalCondition} onChange={(e) => setPhysicalCondition(e.target.value)}>
              <option value="">Select condition</option>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
      )}

      {suggestions.length > 0 && status !== 'Missing' && (
        <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
          Suggested discrepancy types: {suggestions.join(', ')}
        </p>
      )}

      {status === 'Discrepancy' && (
        <div className="mt-4">
          <span className="label">Discrepancy types <span className="text-red-500">*</span></span>
          <div className="mt-1 flex flex-wrap gap-2">
            {DISCREPANCY_TYPES.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => toggleType(t)}
                className={`rounded-full border px-3 py-1 text-xs ${types.includes(t) ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {status !== 'Verified' && (
        <label className="mt-4 block">
          <span className="label">Auditor notes <span className="text-red-500">*</span></span>
          <textarea className="field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe the finding…" />
        </label>
      )}

      <FormError error={error ? { message: error } : null} />

      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <Button variant="primary" loading={loading} onClick={submit}>Save verification</Button>
      </div>
    </Modal>
  );
}
