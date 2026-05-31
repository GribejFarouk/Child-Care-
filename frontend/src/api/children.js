import { apiClient } from './client';

export const listChildren = async () => {
  const response = await apiClient.get('/api/profiles/children/');
  return response.data;
};

export const getChild = async (id) => {
  const response = await apiClient.get(`/api/profiles/children/${id}/`);
  return response.data;
};

export const createChild = async (data) => {
  const response = await apiClient.post('/api/profiles/children/', data);
  return response.data;
};

export const updateChild = async (id, data) => {
  const response = await apiClient.patch(`/api/profiles/children/${id}/`, data);
  return response.data;
};

export const deleteChild = async (id) => {
  await apiClient.delete(`/api/profiles/children/${id}/`);
  return true;
};

/**
 * Vaccinations — no backend yet, returns empty array.
 * Will be implemented in a future phase.
 */
export const getChildVaccinations = async (childId) => {
  return [];
};

/**
 * Appointments — no backend yet, returns empty array.
 * Will be implemented in a future phase.
 */
export const getChildAppointments = async (childId) => {
  return [];
};
