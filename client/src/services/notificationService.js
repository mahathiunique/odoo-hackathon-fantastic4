import api from './api';

// Real API-backed notification service (Stage 11).
const notificationService = {
  async getAll(query = {}) {
    const { data } = await api.get('/notifications', { params: query });
    return data;
  },
  async getUnreadCount() {
    const { data } = await api.get('/notifications/unread-count');
    return data?.data?.unreadCount ?? 0;
  },
  async refresh() {
    const { data } = await api.post('/notifications/refresh');
    return data?.data ?? { createdCount: 0, unreadCount: 0 };
  },
  async markRead(id) {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data;
  },
  async markAllRead() {
    const { data } = await api.patch('/notifications/read-all');
    return data;
  },
};

export default notificationService;
export { notificationService };
