import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import TextArea from '../../components/common/TextArea';
import Button from '../../components/common/Button';
import ErrorState from '../../components/common/ErrorState';
import { applyFieldErrors, readableApiError } from '../../services/helpers/apiErrors';
import resourceService from '../../services/resourceService';

const RESOURCE_TYPES = ['Room', 'Vehicle', 'Equipment', 'Workspace', 'Other'];

const defaultValues = {
  name: '', resourceCode: '', resourceType: 'Room', description: '', capacity: 1, location: '',
  linkedAsset: '', availabilityStatus: 'Available', status: 'Active',
  minimumDurationMinutes: 30, maximumDurationMinutes: 480, maximumAdvanceDays: 90,
  requiresApproval: false, allowWeekendBookings: true, instructions: '',
};

export default function ResourceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loadError, setLoadError] = useState('');
  const [assetOptions, setAssetOptions] = useState([]);
  const [assetIntegration, setAssetIntegration] = useState(true);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues });

  useEffect(() => {
    resourceService.getSharedAssetOptions().then(({ assets, integrationAvailable }) => {
      setAssetOptions(assets);
      setAssetIntegration(integrationAvailable);
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    resourceService.getResourceById(id).then((r) => {
      reset({
        name: r.name || '',
        resourceCode: r.resourceCode || '',
        resourceType: r.resourceType || 'Room',
        description: r.description || '',
        capacity: r.capacity || 1,
        location: r.location || '',
        linkedAsset: r.linkedAsset || '',
        availabilityStatus: r.availabilityStatus || 'Available',
        status: r.status || 'Active',
        minimumDurationMinutes: r.bookingRules?.minimumDurationMinutes ?? 30,
        maximumDurationMinutes: r.bookingRules?.maximumDurationMinutes ?? 480,
        maximumAdvanceDays: r.bookingRules?.maximumAdvanceDays ?? 90,
        requiresApproval: r.bookingRules?.requiresApproval ?? false,
        allowWeekendBookings: r.bookingRules?.allowWeekendBookings ?? true,
        instructions: r.bookingRules?.instructions || '',
      });
    }).catch((e) => setLoadError(readableApiError(e)));
  }, [id, reset]);

  const submit = async (values) => {
    const payload = {
      name: values.name.trim(),
      resourceCode: values.resourceCode.trim().toUpperCase(),
      resourceType: values.resourceType,
      description: values.description?.trim() || '',
      capacity: Number(values.capacity),
      location: values.location.trim(),
      linkedAsset: values.linkedAsset || null,
      availabilityStatus: values.availabilityStatus,
      status: values.status,
      bookingRules: {
        minimumDurationMinutes: Number(values.minimumDurationMinutes),
        maximumDurationMinutes: Number(values.maximumDurationMinutes),
        maximumAdvanceDays: Number(values.maximumAdvanceDays),
        requiresApproval: Boolean(values.requiresApproval),
        allowWeekendBookings: Boolean(values.allowWeekendBookings),
        instructions: values.instructions?.trim() || '',
      },
    };
    try {
      if (id) {
        const { warning } = await resourceService.updateResource(id, payload);
        toast.success('Resource updated successfully');
        if (warning) toast(warning, { icon: '⚠️' });
      } else {
        await resourceService.createResource(payload);
        toast.success('Resource created successfully');
      }
      navigate('/resources');
    } catch (e) {
      applyFieldErrors(e, setError);
      toast.error(readableApiError(e));
    }
  };

  if (loadError) {
    return (
      <>
        <PageHeader title={`${id ? 'Edit' : 'Add'} resource`} />
        <ErrorState retry={() => location.reload()} />
        <p className="mt-3 text-center text-sm text-red-600">{loadError}</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title={`${id ? 'Edit' : 'Add'} resource`} description="Fields marked with an asterisk are required." />
      <form onSubmit={handleSubmit(submit)} className="card max-w-4xl">
        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Resource name" required error={errors.name} {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Use at least 2 characters' }, maxLength: { value: 150, message: 'Use no more than 150 characters' } })} />
          <Input label="Resource code" required error={errors.resourceCode} style={{ textTransform: 'uppercase' }} {...register('resourceCode', { required: 'Code is required', pattern: { value: /^[A-Za-z0-9_-]+$/, message: 'Only letters, numbers, hyphens and underscores' }, minLength: { value: 2, message: 'Use at least 2 characters' }, maxLength: { value: 30, message: 'Use no more than 30 characters' } })} />
          <Select label="Resource type" required options={RESOURCE_TYPES} error={errors.resourceType} placeholder="" {...register('resourceType', { required: 'Resource type is required' })} />
          <Input label="Capacity" type="number" min="1" max="10000" required error={errors.capacity} {...register('capacity', { required: 'Capacity is required', valueAsNumber: true, min: { value: 1, message: 'Minimum is 1' }, max: { value: 10000, message: 'Maximum is 10,000' } })} />
          <Input label="Location" required error={errors.location} {...register('location', { required: 'Location is required', maxLength: { value: 200, message: 'Use no more than 200 characters' } })} />
          <Select label="Availability" options={['Available', 'Unavailable']} placeholder="" error={errors.availabilityStatus} {...register('availabilityStatus')} />
          <Select label="Status" options={['Active', 'Inactive']} placeholder="" error={errors.status} {...register('status')} />
          <label className="block">
            <span className="label">Linked asset</span>
            <select className="field" disabled={!assetIntegration} {...register('linkedAsset')}>
              <option value="">No linked asset</option>
              {assetOptions.map((a) => (
                <option key={a._id} value={a._id}>{a.assetTag ? `${a.assetTag} — ${a.name}` : a.name}</option>
              ))}
            </select>
            {!assetIntegration && (
              <span className="mt-1 block text-xs text-blue-600">
                Asset linking becomes available after Stage 6 is merged. You can still create and book this resource.
              </span>
            )}
          </label>
          <div className="md:col-span-2">
            <TextArea label="Description" error={errors.description} {...register('description', { maxLength: { value: 1000, message: 'Use no more than 1000 characters' } })} />
          </div>
        </div>

        <h3 className="mb-4 mt-8 border-t pt-6 font-semibold text-slate-900">Booking rules</h3>
        <div className="grid gap-5 md:grid-cols-3">
          <Input label="Minimum duration (minutes)" type="number" min="15" error={errors.minimumDurationMinutes} {...register('minimumDurationMinutes', { valueAsNumber: true, min: { value: 15, message: 'Minimum is 15 minutes' } })} />
          <Input label="Maximum duration (minutes)" type="number" min="15" error={errors.maximumDurationMinutes} {...register('maximumDurationMinutes', { valueAsNumber: true, min: { value: 15, message: 'Minimum is 15 minutes' } })} />
          <Input label="Maximum advance (days)" type="number" min="1" max="365" error={errors.maximumAdvanceDays} {...register('maximumAdvanceDays', { valueAsNumber: true, min: { value: 1, message: 'Minimum is 1 day' }, max: { value: 365, message: 'Maximum is 365 days' } })} />
          <label className="flex items-center gap-3 rounded-lg border p-3">
            <input type="checkbox" className="h-4 w-4 accent-indigo-600" {...register('requiresApproval')} />
            <span className="text-sm font-medium">Requires approval</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border p-3">
            <input type="checkbox" className="h-4 w-4 accent-indigo-600" {...register('allowWeekendBookings')} />
            <span className="text-sm font-medium">Allow weekend bookings</span>
          </label>
          <div className="md:col-span-3">
            <TextArea label="Instructions" error={errors.instructions} {...register('instructions', { maxLength: { value: 1000, message: 'Use no more than 1000 characters' } })} />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/resources')}>Cancel</button>
          <Button type="submit" loading={isSubmitting}>{id ? 'Save changes' : 'Create resource'}</Button>
        </div>
      </form>
    </>
  );
}
