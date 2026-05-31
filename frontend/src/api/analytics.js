import { apiClient } from './client';

/**
 * Submit a measurement for rule-based analysis.
 * The server injects parent_id from the JWT.
 *
 * @param {object} currentMeasurement - The newly created measurement object
 * @param {object|null} previousMeasurement - The previous measurement for this child, or null
 * @param {object} options - Additional context: { sex, age_at_recording_months }
 * @returns {Array} Array of created alert objects (may be empty if no rules triggered)
 */
export const analyzeMeasurement = async (currentMeasurement, previousMeasurement = null, options = {}) => {
  const payload = {
    child_id:               currentMeasurement.child_id,
    measurement_id:         currentMeasurement.id,
    weight_kg:              currentMeasurement.weight_kg ?? null,
    height_cm:              currentMeasurement.height_cm ?? null,
    bmi:                    currentMeasurement.bmi ?? null,
    head_circumference_cm:  currentMeasurement.head_circumference_cm ?? null,
    previous_measurement:   previousMeasurement ?? null,
    // OMS context — enables server-side P3/P97 comparison
    age_at_recording_months: currentMeasurement.age_at_recording_months ?? options.age_at_recording_months ?? null,
    sex:                    options.sex ?? null,
  };

  try {
    const response = await apiClient.post('/api/analytics/measurements/analyze/', payload);
    return response.data;
  } catch (err) {
    // Analytics failure is non-critical — measurement was already saved
    console.warn('[analytics] analyze call failed (non-blocking):', err?.response?.data ?? err.message);
    return [];
  }
};

/**
 * List alerts for the authenticated parent.
 *
 * @param {string|null} childId - Optional child UUID to filter by
 */
export const listAlerts = async (childId = null) => {
  const params = childId ? { child_id: childId } : {};
  const response = await apiClient.get('/api/analytics/alerts/', { params });
  return response.data;
};

/**
 * Get a single alert by id.
 */
export const getAlert = async (id) => {
  const response = await apiClient.get(`/api/analytics/alerts/${id}/`);
  return response.data;
};

/**
 * Mark an alert as read.
 */
export const markAlertRead = async (id) => {
  const response = await apiClient.patch(`/api/analytics/alerts/${id}/read/`);
  return response.data;
};

/**
 * Fetch WHO growth reference curve from the backend.
 * Calls: GET /api/analytics/references/growth/
 *
 * @param {object} params
 * @param {'M'|'F'} params.sex
 * @param {'weight'|'height'|'head_circumference'|'bmi'} params.metric
 * @param {number} [params.minAgeMonths=0]
 * @param {number} [params.maxAgeMonths=228]
 * @returns {object} { available, sex, metric, source?, points?: [{age_months, p3, p50, p97}], reason? }
 */
export const getGrowthReferenceCurve = async ({ sex = 'M', metric, minAgeMonths = 0, maxAgeMonths = 228 }) => {
  try {
    const response = await apiClient.get('/api/analytics/references/growth/', {
      params: {
        sex,
        metric,
        min_age_months: minAgeMonths,
        max_age_months: maxAgeMonths,
      },
    });
    return response.data;
  } catch (err) {
    console.warn('[analytics] growth reference fetch failed:', err?.response?.data ?? err.message);
    return { available: false, sex, metric, reason: 'Erreur réseau.' };
  }
};

/**
 * Recommendations and Risk Score API (Phase 8)
 */

export const listRecommendations = async (childId = null) => {
  const params = childId ? { child_id: childId } : {};
  const response = await apiClient.get('/api/analytics/recommendations/', { params });
  return response.data;
};

export const getRecommendation = async (id) => {
  const response = await apiClient.get(`/api/analytics/recommendations/${id}/`);
  return response.data;
};

export const markRecommendationRead = async (id) => {
  const response = await apiClient.patch(`/api/analytics/recommendations/${id}/read/`);
  return response.data;
};

export const getChildRiskScore = async (childId) => {
  const response = await apiClient.get(`/api/analytics/risk-score/${childId}/`);
  return response.data;
};

export const listClinicalFindings = async (childId = null) => {
  const params = childId ? { child_id: childId } : {};
  const response = await apiClient.get('/api/analytics/findings/', { params });
  return response.data;
};
