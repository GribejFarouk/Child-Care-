"""
Explainable Decision Support Engine — ChildCare+

This module computes a transparent, rule-based risk score and generates
personalized recommendations for a child based on:
  - WHO percentile position (from Phase 7 canonical references)
  - Sudden measurement changes
  - Missing data
  - BMI zone
  - Recent alert history

IMPORTANT: This is a "système d'aide à la décision basé sur des règles
explicables". It is NOT a clinical diagnostic tool, NOT a trained ML model,
and NOT a replacement for professional medical advice.

All outputs include a medical disclaimer.
"""
from decimal import Decimal
from .oms_references import get_growth_reference, is_metric_available


# ── Score weight matrix (configurable) ────────────────────────────────────────

FACTOR_WEIGHTS = {
    'weight_percentile':    20,
    'height_percentile':    15,
    'head_percentile':      10,
    'bmi_zone':             15,
    'sudden_weight_change': 15,
    'sudden_height_change':  5,
    'missing_data':          5,
    'repeated_alerts':      15,
}

# Risk level thresholds
RISK_THRESHOLDS = [
    (15,  'low',      'Faible'),
    (35,  'moderate', 'Modéré'),
    (60,  'elevated', 'Élevé'),
    (100, 'high',     'Risque élevé'),
]

# Sudden change thresholds (must match rules.py)
SUDDEN_WEIGHT_THRESHOLD = Decimal('1.5')
SUDDEN_HEIGHT_THRESHOLD = Decimal('5.0')

DISCLAIMER = (
    "Ceci est un outil d'aide à la décision basé sur des règles explicables. "
    "Il ne constitue pas un diagnostic médical. Les résultats sont indicatifs "
    "et doivent être interprétés par un professionnel de santé qualifié. "
    "Consultez votre pédiatre pour toute préoccupation concernant la santé "
    "de votre enfant."
)


def _d(v):
    """Convert to Decimal, or return None."""
    if v is None:
        return None
    try:
        return Decimal(str(v))
    except Exception:
        return None


def _risk_level(score):
    """Map numeric score to risk level and label."""
    for threshold, level, label in RISK_THRESHOLDS:
        if score <= threshold:
            return level, label
    return 'high', 'Risque élevé'


# ── Factor computation ────────────────────────────────────────────────────────

def _compute_percentile_factor(name, label, value, sex, metric, age_months, max_points):
    """Compute a single percentile factor (weight, height, head, bmi)."""
    if value is None or age_months is None:
        return {
            'name': name, 'label': label,
            'status': 'skipped',
            'detail': 'Donnée ou âge non disponible.',
            'points': 0,
        }

    if not is_metric_available(sex, metric, int(age_months)):
        return {
            'name': name, 'label': label,
            'status': 'skipped',
            'detail': f'Référence OMS non disponible pour {int(age_months)} mois.',
            'points': 0,
        }

    ref = get_growth_reference(sex, metric, int(age_months))
    if not ref.get('available'):
        return {
            'name': name, 'label': label,
            'status': 'skipped',
            'detail': ref.get('reason', 'Référence indisponible.'),
            'points': 0,
        }

    val = _d(value)
    p3 = ref['p3']
    p50 = ref['p50']
    p97 = ref['p97']

    if val < p3:
        return {
            'name': name, 'label': label,
            'status': 'warning',
            'detail': f'Mesure enregistrée : {val}, en dessous du seuil bas P3 OMS pour cet âge/sexe ({p3:.1f}).',
            'points': max_points,
        }
    elif val > p97:
        return {
            'name': name, 'label': label,
            'status': 'warning',
            'detail': f'Mesure enregistrée : {val}, au-dessus du seuil haut P97 OMS pour cet âge/sexe ({p97:.1f}).',
            'points': max_points,
        }
    else:
        return {
            'name': name, 'label': label,
            'status': 'normal',
            'detail': f'Valeur ({val}) dans la zone P3–P97 OMS.',
            'points': 0,
        }


