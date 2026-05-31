import json
import os
import uuid
from unittest.mock import MagicMock, patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from .gemini_client import generate_assistant_response, get_analytics_context, is_emergency_message
from .models import Conversation, Message


def make_token(user_id=None, role='parent'):
    user_id = user_id or uuid.uuid4()
    token = AccessToken()
    token['user_id'] = str(user_id)
    token['role'] = role
    token['email'] = 'demo@test.local'
    return str(token), user_id


FINDING_CONTEXT = {
    'child': {'sex': 'M', 'age_months': 36},
    'latest_measurement': {'weight_kg': '10.0', 'height_cm': '92.0', 'bmi': '11.81'},
    'trend_summary': {'weight_change_kg': -1.2},
    'clinical_findings': [{
        'finding_code': 'bmi_below_reference',
        'parent_explanation': "L'IMC est inferieur a la zone de reference OMS.",
        'possible_meaning': "Cela peut correspondre a une insuffisance ponderale potentielle.",
        'recommended_actions': ["Verifier la mesure.", "Consulter un pediatre."],
        'disclaimer': "Ce constat ne constitue pas un diagnostic medical.",
    }],
    'recommendations': [],
    'upcoming_events': [],
}


class AssistantViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        token, self.parent_id = make_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.child_id = uuid.uuid4()

    @patch('assistant.views.parent_owns_child', return_value=True)
    @patch('assistant.views.publish_audit_event')
    def test_parent_creates_conversation_for_owned_child(self, audit, _owned):
        response = self.client.post('/api/assistant/conversations/', {
            'child_id': str(self.child_id), 'title': 'Question croissance'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        audit.assert_called_once()

    @patch('assistant.views.parent_owns_child', return_value=False)
    def test_parent_cannot_create_conversation_for_unowned_child(self, _owned):
        response = self.client.post('/api/assistant/conversations/', {'child_id': str(self.child_id)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('assistant.views.parent_owns_child', return_value=True)
    def test_existing_conversation_cannot_switch_child(self, _owned):
        conversation = Conversation.objects.create(child_id=self.child_id, parent_id=self.parent_id)
        response = self.client.post('/api/assistant/chat/', {
            'conversation_id': str(conversation.id),
            'child_id': str(uuid.uuid4()),
            'message': 'Question',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_cannot_access_assistant(self):
        token, _ = make_token(role='doctor')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/assistant/conversations/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('assistant.views.parent_owns_child', return_value=True)
    @patch('assistant.views.publish_audit_event')
    @patch('assistant.views.generate_assistant_response')
    def test_chat_stores_assistant_role_and_metadata(self, generate, audit, _owned):
        generate.return_value = {
            'payload': {
                'answer': 'Explication claire.',
                'recommended_actions': ['Verifier.'],
                'disclaimer': 'Pas un diagnostic.',
            },
            'fallback_used': True,
            'safety_escalation': False,
            'model_name': None,
            'ai_enabled': False,
        }
        response = self.client.post('/api/assistant/chat/', {
            'child_id': str(self.child_id), 'message': 'Que signifie cette mesure ?'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        saved = Message.objects.filter(role='assistant').get()
        self.assertTrue(saved.fallback_used)
        self.assertFalse(Message.objects.filter(role='model').exists())
        self.assertGreaterEqual(audit.call_count, 3)

    @patch('assistant.views.publish_audit_event')
    def test_parent_can_delete_own_conversation_and_audit(self, audit):
        conversation = Conversation.objects.create(child_id=self.child_id, parent_id=self.parent_id)
        response = self.client.delete(f'/api/assistant/conversations/{conversation.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Conversation.objects.filter(id=conversation.id).exists())
        self.assertEqual(audit.call_args.kwargs['event_type'], 'assistant_conversation_deleted')


class GeminiSafetyTests(TestCase):
    @patch('assistant.gemini_client.requests.get')
    def test_context_request_uses_internal_header_and_safe_host(self, request_get):
        request_get.return_value.status_code = 200
        request_get.return_value.json.return_value = FINDING_CONTEXT
        with patch.dict(os.environ, {'INTERNAL_SERVICE_TOKEN': 'a' * 64}, clear=False):
            context = get_analytics_context(self._uuid(), self._uuid())
        self.assertEqual(context, FINDING_CONTEXT)
        headers = request_get.call_args.kwargs['headers']
        self.assertEqual(headers['Host'], 'localhost')
        self.assertEqual(headers['X-Internal-Service-Token'], 'a' * 64)
        self.assertEqual(request_get.call_args.kwargs['params']['include_events'], 'false')

    def test_emergency_matching_does_not_treat_age_as_emergency(self):
        self.assertTrue(is_emergency_message("Mon enfant ne respire plus et devient inconscient."))
        self.assertFalse(is_emergency_message("Mon enfant a 15 mois."))

    @patch('assistant.gemini_client.get_analytics_context')
    @patch('assistant.gemini_client.genai.Client')
    def test_ai_disabled_uses_contextual_fallback_without_model(self, client, get_context):
        get_context.return_value = FINDING_CONTEXT
        with patch.dict(os.environ, {'ASSISTANT_AI_ENABLED': 'false'}, clear=False):
            result = generate_assistant_response('Pourquoi ?', [], self._uuid(), self._uuid())
        client.assert_not_called()
        self.assertTrue(result['fallback_used'])
        self.assertIn('IMC', result['payload']['answer'])

    @patch('assistant.gemini_client.get_analytics_context')
    @patch('assistant.gemini_client.genai.Client')
    def test_calendar_question_requests_opt_in_event_context(self, client, get_context):
        get_context.return_value = {
            **FINDING_CONTEXT,
            'upcoming_events': [{'title': 'Vaccin DTP', 'scheduled_date': '2026-06-01'}],
        }
        with patch.dict(os.environ, {'ASSISTANT_AI_ENABLED': 'false'}, clear=False):
            result = generate_assistant_response('Quel est son prochain vaccin ?', [], self._uuid(), self._uuid())
        client.assert_not_called()
        self.assertTrue(get_context.call_args.kwargs['include_events'])
        self.assertIn('Vaccin DTP', result['payload']['answer'])

    @patch('assistant.gemini_client.get_analytics_context')
    @patch('assistant.gemini_client.genai.Client')
    def test_emergency_response_never_calls_context_or_model(self, client, get_context):
        result = generate_assistant_response('Il ne respire plus.', [], self._uuid(), self._uuid())
        self.assertTrue(result['safety_escalation'])
        client.assert_not_called()
        get_context.assert_not_called()

    @patch('assistant.gemini_client.get_analytics_context', return_value=FINDING_CONTEXT)
    @patch('assistant.gemini_client.genai.Client')
    def test_valid_structured_gemini_output_is_accepted(self, client_class, _context):
        response = MagicMock()
        response.text = json.dumps({
            'answer': 'Le constat merite une verification.',
            'recommended_actions': ['Consulter un pediatre.'],
            'encourage_professional_review': True,
            'safety_escalation': False,
            'disclaimer': 'Ceci ne constitue pas un diagnostic medical.',
        })
        client_class.return_value.models.generate_content.return_value = response
        with patch.dict(os.environ, {
            'ASSISTANT_AI_ENABLED': 'true', 'GEMINI_API_KEY': 'key', 'ASSISTANT_MODEL': 'gemini-flash-lite-latest'
        }, clear=False):
            result = generate_assistant_response('Expliquez.', [], self._uuid(), self._uuid())
        self.assertFalse(result['fallback_used'])
        self.assertEqual(result['model_name'], 'gemini-flash-lite-latest')

    @patch('assistant.gemini_client.get_analytics_context', return_value=FINDING_CONTEXT)
    @patch('assistant.gemini_client.genai.Client')
    def test_unsafe_model_diagnosis_is_replaced_by_fallback(self, client_class, _context):
        response = MagicMock()
        response.text = json.dumps({
            'answer': 'Diagnostic confirme : votre enfant souffre de malnutrition.',
            'recommended_actions': ['Donnez 10 mg.'],
            'encourage_professional_review': False,
            'safety_escalation': False,
            'disclaimer': 'Ceci ne constitue pas un diagnostic medical.',
        })
        client_class.return_value.models.generate_content.return_value = response
        with patch.dict(os.environ, {'ASSISTANT_AI_ENABLED': 'true', 'GEMINI_API_KEY': 'key'}, clear=False):
            result = generate_assistant_response('Expliquez.', [], self._uuid(), self._uuid())
        self.assertTrue(result['fallback_used'])
        self.assertNotIn('Diagnostic confirme', result['payload']['answer'])

    @patch('assistant.gemini_client.get_analytics_context', return_value=FINDING_CONTEXT)
    @patch('assistant.gemini_client.genai.Client')
    def test_medication_action_or_missing_disclaimer_is_replaced(self, client_class, _context):
        response = MagicMock()
        response.text = json.dumps({
            'answer': 'Une verification est utile.',
            'recommended_actions': ['Donnez 20 mg de medicament.'],
            'encourage_professional_review': True,
            'safety_escalation': False,
            'disclaimer': 'Information generale.',
        })
        client_class.return_value.models.generate_content.return_value = response
        with patch.dict(os.environ, {'ASSISTANT_AI_ENABLED': 'true', 'GEMINI_API_KEY': 'key'}, clear=False):
            result = generate_assistant_response('Expliquez.', [], self._uuid(), self._uuid())
        self.assertTrue(result['fallback_used'])

    @staticmethod
    def _uuid():
        return uuid.uuid4()
