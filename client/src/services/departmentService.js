import api from './api';

export const departmentService={
  async getDepartments(params={}){const {data}=await api.get('/departments',{params});return data.data},
  async getDepartmentById(id){const {data}=await api.get(`/departments/${id}`);return data.data.department},
  async getDepartmentOptions(){const {data}=await api.get('/departments/options');return data.data.departments},
  async createDepartment(payload){const {data}=await api.post('/departments',payload);return data.data.department},
  async updateDepartment(id,payload){const {data}=await api.put(`/departments/${id}`,payload);return data.data.department},
  async changeDepartmentStatus(id,status){const {data}=await api.patch(`/departments/${id}/status`,{status});return data.data.department},
  async deactivateDepartment(id){const {data}=await api.delete(`/departments/${id}`);return data.data.department},
};
export default departmentService;