def _compute_sudden_change_factor(name, label, current_val, prev_val, threshold, max_points, unit):
    """Compute a sudden-change factor."""
    cur = _d(current_val)
    prev = _d(prev_val)
    if cur is None or prev is None:
        return {
            'name': name, 'label': label,
            'status': 'skipped',
            'detail': 'Pas de mesure précédente pour comparaison.',
            'points': 0,
        }
    delta = abs(cur - prev)
    if delta >= threshold:
        sign = '+' if cur > prev else '-'
        return {
            'name': name, 'label': label,
            'status': 'warning',
            'detail': f'Variation de {sign}{delta:.1f} {unit} depuis la dernière mesure.',
            'points': max_points,
        }
    return {
        'name': name, 'label': label,
        'status': 'normal',
        'detail': f'Variation de {delta:.1f} {unit} (dans les limites normales).',
        'points': 0,
    }


def _compute_missing_data_factor(current):
    """Compute missing data factor."""
    missing = []
    if current.get('weight_kg') is None:
        missing.append('poids')
    if current.get('height_cm') is None:
        missing.append('taille')
    if current.get('head_circumference_cm') is None:
        age = current.get('age_at_recording_months')
        if age is not None and int(age) <= 60:
            missing.append('périmètre crânien')

    if missing:
        return {
            'name': 'missing_data',
            'label': 'Données manquantes',
            'status': 'info',
            'detail': f'Non renseigné : {", ".join(missing)}.',
            'points': FACTOR_WEIGHTS['missing_data'],
        }
    return {
        'name': 'missing_data',
        'label': 'Données manquantes',
        'status': 'normal',
        'detail': 'Toutes les données principales sont renseignées.',
        'points': 0,
    }


def _compute_repeated_alerts_factor(alerts_history):
    """Compute repeated alerts factor from recent alert history."""
    if not alerts_history:
        return {
            'name': 'repeated_alerts',
            'label': 'Alertes récentes',
            'status': 'normal',
            'detail': '0 alertes warning/danger récentes.',
            'points': 0,
        }

    # Count warning/danger alerts (all from history — caller filters to 90 days)
    serious = [a for a in alerts_history
               if a.get('severity') in ('warning', 'danger')]
    count = len(serious)

    if count >= 5:
        return {
            'name': 'repeated_alerts',
            'label': 'Alertes récentes',
            'status': 'warning',
            'detail': f'{count} alertes warning/danger récentes. Suivi renforcé conseillé.',
            'points': FACTOR_WEIGHTS['repeated_alerts'],
        }
    elif count >= 3:
        return {
            'name': 'repeated_alerts',
            'label': 'Alertes récentes',
            'status': 'warning',
            'detail': f'{count} alertes warning/danger récentes.',
            'points': int(FACTOR_WEIGHTS['repeated_alerts'] * 0.6),
        }
    else:
        return {
            'name': 'repeated_alerts',
            'label': 'Alertes récentes',
            'status': 'normal',
            'detail': f'{count} alerte(s) warning/danger récente(s).',
            'points': 0,
        }


# ── Main scoring function ────────────────────────────────────────────────────

def compute_risk_score(child_context):
    """
    Compute a transparent risk score for a child based on measurement context.

    Args:
        child_context (dict):
            child_id:               UUID string
            sex:                    'M' | 'F'
            age_at_recording_months: int | None
            current_measurement:    { weight_kg, height_cm, bmi, head_circumference_cm }
            previous_measurement:   { weight_kg, height_cm, ... } | None
            alerts_history:         [ { alert_type, severity, created_at } ]  # recent

    Returns:
        dict: {
            score: int (0-100),
            risk_level: str,
            risk_label: str,
            factors: [ { name, label, status, detail, points } ],
            disclaimer: str,
        }
    """
    current = child_context.get('current_measurement', {})
    previous = child_context.get('previous_measurement')
    sex = child_context.get('sex', 'M')
    age = child_context.get('age_at_recording_months')
    alerts_history = child_context.get('alerts_history', [])

    factors = []

    # 1. Percentile factors
    factors.append(_compute_percentile_factor(
        'weight_percentile', 'Position percentile poids',
        current.get('weight_kg'), sex, 'weight', age,
        FACTOR_WEIGHTS['weight_percentile'],
    ))
    factors.append(_compute_percentile_factor(
        'height_percentile', 'Position percentile taille',
        current.get('height_cm'), sex, 'height', age,
        FACTOR_WEIGHTS['height_percentile'],
    ))
    factors.append(_compute_percentile_factor(
        'head_percentile', 'Position percentile périmètre crânien',
        current.get('head_circumference_cm'), sex, 'head_circumference', age,
        FACTOR_WEIGHTS['head_percentile'],
    ))
    factors.append(_compute_percentile_factor(
        'bmi_zone', 'Zone IMC',
        current.get('bmi'), sex, 'bmi', age,
        FACTOR_WEIGHTS['bmi_zone'],
    ))

    # 2. Sudden change factors
    prev = previous or {}
    factors.append(_compute_sudden_change_factor(
        'sudden_weight_change', 'Variation de poids soudaine',
        current.get('weight_kg'), prev.get('weight_kg'),
        SUDDEN_WEIGHT_THRESHOLD, FACTOR_WEIGHTS['sudden_weight_change'], 'kg',
    ))
    factors.append(_compute_sudden_change_factor(
        'sudden_height_change', 'Variation de taille soudaine',
        current.get('height_cm'), prev.get('height_cm'),
        SUDDEN_HEIGHT_THRESHOLD, FACTOR_WEIGHTS['sudden_height_change'], 'cm',
    ))

    # 3. Missing data
    factors.append(_compute_missing_data_factor(current))

    # 4. Repeated alerts
    factors.append(_compute_repeated_alerts_factor(alerts_history))

    # Compute total score
    total = sum(f['points'] for f in factors)
    total = min(total, 100)
    risk_level, risk_label = _risk_level(total)

    return {
        'score': total,
        'risk_level': risk_level,
        'risk_label': risk_label,
        'factors': factors,
        'disclaimer': DISCLAIMER,
    }


