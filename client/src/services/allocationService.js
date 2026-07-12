import api from './api';

const payload=(response)=>response?.data?.data||{};
const integrationError='The Asset module is pending integration. Merge Stage 6 before creating allocations.';

export const allocationService={
  async getAllocations(params={}){return payload(await api.get('/allocations',{params}))},
  async getMyAllocations(params={}){return payload(await api.get('/allocations/my',{params}))},
  async getOverdueAllocations(params={}){return payload(await api.get('/allocations/overdue',{params}))},
  async getAllocationStats(){return payload(await api.get('/allocations/stats')).stats},
  async getAllocationById(id){return payload(await api.get(`/allocations/${id}`)).allocation},
  async getAvailableAssetOptions(){try{return payload(await api.get('/assets/options',{params:{availableOnly:true}})).assets||[]}catch(error){if([404,503].includes(error?.response?.status)){const pending=new Error(integrationError);pending.integrationPending=true;throw pending}throw error}},
  async getEmployeeOptions(){return payload(await api.get('/employees/options')).employees||[]},
  async getDepartmentOptions(){return payload(await api.get('/departments/options')).departments||[]},
  async createAllocation(data){return payload(await api.post('/allocations',data)).allocation},
  async returnAsset(id,data){return payload(await api.patch(`/allocations/${id}/return`,data))},
};
export default allocationService;
