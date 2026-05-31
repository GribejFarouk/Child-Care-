import { apiClient } from './client';

export const listEvents = async (params = {}) => {
  const response = await apiClient.get('/api/calendar/events/', { params });
  return response.data;
};

export const createEvent = async (data) => {
  const response = await apiClient.post('/api/calendar/events/', data);
  return response.data;
};

export const getEvent = async (id) => {
  const response = await apiClient.get(`/api/calendar/events/${id}/`);
  return response.data;
};

export const updateEvent = async (id, data) => {
  const response = await apiClient.patch(`/api/calendar/events/${id}/`, data);
  return response.data;
};

export const deleteEvent = async (id) => {
  const response = await apiClient.delete(`/api/calendar/events/${id}/`);
  return response.data;
};

export const confirmEvent = async (id, action) => {
  const response = await apiClient.patch(`/api/calendar/events/${id}/confirm/`, { action });
  return response.data;
};
