import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Pencil, PlayCircle, PlusCircle, ShieldCheck, XCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import Pagination from '../../components/common/Pagination';
import DataTable from '../../components/tables/DataTable';
import AuditStatusBadge from '../../components/audits/AuditStatusBadge';
import VerificationStatusBadge from '../../components/audits/VerificationStatusBadge';
import AuditProgressBar from '../../components/audits/AuditProgressBar';
import StartAuditModal from '../../components/audits/StartAuditModal';
import CompleteAuditModal from '../../components/audits/CompleteAuditModal';
import CancelAuditModal from '../../components/audits/CancelAuditModal';
import AuditVerificationModal from '../../components/audits/AuditVerificationModal';
import UnregisteredFindingModal from '../../components/audits/UnregisteredFindingModal';
import useAuth from '../../hooks/useAuth';
import { readableApiError } from '../../services/helpers/apiErrors';
import auditService from '../../services/auditService';

const roleOf = (user) => user?.role?.name || user?.role;
const person = (v) => (v ? `${v.name}${v.email ? ` (${v.email})` : ''}` : '—');
const dt = (v) => (v ? new Date(v).toLocaleString() : '—');
const names = (arr) => (arr?.length ? arr.map((x) => x.name || x).join(', ') : '—');

export default function AuditDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = roleOf(user);
  const userId = String(user?._id || user?.id);
  const isAdmin = role === 'Admin';
  const isAuditor = role === 'Auditor';

  const [audit, setAudit] = useState();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalRecords: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [itemsError, setItemsError] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [findingOpen, setFindingOpen] = useState(false);
  const [verifyItem, setVerifyItem] = useState(null);

  const loadAudit = useCallback(() => {
    setError('');
    auditService.getAuditById(id).then(setAudit).catch((e) => setError(readableApiError(e)));
  }, [id]);

  const loadItems = useCallback(() => {
    setItemsError('');
    auditService
      .getAuditItems(id, { page: pagination.page, limit: pagination.limit, verificationStatus: statusFilter || undefined })
      .then((result) => { setItems(result.items || []); setPagination(result.pagination); })
      .catch((e) => setItemsError(readableApiError(e)));
  }, [id, pagination.page, pagination.limit, statusFilter]);

  useEffect(loadAudit, [loadAudit]);
  useEffect(loadItems, [loadItems]);
  useEffect(() => { setPagination((p) => ({ ...p, page: 1 })); }, [statusFilter]);

  const refresh = () => { loadAudit(); loadItems(); };

  if (error) {
    return (
      <>
        <PageHeader title="Audit details" />
        <ErrorState retry={loadAudit} />
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      </>
    );
  }
  if (!audit) return <LoadingSpinner />;

  const inProgress = audit.status === 'In Progress';
  const canStart = isAdmin && audit.status === 'Planned';
  const canEdit = isAdmin && audit.status === 'Planned';
  const canComplete = isAdmin && inProgress;
  const canCancel = isAdmin && ['Planned', 'In Progress'].includes(audit.status);
  const canFinding = inProgress && (isAdmin || (isAuditor && (audit.assignedAuditors || []).some((a) => String(a._id) === userId)));

  const canVerifyItem = (item) =>
    inProgress && !item.isLocked && (isAdmin || (isAuditor && String(item.assignedAuditor?._id || item.assignedAuditor) === userId));

  const overview = [
    ['Code', audit.auditCode],
    ['Status', <AuditStatusBadge key="s" status={audit.status} />],
    ['Start date', dt(audit.startDate)],
    ['End date', dt(audit.endDate)],
    ['Departments', names(audit.departments)],
    ['Categories', names(audit.categories)],
    ['Include unassigned', audit.includeUnassignedAssets ? 'Yes' : 'No'],
    ['Assigned auditors', names(audit.assignedAuditors)],
    ['Created by', person(audit.createdBy)],
    ['Started by', person(audit.startedBy)],
    ['Started at', dt(audit.startedAt)],
    ['Completed by', person(audit.completedBy)],
    ['Completed at', dt(audit.completedAt)],
    ['Cancelled by', person(audit.cancelledBy)],
    ['Cancel reason', audit.cancelReason],
  ];
  if (audit.completionOverride?.overridePendingItems) {
    overview.push(['Override reason', audit.completionOverride.overrideReason]);
  }

  const columns = [
    { key: 'asset', label: 'Asset', render: (_, row) => `${row.expectedSnapshot?.assetTag || '—'} — ${row.expectedSnapshot?.assetName || ''}` },
    { key: 'expectedLocation', label: 'Expected location', render: (_, row) => row.expectedSnapshot?.currentLocation || '—' },
    { key: 'actualLocation', label: 'Actual location', render: (v) => v || '—' },
    { key: 'assignedAuditor', label: 'Auditor', render: (v) => v?.name || '—' },
    { key: 'discrepancyTypes', label: 'Discrepancy', render: (v) => (v?.length ? v.join(', ') : '—') },
    { key: 'verificationStatus', label: 'Status', render: (v) => <VerificationStatusBadge status={v} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) =>
        canVerifyItem(row) ? (
          <button className="rounded p-2 text-primary-600 hover:bg-primary-50" aria-label="Verify item" onClick={() => setVerifyItem(row)}>
            <ShieldCheck size={16} />
          </button>
        ) : row.isLocked ? (
          <span className="text-xs text-slate-400">Locked</span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={audit.auditName}
        description="Audit cycle details and verification items"
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => navigate('/audits')}><ArrowLeft size={16} /> Back</button>
            <Link className="btn-secondary" to={`/audits/${id}/report`}><FileText size={16} /> Report</Link>
            {canEdit && <Link className="btn-secondary" to={`/audits/${id}/edit`}><Pencil size={16} /> Edit</Link>}
            {canFinding && <button className="btn-secondary" onClick={() => setFindingOpen(true)}><PlusCircle size={16} /> Unregistered</button>}
            {canStart && <button className="btn-primary" onClick={() => setStartOpen(true)}><PlayCircle size={16} /> Start</button>}
            {canComplete && <button className="btn-primary" onClick={() => setCompleteOpen(true)}><CheckCircle2 size={16} /> Complete</button>}
            {canCancel && <button className="btn-danger" onClick={() => setCancelOpen(true)}><XCircle size={16} /> Cancel</button>}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-6 font-semibold text-slate-900">Overview</h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            {overview.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{v || '—'}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</dt>
              <dd className="mt-1 text-sm text-slate-700">{audit.description || '—'}</dd>
            </div>
          </dl>
        </section>
        <section className="card">
          <h2 className="mb-4 font-semibold text-slate-900">Progress</h2>
          <AuditProgressBar summary={audit.summary} />
        </section>
      </div>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Audit items</h2>
          <select className="field max-w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['Pending', 'Verified', 'Discrepancy', 'Missing'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {itemsError && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{itemsError}</p>}
        {audit.status === 'Planned' ? (
          <p className="card text-sm text-slate-500">Audit items are generated when the audit is started.</p>
        ) : (
          <>
            <DataTable columns={columns} data={items} emptyTitle="No audit items match the selected filter" />
            {pagination.totalPages > 1 && (
              <Pagination page={pagination.page} setPage={(page) => setPagination((p) => ({ ...p, page }))} total={pagination.totalRecords} pageSize={pagination.limit} />
            )}
          </>
        )}
      </section>

      <StartAuditModal open={startOpen} audit={audit} onClose={() => setStartOpen(false)} onStarted={refresh} />
      <CompleteAuditModal open={completeOpen} audit={audit} onClose={() => setCompleteOpen(false)} onCompleted={refresh} />
      <CancelAuditModal open={cancelOpen} audit={audit} onClose={() => setCancelOpen(false)} onCancelled={refresh} />
      <UnregisteredFindingModal open={findingOpen} audit={audit} onClose={() => setFindingOpen(false)} onCreated={refresh} />
      <AuditVerificationModal open={Boolean(verifyItem)} audit={audit} item={verifyItem} onClose={() => setVerifyItem(null)} onVerified={refresh} />
    </>
  );
}
