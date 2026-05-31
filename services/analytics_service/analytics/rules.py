"""
Rule-based analytics engine for ChildCare+.

This module applies a set of transparent, configurable rules to a child's
measurement data and returns a list of alert dictionaries.

IMPORTANT DISCLAIMERS:
- These are RULE-BASED insights — not medical diagnosis.
- BMI rules now use WHO age/sex-dependent P3/P97 percentiles (Phase 7).
- Every warning/danger alert includes a recommendation to consult a pediatrician.
- This system is a supportive awareness tool, not a replacement for professional care.
"""
from decimal import Decimal
from .oms_references import get_growth_reference, is_metric_available


# ── Growth change thresholds ──────────────────────────────────────────────────
# Sudden changes between two consecutive measurements that may warrant attention.
SUDDEN_WEIGHT_CHANGE_KG    = Decimal('1.5')   # kg — large change between two records
SUDDEN_HEIGHT_CHANGE_CM    = Decimal('5.0')   # cm — large change between two records
SUDDEN_HEAD_CHANGE_CM      = Decimal('2.0')   # cm — large head circumference change

PEDIATRICIAN_RECOMMENDATION = (
    "Consultez votre pédiatre pour une évaluation professionnelle. "
    "ChildCare+ est un outil de suivi indicatif, non un outil de diagnostic médical."
)

OMS_DISCLAIMER = (
    "Ceci ne constitue pas un diagnostic médical. "
    "Ces valeurs sont en dehors de la zone de référence OMS à titre indicatif. "
    + PEDIATRICIAN_RECOMMENDATION
)


def _to_decimal(value):
    """Convert a numeric value or string to Decimal, or return None."""
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None


