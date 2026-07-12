import api from './api';

const maintenanceWorkflowService = {
  list: (params = {}) => api.get('/maintenance', { params }),
  getById: (id) => api.get(`/maintenance/${id}`),
  myList: (params = {}) => api.get('/maintenance/my', { params }),

  submit: (payload) => api.post('/maintenance', payload),
  approve: (id, payload = {}) => api.patch(`/maintenance/${id}/approve`, payload),
  reject: (id, payload) => api.patch(`/maintenance/${id}/reject`, payload),
  assignTechnician: (id, payload) => api.patch(`/maintenance/${id}/assign-technician`, payload),

  schedule: (id, payload) => api.patch(`/maintenance/${id}/schedule`, payload),
  start: (id, payload) => api.patch(`/maintenance/${id}/start`, payload),
  complete: (id, payload) => api.patch(`/maintenance/${id}/complete`, payload),
  cancel: (id, payload) => api.patch(`/maintenance/${id}/cancel`, payload),

  stats: () => api.get('/maintenance/stats'),
  assetOptions: (params = {}) => api.get('/maintenance/assets', { params }),
};

export default maintenanceWorkflowService;
export { maintenanceWorkflowService };

