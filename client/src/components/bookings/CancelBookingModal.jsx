import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import { readableApiError } from '../../services/helpers/apiErrors';
import bookingService from '../../services/bookingService';

export default function CancelBookingModal({ open, booking, onClose, onCancelled }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 3) {
      setError('Please provide a reason of at least 3 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await bookingService.cancelBooking(booking._id, reason.trim());
      toast.success('Booking cancelled successfully');
      setReason('');
      onCancelled?.();
      onClose();
    } catch (e) {
      toast.error(readableApiError(e));
      setError(readableApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Cancel booking">
      {booking && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">{booking.title}</p>
          <p className="text-slate-500">{booking.resource?.name || 'Resource'}</p>
          <p className="text-slate-500">
            {new Date(booking.startTime).toLocaleString()} — {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
      <label className="block">
        <span className="label">Cancellation reason <span className="text-red-500">*</span></span>
        <textarea
          className="field"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this booking is being cancelled…"
        />
        <FormError error={error ? { message: error } : null} />
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Keep booking</button>
        <Button variant="danger" loading={loading} onClick={submit}>Cancel booking</Button>
      </div>
    </Modal>
  );
}
