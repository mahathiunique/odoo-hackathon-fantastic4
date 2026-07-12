import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarCheck, CalendarClock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import TextArea from '../../components/common/TextArea';
import Button from '../../components/common/Button';
import { applyFieldErrors, readableApiError } from '../../services/helpers/apiErrors';
import bookingService from '../../services/bookingService';
import resourceService from '../../services/resourceService';

const toIso = (localValue) => (localValue ? new Date(localValue).toISOString() : null);

export default function BookingFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillResource = searchParams.get('resource') || '';
  const prefillStart = searchParams.get('start') || '';

  const [resources, setResources] = useState([]);
  const [availabilityNote, setAvailabilityNote] = useState(null);
  const [checking, setChecking] = useState(false);

  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { resource: prefillResource, title: '', purpose: '', startTime: prefillStart, endTime: '', attendeesCount: 1, notes: '' },
  });

  useEffect(() => {
    resourceService.getResourceOptions().then((list) => {
      setResources(list);
      if (prefillResource && list.some((r) => r._id === prefillResource)) {
        setValue('resource', prefillResource);
      }
    }).catch(() => {});
  }, [prefillResource, setValue]);

  const selectedId = watch('resource');
  const selected = useMemo(() => resources.find((r) => r._id === selectedId), [resources, selectedId]);
  const rules = selected?.bookingRules || {};

  const runAvailabilityCheck = async () => {
    const { resource, startTime, endTime } = watch();
    if (!resource || !startTime || !endTime) {
      setAvailabilityNote({ ok: false, message: 'Select a resource and a valid time range first.' });
      return null;
    }
    setChecking(true);
    setAvailabilityNote(null);
    try {
      const result = await bookingService.checkAvailability({ resource, startTime: toIso(startTime), endTime: toIso(endTime) });
      if (result.available) {
        setAvailabilityNote({ ok: true, message: 'The resource is available for the selected time.' });
      } else {
        const ranges = (result.conflicts || []).map((c) => `${new Date(c.startTime).toLocaleString()} – ${new Date(c.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`).join(', ');
        setAvailabilityNote({ ok: false, message: `Unavailable. Conflicting time(s): ${ranges || 'reserved'}.` });
      }
      return result;
    } catch (e) {
      setAvailabilityNote({ ok: false, message: readableApiError(e) });
      return null;
    } finally {
      setChecking(false);
    }
  };

  const submit = async (values) => {
    // Client-side pre-check; the backend still rechecks overlap safely.
    const check = await runAvailabilityCheck();
    if (check && check.available === false) {
      toast.error('The selected resource is not available for this time slot.');
      return;
    }
    const payload = {
      resource: values.resource,
      title: values.title.trim(),
      purpose: values.purpose.trim(),
      startTime: toIso(values.startTime),
      endTime: toIso(values.endTime),
      attendeesCount: Number(values.attendeesCount),
      notes: values.notes?.trim() || '',
    };
    try {
      const booking = await bookingService.createBooking(payload);
      toast.success(booking.status === 'Pending' ? 'Booking submitted and pending approval' : 'Booking confirmed successfully');
      navigate('/my-bookings');
    } catch (e) {
      applyFieldErrors(e, setError);
      toast.error(readableApiError(e));
    }
  };

  return (
    <>
      <PageHeader title="New booking" description="Reserve a shared resource. Select a resource, not an asset." />
      <form onSubmit={handleSubmit(submit)} className="card max-w-3xl">
        <div className="grid gap-5">
          <label className="block">
            <span className="label">Resource <span className="text-red-500">*</span></span>
            <select className="field" {...register('resource', { required: 'Resource is required' })}>
              <option value="">Select a resource</option>
              {resources.map((r) => <option key={r._id} value={r._id}>{r.name} ({r.resourceCode}) · {r.location}</option>)}
            </select>
            {errors.resource && <span className="mt-1 block text-xs text-red-600">{errors.resource.message}</span>}
          </label>

          {selected && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p><b>Capacity:</b> {selected.capacity} · <b>Location:</b> {selected.location}</p>
              <p className="mt-1">
                <b>Rules:</b> {rules.minimumDurationMinutes}–{rules.maximumDurationMinutes} min · up to {rules.maximumAdvanceDays} days ahead · {rules.allowWeekendBookings ? 'weekends allowed' : 'no weekends'} ·{' '}
                {rules.requiresApproval
                  ? <span className="inline-flex items-center gap-1 text-amber-600"><CalendarClock size={13} /> requires approval (Pending)</span>
                  : <span className="inline-flex items-center gap-1 text-emerald-600"><CalendarCheck size={13} /> auto-confirmed</span>}
              </p>
            </div>
          )}

          <Input label="Title" required error={errors.title} {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'Use at least 3 characters' }, maxLength: { value: 150, message: 'Use no more than 150 characters' } })} />
          <TextArea label="Purpose" required error={errors.purpose} {...register('purpose', { required: 'Purpose is required', minLength: { value: 3, message: 'Use at least 3 characters' }, maxLength: { value: 1000, message: 'Use no more than 1000 characters' } })} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Start time" type="datetime-local" required error={errors.startTime} {...register('startTime', { required: 'Start time is required' })} />
            <Input label="End time" type="datetime-local" required error={errors.endTime} {...register('endTime', { required: 'End time is required' })} />
          </div>

          <Input label="Attendees" type="number" min="1" max={selected?.capacity || 10000} required error={errors.attendeesCount} {...register('attendeesCount', { required: 'Attendees is required', valueAsNumber: true, min: { value: 1, message: 'Minimum is 1' }, max: selected ? { value: selected.capacity, message: `Maximum is ${selected.capacity} (resource capacity)` } : undefined })} />
          <TextArea label="Notes" error={errors.notes} {...register('notes', { maxLength: { value: 1000, message: 'Use no more than 1000 characters' } })} />

          {availabilityNote && (
            <p className={`rounded-lg p-3 text-sm ${availabilityNote.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {availabilityNote.message}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/my-bookings')}>Cancel</button>
          <Button type="button" variant="secondary" loading={checking} onClick={runAvailabilityCheck}>Check availability</Button>
          <Button type="submit" loading={isSubmitting}>Create booking</Button>
        </div>
      </form>
    </>
  );
}
