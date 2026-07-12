import api from './api';

const normalizeUserResponse = (response) => response?.data?.data || response?.data || {};

export const userService = {
  async getAll(params = {}) {
    const response = await api.get('/users', { params });
    const payload = normalizeUserResponse(response);
    return { success: true, data: payload.users || [] };
  },
  async getUsers(params = {}) {
    const response = await api.get('/users', { params });
    return normalizeUserResponse(response);
  },
  async getById(id) {
    const response = await api.get(`/users/${id}`);
    const payload = normalizeUserResponse(response);
    return { success: true, data: payload.user || null };
  },
  async getUserById(id) {
    const response = await api.get(`/users/${id}`);
    return normalizeUserResponse(response);
  },
  async create(data) {
    const response = await api.post('/users', data);
    const payload = normalizeUserResponse(response);
    return { success: true, data: payload.user || null };
  },
  async createUser(data) {
    const response = await api.post('/users', data);
    return normalizeUserResponse(response);
  },
  async update(id, data) {
    const response = await api.put(`/users/${id}`, data);
    const payload = normalizeUserResponse(response);
    return { success: true, data: payload.user || null };
  },
  async updateUser(id, data) {
    const response = await api.put(`/users/${id}`, data);
    return normalizeUserResponse(response);
  },
  async changeStatus(id, status) {
    const response = await api.patch(`/users/${id}/status`, { status });
    const payload = normalizeUserResponse(response);
    return { success: true, data: payload.user || null };
  },
  async changeUserStatus(id, status) {
    const response = await api.patch(`/users/${id}/status`, { status });
    return normalizeUserResponse(response);
  },
  async resetUserPassword(id, newPassword) {
    const response = await api.patch(`/users/${id}/reset-password`, { newPassword });
    return normalizeUserResponse(response);
  },
  async remove(id) {
    const response = await api.delete(`/users/${id}`);
    const payload = normalizeUserResponse(response);
    return { success: true, data: payload.user || null };
  },
  async deactivateUser(id) {
    const response = await api.delete(`/users/${id}`);
    return normalizeUserResponse(response);
  },
};
