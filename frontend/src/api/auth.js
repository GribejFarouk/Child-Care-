import { apiClient } from './client';

export const login = async (email, password) => {
  const response = await apiClient.post('/api/auth/login/', { email, password });
  return response.data;
};

export const registerParent = async (data) => {
  const response = await apiClient.post('/api/auth/register/parent/', data);
  return response.data;
};

export const registerDoctor = async (data) => {
  const response = await apiClient.post('/api/auth/register/doctor/', data);
  return response.data;
};

export const logout = async (refreshToken) => {
  await apiClient.post('/api/auth/logout/', { refresh: refreshToken });
  return true;
};

export const getMe = async () => {
  const response = await apiClient.get('/api/auth/me/');
  return response.data;
};

export const updateMe = async (data) => {
  const response = await apiClient.patch('/api/auth/me/', data);
  return response.data;
};
