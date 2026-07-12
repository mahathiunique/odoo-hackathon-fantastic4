import api from './api';

// Real API-backed activity log service (Stage 11).
const activityService = {
  async getAll(query = {}) {
    const { data } = await api.get('/activity', { params: query });
    return data;
  },
  async getById(id) {
    const { data } = await api.get(`/activity/${id}`);
    return data;
  },
};

export default activityService;
export { activityService };
