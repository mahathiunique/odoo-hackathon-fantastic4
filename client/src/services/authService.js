import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout API failures and still clear local auth state.
    } finally {
      localStorage.removeItem('assetflow_token');
      localStorage.removeItem('assetflow_user');
    }
  },
};
