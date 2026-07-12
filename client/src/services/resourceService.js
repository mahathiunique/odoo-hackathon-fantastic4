import api from './api';

export const resourceService = {
  async getResources(params = {}) {
    const { data } = await api.get('/resources', { params });
    return data.data;
  },
  async getResourceOptions(params = {}) {
    const { data } = await api.get('/resources/options', { params });
    return data.data.resources;
  },
  async getResourceById(id) {
    const { data } = await api.get(`/resources/${id}`);
    return data.data.resource;
  },
  async createResource(payload) {
    const { data } = await api.post('/resources', payload);
    return data.data.resource;
  },
  async updateResource(id, payload) {
    const { data } = await api.put(`/resources/${id}`, payload);
    // Returns { resource, warning }
    return data.data;
  },
  async changeResourceStatus(id, status) {
    const { data } = await api.patch(`/resources/${id}/status`, { status });
    return data.data;
  },
  async changeResourceAvailability(id, payload) {
    const { data } = await api.patch(`/resources/${id}/availability`, payload);
    return data.data;
  },
  async deactivateResource(id) {
    const { data } = await api.delete(`/resources/${id}`);
    return data.data;
  },
  // Optional Stage 6 integration. Returns an empty list (and integrationAvailable
  // false) when the Asset module is not merged yet, never blocking resource work.
  async getSharedAssetOptions() {
    try {
      const { data } = await api.get('/assets/options', { params: { sharedOnly: true } });
      return { assets: data.data?.assets || data.data?.resources || [], integrationAvailable: true };
    } catch {
      return { assets: [], integrationAvailable: false };
    }
  },
};

export default resourceService;
