"""
WHO Growth Reference Module — Canonical source for ChildCare+ Analytics.

Loads data from data/who/growth_references.json and provides:
  - get_growth_reference(sex, metric, age_months) → single point lookup with interpolation
  - get_growth_curve(sex, metric, min_age_months, max_age_months) → array of points
  - is_metric_available(sex, metric, age_months) → boolean

IMPORTANT:
  - Weight-for-age: available 0–120 months only.
  - Height-for-age: available 0–228 months.
  - Head circumference: available 0–60 months only.
  - BMI-for-age: available 0–228 months.
  - Comparisons are informational percentile references, NOT medical diagnosis.
"""
import json
import os
from decimal import Decimal
from functools import lru_cache

# ── Load JSON data at module level ────────────────────────────────────────────

_DATA_DIR = os.path.join(os.path.dirname(__file__), 'data', 'who')
_DATA_FILE = os.path.join(_DATA_DIR, 'growth_references.json')


@lru_cache(maxsize=1)
def _load_data() -> dict:
    """Load and cache the WHO growth reference JSON."""
    with open(_DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


# ── Age limits per metric ─────────────────────────────────────────────────────

METRIC_AGE_LIMITS = {
    'weight':             {'min': 0, 'max': 120},
    'height':             {'min': 0, 'max': 228},
    'head_circumference': {'min': 0, 'max': 60},
    'bmi':                {'min': 0, 'max': 228},
}

UNAVAILABLE_REASONS = {
    'weight': "La référence poids-pour-âge OMS n'est pas disponible après 120 mois (10 ans).",
    'head_circumference': "La référence périmètre crânien OMS n'est pas disponible après 60 mois (5 ans).",
    '_default': "Aucune donnée de référence OMS disponible pour cet indicateur ou cet âge.",
}


def _normalize_sex(sex) -> str:
    """Normalize sex to 'M' or 'F'. Defaults to 'M'."""
    if not sex:
        return 'M'
    return 'F' if str(sex).upper() in ('F', 'FEMALE', 'FILLE') else 'M'


def _d(v) -> Decimal:
    return Decimal(str(v))


def _get_metric_data(sex: str, metric: str) -> list[dict]:
    """Return the list of reference points for a given sex and metric."""
    data = _load_data()
    sex_norm = _normalize_sex(sex)
    return data.get(sex_norm, {}).get(metric, [])


def _interpolate(lower: dict, upper: dict, age_months: int) -> dict:
    """Linearly interpolate between two reference points."""
    if lower['age_months'] == upper['age_months']:
        return {
            'p3': _d(lower['p3']),
            'p50': _d(lower['p50']),
            'p97': _d(lower['p97']),
        }

    t = _d(age_months - lower['age_months']) / _d(upper['age_months'] - lower['age_months'])
    return {
        'p3':  _d(lower['p3'])  + t * (_d(upper['p3'])  - _d(lower['p3'])),
        'p50': _d(lower['p50']) + t * (_d(upper['p50']) - _d(lower['p50'])),
        'p97': _d(lower['p97']) + t * (_d(upper['p97']) - _d(lower['p97'])),
    }


# ── Public API ────────────────────────────────────────────────────────────────

def is_metric_available(sex: str, metric: str, age_months: int) -> bool:
    """
    Check if WHO reference data is available for a given sex, metric, and age.

    Returns False if:
      - age_months is outside the known limits for this metric
      - metric is unknown
      - no data points exist
    """
    if age_months is None or age_months < 0:
        return False
    limits = METRIC_AGE_LIMITS.get(metric)
    if not limits:
        return False
    if age_months > limits['max']:
        return False
    data = _get_metric_data(sex, metric)
    return len(data) > 0


def get_growth_reference(sex: str, metric: str, age_months: int) -> dict:
    """
    Return WHO reference percentiles for a given sex, metric, and age.

    Returns a dict with structure:
      Available:
        {'available': True, 'sex': 'M', 'metric': 'weight', 'age_months': 24,
         'p3': Decimal(...), 'p50': Decimal(...), 'p97': Decimal(...),
         'source': 'WHO Child Growth Standards'}
      Unavailable:
        {'available': False, 'sex': 'M', 'metric': 'weight', 'age_months': 144,
         'reason': '...'}

    Uses linear interpolation between known age points.
    """
    sex_norm = _normalize_sex(sex)

    if age_months is None or age_months < 0:
        return {
            'available': False,
            'sex': sex_norm,
            'metric': metric,
            'age_months': age_months,
            'reason': "Âge invalide.",
        }

    if not is_metric_available(sex, metric, age_months):
        reason = UNAVAILABLE_REASONS.get(metric, UNAVAILABLE_REASONS['_default'])
        return {
            'available': False,
            'sex': sex_norm,
            'metric': metric,
            'age_months': age_months,
            'reason': reason,
        }

    data = _get_metric_data(sex, metric)
    if not data:
        return {
            'available': False,
            'sex': sex_norm,
            'metric': metric,
            'age_months': age_months,
            'reason': UNAVAILABLE_REASONS['_default'],
        }

    # Find bracketing points
    lower = data[0]
    upper = data[-1]

    # Clamp to data range
    if age_months <= data[0]['age_months']:
        lower = upper = data[0]
    elif age_months >= data[-1]['age_months']:
        lower = upper = data[-1]
    else:
        for i in range(len(data) - 1):
            if data[i]['age_months'] <= age_months <= data[i + 1]['age_months']:
                lower = data[i]
                upper = data[i + 1]
                break

    interpolated = _interpolate(lower, upper, age_months)
    source = lower.get('source', 'WHO')

    return {
        'available': True,
        'sex': sex_norm,
        'metric': metric,
        'age_months': age_months,
        'p3': interpolated['p3'],
        'p50': interpolated['p50'],
        'p97': interpolated['p97'],
        'source': source,
    }


def get_growth_curve(sex: str, metric: str, min_age_months: int = 0, max_age_months: int = 228) -> dict:
    """
    Return the WHO reference curve (array of P3/P50/P97 points) for a metric/sex,
    filtered by age range.

    Returns:
      Available:
        {'available': True, 'sex': 'M', 'metric': 'weight',
         'source': '...', 'points': [{age_months, p3, p50, p97}, ...]}
      Unavailable:
        {'available': False, 'sex': 'M', 'metric': 'weight',
         'reason': '...'}
    """
    sex_norm = _normalize_sex(sex)
    limits = METRIC_AGE_LIMITS.get(metric)

    if not limits:
        return {
            'available': False,
            'sex': sex_norm,
            'metric': metric,
            'reason': f"Indicateur inconnu : {metric}",
        }

    data = _get_metric_data(sex, metric)
    if not data:
        return {
            'available': False,
            'sex': sex_norm,
            'metric': metric,
            'reason': UNAVAILABLE_REASONS.get(metric, UNAVAILABLE_REASONS['_default']),
        }

    # Clamp range to metric limits
    effective_min = max(min_age_months, limits['min'])
    effective_max = min(max_age_months, limits['max'])

    if effective_min > effective_max:
        reason = UNAVAILABLE_REASONS.get(metric, UNAVAILABLE_REASONS['_default'])
        return {
            'available': False,
            'sex': sex_norm,
            'metric': metric,
            'reason': reason,
        }

    points = [
        {
            'age_months': pt['age_months'],
            'p3': float(pt['p3']),
            'p50': float(pt['p50']),
            'p97': float(pt['p97']),
        }
        for pt in data
        if effective_min <= pt['age_months'] <= effective_max
    ]

    source = data[0].get('source', 'WHO') if data else 'WHO'

    return {
        'available': True,
        'sex': sex_norm,
        'metric': metric,
        'source': source,
        'points': points,
    }


# ── Backward compatibility alias ─────────────────────────────────────────────
# Used by rules.py (Phase 6.1 interface).

def get_oms_reference(sex: str, metric: str, age_months: int) -> dict | None:
    """
    Backward-compatible wrapper. Returns {'p3': Decimal, 'p50': Decimal, 'p97': Decimal}
    or None if unavailable.
    """
    ref = get_growth_reference(sex, metric, age_months)
    if ref.get('available'):
        return {'p3': ref['p3'], 'p50': ref['p50'], 'p97': ref['p97']}
    return None