# ── Recommendation generation ────────────────────────────────────────────────

def generate_recommendations(score_result, child_context):
    """
    Generate personalized recommendations based on risk score factors.

    Each recommendation includes:
      - category, title, message, priority
      - why: plain-language explanation (explainability)

    Returns: list of recommendation dicts.
    """
    recommendations = []
    factors = {f['name']: f for f in score_result['factors']}
    risk_level = score_result['risk_level']

    # ── Nutrition ──
    weight_f = factors.get('weight_percentile', {})
    bmi_f = factors.get('bmi_zone', {})

    if weight_f.get('status') == 'warning' or bmi_f.get('status') == 'warning':
        # Determine direction
        is_above = any('au-dessus' in f.get('detail', '').lower() or 'p97' in f.get('detail', '').lower()
                       for f in [weight_f, bmi_f] if f.get('status') == 'warning')
        is_below = any('en dessous' in f.get('detail', '').lower() or 'p3' in f.get('detail', '').lower()
                       for f in [weight_f, bmi_f] if f.get('status') == 'warning')

        if is_above:
            recommendations.append({
                'category': 'nutrition',
                'title': 'Suivi nutritionnel conseillé',
                'message': (
                    "Les indicateurs de poids ou d'IMC sont au-dessus des seuils OMS. "
                    "Un suivi de l'alimentation et de l'activité physique est conseillé."
                ),
                'priority': 'high',
                'why': _build_why([weight_f, bmi_f], 'warning'),
            })
        if is_below:
            recommendations.append({
                'category': 'nutrition',
                'title': 'Surveillance de la prise de poids',
                'message': (
                    "Les indicateurs de poids ou d'IMC sont en dessous des seuils OMS. "
                    "Vérifiez l'alimentation et consultez si cette tendance se poursuit."
                ),
                'priority': 'high',
                'why': _build_why([weight_f, bmi_f], 'warning'),
            })

    # ── Follow-up (sudden change) ──
    sw = factors.get('sudden_weight_change', {})
    sh = factors.get('sudden_height_change', {})

    if sw.get('status') == 'warning' or sh.get('status') == 'warning':
        recommendations.append({
            'category': 'follow_up',
            'title': 'Mesure de contrôle recommandée',
            'message': (
                "Une variation importante a été détectée entre deux mesures consécutives. "
                "Il est conseillé de reprendre les mesures pour confirmer les valeurs."
            ),
            'priority': 'medium',
            'why': _build_why([sw, sh], 'warning'),
        })

    # ── Measurement verification (missing data) ──
    md = factors.get('missing_data', {})
    if md.get('status') == 'info':
        recommendations.append({
            'category': 'measurement_verification',
            'title': 'Compléter les données manquantes',
            'message': (
                "Certaines mesures n'ont pas été renseignées. "
                "Des données complètes permettent une analyse plus précise."
            ),
            'priority': 'low',
            'why': md.get('detail', ''),
        })

    # ── Doctor consultation (elevated/high score) ──
    if risk_level in ('elevated', 'high'):
        warning_count = sum(1 for f in score_result['factors'] if f['status'] == 'warning')
        if warning_count >= 2:
            recommendations.append({
                'category': 'doctor_consultation',
                'title': 'Consultation pédiatrique recommandée',
                'message': (
                    "Plusieurs indicateurs sont en dehors des zones de référence. "
                    "Une consultation avec votre pédiatre est fortement recommandée."
                ),
                'priority': 'high',
                'why': (
                    f'{warning_count} facteur(s) en zone d\'alerte ont été identifiés. '
                    f'Niveau de risque global : {score_result["risk_label"]}.'
                ),
            })

    # ── Appointment (repeated alerts) ──
    ra = factors.get('repeated_alerts', {})
    if ra.get('status') == 'warning':
        recommendations.append({
            'category': 'appointment',
            'title': 'Rendez-vous de suivi conseillé',
            'message': (
                "Plusieurs alertes récentes ont été générées pour cet enfant. "
                "Un rendez-vous de suivi permettrait de faire le point."
            ),
            'priority': 'medium',
            'why': ra.get('detail', ''),
        })

    # ── Normal case ──
    if not recommendations and risk_level == 'low':
        recommendations.append({
            'category': 'follow_up',
            'title': 'Continuez les mesures régulières',
            'message': (
                "Les indicateurs de croissance sont dans les zones de référence OMS. "
                "Continuez à effectuer des mesures régulières pour un suivi optimal."
            ),
            'priority': 'low',
            'why': 'Tous les indicateurs analysés sont dans les limites normales.',
        })

    return recommendations


