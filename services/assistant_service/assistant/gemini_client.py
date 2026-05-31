import json
import os
import re

import requests
from google import genai
from google.genai import types


DISCLAIMER = (
    "Cet assistant explique des constats issus des courbes de reference OMS. "
    "Il ne pose pas de diagnostic et ne remplace pas l'avis d'un professionnel de sante."
)
DEMO_WARNING = (
    "Assistant IA de demonstration : utilisez uniquement des donnees fictives. "
    "Les messages peuvent etre transmis a un fournisseur externe d'IA."
)
EMERGENCY_ANSWER = (
    "Les symptomes decrits peuvent necessiter une prise en charge urgente. "
    "Appelez immediatement les urgences (15 ou 112) ou rendez-vous aux urgences les plus proches. "
    "Je ne peux pas evaluer une urgence medicale dans cette conversation."
)
EMERGENCY_PATTERNS = [
    r"\b(ne respire plus|difficulte(?:s)? (?:a|à) respirer|detresse respiratoire|s[' ]?etouffe)\b",
    r"\b(perte de connaissance|inconscient(?:e)?|ne se reveille pas|coma)\b",
    r"\b(convulsion(?:s)?|crise convulsive)\b",
    r"\b(saignement important|hemorragie|saigne abondamment)\b",
    r"\b(reaction allergique grave|gonflement de la gorge|anaphylaxie)\b",
    r"\b(fievre (?:tres )?elevee|forte fievre)\b.*\b(nourrisson|bebe|nouveau-ne)\b",
]
UNSAFE_OUTPUT_PATTERNS = [
    r"\bdiagnostic (?:confirme|certain)\b",
    r"\bvotre enfant (?:souffre|a) (?:de|un|une)\b",
    r"\b(?:prenez|donnez|administrez)\s+\d+(?:[.,]\d+)?\s*(?:mg|ml|comprime)",
    r"\b(?:inutile|pas besoin|aucune necessite)\s+de\s+consult",
]


def _normalize(text):
    table = str.maketrans(
        "àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ",
        "aaaeeeeiioouuucAAAEEEEIIOOUUUC",
    )
    return (text or "").translate(table).lower()


def is_emergency_message(message):
    normalized = _normalize(message)
    return any(re.search(pattern, normalized) for pattern in EMERGENCY_PATTERNS)


def get_analytics_context(child_id, parent_id, include_events=False):
    url = os.environ.get('ANALYTICS_INTERNAL_URL', 'http://analytics_service:8000')
    token = os.environ.get('INTERNAL_SERVICE_TOKEN', '')
    try:
        response = requests.get(
            f"{url.rstrip('/')}/api/analytics/internal/assistant-context/",
            params={
                'child_id': str(child_id),
                'parent_id': str(parent_id),
                'include_events': str(bool(include_events)).lower(),
            },
            headers={'Host': 'localhost', 'X-Internal-Service-Token': token},
            timeout=int(os.environ.get('ASSISTANT_TIMEOUT_SECONDS', '20')),
        )
        if response.status_code == 200:
            return response.json()
    except requests.RequestException:
        pass
    return None


def deterministic_fallback(context):
    events = (context or {}).get('upcoming_events') or []
    if events:
        event = events[0]
        title = event.get('title') or "Un evenement medical"
        scheduled_date = event.get('scheduled_date') or "une date a verifier"
        return {
            'answer': (
                f"{title} est prevu le {scheduled_date}. "
                "Consultez votre calendrier medical pour confirmer les details et le statut."
            ),
            'recommended_actions': [
                "Verifier le rendez-vous dans le calendrier medical.",
                "Contacter le professionnel de sante en cas de changement.",
            ],
            'encourage_professional_review': False,
            'safety_escalation': False,
            'disclaimer': DISCLAIMER,
        }
    findings = (context or {}).get('clinical_findings') or []
    if not findings:
        answer = (
            "Je ne dispose pas actuellement d'un constat de croissance valide a expliquer. "
            "Vous pouvez verifier les mesures enregistrees et demander conseil a un pediatre en cas d'inquietude."
        )
        return {
            'answer': answer,
            'recommended_actions': ["Verifier les mesures enregistrees."],
            'encourage_professional_review': True,
            'safety_escalation': False,
            'disclaimer': DISCLAIMER,
        }

    finding = findings[0]
    actions = finding.get('recommended_actions') or [
        "Verifier les mesures saisies.",
        "Demander conseil a un pediatre.",
    ]
    answer = " ".join(filter(None, [
        finding.get('parent_explanation'),
        finding.get('possible_meaning'),
    ]))
    return {
        'answer': answer,
        'recommended_actions': actions,
        'encourage_professional_review': True,
        'safety_escalation': False,
        'disclaimer': finding.get('disclaimer') or DISCLAIMER,
    }