def analyze_measurement(current: dict, previous: dict | None = None) -> list[dict]:
    """
    Apply rule-based logic to a measurement data dict.

    Args:
        current:  dict with keys matching Measurement fields (child_id, parent_id,
                  measurement_id, weight_kg, height_cm, bmi, head_circumference_cm,
                  age_at_recording_months, sex, etc.)
        previous: dict of the previous measurement for this child, or None.

    Returns:
        List of alert dicts. Each dict contains:
          child_id, parent_id, measurement_id, alert_type, severity,
          title, message, recommendation.
        Returns an empty list if no rules trigger.
    """
    alerts = []

    child_id       = current.get('child_id')
    parent_id      = current.get('parent_id')
    measurement_id = current.get('measurement_id')

    weight = _to_decimal(current.get('weight_kg'))
    height = _to_decimal(current.get('height_cm'))
    bmi    = _to_decimal(current.get('bmi'))
    head   = _to_decimal(current.get('head_circumference_cm'))
    age_months = current.get('age_at_recording_months')
    sex    = current.get('sex') or current.get('child_sex') or 'M'

    def make_alert(alert_type, severity, title, message, recommendation=''):
        return {
            'child_id':       child_id,
            'parent_id':      parent_id,
            'measurement_id': measurement_id,
            'alert_type':     alert_type,
            'severity':       severity,
            'title':          title,
            'message':        message,
            'recommendation': recommendation or (PEDIATRICIAN_RECOMMENDATION if severity in ('warning', 'danger') else ''),
        }

    # ── Rule 1–2: BMI via WHO P3/P97 (replaces fixed thresholds) ─────────────
    # Only triggered when age + BMI reference is available.
    if bmi is not None and age_months is not None:
        try:
            age_int = int(age_months)
        except (TypeError, ValueError):
            age_int = None

        if age_int is not None and is_metric_available(sex, 'bmi', age_int):
            ref = get_growth_reference(sex, 'bmi', age_int)
            if ref.get('available'):
                if bmi < ref['p3']:
                    alerts.append(make_alert(
                        alert_type='bmi',
                        severity='warning',
                        title='IMC en dessous de la zone OMS (P3)',
                        message=(
                            f"L'IMC calculé ({bmi}) est inférieur au 3e percentile OMS "
                            f"({ref['p3']:.1f}) pour un enfant de {age_int} mois ({sex}). "
                            "Valeur hors de la zone de référence OMS."
                        ),
                        recommendation=OMS_DISCLAIMER,
                    ))
                elif bmi > ref['p97']:
                    alerts.append(make_alert(
                        alert_type='bmi',
                        severity='warning',
                        title='IMC au-dessus de la zone OMS (P97)',
                        message=(
                            f"L'IMC calculé ({bmi}) est supérieur au 97e percentile OMS "
                            f"({ref['p97']:.1f}) pour un enfant de {age_int} mois ({sex}). "
                            "Valeur hors de la zone de référence OMS."
                        ),
                        recommendation=OMS_DISCLAIMER,
                    ))

    # ── Rule 3: Poids manquant ───────────────────────────────────────────────
    if weight is None:
        alerts.append(make_alert(
            alert_type='missing_data',
            severity='info',
            title='Poids non renseigné',
            message="Le poids n'a pas été saisi pour cette mesure. L'IMC ne peut pas être calculé.",
            recommendation='',
        ))

    # ── Rule 4: Taille manquante ─────────────────────────────────────────────
    if height is None:
        alerts.append(make_alert(
            alert_type='missing_data',
            severity='info',
            title='Taille non renseignée',
            message="La taille n'a pas été saisie pour cette mesure. L'IMC ne peut pas être calculé.",
            recommendation='',
        ))

    # ── Rules 5–7: Changements soudains (nécessite mesure précédente) ────────
    if previous:
        prev_weight = _to_decimal(previous.get('weight_kg'))
        prev_height = _to_decimal(previous.get('height_cm'))
        prev_head   = _to_decimal(previous.get('head_circumference_cm'))

        # Rule 5: Changement de poids soudain
        if weight is not None and prev_weight is not None:
            delta = abs(weight - prev_weight)
            if delta >= SUDDEN_WEIGHT_CHANGE_KG:
                alerts.append(make_alert(
                    alert_type='growth',
                    severity='warning',
                    title='Variation de poids importante',
                    message=(
                        f"Le poids a varié de {delta:.2f} kg par rapport à la mesure précédente "
                        f"({prev_weight} kg → {weight} kg). "
                        "Une variation aussi importante mérite un suivi."
                    ),
                ))

        # Rule 6: Changement de taille soudain
        if height is not None and prev_height is not None:
            delta = abs(height - prev_height)
            if delta >= SUDDEN_HEIGHT_CHANGE_CM:
                alerts.append(make_alert(
                    alert_type='growth',
                    severity='warning',
                    title='Variation de taille importante',
                    message=(
                        f"La taille a varié de {delta:.2f} cm par rapport à la mesure précédente "
                        f"({prev_height} cm → {height} cm). "
                        "Une variation aussi importante mérite un suivi."
                    ),
                ))

        # Rule 7: Changement du périmètre crânien soudain
        if head is not None and prev_head is not None:
            delta = abs(head - prev_head)
            if delta >= SUDDEN_HEAD_CHANGE_CM:
                alerts.append(make_alert(
                    alert_type='growth',
                    severity='warning',
                    title='Variation du périmètre crânien',
                    message=(
                        f"Le périmètre crânien a varié de {delta:.2f} cm par rapport à la mesure précédente "
                        f"({prev_head} cm → {head} cm)."
                    ),
                ))

    # ── Rules 8–10: OMS P3/P97 comparison (weight, height, head) ─────────────
    # Only applied when age_at_recording_months is available AND reference exists.
    # No alert is generated when the reference is unavailable for the age.

    if age_months is not None:
        try:
            age_int = int(age_months)
        except (TypeError, ValueError):
            age_int = None

        if age_int is not None:

            # Rule 8: Poids hors zone OMS
            if weight is not None and is_metric_available(sex, 'weight', age_int):
                ref = get_growth_reference(sex, 'weight', age_int)
                if ref.get('available'):
                    if weight < ref['p3']:
                        alerts.append(make_alert(
                            alert_type='growth',
                            severity='warning',
                            title='Poids en dessous de la zone OMS (P3)',
                            message=(
                                f"Le poids ({weight} kg) est inférieur au 3e percentile OMS "
                                f"({ref['p3']:.1f} kg) pour un enfant de {age_int} mois ({sex}). "
                                "Valeur hors de la zone de référence OMS."
                            ),
                            recommendation=OMS_DISCLAIMER,
                        ))
                    elif weight > ref['p97']:
                        alerts.append(make_alert(
                            alert_type='growth',
                            severity='warning',
                            title='Poids au-dessus de la zone OMS (P97)',
                            message=(
                                f"Le poids ({weight} kg) est supérieur au 97e percentile OMS "
                                f"({ref['p97']:.1f} kg) pour un enfant de {age_int} mois ({sex}). "
                                "Valeur hors de la zone de référence OMS."
                            ),
                            recommendation=OMS_DISCLAIMER,
                        ))

            # Rule 9: Taille hors zone OMS
            if height is not None and is_metric_available(sex, 'height', age_int):
                ref = get_growth_reference(sex, 'height', age_int)
                if ref.get('available'):
                    if height < ref['p3']:
                        alerts.append(make_alert(
                            alert_type='growth',
                            severity='warning',
                            title='Taille en dessous de la zone OMS (P3)',
                            message=(
                                f"La taille ({height} cm) est inférieure au 3e percentile OMS "
                                f"({ref['p3']:.1f} cm) pour un enfant de {age_int} mois ({sex}). "
                                "Valeur hors de la zone de référence OMS."
                            ),
                            recommendation=OMS_DISCLAIMER,
                        ))
                    elif height > ref['p97']:
                        alerts.append(make_alert(
                            alert_type='growth',
                            severity='warning',
                            title='Taille au-dessus de la zone OMS (P97)',
                            message=(
                                f"La taille ({height} cm) est supérieure au 97e percentile OMS "
                                f"({ref['p97']:.1f} cm) pour un enfant de {age_int} mois ({sex}). "
                                "Valeur hors de la zone de référence OMS."
                            ),
                            recommendation=OMS_DISCLAIMER,
                        ))

            # Rule 10: Périmètre crânien hors zone OMS
            if head is not None and is_metric_available(sex, 'head_circumference', age_int):
                ref = get_growth_reference(sex, 'head_circumference', age_int)
                if ref.get('available'):
                    if head < ref['p3']:
                        alerts.append(make_alert(
                            alert_type='growth',
                            severity='warning',
                            title='Périmètre crânien en dessous de la zone OMS (P3)',
                            message=(
                                f"Le périmètre crânien ({head} cm) est inférieur au 3e percentile OMS "
                                f"({ref['p3']:.1f} cm) pour un enfant de {age_int} mois ({sex}). "
                                "Valeur hors de la zone de référence OMS."
                            ),
                            recommendation=OMS_DISCLAIMER,
                        ))
                    elif head > ref['p97']:
                        alerts.append(make_alert(
                            alert_type='growth',
                            severity='warning',
                            title='Périmètre crânien au-dessus de la zone OMS (P97)',
                            message=(
                                f"Le périmètre crânien ({head} cm) est supérieur au 97e percentile OMS "
                                f"({ref['p97']:.1f} cm) pour un enfant de {age_int} mois ({sex}). "
                                "Valeur hors de la zone de référence OMS."
                            ),
                            recommendation=OMS_DISCLAIMER,
                        ))

    return alerts
