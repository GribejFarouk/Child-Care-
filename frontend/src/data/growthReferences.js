/**
 * @deprecated — DO NOT IMPORT THIS FILE IN ACTIVE CODE.
 *
 * As of Phase 7, the canonical WHO growth reference data is served by the
 * Analytics Service backend:
 *   GET /api/analytics/references/growth/?sex=M&metric=weight&min_age_months=0&max_age_months=228
 *
 * Use `getGrowthReferenceCurve()` from `api/analytics.js` instead.
 *
 * This file is retained as a local fallback reference only.
 * It should NOT be imported by any chart page, component, or module.
 *
 * ─── Original Documentation ────────────────────────────────────────────
 * WHO Growth Reference Data — Sample Dataset (0-60 months only)
 * Source: Based on WHO Child Growth Standards (WHO 2006/2007).
 * This is a representative SAMPLE dataset for demonstration purposes.
 * IMPORTANT: This data is for illustrative purposes only.
 * Clinical decisions must be made by a qualified healthcare professional.
 */

const references = {
  M: {
    weight: [
      { age_months: 0,  p3: 2.5,  p50: 3.3,  p97: 4.3 },
      { age_months: 1,  p3: 3.4,  p50: 4.5,  p97: 5.7 },
      { age_months: 2,  p3: 4.3,  p50: 5.6,  p97: 7.1 },
      { age_months: 3,  p3: 5.0,  p50: 6.4,  p97: 8.0 },
      { age_months: 4,  p3: 5.6,  p50: 7.0,  p97: 8.7 },
      { age_months: 5,  p3: 6.1,  p50: 7.5,  p97: 9.3 },
      { age_months: 6,  p3: 6.4,  p50: 7.9,  p97: 9.8 },
      { age_months: 9,  p3: 7.1,  p50: 8.9,  p97: 11.0 },
      { age_months: 12, p3: 7.7,  p50: 9.6,  p97: 11.9 },
      { age_months: 15, p3: 8.2,  p50: 10.3, p97: 12.8 },
      { age_months: 18, p3: 8.7,  p50: 10.9, p97: 13.7 },
      { age_months: 21, p3: 9.1,  p50: 11.5, p97: 14.5 },
      { age_months: 24, p3: 9.5,  p50: 12.0, p97: 15.3 },
      { age_months: 30, p3: 10.2, p50: 13.0, p97: 16.7 },
      { age_months: 36, p3: 11.0, p50: 14.3, p97: 18.7 },
      { age_months: 42, p3: 11.8, p50: 15.4, p97: 20.3 },
      { age_months: 48, p3: 12.6, p50: 16.3, p97: 21.7 },
      { age_months: 54, p3: 13.3, p50: 17.2, p97: 23.0 },
      { age_months: 60, p3: 14.1, p50: 18.3, p97: 24.7 },
    ],
    height: [
      { age_months: 0,  p3: 46.3, p50: 49.9, p97: 53.4 },
      { age_months: 1,  p3: 50.8, p50: 54.7, p97: 58.6 },
      { age_months: 2,  p3: 54.4, p50: 58.4, p97: 62.4 },
      { age_months: 3,  p3: 57.3, p50: 61.4, p97: 65.5 },
      { age_months: 4,  p3: 59.7, p50: 63.9, p97: 68.0 },
      { age_months: 5,  p3: 61.7, p50: 65.9, p97: 70.1 },
      { age_months: 6,  p3: 63.3, p50: 67.6, p97: 71.9 },
      { age_months: 9,  p3: 67.7, p50: 72.0, p97: 76.3 },
      { age_months: 12, p3: 71.0, p50: 75.7, p97: 80.5 },
      { age_months: 15, p3: 74.1, p50: 79.1, p97: 84.2 },
      { age_months: 18, p3: 76.9, p50: 82.3, p97: 87.7 },
      { age_months: 21, p3: 79.6, p50: 85.1, p97: 90.6 },
      { age_months: 24, p3: 81.7, p50: 87.8, p97: 94.0 },
      { age_months: 30, p3: 86.4, p50: 92.9, p97: 99.5 },
      { age_months: 36, p3: 90.7, p50: 96.1, p97: 101.4 },
      { age_months: 42, p3: 94.9, p50: 100.7, p97: 106.5 },
      { age_months: 48, p3: 98.7, p50: 103.3, p97: 109.7 },
      { age_months: 54, p3: 102.1, p50: 108.2, p97: 114.4 },
      { age_months: 60, p3: 105.3, p50: 110.0, p97: 114.7 },
    ],
    head_circumference: [
      { age_months: 0,  p3: 32.1, p50: 34.5, p97: 36.9 },
      { age_months: 1,  p3: 35.1, p50: 37.3, p97: 39.5 },
      { age_months: 2,  p3: 37.0, p50: 39.1, p97: 41.2 },
      { age_months: 3,  p3: 38.3, p50: 40.5, p97: 42.6 },
      { age_months: 4,  p3: 39.4, p50: 41.6, p97: 43.7 },
      { age_months: 5,  p3: 40.3, p50: 42.6, p97: 44.8 },
      { age_months: 6,  p3: 41.0, p50: 43.3, p97: 45.6 },
      { age_months: 9,  p3: 42.5, p50: 44.9, p97: 47.2 },
      { age_months: 12, p3: 43.6, p50: 46.1, p97: 48.5 },
      { age_months: 15, p3: 44.4, p50: 46.9, p97: 49.4 },
      { age_months: 18, p3: 45.0, p50: 47.6, p97: 50.1 },
      { age_months: 21, p3: 45.5, p50: 48.1, p97: 50.8 },
      { age_months: 24, p3: 46.0, p50: 48.6, p97: 51.3 },
      { age_months: 30, p3: 46.7, p50: 49.4, p97: 52.1 },
      { age_months: 36, p3: 47.2, p50: 50.0, p97: 52.9 },
      { age_months: 42, p3: 47.7, p50: 50.6, p97: 53.4 },
      { age_months: 48, p3: 48.1, p50: 51.0, p97: 53.9 },
      { age_months: 54, p3: 48.4, p50: 51.3, p97: 54.3 },
      { age_months: 60, p3: 48.6, p50: 51.6, p97: 54.5 },
    ],
  },
  F: {
    weight: [
      { age_months: 0,  p3: 2.4,  p50: 3.2,  p97: 4.2 },
      { age_months: 1,  p3: 3.2,  p50: 4.2,  p97: 5.4 },
      { age_months: 2,  p3: 3.9,  p50: 5.1,  p97: 6.6 },
      { age_months: 3,  p3: 4.5,  p50: 5.8,  p97: 7.5 },
      { age_months: 4,  p3: 5.0,  p50: 6.4,  p97: 8.2 },
      { age_months: 5,  p3: 5.4,  p50: 6.9,  p97: 8.8 },
      { age_months: 6,  p3: 5.7,  p50: 7.3,  p97: 9.3 },
      { age_months: 9,  p3: 6.5,  p50: 8.2,  p97: 10.5 },
      { age_months: 12, p3: 7.0,  p50: 8.9,  p97: 11.3 },
      { age_months: 15, p3: 7.6,  p50: 9.6,  p97: 12.3 },
      { age_months: 18, p3: 8.1,  p50: 10.2, p97: 13.2 },
      { age_months: 21, p3: 8.6,  p50: 10.9, p97: 14.1 },
      { age_months: 24, p3: 9.0,  p50: 11.5, p97: 15.0 },
      { age_months: 30, p3: 9.8,  p50: 12.7, p97: 16.9 },
      { age_months: 36, p3: 10.8, p50: 14.1, p97: 18.7 },
      { age_months: 42, p3: 11.6, p50: 15.3, p97: 20.4 },
      { age_months: 48, p3: 12.3, p50: 16.3, p97: 21.9 },
      { age_months: 54, p3: 13.0, p50: 17.3, p97: 23.4 },
      { age_months: 60, p3: 13.7, p50: 18.2, p97: 25.0 },
    ],
    height: [
      { age_months: 0,  p3: 45.6, p50: 49.1, p97: 52.7 },
      { age_months: 1,  p3: 49.8, p50: 53.7, p97: 57.6 },
      { age_months: 2,  p3: 53.0, p50: 57.1, p97: 61.1 },
      { age_months: 3,  p3: 55.6, p50: 59.8, p97: 64.0 },
      { age_months: 4,  p3: 57.8, p50: 62.1, p97: 66.4 },
      { age_months: 5,  p3: 59.6, p50: 64.0, p97: 68.5 },
      { age_months: 6,  p3: 61.2, p50: 65.7, p97: 70.3 },
      { age_months: 9,  p3: 65.6, p50: 70.1, p97: 74.7 },
      { age_months: 12, p3: 69.2, p50: 74.0, p97: 78.9 },
      { age_months: 15, p3: 72.5, p50: 77.5, p97: 82.6 },
      { age_months: 18, p3: 75.3, p50: 80.7, p97: 86.1 },
      { age_months: 21, p3: 78.0, p50: 83.7, p97: 89.4 },
      { age_months: 24, p3: 80.0, p50: 86.4, p97: 92.9 },
      { age_months: 30, p3: 84.6, p50: 91.4, p97: 98.1 },
      { age_months: 36, p3: 89.0, p50: 95.1, p97: 101.2 },
      { age_months: 42, p3: 93.0, p50: 99.4, p97: 105.8 },
      { age_months: 48, p3: 96.8, p50: 103.4, p97: 110.1 },
      { age_months: 54, p3: 100.3, p50: 107.3, p97: 114.2 },
      { age_months: 60, p3: 103.7, p50: 110.0, p97: 116.2 },
    ],
    head_circumference: [
      { age_months: 0,  p3: 31.7, p50: 33.9, p97: 36.1 },
      { age_months: 1,  p3: 34.3, p50: 36.5, p97: 38.7 },
      { age_months: 2,  p3: 36.0, p50: 38.3, p97: 40.5 },
      { age_months: 3,  p3: 37.2, p50: 39.5, p97: 41.8 },
      { age_months: 4,  p3: 38.1, p50: 40.6, p97: 43.0 },
      { age_months: 5,  p3: 38.9, p50: 41.5, p97: 44.0 },
      { age_months: 6,  p3: 39.6, p50: 42.2, p97: 44.8 },
      { age_months: 9,  p3: 41.1, p50: 43.8, p97: 46.5 },
      { age_months: 12, p3: 42.2, p50: 44.9, p97: 47.7 },
      { age_months: 15, p3: 43.0, p50: 45.8, p97: 48.6 },
      { age_months: 18, p3: 43.6, p50: 46.4, p97: 49.2 },
      { age_months: 21, p3: 44.1, p50: 47.0, p97: 49.8 },
      { age_months: 24, p3: 44.6, p50: 47.5, p97: 50.4 },
      { age_months: 30, p3: 45.3, p50: 48.3, p97: 51.3 },
      { age_months: 36, p3: 45.9, p50: 48.9, p97: 51.9 },
      { age_months: 42, p3: 46.3, p50: 49.4, p97: 52.5 },
      { age_months: 48, p3: 46.7, p50: 49.8, p97: 53.0 },
      { age_months: 54, p3: 47.0, p50: 50.2, p97: 53.4 },
      { age_months: 60, p3: 47.2, p50: 50.5, p97: 53.7 },
    ],
  },
};

