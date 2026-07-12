import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Select from '../common/Select';
import FormError from '../common/FormError';
import { readableApiError } from '../../services/helpers/apiErrors';
import resourceService from '../../services/resourceService';

export default function ResourceAvailabilityModal({ open, resource, onClose, onChanged }) {
  const [status, setStatus] = useState(resource?.availabilityStatus || 'Available');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (status === 'Unavailable' && reason.trim().length < 3) {
      setError('A reason of at least 3 characters is required when marking a resource unavailable.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { warning } = await resourceService.changeResourceAvailability(resource._id, {
        availabilityStatus: status,
        reason: reason.trim(),
      });
      toast.success(status === 'Available' ? 'Resource marked as available' : 'Resource marked as unavailable');
      if (warning) toast(warning, { icon: '⚠️' });
      onChanged?.();
      onClose();
    } catch (e) {
      toast.error(readableApiError(e));
      setError(readableApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Change availability">
      {resource && (
        <p className="mb-4 text-sm text-slate-500">
          {resource.name} <span className="text-slate-400">({resource.resourceCode})</span>
        </p>
      )}
      <Select
        label="Availability"
        required
        options={['Available', 'Unavailable']}
        value={status}
        placeholder=""
        onChange={(e) => setStatus(e.target.value)}
      />
      {status === 'Unavailable' && (
        <label className="mt-3 block">
          <span className="label">Reason <span className="text-red-500">*</span></span>
          <textarea
            className="field"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this resource unavailable?"
          />
        </label>
      )}
      <FormError error={error ? { message: error } : null} />
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <Button variant="primary" loading={loading} onClick={submit}>Save</Button>
      </div>
    </Modal>
  );
}
