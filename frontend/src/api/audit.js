import { apiClient } from './client';

export const listActivityLogs = async (params = {}) => {
  const response = await apiClient.get('/api/audit/activity/', { params });
  return response.data;
};
