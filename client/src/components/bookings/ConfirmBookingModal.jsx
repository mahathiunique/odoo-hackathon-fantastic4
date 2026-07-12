import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { readableApiError } from '../../services/helpers/apiErrors';
import bookingService from '../../services/bookingService';

const line = (label, value) => (
  <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
    <span className="text-slate-500">{label}</span>
    <span className="text-right font-medium text-slate-800">{value ?? '—'}</span>
  </div>
);

export default function ConfirmBookingModal({ open, booking, onClose, onConfirmed }) {
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await bookingService.confirmBooking(booking._id);
      toast.success('Booking confirmed successfully');
      onConfirmed?.();
      onClose();
    } catch (e) {
      toast.error(readableApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Confirm booking">
      {booking && (
        <div className="mb-2">
          {line('Resource', booking.resource?.name)}
          {line('Requested by', booking.bookedBy?.name)}
          {line('Start', new Date(booking.startTime).toLocaleString())}
          {line('End', new Date(booking.endTime).toLocaleString())}
          {line('Attendees', booking.attendeesCount)}
          {line('Purpose', booking.purpose)}
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            The server rechecks for overlapping bookings before confirming. If another booking
            was confirmed first, this action will be rejected.
          </p>
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <Button variant="primary" loading={loading} onClick={submit}>Confirm booking</Button>
      </div>
    </Modal>
  );
}
