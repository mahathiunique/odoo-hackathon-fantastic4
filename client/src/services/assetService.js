import api from './api';

const assetService = {
  async getAll(params = {}) {
    const { data } = await api.get('/assets', { params });
    return data.data;
  },
  async getAssets(params = {}) {
    return this.getAll(params);
  },
  async getAssetOptions(params = {}) {
    const { data } = await api.get('/assets/options', { params });
    return data.data;
  },
  async getAssetStats() {
    const { data } = await api.get('/assets/stats');
    return data.data;
  },
  async getById(id) {
    const { data } = await api.get(`/assets/${id}`);
    return data.data.asset;
  },
  async getAssetById(id) {
    return this.getById(id);
  },
  async getAssetHistory(id, params = {}) {
    const { data } = await api.get(`/assets/${id}/history`, { params });
    return data.data;
  },
  async create(payload) {
    const { data } = await api.post('/assets', payload);
    return data.data.asset;
  },
  async createAsset(payload) {
    return this.create(payload);
  },
  async update(id, payload) {
    const { data } = await api.put(`/assets/${id}`, payload);
    return data.data.asset;
  },
  async updateAsset(id, payload) {
    return this.update(id, payload);
  },
  async changeStatus(id, payload) {
    const { data } = await api.patch(`/assets/${id}/status`, payload);
    return data.data.asset;
  },
  async changeAssetStatus(id, payload) {
    return this.changeStatus(id, payload);
  },
  async changeCondition(id, payload) {
    const { data } = await api.patch(`/assets/${id}/condition`, payload);
    return data.data.asset;
  },
  async changeAssetCondition(id, payload) {
    return this.changeCondition(id, payload);
  },
  async remove(id, reason) {
    const { data } = await api.delete(`/assets/${id}`, { data: { reason } });
    return data.data.asset;
  },
  async retireAsset(id, reason) {
    return this.remove(id, reason);
  },
};

export { assetService as default, assetService };
