import api from './api';

export const categoryService={
  async getCategories(params={}){const {data}=await api.get('/categories',{params});return data.data},
  async getCategoryById(id){const {data}=await api.get(`/categories/${id}`);return data.data.category},
  async getCategoryOptions(){const {data}=await api.get('/categories/options');return data.data.categories},
  async createCategory(payload){const {data}=await api.post('/categories',payload);return data.data.category},
  async updateCategory(id,payload){const {data}=await api.put(`/categories/${id}`,payload);return data.data.category},
  async changeCategoryStatus(id,status){const {data}=await api.patch(`/categories/${id}/status`,{status});return data.data.category},
  async deactivateCategory(id){const {data}=await api.delete(`/categories/${id}`);return data.data.category},
};
export default categoryService;
