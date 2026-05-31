from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken
from .models import ChildShare, Message
import uuid

VALID_INTERNAL_TOKEN = 'test_internal_token_for_ci'

def generate_test_token(user_id, email, role):
    token = AccessToken()
    token['user_id'] = str(user_id)
    token['email'] = email
    token['role'] = role
    return str(token)

class CollaborationTests(APITestCase):
    def setUp(self):
        self.parent_id = uuid.uuid4()
        self.doctor_id = uuid.uuid4()
        self.child_id = uuid.uuid4()

        self.parent_token = generate_test_token(self.parent_id, 'parent@test.com', 'parent')
        self.doctor_token = generate_test_token(self.doctor_id, 'doctor@test.com', 'doctor')

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")

    def test_parent_create_share(self):
        url = reverse('share-list')
        data = {
            'child_id': str(self.child_id),
            'permissions': {'measurements': True}
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')
        self.assertTrue('sharing_code' in response.data)
        self.assertEqual(len(response.data['sharing_code']), 6)

        # Try list
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_doctor_accept_share(self):
        # 1. Parent creates
        share = ChildShare.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            permissions={'measurements': True}
        )
        
        # 2. Doctor accepts
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        url = reverse('share-accept')
        data = {'code': share.sharing_code}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'active')
        
        # Verify db
        share.refresh_from_db()
        self.assertEqual(share.doctor_id, self.doctor_id)
        self.assertEqual(share.doctor_email, 'doctor@test.com')
        self.assertEqual(share.doctor_display_name, 'doctor@test.com')
        self.assertEqual(share.status, 'active')

        # Try accept again -> fail
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_parent_revoke_share(self):
        share = ChildShare.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            doctor_id=self.doctor_id,
            status='active'
        )
        url = reverse('share-detail', args=[share.id])
        data = {'status': 'revoked'}
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'revoked')

    @patch('collaboration.views.INTERNAL_SERVICE_TOKEN', VALID_INTERNAL_TOKEN)
    def test_internal_access_check(self):
        # Pending share -> blocked
        share = ChildShare.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            doctor_id=self.doctor_id,
            status='pending',
            permissions={'profile': True, 'measurements': False}
        )
        
        url = reverse('internal-access-check')
        # Without auth (it's internal) but WITH internal service token
        self.client.credentials()
        token_header = {'HTTP_X_INTERNAL_SERVICE_TOKEN': VALID_INTERNAL_TOKEN}
        
        # 1. Pending status -> allowed = False
        response = self.client.get(url, {'doctor_id': str(self.doctor_id), 'child_id': str(self.child_id)}, **token_header)
        self.assertFalse(response.data['allowed'])

        # 2. Active status -> allowed = True
        share.status = 'active'
        share.save()
        response = self.client.get(url, {'doctor_id': str(self.doctor_id), 'child_id': str(self.child_id)}, **token_header)
        self.assertTrue(response.data['allowed'])
        self.assertEqual(response.data['share_id'], str(share.id))
        self.assertEqual(response.data['parent_id'], str(self.parent_id))

        # 3. Check section with permission True
        response = self.client.get(url, {'doctor_id': str(self.doctor_id), 'child_id': str(self.child_id), 'section': 'profile'}, **token_header)
        self.assertTrue(response.data['allowed'])

        # 4. Check section with permission False
        response = self.client.get(url, {'doctor_id': str(self.doctor_id), 'child_id': str(self.child_id), 'section': 'measurements'}, **token_header)
        self.assertFalse(response.data['allowed'])
        self.assertEqual(response.data['share_id'], str(share.id))

    def test_messaging(self):
        share = ChildShare.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            doctor_id=self.doctor_id,
            status='active'
        )

        url = reverse('message-list')
        
        # Parent sends message
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        data = {
            'share': str(share.id),
            'content': 'Hello Doctor'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['sender_role'], 'parent')

        # Doctor reads message
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        response = self.client.get(url, {'share_id': str(share.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertTrue(response.data[0]['is_read']) # Should be marked as read when fetched by doctor

    def test_unread_count(self):
        share = ChildShare.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            doctor_id=self.doctor_id,
            status='active'
        )

        url = reverse('message-list')
        unread_url = reverse('message-unread-count')
        
        # Parent sends message
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        self.client.post(url, {'share': str(share.id), 'content': 'Msg 1'}, format='json')
        self.client.post(url, {'share': str(share.id), 'content': 'Msg 2'}, format='json')

        # Check doctor unread count
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        response = self.client.get(unread_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 2)

        # Check parent unread count
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        response = self.client.get(unread_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 0) # Parent sent them

        # Doctor opens chat
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        self.client.get(url, {'share_id': str(share.id)})

        # Check doctor unread count again
        response = self.client.get(unread_url)
        self.assertEqual(response.data['unread_count'], 0)





class InternalEndpointSecurityTests(APITestCase):
    """Tests proving internal endpoints reject requests without valid X-Internal-Service-Token."""

    def setUp(self):
        self.parent_id = uuid.uuid4()
        self.doctor_id = uuid.uuid4()
        self.child_id = uuid.uuid4()

    # ── access-check ────────────────────────────────────────────────────────

    @patch('collaboration.views.INTERNAL_SERVICE_TOKEN', VALID_INTERNAL_TOKEN)
    def test_access_check_no_token_returns_403(self):
        url = reverse('internal-access-check')
        response = self.client.get(url, {
            'doctor_id': str(self.doctor_id),
            'child_id': str(self.child_id)
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('collaboration.views.INTERNAL_SERVICE_TOKEN', VALID_INTERNAL_TOKEN)
    def test_access_check_wrong_token_returns_403(self):
        url = reverse('internal-access-check')
        response = self.client.get(
            url,
            {'doctor_id': str(self.doctor_id), 'child_id': str(self.child_id)},
            HTTP_X_INTERNAL_SERVICE_TOKEN='wrong-token'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('collaboration.views.INTERNAL_SERVICE_TOKEN', VALID_INTERNAL_TOKEN)
    def test_access_check_valid_token_succeeds(self):
        ChildShare.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            doctor_id=self.doctor_id,
            status='active',
            permissions={'profile': True}
        )
        url = reverse('internal-access-check')
        response = self.client.get(
            url,
            {'doctor_id': str(self.doctor_id), 'child_id': str(self.child_id)},
            HTTP_X_INTERNAL_SERVICE_TOKEN=VALID_INTERNAL_TOKEN
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['allowed'])

    # ── shares-by-children ──────────────────────────────────────────────────

    @patch('collaboration.views.INTERNAL_SERVICE_TOKEN', VALID_INTERNAL_TOKEN)
    def test_shares_by_children_no_token_returns_403(self):
        url = reverse('internal-shares-by-children')
        response = self.client.post(url, {'child_ids': [str(self.child_id)]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('collaboration.views.INTERNAL_SERVICE_TOKEN', VALID_INTERNAL_TOKEN)
    def test_shares_by_children_wrong_token_returns_403(self):
        url = reverse('internal-shares-by-children')
        response = self.client.post(
            url,
            {'child_ids': [str(self.child_id)]},
            format='json',
            HTTP_X_INTERNAL_SERVICE_TOKEN='wrong-token'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('collaboration.views.INTERNAL_SERVICE_TOKEN', VALID_INTERNAL_TOKEN)
    def test_shares_by_children_valid_token_succeeds(self):
        ChildShare.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            doctor_id=self.doctor_id,
            status='active',
            permissions={'alerts': True}
        )
        url = reverse('internal-shares-by-children')
        response = self.client.post(
            url,
            {'child_ids': [str(self.child_id)]},
            format='json',
            HTTP_X_INTERNAL_SERVICE_TOKEN=VALID_INTERNAL_TOKEN
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(str(self.child_id), response.data)

