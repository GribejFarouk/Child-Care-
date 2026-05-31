import uuid
from django.test import TestCase
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken
from unittest.mock import patch
from .models import ParentProfile, DoctorProfile, Child


class ProfileServiceTestsBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.parent_id = str(uuid.uuid4())
        self.doctor_id = str(uuid.uuid4())
        
        # Generate tokens valid for the shared JWT logic
        parent_token = AccessToken()
        parent_token.payload['user_id'] = self.parent_id
        parent_token.payload['email'] = 'parent@test.com'
        parent_token.payload['role'] = 'parent'
        self.parent_token = str(parent_token)

        doctor_token = AccessToken()
        doctor_token.payload['user_id'] = self.doctor_id
        doctor_token.payload['email'] = 'doctor@test.com'
        doctor_token.payload['role'] = 'doctor'
        self.doctor_token = str(doctor_token)

    def auth_parent(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.parent_token}')

    def auth_doctor(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.doctor_token}')

    def unauth(self):
        self.client.credentials()


class ProfileTests(ProfileServiceTestsBase):

    def test_parent_profile_get_create(self):
        """GET /parent/me/ auto-creates and returns the profile."""
        self.auth_parent()
        resp = self.client.get('/api/profiles/parent/me/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['user_id'], self.parent_id)
        self.assertTrue(ParentProfile.objects.filter(user_id=self.parent_id).exists())

    def test_parent_profile_patch(self):
        """PATCH /parent/me/ updates the profile."""
        self.auth_parent()
        self.client.get('/api/profiles/parent/me/') # create
        resp = self.client.patch('/api/profiles/parent/me/', {'city': 'Sfax'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['city'], 'Sfax')

    def test_doctor_profile_get_create(self):
        """GET /doctor/me/ auto-creates and returns the profile."""
        self.auth_doctor()
        resp = self.client.get('/api/profiles/doctor/me/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['user_id'], self.doctor_id)
        self.assertTrue(DoctorProfile.objects.filter(user_id=self.doctor_id).exists())

    def test_doctor_profile_patch(self):
        """PATCH /doctor/me/ updates the profile."""
        self.auth_doctor()
        self.client.get('/api/profiles/doctor/me/') # create
        resp = self.client.patch('/api/profiles/doctor/me/', {'specialty': 'Pediatrics'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['specialty'], 'Pediatrics')

    def test_parent_cannot_access_doctor_profile(self):
        self.auth_parent()
        resp = self.client.get('/api/profiles/doctor/me/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_cannot_access_parent_profile(self):
        self.auth_doctor()
        resp = self.client.get('/api/profiles/parent/me/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class ChildTests(ProfileServiceTestsBase):

    def setUp(self):
        super().setUp()
        self.child_data = {
            'first_name': 'Ali',
            'date_of_birth': '2023-01-01',
            'sex': 'M'
        }

    def test_parent_creates_child(self):
        self.auth_parent()
        resp = self.client.post('/api/profiles/children/', self.child_data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['parent_id'], self.parent_id)

    def test_parent_lists_only_own_children(self):
        self.auth_parent()
        self.client.post('/api/profiles/children/', self.child_data)
        
        # Create a child for another parent
        Child.objects.create(parent_id=uuid.uuid4(), first_name='Other', date_of_birth='2022-01-01', sex='F')
        
        resp = self.client.get('/api/profiles/children/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['first_name'], 'Ali')

    def test_parent_updates_own_child(self):
        self.auth_parent()
        create_resp = self.client.post('/api/profiles/children/', self.child_data)
        child_id = create_resp.data['id']
        
        resp = self.client.patch(f'/api/profiles/children/{child_id}/', {'first_name': 'Alia'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['first_name'], 'Alia')

    def test_parent_deletes_own_child(self):
        self.auth_parent()
        create_resp = self.client.post('/api/profiles/children/', self.child_data)
        child_id = create_resp.data['id']
        
        resp = self.client.delete(f'/api/profiles/children/{child_id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Child.objects.filter(id=child_id).exists())

    def test_wrong_owner_child_returns_404(self):
        self.auth_parent()
        other_child = Child.objects.create(parent_id=uuid.uuid4(), first_name='Other', date_of_birth='2022-01-01', sex='F')
        
        resp = self.client.get(f'/api/profiles/children/{other_child.id}/')
        # DRF generics filter by queryset first, so it's a 404 (Not Found), exactly as requested
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_doctor_cannot_access_child_endpoints(self):
        self.auth_doctor()
        resp = self.client.get('/api/profiles/children/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        
        resp = self.client.post('/api/profiles/children/', self.child_data)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    @patch('profiles.views.publish_audit_event')
    @patch('profiles.permissions.check_collaboration_access')
    def test_doctor_can_retrieve_shared_child(self, mock_check, mock_audit):
        """Doctor can GET child if collaboration service returns True."""
        mock_check.return_value = True
        
        # Create a child
        self.auth_parent()
        create_resp = self.client.post('/api/profiles/children/', self.child_data)
        child_id = create_resp.data['id']
        
        # Doctor tries to retrieve
        self.auth_doctor()
        resp = self.client.get(f'/api/profiles/children/{child_id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], child_id)
        import uuid
        mock_check.assert_called_once_with(uuid.UUID(str(self.doctor_id)), uuid.UUID(child_id), 'profile')
        mock_audit.assert_called_once()
        self.assertEqual(mock_audit.call_args.kwargs['parent_id'], uuid.UUID(self.parent_id))

    @patch('profiles.permissions.check_collaboration_access')
    def test_doctor_cannot_retrieve_unshared_child(self, mock_check):
        """Doctor cannot GET child if collaboration service returns False."""
        mock_check.return_value = False
        
        # Create a child
        self.auth_parent()
        create_resp = self.client.post('/api/profiles/children/', self.child_data)
        child_id = create_resp.data['id']
        
        # Doctor tries to retrieve
        self.auth_doctor()
        resp = self.client.get(f'/api/profiles/children/{child_id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        import uuid
        mock_check.assert_called_once_with(uuid.UUID(str(self.doctor_id)), uuid.UUID(child_id), 'profile')

    @patch('profiles.permissions.check_collaboration_access')
    def test_doctor_cannot_update_shared_child(self, mock_check):
        """Even with profile access, doctor cannot update."""
        mock_check.return_value = True
        
        self.auth_parent()
        create_resp = self.client.post('/api/profiles/children/', self.child_data)
        child_id = create_resp.data['id']
        
        self.auth_doctor()
        resp = self.client.patch(f'/api/profiles/children/{child_id}/', {'first_name': 'Hacked'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_requests_blocked(self):
        self.unauth()
        resp1 = self.client.get('/api/profiles/parent/me/')
        resp2 = self.client.get('/api/profiles/children/')
        self.assertEqual(resp1.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(resp2.status_code, status.HTTP_401_UNAUTHORIZED)


class InternalOwnershipContextTests(TestCase):
    def test_owned_child_returns_minimized_context_only(self):
        parent_id = uuid.uuid4()
        child = Child.objects.create(
            parent_id=parent_id,
            first_name='Demo',
            date_of_birth='2023-05-10',
            sex='F',
        )
        client = APIClient()
        with patch.dict('os.environ', {'INTERNAL_SERVICE_TOKEN': 'x' * 64}):
            response = client.get(
                f'/api/profiles/internal/check-ownership/?parent_id={parent_id}&child_id={child.id}',
                HTTP_X_INTERNAL_SERVICE_TOKEN='x' * 64,
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['owned'])
        self.assertEqual(response.data['child']['sex'], 'F')
        self.assertNotIn('first_name', response.data['child'])
