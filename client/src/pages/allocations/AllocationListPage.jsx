import {useCallback,useEffect,useMemo,useState} from 'react';
import {Eye,Plus,Power,RefreshCw,X} from 'lucide-react';
import {Link} from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/common/SearchInput';
import AllocationStatusBadge from '../../components/allocations/AllocationStatusBadge';
import AllocationSummaryCards from '../../components/allocations/AllocationSummaryCards';
import AllocationTargetDisplay from '../../components/allocations/AllocationTargetDisplay';
import ReturnAssetModal from '../../components/allocations/ReturnAssetModal';
import DataTable from '../../components/tables/DataTable';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import useDebounce from '../../hooks/useDebounce';
import useAuth from '../../hooks/useAuth';
import allocationService from '../../services/allocationService';
import {readableApiError} from '../../services/helpers/apiErrors';

const roleOf=user=>user?.role?.name||user?.role;
const today=new Date().toISOString().slice(0,10);

export default function AllocationListPage({mine}){
  const {user}=useAuth(),role=roleOf(user);
  const [allocations,setAllocations]=useState([]),[stats,setStats]=useState(null);
  const [pagination,setPagination]=useState({page:1,limit:10,totalRecords:0,totalPages:0});
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  const [search,setSearch]=useState(''),[status,setStatus]=useState(''),[targetType,setTargetType]=useState('');
  const [employeeId,setEmployeeId]=useState(''),[departmentId,setDepartmentId]=useState('');
  const [returnFrom,setReturnFrom]=useState(''),[returnTo,setReturnTo]=useState('');
  const [sortBy,setSortBy]=useState('createdAt'),[sortOrder,setSortOrder]=useState('desc');
  const [returning,setReturning]=useState(null);
  const debounced=useDebounce(search,350);
  const [employeeOptions,setEmployeeOptions]=useState([]);
  const [departmentOptions,setDepartmentOptions]=useState([]);
  const [optionsLoading,setOptionsLoading]=useState(false);

  const isAdminOrManager=['Admin','Asset Manager'].includes(role);
  const canReturn=isAdminOrManager&&!mine;

  useEffect(()=>{(async()=>{setOptionsLoading(true);try{const[e,d]=await Promise.all([allocationService.getEmployeeOptions(),allocationService.getDepartmentOptions()]);setEmployeeOptions(e||[]);setDepartmentOptions(d||[])}catch{}finally{setOptionsLoading(false)}})()},[]);

  const fetchStats=useCallback(async()=>{try{setStats(await allocationService.getAllocationStats())}catch{}} ,[]);
  useEffect(()=>{fetchStats()},[fetchStats]);

  const params=useMemo(()=>({page:pagination.page,limit:pagination.limit,search:debounced||undefined,status:status||undefined,allocatedToType:targetType||undefined,employee:employeeId||undefined,department:departmentId||undefined,expectedReturnFrom:returnFrom||undefined,expectedReturnTo:returnTo||undefined,sortBy,sortOrder}),[pagination.page,pagination.limit,debounced,status,targetType,employeeId,departmentId,returnFrom,returnTo,sortBy,sortOrder]);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const result=mine?await allocationService.getMyAllocations(params):await allocationService.getAllocations(params);
      setAllocations(result.allocations||[]);setPagination(result.pagination||{});
    }catch(e){setError(readableApiError(e))}finally{setLoading(false)}
  },[mine,params]);
  useEffect(()=>{load()},[load]);

  const sort=field=>{if(sortBy===field)setSortOrder(x=>x==='asc'?'desc':'asc');else{setSortBy(field);setSortOrder('asc')}setPagination(p=>({...p,page:1}))};

  const clearFilters=()=>{setSearch('');setStatus('');setTargetType('');setEmployeeId('');setDepartmentId('');setReturnFrom('');setReturnTo('');setPagination(p=>({...p,page:1}))};

  const handleReturn=async data=>{if(!returning)return;try{await allocationService.returnAsset(returning._id,data);toast.success('Asset returned successfully');setReturning(null);load();fetchStats()}catch(e){toast.error(readableApiError(e))}};

  const title=mine?'My allocations':'Asset allocations';
  const base='/allocations';

  if(error&&!allocations.length)return <><PageHeader title={title} description={mine?'Assets currently issued to you.':'Issue assets to employees and departments and track returns.'}/><ErrorState retry={load}/><p className="mt-3 text-center text-sm text-red-600">{error}</p></>;
  const canCreate=isAdminOrManager&&!mine;

  const columns=[
    {key:'asset',label:'Asset',render:(v)=>v?<div><p className="font-medium text-slate-800">{v.name||v.assetTag||'—'}</p><p className="text-xs text-slate-500">{v.assetTag}</p></div>:'—'},
    {key:'allocatedTo',label:'Allocated to',render:(_,row)=><AllocationTargetDisplay allocation={row}/>},
    {key:'allocatedToType',label:'Target type',render:v=>v||'—'},
    {key:'allocatedDate',label:'Allocated',render:v=>v?new Date(v).toLocaleDateString():'—'},
    {key:'expectedReturnDate',label:'Expected return',render:v=>v?<span className={row.status==='Overdue'?'text-red-600 font-medium':''}>{new Date(v).toLocaleDateString()}</span>:'—'},
    {key:'actualReturnDate',label:'Actual return',render:v=>v?new Date(v).toLocaleDateString():'—'},
    {key:'status',label:'Status',render:v=><AllocationStatusBadge status={v}/>},
    {key:'allocatedBy',label:'Allocated by',render:v=>v?.name||'—'},
    {key:'actions',label:'Actions',render:(_,row)=><div className="flex items-center gap-1"><Link className="rounded p-2 hover:bg-slate-100" aria-label="View allocation" to={`${base}/${row._id}`}><Eye size={16}/></Link>{canReturn&&['Active','Overdue'].includes(row.status)&&<button className="rounded p-2 text-red-600 hover:bg-red-50" aria-label="Return asset" onClick={()=>setReturning(row)}><Power size={16}/></button>}</div>},
  ];

  return(
    <>
      <PageHeader title={title} description={mine?'Assets currently issued to you.':'Issue assets to employees and departments and track returns.'} action={canCreate&&<Link className="btn-primary" to={`${base}/new`}><Plus size={17}/> New allocation</Link>}/>
      {stats&&!mine&&<AllocationSummaryCards stats={stats}/>}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <SearchInput value={search} onChange={e=>{setSearch(e.target.value);setPagination(p=>({...p,page:1}))}} placeholder="Search allocations…" className="lg:max-w-sm"/>
        <select className="field lg:max-w-40" value={status} onChange={e=>{setStatus(e.target.value);setPagination(p=>({...p,page:1}))}}><option value="">All statuses</option><option>Active</option><option>Overdue</option><option>Returned</option></select>
        {!mine&&<><select className="field lg:max-w-40" value={targetType} onChange={e=>{setTargetType(e.target.value);setPagination(p=>({...p,page:1}))}}><option value="">All targets</option><option>Employee</option><option>Department</option></select>
        <select className="field lg:max-w-48" value={employeeId} onChange={e=>{setEmployeeId(e.target.value);setPagination(p=>({...p,page:1}))}} disabled={optionsLoading}><option value="">All employees</option>{employeeOptions.map(x=><option key={x._id} value={x._id}>{x.name} ({x.employeeId})</option>)}</select>
        <select className="field lg:max-w-48" value={departmentId} onChange={e=>{setDepartmentId(e.target.value);setPagination(p=>({...p,page:1}))}} disabled={optionsLoading}><option value="">All departments</option>{departmentOptions.map(x=><option key={x._id} value={x._id}>{x.name} ({x.code})</option>)}</select></>}
        <input type="date" className="field lg:max-w-40" value={returnFrom} onChange={e=>{setReturnFrom(e.target.value);setPagination(p=>({...p,page:1}))}} placeholder="From"/>
        <input type="date" className="field lg:max-w-40" value={returnTo} onChange={e=>{setReturnTo(e.target.value);setPagination(p=>({...p,page:1}))}} placeholder="To"/>
        <button className="btn-secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
        {(search||status||targetType||employeeId||departmentId||returnFrom||returnTo)&&<button className="btn-secondary" onClick={clearFilters}><X size={16}/> Clear</button>}
      </div>
      {error&&<p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="mb-3 text-sm text-slate-500">{pagination.totalRecords||0} result{(pagination.totalRecords===1)?'':'s'}</p>
      <DataTable columns={columns} data={allocations} loading={loading} emptyTitle={mine?'You have no allocations':'No allocations match the selected filters'}/>
      {pagination.totalPages>1&&<Pagination page={pagination.page} setPage={page=>setPagination(p=>({...p,page}))} total={pagination.totalRecords} pageSize={pagination.limit}/>}
      {returning&&<ReturnAssetModal open={Boolean(returning)} onClose={()=>setReturning(null)} onSubmit={handleReturn} allocation={returning}/>}
    </>
  );
}
