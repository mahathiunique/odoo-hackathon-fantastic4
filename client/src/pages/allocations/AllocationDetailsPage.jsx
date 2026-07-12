import {useEffect,useState} from 'react';
import {ArrowLeft} from 'lucide-react';
import {Link,useParams} from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import AllocationStatusBadge from '../../components/allocations/AllocationStatusBadge';
import AllocationTargetDisplay from '../../components/allocations/AllocationTargetDisplay';
import AllocationHistoryPanel from '../../components/allocations/AllocationHistoryPanel';
import ReturnAssetModal from '../../components/allocations/ReturnAssetModal';
import allocationService from '../../services/allocationService';
import {readableApiError} from '../../services/helpers/apiErrors';
import useAuth from '../../hooks/useAuth';

const roleOf=user=>user?.role?.name||user?.role;

export default function AllocationDetailsPage(){
  const {id}=useParams(),{user}=useAuth(),role=roleOf(user);
  const [allocation,setAllocation]=useState();
  const [error,setError]=useState('');
  const [returnOpen,setReturnOpen]=useState(false);
  const isAdminOrManager=['Admin','Asset Manager'].includes(role);

  const load=()=>{setError('');allocationService.getAllocationById(id).then(setAllocation).catch(e=>setError(readableApiError(e)))};
  useEffect(()=>{load()},[id]);

  const handleReturn=async data=>{try{const result=await allocationService.returnAsset(id,data);setAllocation(result.allocation);setReturnOpen(false);toast.success('Asset returned successfully');if(result.warning)toast(result.warning,{icon:'⚠️'})}catch(e){toast.error(readableApiError(e))}};

  if(error)return <><PageHeader title="Allocation details"/><ErrorState retry={load}/><p className="mt-3 text-center text-sm text-red-600">{error}</p></>;
  if(!allocation)return <LoadingSpinner/>;

  const canReturn=isAdminOrManager&&['Active','Overdue'].includes(allocation.status);

  return(
    <>
      <PageHeader title="Allocation details" description="Asset allocation record details" action={<div className="flex gap-2"><Link className="btn-secondary" to="/allocations"><ArrowLeft size={16}/> Back</Link>{canReturn&&<Button onClick={()=>setReturnOpen(true)}>Return asset</Button>}</div>}/>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-5 font-semibold text-slate-900">Allocation overview</h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Asset</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.asset?.name||'—'}</dd><dd className="text-xs text-slate-500">{allocation.asset?.assetTag}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Condition</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.asset?.condition||'—'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lifecycle status</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.asset?.lifecycleStatus||'—'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current location</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.asset?.currentLocation||'—'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Allocated to</dt><dd className="mt-1"><AllocationTargetDisplay allocation={allocation}/></dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Allocation status</dt><dd className="mt-1"><AllocationStatusBadge status={allocation.status}/></dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Allocated date</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.allocatedDate?new Date(allocation.allocatedDate).toLocaleDateString():'—'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expected return</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.expectedReturnDate?<span className={allocation.status==='Overdue'?'text-red-600 font-medium':''}>{new Date(allocation.expectedReturnDate).toLocaleDateString()}</span>:'—'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Actual return</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.actualReturnDate?new Date(allocation.actualReturnDate).toLocaleDateString():'—'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Return condition</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.returnCondition||'—'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purpose</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.purpose}</dd></div>
            {allocation.notes&&<div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.notes}</dd></div>}
            {allocation.returnNotes&&<div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Return notes</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.returnNotes}</dd></div>}
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Allocated by</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.allocatedBy?.name||'—'}</dd></div>
            {allocation.returnedBy&&<div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Returned by</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.returnedBy?.name||'—'}</dd></div>}
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Created</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.createdAt?new Date(allocation.createdAt).toLocaleString():'—'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Updated</dt><dd className="mt-1 text-sm font-medium text-slate-800">{allocation.updatedAt?new Date(allocation.updatedAt).toLocaleString():'—'}</dd></div>
          </dl>
        </section>
        <aside className="space-y-5">
          <AllocationHistoryPanel allocation={allocation}/>
        </aside>
      </div>
      {canReturn&&<ReturnAssetModal open={returnOpen} onClose={()=>setReturnOpen(false)} onSubmit={handleReturn} allocation={allocation}/>}
    </>
  );
}
