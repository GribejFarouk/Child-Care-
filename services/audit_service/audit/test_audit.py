from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
import uuid
from unittest.mock import patch
import os

class AuditServiceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.internal_token = 'test-token-123_aaaaaaaaaaaaaaaaaaaaa'
        self.create_url = '/api/audit/internal/events/'

    @patch.dict(os.environ, {'INTERNAL_SERVICE_TOKEN': 'test-token-123_aaaaaaaaaaaaaaaaaaaaa'})
    def test_create_audit_event_success(self):
        payload = {
            'actor_id': str(uuid.uuid4()),
            'actor_role': 'doctor',
            'event_type': 'test_event',
            'outcome': 'success',
            'child_id': str(uuid.uuid4()),
            'parent_id': str(uuid.uuid4()),
            'resource_type': 'test_resource',
            'source_service': 'test_service',
            'summary': 'Test summary',
            'metadata': {'safe_key': 'safe_value'}
        }
        response = self.client.post(
            self.create_url,
            data=payload,
            format='json',
            HTTP_X_INTERNAL_SERVICE_TOKEN=self.internal_token
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch.dict(os.environ, {'INTERNAL_SERVICE_TOKEN': 'test-token-123_aaaaaaaaaaaaaaaaaaaaa'})
    def test_create_audit_event_unauthorized(self):
        payload = {
            'actor_id': str(uuid.uuid4()),
            'actor_role': 'doctor',
            'event_type': 'test_event',
            'outcome': 'success',
            'resource_type': 'test_resource',
            'source_service': 'test_service',
            'summary': 'Test summary'
        }
        response = self.client.post(
            self.create_url,
            data=payload,
            format='json',
            HTTP_X_INTERNAL_SERVICE_TOKEN='wrong-token'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch.dict(os.environ, {'INTERNAL_SERVICE_TOKEN': 'test-token-123_aaaaaaaaaaaaaaaaaaaaa'})
    def test_create_audit_event_rejects_banned_metadata(self):
        # Top-level prohibited
        payload1 = {
            'actor_id': str(uuid.uuid4()),
            'actor_role': 'doctor',
            'event_type': 'test_event',
            'outcome': 'success',
            'resource_type': 'test_resource',
            'source_service': 'test_service',
            'summary': 'Test summary',
            'metadata': {'token': 'secret', 'password': '123'}
        }
        # Nested prohibited
        payload2 = {
            'actor_id': str(uuid.uuid4()),
            'actor_role': 'doctor',
            'event_type': 'test_event',
            'outcome': 'success',
            'resource_type': 'test_resource',
            'source_service': 'test_service',
            'summary': 'Test summary',
            'metadata': {'safe_field': {'nested_access_token': 'secret'}}
        }
        # Mixed-case prohibited
        payload3 = {
            'actor_id': str(uuid.uuid4()),
            'actor_role': 'doctor',
            'event_type': 'test_event',
            'outcome': 'success',
            'resource_type': 'test_resource',
            'source_service': 'test_service',
            'summary': 'Test summary',
            'metadata': {'Room_Token': 'secret'}
        }

        for payload in [payload1, payload2, payload3]:
            response = self.client.post(
                self.create_url,
                data=payload,
                format='json',
                HTTP_X_INTERNAL_SERVICE_TOKEN=self.internal_token
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("metadata", response.data)

    @patch.dict(os.environ, {'INTERNAL_SERVICE_TOKEN': 'test-token-123_aaaaaaaaaaaaaaaaaaaaa'})
    def test_create_audit_event_accepts_safe_metadata_containing_file_word(self):
        payload = {
            'actor_id': str(uuid.uuid4()),
            'actor_role': 'doctor',
            'event_type': 'profile_accessed',
            'outcome': 'success',
            'resource_type': 'child',
            'source_service': 'profile_service',
            'summary': 'Profile access allowed',
            'metadata': {'profile_status': 'active', 'permission_scope': 'profile'},
        }
        response = self.client.post(
            self.create_url,
            data=payload,
            format='json',
            HTTP_X_INTERNAL_SERVICE_TOKEN=self.internal_token,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_activity_journal_permissions_and_fields(self):
        from .models import AuditEvent
        user_id = uuid.uuid4()
        
        # Create a test event
        AuditEvent.objects.create(
            actor_id=uuid.uuid4(),
            actor_role='doctor',
            event_type='test_event',
            outcome='success',
            child_id=uuid.uuid4(),
            parent_id=user_id,
            resource_type='test_resource',
            source_service='test_service',
            summary='Test summary',
            visible_to_parent=True,
            metadata={'safe_key': 'safe_value'}
        )

        class MockUser:
            def __init__(self, role, uid):
                self.role = role
                self.id = uid
                self.is_authenticated = True

        # Test Doctor gets 403
        self.client.force_authenticate(user=MockUser('doctor', uuid.uuid4()))
        response = self.client.get('/api/audit/activity/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test Parent gets 200 with safe fields only
        self.client.force_authenticate(user=MockUser('parent', user_id))
        response = self.client.get('/api/audit/activity/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(len(data), 1)
        event = data[0]
        
        # Assert safe fields exist
        self.assertIn('id', event)
        self.assertIn('event_type', event)
        self.assertIn('outcome', event)
        self.assertIn('child_id', event)
        self.assertIn('summary', event)
        self.assertIn('occurred_at', event)
        self.assertIn('resource_type', event)
        
        # Assert sensitive fields do NOT exist
        self.assertNotIn('actor_id', event)
        self.assertNotIn('parent_id', event)
        self.assertNotIn('share_id', event)
        self.assertNotIn('resource_id', event)
        self.assertNotIn('source_service', event)
        self.assertNotIn('metadata', event)