def build_system_prompt(context):
    safe_context = {
        'child': (context or {}).get('child', {}),
        'latest_measurement': (context or {}).get('latest_measurement'),
        'trend_summary': (context or {}).get('trend_summary'),
        'clinical_findings': (context or {}).get('clinical_findings', []),
        'recommendations': (context or {}).get('recommendations', []),
        'upcoming_events': (context or {}).get('upcoming_events', []),
    }
    return (
        "Vous etes l'assistant explicatif parent de ChildCare+. "
        "Les constats ci-dessous ont deja ete calcules par un moteur deterministe fonde sur les references OMS. "
        "Expliquez-les simplement en francais. Ne calculez aucune anomalie, n'inventez aucun constat, "
        "ne posez aucun diagnostic et ne prescrivez ni medicament ni regime. "
        "Encouragez un avis professionnel lorsqu'un constat necessite une attention. "
        "Si le contexte contient des allergies, utilisez-les seulement comme prudence generale "
        "(par exemple eviter un aliment allergene connu) sans deduire une nouvelle anomalie. "
        "Repondez uniquement en JSON avec les champs answer, recommended_actions, "
        "encourage_professional_review, safety_escalation et disclaimer. "
        f"Le champ disclaimer doit reprendre ce texte: {DISCLAIMER}\n"
        "Contexte clinique minimise valide:\n"
        + json.dumps(safe_context, ensure_ascii=False, default=str)
    )


def _validated_model_output(raw_text, context):
    try:
        parsed = json.loads(raw_text)
    except (TypeError, ValueError):
        return None
    required = {'answer', 'recommended_actions', 'encourage_professional_review', 'safety_escalation', 'disclaimer'}
    if not required.issubset(parsed) or not isinstance(parsed.get('recommended_actions'), list):
        return None
    normalized = _normalize(
        parsed.get('answer', '') + ' ' + ' '.join(str(item) for item in parsed.get('recommended_actions', []))
    )
    if any(re.search(pattern, normalized) for pattern in UNSAFE_OUTPUT_PATTERNS):
        return None
    if 'diagnostic' not in _normalize(parsed.get('disclaimer', '')):
        return None
    if not (context or {}).get('clinical_findings'):
        return None
    return parsed


def generate_assistant_response(user_message, conversation_history, child_id, parent_id):
    if is_emergency_message(user_message):
        return {
            'payload': {
                'answer': EMERGENCY_ANSWER,
                'recommended_actions': ["Contacter immediatement les urgences."],
                'encourage_professional_review': True,
                'safety_escalation': True,
                'disclaimer': DISCLAIMER,
            },
            'fallback_used': True,
            'safety_escalation': True,
            'model_name': None,
            'ai_enabled': False,
        }

    calendar_question = bool(re.search(
        r"\b(rendez-vous|rendez vous|vaccin(?:ation)?|calendrier|appointment)\b",
        _normalize(user_message),
    ))
    context = get_analytics_context(child_id, parent_id, include_events=calendar_question)
    fallback = deterministic_fallback(context)
    ai_enabled = os.environ.get('ASSISTANT_AI_ENABLED', 'false').lower() in {'1', 'true', 'yes'}
    api_key = os.environ.get('GEMINI_API_KEY', '')
    model_name = os.environ.get('ASSISTANT_MODEL', 'gemini-flash-lite-latest')
    if not context or not ai_enabled or not api_key:
        return {
            'payload': fallback,
            'fallback_used': True,
            'safety_escalation': False,
            'model_name': None,
            'ai_enabled': ai_enabled,
        }

    max_history = int(os.environ.get('ASSISTANT_MAX_HISTORY_MESSAGES', '8'))
    contents = []
    for message in conversation_history[-max_history:]:
        if message.role not in {'user', 'assistant'}:
            continue
        contents.append(types.Content(
            role='user' if message.role == 'user' else 'model',
            parts=[types.Part.from_text(text=message.content)],
        ))
    contents.append(types.Content(role='user', parts=[types.Part.from_text(text=user_message)]))

    try:
        response = genai.Client(api_key=api_key).models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=build_system_prompt(context),
                temperature=0.2,
                response_mime_type='application/json',
            ),
        )
        payload = _validated_model_output(response.text, context)
        if payload:
            return {
                'payload': payload,
                'fallback_used': False,
                'safety_escalation': False,
                'model_name': model_name,
                'ai_enabled': True,
            }
    except Exception:
        pass
    return {
        'payload': fallback,
        'fallback_used': True,
        'safety_escalation': False,
        'model_name': model_name,
        'ai_enabled': True,
    }
