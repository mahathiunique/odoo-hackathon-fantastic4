import api from './api';

// Real API-backed dashboard service (Stage 11).
const dashboardService = {
  async getOverview() {
    const { data } = await api.get('/dashboard');
    return data;
  },
};

export default dashboardService;
export { dashboardService };
