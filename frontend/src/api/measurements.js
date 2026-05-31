import { apiClient } from './client';

/**
 * List measurements for a child.
 */
export const listMeasurements = async (childId) => {
  const response = await apiClient.get('/api/measurements/', {
    params: { child_id: childId },
  });
  return response.data;
};

/**
 * Create a new measurement.
 * parent_id is injected server-side from the JWT — do not send it in body.
 */
export const createMeasurement = async (data) => {
  const response = await apiClient.post('/api/measurements/', data);
  return response.data;
};

/**
 * Partially update a measurement.
 */
export const updateMeasurement = async (id, data) => {
  const response = await apiClient.patch(`/api/measurements/${id}/`, data);
  return response.data;
};

/**
 * Delete a measurement.
 */
export const deleteMeasurement = async (id) => {
  await apiClient.delete(`/api/measurements/${id}/`);
  return true;
};
