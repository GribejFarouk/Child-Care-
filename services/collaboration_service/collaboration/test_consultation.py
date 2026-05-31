import uuid
from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken
from .models import ChildShare, ConsultationSession

VALID_INTERNAL_TOKEN = 'test_internal_token_for_ci'

def generate_test_token(user_id, email, role):
    token = AccessToken()
    token['user_id'] = str(user_id)
    token['email'] = email
    token['role'] = role
    return str(token)

class ConsultationTests(APITestCase):
    def setUp(self):
        self.parent_id = uuid.uuid4()
        self.doctor_id = uuid.uuid4()
        self.child_id = uuid.uuid4()
        self.other_doctor_id = uuid.uuid4()

        self.parent_token = generate_test_token(self.parent_id, 'parent@test.com', 'parent')
        self.doctor_token = generate_test_token(self.doctor_id, 'doctor@test.com', 'doctor')
        self.other_doctor_token = generate_test_token(self.other_doctor_id, 'other@test.com', 'doctor')

        self.share = ChildShare.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            doctor_id=self.doctor_id,
            status='active',
            permissions={'consultation': True, 'profile': True}
        )
        
        self.no_perm_share = ChildShare.objects.create(
            parent_id=self.parent_id,
            child_id=uuid.uuid4(),
            doctor_id=self.doctor_id,
            status='active',
            permissions={'profile': True}
        )

    def test_parent_creates_video_session(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-list')
        data = {
            'share': str(self.share.id),
            'session_type': 'video'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['created_by_role'], 'parent')
        self.assertEqual(response.data['session_type'], 'video')
        # Ensure join_url is not returned
        self.assertNotIn('join_url', response.data)
        # Ensure room_token is not returned
        self.assertNotIn('room_token', response.data)
        
    def test_doctor_creates_audio_session(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        url = reverse('consultation-list')
        data = {
            'share': str(self.share.id),
            'session_type': 'audio'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['created_by_role'], 'doctor')
        self.assertEqual(response.data['session_type'], 'audio')

    def test_disabled_permission_prevents_creation(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-list')
        data = {
            'share': str(self.no_perm_share.id),
            'session_type': 'video'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unrelated_doctor_gets_403(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.other_doctor_token}")
        url = reverse('consultation-list')
        data = {
            'share': str(self.share.id),
            'session_type': 'video'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_second_open_session_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-list')
        data = {
            'share': str(self.share.id),
            'session_type': 'video'
        }
        # First session
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Second session
        response2 = self.client.post(url, data, format='json')
        self.assertEqual(response2.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("An active or scheduled consultation already exists", str(response2.data))

    @patch('collaboration.views.publish_audit_event')
    @patch('collaboration.views.requests.post')
    @patch('collaboration.views.INTERNAL_SERVICE_TOKEN', VALID_INTERNAL_TOKEN)
    def test_scheduled_creates_notification(self, mock_post, mock_audit):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-list')
        data = {
            'share': str(self.share.id),
            'session_type': 'video',
            'scheduled_at': '2030-01-01T10:00:00Z'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check notification payload
        mock_post.assert_called_once()
        payload = mock_post.call_args[1]['json']
        self.assertEqual(payload['notification_type'], 'consultation_scheduled')
        # Payload must not contain external room URL
        self.assertNotIn('join_url', str(payload))
        self.assertNotIn('room_token', str(payload))

    def test_join_transitions_to_active_and_returns_url(self):
        # Create session
        session = ConsultationSession.objects.create(
            share=self.share,
            created_by_id=self.parent_id,
            created_by_role='parent',
            session_type='video'
        )
        self.assertEqual(session.status, ConsultationSession.Status.SCHEDULED)
        
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        join_url = reverse('consultation-join', kwargs={'pk': session.id})
        response = self.client.post(join_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertIn('join_url', response.data)
        self.assertTrue(response.data['join_url'].endswith(session.room_token))
        
        session.refresh_from_db()
        self.assertEqual(session.status, ConsultationSession.Status.ACTIVE)
        self.assertIsNotNone(session.started_at)

    def test_completed_session_cannot_be_joined(self):
        session = ConsultationSession.objects.create(
            share=self.share,
            created_by_id=self.parent_id,
            created_by_role='parent',
            session_type='video',
            status=ConsultationSession.Status.COMPLETED
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        join_url = reverse('consultation-join', kwargs={'pk': session.id})
        response = self.client.post(join_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already ended", str(response.data))

    def test_doctor_loses_access_after_revocation(self):
        session = ConsultationSession.objects.create(
            share=self.share,
            created_by_id=self.parent_id,
            created_by_role='parent',
            session_type='video'
        )
        
        # Revoke share
        self.share.status = 'revoked'
        self.share.save()
        
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        # Cannot list
        list_url = reverse('consultation-list')
        response = self.client.get(list_url, {'share_id': self.share.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
        
        # Cannot join
        join_url = reverse('consultation-join', kwargs={'pk': session.id})
        response = self.client.post(join_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_parent_keeps_history_but_cannot_join_revoked(self):
        session = ConsultationSession.objects.create(
            share=self.share,
            created_by_id=self.parent_id,
            created_by_role='parent',
            session_type='video'
        )
        
        # Revoke share
        self.share.status = 'revoked'
        self.share.save()
        
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        
        # Can list history
        list_url = reverse('consultation-list')
        response = self.client.get(list_url, {'share_id': self.share.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # Cannot join
        join_url = reverse('consultation-join', kwargs={'pk': session.id})
        response = self.client.post(join_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_cannot_create_share(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        url = reverse('share-list')
        data = {
            'child_id': str(self.child_id),
            'permissions': {'measurements': True}
        }
        response = self.client.post(url, data, format='json')
        # Verify it returns a clean 403, not a 500 server error
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unrelated_doctor_cannot_get_detail(self):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.other_doctor_token}")
        url = reverse('consultation-detail', kwargs={'pk': session.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unrelated_parent_cannot_get_detail(self):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video')
        unrelated_parent_id = uuid.uuid4()
        unrelated_token = generate_test_token(unrelated_parent_id, 'unrelated@test.com', 'parent')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {unrelated_token}")
        url = reverse('consultation-detail', kwargs={'pk': session.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_doctor_loses_detail_access_immediately_after_revocation(self):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        url = reverse('consultation-detail', kwargs={'pk': session.id})
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
        self.share.status = 'revoked'
        self.share.save()
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

    def test_doctor_loses_detail_access_immediately_after_permission_disabled(self):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        url = reverse('consultation-detail', kwargs={'pk': session.id})
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
        self.share.permissions['consultation'] = False
        self.share.save()
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

    def test_parent_retains_metadata_history_after_revocation(self):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video')
        self.share.status = 'revoked'
        self.share.save()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-detail', kwargs={'pk': session.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_parent_list_is_scoped_to_requested_share(self):
        second_share = ChildShare.objects.create(
            parent_id=self.parent_id,
            child_id=uuid.uuid4(),
            doctor_id=self.doctor_id,
            status='active',
            permissions={'consultation': True, 'profile': True},
        )
        own_session = ConsultationSession.objects.create(
            share=self.share,
            created_by_id=self.parent_id,
            created_by_role='parent',
            session_type='video',
        )
        ConsultationSession.objects.create(
            share=second_share,
            created_by_id=self.parent_id,
            created_by_role='parent',
            session_type='audio',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        response = self.client.get(reverse('consultation-list'), {'share_id': self.share.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in response.data], [str(own_session.id)])

    def test_doctor_list_is_scoped_to_requested_share(self):
        second_share = ChildShare.objects.create(
            parent_id=self.parent_id,
            child_id=uuid.uuid4(),
            doctor_id=self.doctor_id,
            status='active',
            permissions={'consultation': True, 'profile': True},
        )
        own_session = ConsultationSession.objects.create(
            share=self.share,
            created_by_id=self.parent_id,
            created_by_role='parent',
            session_type='video',
        )
        ConsultationSession.objects.create(
            share=second_share,
            created_by_id=self.parent_id,
            created_by_role='parent',
            session_type='audio',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        response = self.client.get(reverse('consultation-list'), {'share_id': self.share.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in response.data], [str(own_session.id)])

    def test_list_without_share_id_does_not_expose_sessions(self):
        ConsultationSession.objects.create(
            share=self.share,
            created_by_id=self.parent_id,
            created_by_role='parent',
            session_type='video',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        response = self.client.get(reverse('consultation-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_list_detail_output_does_not_contain_room_token_or_url(self):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-detail', kwargs={'pk': session.id})
        response = self.client.get(url)
        self.assertNotIn('room_token', response.data)
        self.assertNotIn('join_url', response.data)
        self.assertNotIn('provider', response.data)

    def test_patch_is_disabled(self):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-detail', kwargs={'pk': session.id})
        response = self.client.patch(url, {'status': 'completed'})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_is_disabled(self):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-detail', kwargs={'pk': session.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_client_cannot_set_readonly_fields_on_create(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-list')
        response = self.client.post(url, {
            'share': self.share.id,
            'session_type': 'video',
            'room_token': 'my-custom-token',
            'status': 'completed',
            'started_at': '2020-01-01T00:00:00Z',
            'ended_at': '2020-01-01T01:00:00Z'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(response.data.get('room_token'), 'my-custom-token')
        self.assertEqual(response.data.get('status'), 'scheduled')
        self.assertIsNone(response.data.get('started_at'))
        self.assertIsNone(response.data.get('ended_at'))

    def test_scheduled_session_can_be_cancelled(self):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-cancel', kwargs={'pk': session.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, 'cancelled')

    def test_active_session_can_be_completed(self):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video', status='active')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-complete', kwargs={'pk': session.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, 'completed')

    def test_after_completing_new_session_can_be_created(self):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video', status='completed')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-list')
        response = self.client.post(url, {'share': self.share.id, 'session_type': 'video'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch('collaboration.views.publish_audit_event')
    @patch('collaboration.views.requests.post')
    def test_cancellation_notification_does_not_include_room_data(self, mock_post, mock_audit):
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-cancel', kwargs={'pk': session.id})
        self.client.post(url)
        self.assertTrue(mock_post.called)
        payload = mock_post.call_args[1]['json']
        self.assertNotIn('room_token', str(payload))
        self.assertNotIn('join_url', str(payload))
        self.assertNotIn('provider', str(payload))

    @patch('collaboration.views.publish_audit_event')
    @patch('collaboration.views.requests.post')
    def test_notification_failure_does_not_fail_session_creation(self, mock_post, mock_audit):
        mock_post.side_effect = Exception("Connection error")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-list')
        response = self.client.post(url, {
            'share': self.share.id,
            'session_type': 'video',
            'scheduled_at': '2030-01-01T10:00:00Z',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_post.assert_called_once()

    @patch('collaboration.views.publish_audit_event')
    @patch('collaboration.views.requests.post')
    def test_notification_failure_does_not_fail_cancellation(self, mock_post, mock_audit):
        mock_post.side_effect = Exception("Connection error")
        session = ConsultationSession.objects.create(share=self.share, created_by_id=self.parent_id, created_by_role='parent', session_type='video')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('consultation-cancel', kwargs={'pk': session.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
