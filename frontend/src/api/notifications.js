import { apiClient } from './client';

export const notificationService = {
  getNotifications: async () => {
    const response = await apiClient.get('/api/notifications/');
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await apiClient.patch(`/api/notifications/${id}/read/`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.post('/api/notifications/mark-all-read/');
    return response.data;
  }
};
