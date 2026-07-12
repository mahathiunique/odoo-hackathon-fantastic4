import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowDown,ArrowUp,Eye,Pencil,Plus,Power,RefreshCw,X} from 'lucide-react';
import {Link} from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../components/layout/PageHeader';
import SearchInput from '../components/common/SearchInput';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/tables/DataTable';
import Pagination from '../components/common/Pagination';
import ConfirmModal from '../components/common/ConfirmModal';
import ErrorState from '../components/common/ErrorState';
import useDebounce from '../hooks/useDebounce';
import useAuth from '../hooks/useAuth';
import {readableApiError} from '../services/helpers/apiErrors';

const roleOf=user=>user?.role?.name||user?.role;
const SortLabel=({label,field,sortBy,sortOrder,onSort})=><button className="flex items-center gap-1" onClick={()=>onSort(field)}>{label}{sortBy===field&&(sortOrder==='asc'?<ArrowUp size={13}/>:<ArrowDown size={13}/>)}</button>;

export default function OrganizationListPage({kind,service}){
  const department=kind==='department';
  const {user}=useAuth(),role=roleOf(user);
  const [records,setRecords]=useState([]),[pagination,setPagination]=useState({page:1,limit:10,totalRecords:0,totalPages:0});
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[search,setSearch]=useState(''),[status,setStatus]=useState('');
  const [maintenance,setMaintenance]=useState(''),[sortBy,setSortBy]=useState('createdAt'),[sortOrder,setSortOrder]=useState('desc'),[pending,setPending]=useState(null);
  const debounced=useDebounce(search,350);
  const canEdit=department?role==='Admin':['Admin','Asset Manager'].includes(role);
  const canCreate=canEdit,canStatus=role==='Admin',canFilterStatus=['Admin','Asset Manager'].includes(role);
  const params=useMemo(()=>({page:pagination.page,limit:pagination.limit,search:debounced||undefined,status:status||undefined,requiresMaintenance:!department&&maintenance!==''?maintenance:undefined,sortBy,sortOrder}),[pagination.page,pagination.limit,debounced,status,maintenance,department,sortBy,sortOrder]);
  const load=useCallback(async()=>{setLoading(true);setError('');try{const result=department?await service.getDepartments(params):await service.getCategories(params);setRecords(result[department?'departments':'categories']);setPagination(result.pagination)}catch(e){setError(readableApiError(e))}finally{setLoading(false)}},[department,params,service]);
  useEffect(()=>{load()},[load]);
  useEffect(()=>{setPagination(p=>({...p,page:1}))},[debounced,status,maintenance]);
  const sort=field=>{if(sortBy===field)setSortOrder(x=>x==='asc'?'desc':'asc');else{setSortBy(field);setSortOrder('asc')}setPagination(p=>({...p,page:1}))};
  const statusAction=async()=>{const record=pending;if(!record)return;const next=record.status==='Active'?'Inactive':'Active';try{if(next==='Inactive'){department?await service.deactivateDepartment(record._id):await service.deactivateCategory(record._id)}else{department?await service.changeDepartmentStatus(record._id,next):await service.changeCategoryStatus(record._id,next)}toast.success(`${department?'Department':'Category'} ${next.toLowerCase()} successfully`);setPending(null);load()}catch(e){toast.error(readableApiError(e))}};
  const sortLabel=(label,field)=><SortLabel label={label} field={field} sortBy={sortBy} sortOrder={sortOrder} onSort={sort}/>;
  const columns=department?[
    {key:'code',label:sortLabel('Code','code')},{key:'name',label:sortLabel('Department','name')},{key:'managerName',label:'Manager'},{key:'location',label:sortLabel('Location','location')},{key:'employeeCount',label:'Employees'},{key:'assetCount',label:'Assets'},{key:'status',label:sortLabel('Status','status'),render:v=><StatusBadge status={v}/>}
  ]:[
    {key:'code',label:sortLabel('Code','code')},{key:'name',label:sortLabel('Category','name')},{key:'defaultUsefulLife',label:sortLabel('Useful life','defaultUsefulLife'),render:v=><span>{v} months {v%12===0&&<small className="text-slate-400">({v/12} years)</small>}</span>},{key:'requiresMaintenance',label:sortLabel('Maintenance','requiresMaintenance'),render:v=>v?'Required':'Not required'},{key:'assetCount',label:'Assets'},{key:'status',label:sortLabel('Status','status'),render:v=><StatusBadge status={v}/>}
  ];
  columns.push({key:'actions',label:'Actions',render:(_,row)=><div className="flex items-center gap-1">{department&&<Link className="rounded p-2 hover:bg-slate-100" aria-label="View department" to={`/departments/${row._id}`}><Eye size={16}/></Link>}{canEdit&&<Link className="rounded p-2 hover:bg-slate-100" aria-label="Edit record" to={`/${department?'departments':'categories'}/${row._id}/edit`}><Pencil size={16}/></Link>}{canStatus&&<button className={`rounded p-2 ${row.status==='Active'?'text-red-600 hover:bg-red-50':'text-emerald-600 hover:bg-emerald-50'}`} aria-label={`${row.status==='Active'?'Deactivate':'Activate'} record`} onClick={()=>setPending(row)}><Power size={16}/></button>}</div>});
  const title=department?'Departments':'Asset categories',base=department?'/departments':'/categories';
  if(error&&!records.length)return <><PageHeader title={title}/><ErrorState retry={load}/><p className="mt-3 text-center text-sm text-red-600">{error}</p></>;
  return <><PageHeader title={title} description={department?'Manage organizational units, ownership and locations.':'Define asset classification and lifecycle defaults.'} action={canCreate&&<Link className="btn-primary" to={`${base}/new`}><Plus size={17}/> Add {department?'department':'category'}</Link>}/><div className="mb-4 flex flex-col gap-3 lg:flex-row"><SearchInput value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`}/>{canFilterStatus&&<select className="field lg:max-w-44" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option>Active</option><option>Inactive</option></select>}{!department&&<select className="field lg:max-w-56" value={maintenance} onChange={e=>setMaintenance(e.target.value)}><option value="">All maintenance rules</option><option value="true">Maintenance required</option><option value="false">No maintenance required</option></select>}<button className="btn-secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>{(search||status||maintenance)&&<button className="btn-secondary" onClick={()=>{setSearch('');setStatus('');setMaintenance('')}}><X size={16}/> Clear</button>}</div>{error&&<p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<p className="mb-3 text-sm text-slate-500">{pagination.totalRecords} result{pagination.totalRecords===1?'':'s'}</p><DataTable columns={columns} data={records} loading={loading} emptyTitle={`No ${title.toLowerCase()} match the selected filters`}/>{pagination.totalPages>1&&<Pagination page={pagination.page} setPage={page=>setPagination(p=>({...p,page}))} total={pagination.totalRecords} pageSize={pagination.limit}/>}<ConfirmModal open={Boolean(pending)} onClose={()=>setPending(null)} onConfirm={statusAction} title={`${pending?.status==='Active'?'Deactivate':'Activate'} ${department?'department':'category'}`} message={`Are you sure you want to ${pending?.status==='Active'?'deactivate':'activate'} ${pending?.name}?`}/></>;
}
