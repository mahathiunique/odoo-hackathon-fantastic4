export const readableApiError=(error)=>{
  const status=error?.response?.status;
  if(status===401)return 'Please sign in again to continue.';
  if(status===403)return 'You do not have permission to perform this action.';
  if(status===404)return 'The requested record could not be found.';
  if(status===503)return 'Authentication integration is waiting for the backend authentication module.';
  return error?.response?.data?.message||'The server could not complete this request.';
};
export const applyFieldErrors=(error,setError)=>{
  const errors=error?.response?.data?.errors;
  if(!Array.isArray(errors))return false;
  errors.filter(x=>x?.field).forEach(x=>setError(x.field,{type:'server',message:x.message}));
  return errors.some(x=>x?.field);
};
