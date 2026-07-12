import {useEffect,useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import TextArea from '../../components/common/TextArea';
import Button from '../../components/common/Button';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import allocationService from '../../services/allocationService';
import {applyFieldErrors,readableApiError} from '../../services/helpers/apiErrors';

export default function AllocationFormPage(){
  const navigate=useNavigate();
  const [assets,setAssets]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [departments,setDepartments]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [integrationPending,setIntegrationPending]=useState(false);
  const [submitting,setSubmitting]=useState(false);

  const{register,handleSubmit,watch,reset,setError:setFormError,formState:{errors}}=useForm({defaultValues:{asset:'',allocatedToType:'Employee',employee:'',department:'',allocatedDate:new Date().toISOString().slice(0,10),expectedReturnDate:'',purpose:'',notes:''}});
  const targetType=watch('allocatedToType');
  const selectedAssetId=watch('asset');
  const selectedAsset=assets.find(a=>a._id===selectedAssetId);

  useEffect(()=>{(async()=>{setLoading(true);setError('');
    try{
      const[assetOptions,empOptions,deptOptions]=await Promise.all([allocationService.getAvailableAssetOptions(),allocationService.getEmployeeOptions(),allocationService.getDepartmentOptions()]);
      setAssets(assetOptions||[]);setEmployees(empOptions||[]);setDepartments(deptOptions||[]);
    }catch(e){if(e?.integrationPending){setIntegrationPending(true);setAssets([])}else{setError(readableApiError(e))}}finally{setLoading(false)}})()},[]);

  useEffect(()=>{if(targetType==='Employee'){reset(r=>({...r,department:''}))}else{reset(r=>({...r,employee:''}))}},[targetType,reset]);

  const submit=async values=>{
    setSubmitting(true);
    try{
      const payload={...values,asset:values.asset,allocatedToType:values.allocatedToType,employee:values.allocatedToType==='Employee'?values.employee:undefined,department:values.allocatedToType==='Department'?values.department:undefined,allocatedDate:values.allocatedDate||new Date().toISOString().slice(0,10),notes:values.notes?.trim()||''};
      const allocation=await allocationService.createAllocation(payload);
      toast.success('Asset allocated successfully');
      navigate(`/allocations/${allocation._id}`);
    }catch(e){applyFieldErrors(e,setFormError);toast.error(readableApiError(e))}finally{setSubmitting(false)}
  };

  if(loading)return <><PageHeader title="New allocation" description="Issue an asset to an employee or department."/><div className="card"><LoadingSkeleton/></div></>;
  if(error)return <><PageHeader title="New allocation" description="Issue an asset to an employee or department."/><ErrorState retry={()=>location.reload()}/><p className="mt-3 text-center text-sm text-red-600">{error}</p></>;

  return(
    <>
      <PageHeader title="New allocation" description="Issue an asset to an employee or department."/>
      {integrationPending&&<div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Asset Management is being developed on another branch. Merge Stage 6 to enable allocation creation.</div>}
      <form onSubmit={handleSubmit(submit)} className="card max-w-4xl">
        <div className="grid gap-5 md:grid-cols-2">
          <Select label="Available asset" required options={assets.map(a=>({value:a._id,label:`${a.assetTag} - ${a.name}${a.condition?` (${a.condition})`:''}`}))} error={errors.asset} {...register('asset',{required:'Asset is required'})}/>
          <Select label="Allocate to" required options={['Employee','Department']} error={errors.allocatedToType} {...register('allocatedToType',{required:'Allocation target type is required'})}/>
          {targetType==='Employee'&&<Select label="Employee" required options={employees.map(e=>({value:e._id,label:`${e.name} (${e.employeeId})`}))} error={errors.employee} {...register('employee',{required:'Employee is required'})}/>}
          {targetType==='Department'&&<Select label="Department" required options={departments.map(d=>({value:d._id,label:`${d.name} (${d.code})`}))} error={errors.department} {...register('department',{required:'Department is required'})}/>}
          <Input label="Allocation date" type="date" required error={errors.allocatedDate} {...register('allocatedDate',{required:'Allocation date is required'})}/>
          <Input label="Expected return date" type="date" required error={errors.expectedReturnDate} {...register('expectedReturnDate',{required:'Expected return date is required',validate:v=>!watch('allocatedDate')||new Date(v)>=new Date(watch('allocatedDate'))||'Expected return date cannot be earlier than allocation date'})}/>
          <div className="md:col-span-2"><Input label="Purpose" required error={errors.purpose} {...register('purpose',{required:'Purpose is required',minLength:{value:3,message:'Use at least 3 characters'},maxLength:{value:500,message:'Use no more than 500 characters'}})}/></div>
          <div className="md:col-span-2"><TextArea label="Notes" error={errors.notes} {...register('notes',{maxLength:{value:1000,message:'Use no more than 1000 characters'}})}/></div>
        </div>
        {selectedAsset&&<div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm"><p className="font-medium text-slate-900">Selected asset</p><p className="mt-1 text-slate-700">{selectedAsset.name} ({selectedAsset.assetTag})</p><p className="text-xs text-slate-500">Condition: {selectedAsset.condition||'—'} · Status: {selectedAsset.lifecycleStatus||'—'}</p></div>}
        <div className="mt-7 flex justify-end gap-3 border-t pt-5">
          <button type="button" onClick={()=>navigate('/allocations')} className="btn-secondary">Cancel</button>
          <Button type="submit" loading={submitting} disabled={integrationPending}>Allocate asset</Button>
        </div>
      </form>
    </>
  );
}
