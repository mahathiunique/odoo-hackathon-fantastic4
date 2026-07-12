import {useEffect,useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate,useParams} from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../components/layout/PageHeader';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import TextArea from '../components/common/TextArea';
import Button from '../components/common/Button';
import ErrorState from '../components/common/ErrorState';
import useAuth from '../hooks/useAuth';
import {applyFieldErrors,readableApiError} from '../services/helpers/apiErrors';
import {codePattern} from '../utils/validators';

const roleOf=user=>user?.role?.name||user?.role;
export default function OrganizationFormPage({kind,service}){
  const department=kind==='department',label=department?'Department':'Asset category',base=department?'/departments':'/categories';
  const {id}=useParams(),navigate=useNavigate(),{user}=useAuth(),isAdmin=roleOf(user)==='Admin';
  const [loadError,setLoadError]=useState('');
  const {register,handleSubmit,reset,setError,formState:{errors,isSubmitting}}=useForm({defaultValues:department?{status:'Active'}:{status:'Active',requiresMaintenance:false}});
  useEffect(()=>{if(!id)return;const load=department?service.getDepartmentById(id):service.getCategoryById(id);load.then(reset).catch(e=>setLoadError(readableApiError(e)))},[id,department,service,reset]);
  const submit=async values=>{try{const payload={...values,code:values.code.trim().toUpperCase()};if(!isAdmin)delete payload.status;if(!department)payload.defaultUsefulLife=Number(payload.defaultUsefulLife);if(id){department?await service.updateDepartment(id,payload):await service.updateCategory(id,payload)}else{department?await service.createDepartment(payload):await service.createCategory(payload)}toast.success(`${label} ${id?'updated':'created'} successfully`);navigate(base)}catch(e){applyFieldErrors(e,setError);toast.error(readableApiError(e))}};
  if(loadError)return <><PageHeader title={`${id?'Edit':'Add'} ${label}`}/><ErrorState retry={()=>location.reload()}/><p className="mt-3 text-center text-sm text-red-600">{loadError}</p></>;
  return <><PageHeader title={`${id?'Edit':'Add'} ${label}`} description="Fields marked with an asterisk are required."/><form onSubmit={handleSubmit(submit)} className="card max-w-4xl"><div className="grid gap-5 md:grid-cols-2"><Input label={`${label} name`} required error={errors.name} {...register('name',{required:'Name is required',minLength:{value:2,message:'Use at least 2 characters'},maxLength:{value:100,message:'Use no more than 100 characters'}})}/><Input label={`${label} code`} required error={errors.code} style={{textTransform:'uppercase'}} {...register('code',{required:'Code is required',pattern:codePattern,minLength:{value:2,message:'Use at least 2 characters'},maxLength:{value:20,message:'Use no more than 20 characters'},setValueAs:v=>v?.trim().toUpperCase()})}/>{department?<><Input label="Manager name" error={errors.managerName} {...register('managerName',{maxLength:{value:100,message:'Use no more than 100 characters'}})}/><Input label="Location" required error={errors.location} {...register('location',{required:'Location is required',maxLength:{value:150,message:'Use no more than 150 characters'}})}/></>:<><Input label="Useful life (months)" type="number" min="1" max="600" required error={errors.defaultUsefulLife} {...register('defaultUsefulLife',{required:'Useful life is required',valueAsNumber:true,min:{value:1,message:'Minimum is 1 month'},max:{value:600,message:'Maximum is 600 months'},validate:v=>Number.isInteger(v)||'Use a whole number of months'})}/><label className="flex items-center gap-3 rounded-lg border p-3 sm:mt-7"><input type="checkbox" className="h-4 w-4 accent-indigo-600" {...register('requiresMaintenance')}/><span className="text-sm font-medium">Requires regular maintenance</span></label></>}{isAdmin&&<Select label="Status" required options={['Active','Inactive']} error={errors.status} {...register('status',{required:'Status is required'})}/>}<div className="md:col-span-2"><TextArea label="Description" error={errors.description} {...register('description',{maxLength:{value:500,message:'Use no more than 500 characters'}})}/></div></div><div className="mt-7 flex justify-end gap-3 border-t pt-5"><button type="button" className="btn-secondary" onClick={()=>navigate(base)}>Cancel</button><Button loading={isSubmitting}>Save {label.toLowerCase()}</Button></div></form></>;
}
