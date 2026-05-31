from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

User = get_user_model()


class AuthRegistrationTests(TestCase):
    """Tests for parent and doctor registration."""

    def setUp(self):
        self.client = APIClient()

    def test_register_parent(self):
        """Parent registration creates user with role=parent and returns tokens."""
        resp = self.client.post('/api/auth/register/parent/', {
            'email': 'parent@test.com',
            'password': 'TestPass123!',
            'first_name': 'Asma',
            'last_name': 'Ben Youssef',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['user']['role'], 'parent')
        self.assertIn('access', resp.data['tokens'])
        self.assertIn('refresh', resp.data['tokens'])
        self.assertTrue(User.objects.filter(email='parent@test.com', role='parent').exists())

    def test_register_doctor(self):
        """Doctor registration creates user with role=doctor and returns tokens."""
        resp = self.client.post('/api/auth/register/doctor/', {
            'email': 'doctor@test.com',
            'password': 'TestPass123!',
            'first_name': 'Hichem',
            'last_name': 'Trabelsi',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['user']['role'], 'doctor')
        self.assertIn('access', resp.data['tokens'])

    def test_register_duplicate_email(self):
        """Registering with an existing email returns 400."""
        User.objects.create_user(
            email='dup@test.com', password='TestPass123!',
            first_name='A', last_name='B', role='parent',
        )
        resp = self.client.post('/api/auth/register/parent/', {
            'email': 'dup@test.com',
            'password': 'TestPass123!',
            'first_name': 'C',
            'last_name': 'D',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_weak_password(self):
        """Password that is too short is rejected."""
        resp = self.client.post('/api/auth/register/parent/', {
            'email': 'weak@test.com',
            'password': '123',
            'first_name': 'A',
            'last_name': 'B',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class AuthLoginTests(TestCase):
    """Tests for login endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='login@test.com', password='TestPass123!',
            first_name='Asma', last_name='Ben', role='parent',
        )

    def test_login_valid(self):
        """Valid credentials return tokens and user data."""
        resp = self.client.post('/api/auth/login/', {
            'email': 'login@test.com',
            'password': 'TestPass123!',
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', resp.data)
        self.assertEqual(resp.data['user']['email'], 'login@test.com')

    @patch('authentication.views.publish_audit_event')
    def test_parent_login_is_visible_in_own_activity_journal(self, mock_publish):
        resp = self.client.post('/api/auth/login/', {
            'email': 'login@test.com',
            'password': 'TestPass123!',
        })

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        kwargs = mock_publish.call_args.kwargs
        self.assertEqual(kwargs['parent_id'], self.user.id)
        self.assertTrue(kwargs['visible_to_parent'])
        self.assertEqual(kwargs['summary'], 'Connexion réussie.')

    def test_login_wrong_password(self):
        """Wrong password returns 401."""
        resp = self.client.post('/api/auth/login/', {
            'email': 'login@test.com',
            'password': 'WrongPassword!',
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('authentication.views.publish_audit_event')
    def test_failed_parent_login_is_visible_without_exposing_email(self, mock_publish):
        resp = self.client.post('/api/auth/login/', {
            'email': 'login@test.com',
            'password': 'WrongPassword!',
        })

        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        kwargs = mock_publish.call_args.kwargs
        self.assertEqual(kwargs['parent_id'], self.user.id)
        self.assertTrue(kwargs['visible_to_parent'])
        self.assertNotIn(self.user.email, kwargs['summary'])

    def test_login_nonexistent(self):
        """Non-existent email returns 401."""
        resp = self.client.post('/api/auth/login/', {
            'email': 'nobody@test.com',
            'password': 'TestPass123!',
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class AuthMeTests(TestCase):
    """Tests for /me/ endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='me@test.com', password='TestPass123!',
            first_name='Asma', last_name='Ben', role='parent',
        )

    def _login(self):
        resp = self.client.post('/api/auth/login/', {
            'email': 'me@test.com', 'password': 'TestPass123!',
        })
        return resp.data['tokens']['access']

    def test_me_authenticated(self):
        """Authenticated user gets their data."""
        token = self._login()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['email'], 'me@test.com')

    def test_me_unauthenticated(self):
        """Unauthenticated request returns 401."""
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        """Refresh token returns new access token."""
        login_resp = self.client.post('/api/auth/login/', {
            'email': 'me@test.com', 'password': 'TestPass123!',
        })
        refresh = login_resp.data['tokens']['refresh']
        resp = self.client.post('/api/auth/token/refresh/', {'refresh': refresh})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)

    def test_logout(self):
        """Logout blacklists the refresh token."""
        login_resp = self.client.post('/api/auth/login/', {
            'email': 'me@test.com', 'password': 'TestPass123!',
        })
        access = login_resp.data['tokens']['access']
        refresh = login_resp.data['tokens']['refresh']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        resp = self.client.post('/api/auth/logout/', {'refresh': refresh})
        self.assertEqual(resp.status_code, status.HTTP_205_RESET_CONTENT)
        # Verify refresh token is no longer usable
        resp2 = self.client.post('/api/auth/token/refresh/', {'refresh': refresh})
        self.assertEqual(resp2.status_code, status.HTTP_401_UNAUTHORIZED)