def _build_why(factors_list, target_status):
    """Build a plain-language 'why' from multiple factors."""
    parts = []
    for f in factors_list:
        if f.get('status') == target_status:
            parts.append(f.get('detail', ''))
    return ' '.join(parts) if parts else ''


# ── Clinical Findings generation ─────────────────────────────────────────────

def generate_clinical_findings(score_result, child_context):
    """
    Generate deterministic ClinicalFinding dicts from factors.
    Returns a list of dicts matching the ClinicalFinding model structure.
    """
    findings = []
    factors = {f['name']: f for f in score_result['factors']}
    sex = child_context.get('sex', 'M')
    age = child_context.get('age_at_recording_months')
    current = child_context.get('current_measurement', {})

    def _get_evidence(metric):
        ev = {'value': current.get(metric), 'sex': sex, 'age_months': age, 'reference_standard': 'WHO'}
        if age is not None and current.get(metric) is not None:
            ref = get_growth_reference(sex, metric, int(age))
            if ref.get('available'):
                ev['p3'] = float(ref['p3'])
                ev['p50'] = float(ref['p50'])
                ev['p97'] = float(ref['p97'])
        return ev

    # BMI
    bmi_f = factors.get('bmi_zone', {})
    if bmi_f.get('status') == 'warning':
        if 'en dessous' in bmi_f.get('detail', '').lower():
            if age is not None and age < 24:
                # Limitation for infants
                explanation = "L'IMC mesuré est inférieur aux références utilisées pour l'âge et le sexe de votre enfant. Pour les enfants de moins de 2 ans, l'IMC seul n'est pas suffisant pour confirmer un diagnostic nutritionnel."
                possible = "Cela peut correspondre à une insuffisance pondérale potentielle ou à une mesure incorrecte."
            else:
                explanation = "L'IMC mesuré est inférieur aux références utilisées pour l'âge et le sexe de votre enfant."
                possible = "Cela suggère une insuffisance pondérale ou une erreur de mesure."
                
            findings.append({
                'finding_code': 'bmi_below_reference',
                'metric': 'bmi',
                'severity': 'warning',
                'child_friendly_title': "IMC inférieur à la zone attendue",
                'parent_explanation': explanation,
                'possible_meaning': possible,
                'recommended_actions': [
                    "Vérifier le poids et la taille saisis.",
                    "Demander conseil à un pédiatre pour évaluer la croissance et l'alimentation."
                ],
                'evidence': _get_evidence('bmi'),
                'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
            })
        elif 'au-dessus' in bmi_f.get('detail', '').lower():
            findings.append({
                'finding_code': 'bmi_above_reference',
                'metric': 'bmi',
                'severity': 'warning',
                'child_friendly_title': "IMC supérieur à la zone de référence",
                'parent_explanation': "L'IMC mesuré est supérieur aux références utilisées pour l'âge et le sexe de votre enfant.",
                'possible_meaning': "Cela peut correspondre à un surpoids potentiel ou à une mesure incorrecte.",
                'recommended_actions': [
                    "Vérifier le poids et la taille saisis.",
                    "Demander conseil à un pédiatre pour évaluer la croissance et l'alimentation."
                ],
                'evidence': _get_evidence('bmi'),
                'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
            })

    # Weight
    weight_f = factors.get('weight_percentile', {})
    if weight_f.get('status') == 'warning':
        if 'en dessous' in weight_f.get('detail', '').lower():
            findings.append({
                'finding_code': 'weight_below_reference',
                'metric': 'weight_kg',
                'severity': 'warning',
                'child_friendly_title': "Poids inférieur à la zone attendue",
                'parent_explanation': "Le poids mesuré est inférieur aux références utilisées pour l'âge et le sexe de votre enfant.",
                'possible_meaning': "Cela peut suggérer un retard de croissance pondérale ou une erreur de mesure.",
                'recommended_actions': [
                    "Vérifier le poids saisi.",
                    "Demander un avis pédiatrique recommandé."
                ],
                'evidence': _get_evidence('weight'),
                'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
            })
        elif 'au-dessus' in weight_f.get('detail', '').lower():
            findings.append({
                'finding_code': 'weight_above_reference',
                'metric': 'weight_kg',
                'severity': 'warning',
                'child_friendly_title': "Poids supérieur à la zone de référence",
                'parent_explanation': "Le poids mesuré est supérieur aux références OMS.",
                'possible_meaning': "Cette évolution mérite une vérification des mesures et un avis professionnel sur la croissance et l'alimentation.",
                'recommended_actions': [
                    "Vérifier le poids saisi.",
                    "Discuter de l'évolution du poids avec un professionnel de santé."
                ],
                'evidence': _get_evidence('weight'),
                'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
            })

    # Height
    height_f = factors.get('height_percentile', {})
    if height_f.get('status') == 'warning':
        if 'en dessous' in height_f.get('detail', '').lower():
            findings.append({
                'finding_code': 'height_below_reference',
                'metric': 'height_cm',
                'severity': 'warning',
                'child_friendly_title': "Taille inférieure à la zone attendue",
                'parent_explanation': "La taille mesurée est inférieure aux références utilisées pour l'âge et le sexe de votre enfant.",
                'possible_meaning': "Cela suggère un ralentissement de la croissance staturale ou une erreur de mesure.",
                'recommended_actions': [
                    "Vérifier la taille saisie.",
                    "Prévoir un suivi avec le pédiatre."
                ],
                'evidence': _get_evidence('height'),
                'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
            })
        elif 'au-dessus' in height_f.get('detail', '').lower():
            findings.append({
                'finding_code': 'height_above_reference',
                'metric': 'height_cm',
                'severity': 'warning',
                'child_friendly_title': "Taille supérieure à la zone attendue",
                'parent_explanation': "La taille mesurée est supérieure aux références utilisées pour l'âge et le sexe de votre enfant.",
                'possible_meaning': "Croissance staturale accélérée ou erreur de mesure.",
                'recommended_actions': [
                    "Vérifier la taille saisie."
                ],
                'evidence': _get_evidence('height'),
                'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
            })

    # Head Circumference
    head_f = factors.get('head_percentile', {})
    if head_f.get('status') == 'warning':
        if 'en dessous' in head_f.get('detail', '').lower():
            findings.append({
                'finding_code': 'head_circumference_below_reference',
                'metric': 'head_circumference_cm',
                'severity': 'warning',
                'child_friendly_title': "Périmètre crânien inférieur à la zone attendue",
                'parent_explanation': "Le tour de tête mesuré est en dessous de la zone de référence disponible pour l'âge de votre enfant.",
                'possible_meaning': "Cela nécessite une vérification médicale.",
                'recommended_actions': [
                    "Vérifier la mesure.",
                    "Discuter de cette mesure avec un pédiatre."
                ],
                'evidence': _get_evidence('head_circumference'),
                'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
            })
        elif 'au-dessus' in head_f.get('detail', '').lower():
            findings.append({
                'finding_code': 'head_circumference_above_reference',
                'metric': 'head_circumference_cm',
                'severity': 'warning',
                'child_friendly_title': "Périmètre crânien supérieur à la zone attendue",
                'parent_explanation': "Le tour de tête mesuré est au-dessus de la zone de référence disponible pour l'âge de votre enfant.",
                'possible_meaning': "Cela nécessite une vérification médicale.",
                'recommended_actions': [
                    "Vérifier la mesure.",
                    "Discuter de cette mesure avec un pédiatre."
                ],
                'evidence': _get_evidence('head_circumference'),
                'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
            })

    # Sudden Changes
    sw_f = factors.get('sudden_weight_change', {})
    if sw_f.get('status') == 'warning':
        findings.append({
            'finding_code': 'sudden_weight_change',
            'metric': 'weight_kg',
            'severity': 'warning',
            'child_friendly_title': "Variation de poids inhabituelle",
            'parent_explanation': "Une variation de poids inhabituelle a été détectée entre deux mesures.",
            'possible_meaning': "Il peut s'agir d'une fluctuation normale, mais une erreur de saisie est possible.",
            'recommended_actions': [
                "Avant toute interprétation, reprenez la mesure afin de vérifier qu'il ne s'agit pas d'une erreur de saisie ou de mesure."
            ],
            'evidence': {'variation': sw_f.get('detail')},
            'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
        })

    sh_f = factors.get('sudden_height_change', {})
    if sh_f.get('status') == 'warning':
        findings.append({
            'finding_code': 'sudden_height_change',
            'metric': 'height_cm',
            'severity': 'warning',
            'child_friendly_title': "Variation de taille inhabituelle",
            'parent_explanation': "Une variation de taille inhabituelle a été détectée entre deux mesures.",
            'possible_meaning': "Il peut s'agir d'une poussée de croissance, mais une erreur de saisie est fréquente.",
            'recommended_actions': [
                "Avant toute interprétation, reprenez la mesure afin de vérifier qu'il ne s'agit pas d'une erreur de saisie ou de mesure."
            ],
            'evidence': {'variation': sh_f.get('detail')},
            'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
        })

    # Missing Data
    md_f = factors.get('missing_data', {})
    if md_f.get('status') == 'info':
        findings.append({
            'finding_code': 'missing_measurement_data',
            'metric': 'none',
            'severity': 'info',
            'child_friendly_title': "Données incomplètes",
            'parent_explanation': "Certaines données importantes n'ont pas été renseignées.",
            'possible_meaning': md_f.get('detail'),
            'recommended_actions': [
                "Complétez les données manquantes (poids, taille, ou périmètre crânien) lors de la prochaine mesure pour une analyse complète."
            ],
            'evidence': {},
            'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
        })

    # Repeated Alerts
    ra_f = factors.get('repeated_alerts', {})
    if ra_f.get('status') == 'warning':
        findings.append({
            'finding_code': 'repeated_concerning_findings',
            'metric': 'multiple',
            'severity': 'warning',
            'child_friendly_title': "Constats répétés nécessitant une attention",
            'parent_explanation': ra_f.get('detail', "Plusieurs alertes ont été générées récemment."),
            'possible_meaning': "La répétition des alertes suggère qu'un suivi plus régulier est nécessaire.",
            'recommended_actions': [
                "Prenez un rendez-vous avec le pédiatre pour faire un point complet sur la croissance."
            ],
            'evidence': {},
            'disclaimer': "Cette information aide à comprendre les mesures enregistrées et ne constitue pas un diagnostic médical."
        })

    if age is not None and age < 24:
        limitation = (
            "Chez les jeunes enfants, l'interpretation nutritionnelle necessite notamment "
            "le rapport poids-pour-taille et l'avis d'un professionnel."
        )
        for finding in findings:
            if finding.get('metric') in {'bmi', 'weight_kg'}:
                if limitation not in finding['parent_explanation']:
                    finding['parent_explanation'] = f"{finding['parent_explanation']} {limitation}"
                if limitation not in finding['recommended_actions']:
                    finding['recommended_actions'].append(limitation)
    return findings
