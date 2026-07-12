import api from './api';

export const bookingService = {
  async getBookings(params = {}) {
    const { data } = await api.get('/bookings', { params });
    return data.data;
  },
  async getMyBookings(params = {}) {
    const { data } = await api.get('/bookings/my', { params });
    return data.data;
  },
  async getCalendarBookings(params = {}) {
    const { data } = await api.get('/bookings/calendar', { params });
    return data.data.bookings;
  },
  async getBookingStats() {
    const { data } = await api.get('/bookings/stats');
    return data.data;
  },
  async getBookingById(id) {
    const { data } = await api.get(`/bookings/${id}`);
    return data.data.booking;
  },
  async checkAvailability(payload) {
    const { data } = await api.post('/bookings/check-availability', payload);
    return data.data;
  },
  async createBooking(payload) {
    const { data } = await api.post('/bookings', payload);
    return data.data.booking;
  },
  async confirmBooking(id) {
    const { data } = await api.patch(`/bookings/${id}/confirm`);
    return data.data.booking;
  },
  async cancelBooking(id, cancelReason) {
    const { data } = await api.patch(`/bookings/${id}/cancel`, { cancelReason });
    return data.data.booking;
  },
  async completeBooking(id) {
    const { data } = await api.patch(`/bookings/${id}/complete`);
    return data.data.booking;
  },
};

export default bookingService;
