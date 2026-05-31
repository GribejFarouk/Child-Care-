import { apiClient } from './client';

/**
 * List all shares for the current user.
 * Parent: Returns shares created by the parent.
 * Doctor: Returns active shares assigned to the doctor.
 */
export const listShares = async () => {
  const response = await apiClient.get('/api/collaboration/shares/');
  return response.data;
};

/**
 * Create a new share for a child (Parent only).
 * @param {string} childId 
 * @param {object} permissions e.g. { profile: true, measurements: true, alerts: true, calendar: true }
 */
export const createShare = async (childId, permissions) => {
  const response = await apiClient.post('/api/collaboration/shares/', {
    child_id: childId,
    permissions
  });
  return response.data;
};

/**
 * Update permissions or revoke a share (Parent only).
 * @param {string} shareId 
 * @param {object} data e.g. { permissions: {...} } or { status: 'revoked' }
 */
export const updateShare = async (shareId, data) => {
  const response = await apiClient.patch(`/api/collaboration/shares/${shareId}/`, data);
  return response.data;
};

/**
 * Accept a sharing code (Doctor only).
 * @param {string} code 
 */
export const acceptShare = async (code) => {
  const response = await apiClient.post('/api/collaboration/shares/accept/', { code });
  return response.data;
};

/**
 * List messages for a specific share.
 * @param {string} shareId 
 */
export const listMessages = async (shareId) => {
  const response = await apiClient.get(`/api/collaboration/messages/?share_id=${shareId}`);
  return response.data;
};

/**
 * Send a message within a share.
 * @param {string} shareId 
 * @param {string} content 
 */
export const sendMessage = async (shareId, content) => {
  const response = await apiClient.post('/api/collaboration/messages/', {
    share: shareId,
    content
  });
  return response.data;
};

/**
 * Get the total number of unread messages for the user.
 */
export const getUnreadMessagesCount = async () => {
  const response = await apiClient.get('/api/collaboration/messages/unread-count/');
  return response.data;
};

/**
 * List consultation sessions for a share.
 * @param {string} shareId 
 */
export const listConsultations = async (shareId) => {
  const response = await apiClient.get(`/api/collaboration/consultations/?share_id=${shareId}`);
  return response.data;
};

/**
 * Create a new consultation session.
 * @param {string} shareId 
 * @param {string} sessionType ('video' | 'audio')
 */
export const createConsultation = async (shareId, sessionType = 'video') => {
  const response = await apiClient.post('/api/collaboration/consultations/', {
    share: shareId,
    session_type: sessionType
  });
  return response.data;
};

/**
 * Join an existing consultation session and get the URL.
 * @param {string} sessionId 
 */
export const joinConsultation = async (sessionId) => {
  const response = await apiClient.post(`/api/collaboration/consultations/${sessionId}/join/`);
  return response.data;
};

/**
 * Complete a consultation session.
 * @param {string} sessionId 
 */
export const completeConsultation = async (sessionId) => {
  const response = await apiClient.post(`/api/collaboration/consultations/${sessionId}/complete/`);
  return response.data;
};

/**
 * Cancel a consultation session.
 * @param {string} sessionId 
 */
export const cancelConsultation = async (sessionId) => {
  const response = await apiClient.post(`/api/collaboration/consultations/${sessionId}/cancel/`);
  return response.data;
};
