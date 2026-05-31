import { apiClient } from './client';

export const getParentProfile = async () => {
  const response = await apiClient.get('/api/profiles/parent/me/');
  return response.data;
};

export const updateParentProfile = async (data) => {
  const response = await apiClient.patch('/api/profiles/parent/me/', data);
  return response.data;
};

export const getDoctorProfileMe = async () => {
  const response = await apiClient.get('/api/profiles/doctor/me/');
  return response.data;
};

export const updateDoctorProfileMe = async (data) => {
  const response = await apiClient.patch('/api/profiles/doctor/me/', data);
  return response.data;
};

export const getDoctorProfile = async (userId) => {
  const response = await apiClient.get(`/api/profiles/doctors/${userId}/`);
  return response.data;
};

/**
 * Get user settings from the parent profile.
 * Extracts notification_preferences from the profile data.
 * Returns sensible defaults if the API call fails.
 */
export const getUserSettings = async () => {
  try {
    const profile = await getParentProfile();
    return profile.notification_preferences || {
      notifications: true,
      emailAlerts: false,
      dataSharing: false,
    };
  } catch {
    return {
      notifications: true,
      emailAlerts: false,
      dataSharing: false,
    };
  }
};