/**
 * Get growth reference percentiles (P3/P50/P97) for a given sex and metric.
 * Interpolates between known age points for smooth display.
 *
 * @param {'M'|'F'} sex
 * @param {'weight'|'height'|'head_circumference'} metric
 * @param {number} maxAgeMonths - Upper age limit (default 60)
 * @returns {Array<{age_months, p3, p50, p97}>}
 */
export function getGrowthReferences(sex, metric, maxAgeMonths = 60) {
  const sexData = references[sex] || references['M'];
  const metricData = sexData[metric] || [];
  return metricData.filter(d => d.age_months <= maxAgeMonths);
}

/**
 * Get reference values for a specific age via linear interpolation.
 * @param {'M'|'F'} sex
 * @param {'weight'|'height'|'head_circumference'} metric
 * @param {number} ageMonths
 * @returns {{p3, p50, p97}|null}
 */
export function getReferenceAtAge(sex, metric, ageMonths) {
  const data = getGrowthReferences(sex, metric, 60);
  if (!data.length) return null;

  // Find bracketing points
  let lower = data[0];
  let upper = data[data.length - 1];
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].age_months <= ageMonths && data[i + 1].age_months >= ageMonths) {
      lower = data[i];
      upper = data[i + 1];
      break;
    }
  }

  if (lower.age_months === upper.age_months) return { p3: lower.p3, p50: lower.p50, p97: lower.p97 };

  const t = (ageMonths - lower.age_months) / (upper.age_months - lower.age_months);
  return {
    p3:  lower.p3  + t * (upper.p3  - lower.p3),
    p50: lower.p50 + t * (upper.p50 - lower.p50),
    p97: lower.p97 + t * (upper.p97 - lower.p97),
  };
}

export default references;
