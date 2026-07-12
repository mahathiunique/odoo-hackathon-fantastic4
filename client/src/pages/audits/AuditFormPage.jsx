import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Input from '../../components/common/Input';
import TextArea from '../../components/common/TextArea';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { readableApiError, applyFieldErrors } from '../../services/helpers/apiErrors';
import auditService from '../../services/auditService';
import departmentService from '../../services/departmentService';
import categoryService from '../../services/categoryService';

const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');
const idOf = (v) => (typeof v === 'string' ? v : v?._id);

function MultiSelect({ label, options, selected, onToggle, empty }) {
  return (
    <div>
      <span className="label">{label}</span>
      {options.length === 0 ? (
        <p className="mt-1 text-xs text-slate-400">{empty}</p>
      ) : (
        <div className="mt-1 flex max-h-40 flex-wrap gap-2 overflow-auto rounded-lg border p-3">
          {options.map((o) => (
            <button
              type="button"
              key={o._id}
              onClick={() => onToggle(o._id)}
              className={`rounded-full border px-3 py-1 text-xs ${selected.includes(o._id) ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}
            >
              {o.name}{o.code ? ` (${o.code})` : ''}{o.role ? ` · ${o.role}` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    auditName: '',
    description: '',
    departments: [],
    categories: [],
    assignedAuditors: [],
    includeUnassignedAssets: false,
    includeInactiveDepartments: false,
    startDate: '',
    endDate: '',
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggle = (key) => (optionId) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(optionId) ? prev[key].filter((x) => x !== optionId) : [...prev[key], optionId],
    }));

  useEffect(() => {
    Promise.all([
      departmentService.getDepartmentOptions().catch(() => []),
      categoryService.getCategoryOptions().catch(() => []),
      auditService.getAuditorOptions().catch(() => []),
    ]).then(([deps, cats, auds]) => {
      setDepartments(deps || []);
      setCategories(cats || []);
      setAuditors(auds || []);
    });
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    auditService
      .getAuditById(id)
      .then((audit) => {
        if (audit.status !== 'Planned') {
          toast.error('Only planned audits can be edited.');
          navigate(`/audits/${id}`);
          return;
        }
        setForm({
          auditName: audit.auditName || '',
          description: audit.description || '',
          departments: (audit.departments || []).map(idOf),
          categories: (audit.categories || []).map(idOf),
          assignedAuditors: (audit.assignedAuditors || []).map(idOf),
          includeUnassignedAssets: !!audit.includeUnassignedAssets,
          includeInactiveDepartments: !!audit.includeInactiveDepartments,
          startDate: toDateInput(audit.startDate),
          endDate: toDateInput(audit.endDate),
        });
      })
      .catch((e) => setError(readableApiError(e)))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  const scopeValid = form.departments.length || form.categories.length || form.includeUnassignedAssets;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    const errs = {};
    if (form.auditName.trim().length < 3) errs.auditName = 'Audit name must be at least 3 characters.';
    if (!scopeValid) errs.scope = 'Select at least one department, category, or include unassigned assets.';
    if (!form.startDate) errs.startDate = 'Start date is required.';
    if (!form.endDate) errs.endDate = 'End date is required.';
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) errs.endDate = 'End date cannot be before start date.';
    if (!form.assignedAuditors.length) errs.assignedAuditors = 'Select at least one auditor.';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    const payload = {
      auditName: form.auditName.trim(),
      description: form.description.trim(),
      departments: form.departments,
      categories: form.categories,
      assignedAuditors: form.assignedAuditors,
      includeUnassignedAssets: form.includeUnassignedAssets,
      includeInactiveDepartments: form.includeInactiveDepartments,
      startDate: form.startDate,
      endDate: form.endDate,
    };

    setSaving(true);
    try {
      const audit = isEdit ? await auditService.updateAudit(id, payload) : await auditService.createAudit(payload);
      toast.success(isEdit ? 'Audit updated successfully' : 'Audit cycle created successfully');
      navigate(`/audits/${audit._id}`);
    } catch (err) {
      applyFieldErrors(err, (field, opt) => setFieldErrors((prev) => ({ ...prev, [field]: opt.message })));
      setError(readableApiError(err));
      toast.error(readableApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <PageHeader title={isEdit ? 'Edit audit cycle' : 'New audit cycle'} description="Plan a physical inventory verification. Audit items are generated when the audit starts." />
      <form onSubmit={submit} className="card max-w-3xl">
        <div className="grid gap-5">
          <Input label="Audit name" required value={form.auditName} onChange={(e) => set('auditName', e.target.value)} error={fieldErrors.auditName ? { message: fieldErrors.auditName } : null} />
          <TextArea label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} />

          <MultiSelect label="Departments" options={departments} selected={form.departments} onToggle={toggle('departments')} empty="No active departments available." />
          <MultiSelect label="Categories" options={categories} selected={form.categories} onToggle={toggle('categories')} empty="No active categories available." />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.includeUnassignedAssets} onChange={(e) => set('includeUnassignedAssets', e.target.checked)} />
            Include unassigned assets
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.includeInactiveDepartments} onChange={(e) => set('includeInactiveDepartments', e.target.checked)} />
            Include inactive departments
          </label>
          {fieldErrors.scope && <p className="text-xs text-red-600">{fieldErrors.scope}</p>}

          <MultiSelect label="Assigned auditors" options={auditors} selected={form.assignedAuditors} onToggle={toggle('assignedAuditors')} empty="No active auditors available. Create an active user with the Auditor role." />
          {fieldErrors.assignedAuditors && <p className="text-xs text-red-600">{fieldErrors.assignedAuditors}</p>}

          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Start date" type="date" required value={form.startDate} onChange={(e) => set('startDate', e.target.value)} error={fieldErrors.startDate ? { message: fieldErrors.startDate } : null} />
            <Input label="End date" type="date" required value={form.endDate} onChange={(e) => set('endDate', e.target.value)} error={fieldErrors.endDate ? { message: fieldErrors.endDate } : null} />
          </div>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>

        <div className="mt-8 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/audits')}>Cancel</button>
          <Button type="submit" loading={saving}>{isEdit ? 'Save changes' : 'Create audit'}</Button>
        </div>
      </form>
    </>
  );
}
