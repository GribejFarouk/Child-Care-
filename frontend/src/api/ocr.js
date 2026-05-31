import { apiClient } from './client';

/**
 * Upload a file for OCR extraction.
 * Uses FormData — axios auto-sets Content-Type with boundary.
 * Do NOT set Content-Type manually.
 */
export const extractOcr = async (file, childId) => {
  const formData = new FormData();
  formData.append('file', file);
  if (childId) formData.append('child_id', childId);

  const response = await apiClient.post('/api/ocr/extract/', formData);
  return response.data;
};

/**
 * List the authenticated parent's OCR import history.
 */
export const listOcrImports = async (childId = null) => {
  const params = childId ? { child_id: childId } : {};
  const response = await apiClient.get('/api/ocr/imports/', { params });
  return response.data;
};

/**
 * Confirm and save an OCR import as a Measurement.
 */
export const confirmOcrImport = async (id, data) => {
  const response = await apiClient.post(`/api/ocr/imports/${id}/confirm/`, data);
  return response.data;
};
