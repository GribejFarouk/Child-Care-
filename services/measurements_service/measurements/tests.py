"""
Measurements Service — Integration Tests.

All tests run against an in-memory SQLite database with no external services.
JWT tokens are simulated by creating minimal signed tokens using the same
JWT_SIGNING_KEY, which is the same approach as profile_service tests.
"""
import uuid
from decimal import Decimal
from datetime import date
import datetime
from unittest.mock import patch

from django.test import TestCase
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken

from .models import Measurement


def make_token(user_id=None, role='parent', email='test@test.com'):
    """
    Create a minimal signed JWT for testing without calling auth_service.
    Uses the shared JWT_SIGNING_KEY from settings.
    """
    if user_id is None:
        user_id = uuid.uuid4()

    token = AccessToken()
    token['user_id'] = str(user_id)
    token['role'] = role
    token['email'] = email
    return str(token), user_id


class MeasurementCreateTests(TestCase):
    """Tests for POST /api/measurements/"""

    def setUp(self):
        self.client = APIClient()
        self.token, self.user_id = make_token(role='parent')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.child_id = uuid.uuid4()

    def _payload(self, **overrides):
        base = {
            'child_id': str(self.child_id),
            'date_recorded': str(date.today() - datetime.timedelta(days=1)),
            'weight_kg': '10.50',
            'height_cm': '80.00',
            'source': 'manual',
        }
        base.update(overrides)
        return base

    def test_create_measurement_success(self):
        """Parent can create a measurement and gets 201."""
        resp = self.client.post('/api/measurements/', self._payload())
        if resp.status_code != 201:
            raise Exception(f"ERROR: {resp.data}")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['child_id'], str(self.child_id))

    def test_bmi_auto_calculated(self):
        """BMI is auto-calculated from weight and height: weight / (height_m)^2."""
        resp = self.client.post('/api/measurements/', self._payload(
            weight_kg='10.50', height_cm='80.00'
        ))
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # 10.50 / (0.80)^2 = 10.50 / 0.64 ≈ 16.41
        bmi = Decimal(resp.data['bmi'])
        self.assertAlmostEqual(float(bmi), 16.41, delta=0.05)

    def test_bmi_calculation_correctness(self):
        """Verify exact BMI formula: w / (h/100)^2."""
        resp = self.client.post('/api/measurements/', self._payload(
            weight_kg='14.10', height_cm='96.00'
        ))
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        expected_bmi = round(14.10 / (0.96 ** 2), 2)
        self.assertAlmostEqual(float(resp.data['bmi']), expected_bmi, delta=0.01)

    def test_bmi_null_when_height_missing(self):
        """BMI is null when height is not provided."""
        resp = self.client.post('/api/measurements/', self._payload(
            height_cm=None, weight_kg='10.00'
        ), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data['bmi'])

    def test_bmi_null_when_weight_missing(self):
        """BMI is null when weight is not provided."""
        resp = self.client.post('/api/measurements/', self._payload(
            weight_kg=None, height_cm='80.00'
        ), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data['bmi'])

    def test_parent_id_injected_from_jwt(self):
        """parent_id in response must match the authenticated user's JWT id."""
        resp = self.client.post('/api/measurements/', self._payload())
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['parent_id'], str(self.user_id))

    def test_parent_id_from_body_ignored(self):
        """parent_id sent in request body must be ignored; JWT value is used."""
        fake_parent = str(uuid.uuid4())
        resp = self.client.post('/api/measurements/', self._payload(parent_id=fake_parent))
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['parent_id'], str(self.user_id))

    def test_missing_date_rejected(self):
        """date_recorded is required."""
        payload = self._payload()
        del payload['date_recorded']
        resp = self.client.post('/api/measurements/', payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_child_id_rejected(self):
        """child_id is required."""
        payload = self._payload()
        del payload['child_id']
        resp = self.client.post('/api/measurements/', payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_source_default_is_manual(self):
        """source defaults to 'manual' if not provided."""
        payload = self._payload()
        del payload['source']
        resp = self.client.post('/api/measurements/', payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['source'], 'manual')

    def test_unauthenticated_blocked(self):
        """Unauthenticated request returns 401."""
        self.client.credentials()
        resp = self.client.post('/api/measurements/', self._payload())
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_doctor_blocked(self):
        """Doctors cannot create measurements in Phase 3 (403)."""
        doc_token, _ = make_token(role='doctor', email='doc@test.com')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {doc_token}')
        resp = self.client.post('/api/measurements/', self._payload())
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class MeasurementListTests(TestCase):
    """Tests for GET /api/measurements/"""

    def setUp(self):
        self.client = APIClient()
        self.token, self.user_id = make_token(role='parent')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.child_id = uuid.uuid4()
        self.other_child_id = uuid.uuid4()
        self.other_parent_id = uuid.uuid4()

        # Create 2 measurements for this parent
        Measurement.objects.create(
            child_id=self.child_id, parent_id=self.user_id,
            date_recorded=date.today() - datetime.timedelta(days=1), weight_kg=10.5, height_cm=80
        )
        Measurement.objects.create(
            child_id=self.other_child_id, parent_id=self.user_id,
            date_recorded=date.today() - datetime.timedelta(days=1), weight_kg=14.0, height_cm=96
        )
        # Create 1 measurement for another parent — must NOT appear in results
        Measurement.objects.create(
            child_id=self.child_id, parent_id=self.other_parent_id,
            date_recorded=date.today() - datetime.timedelta(days=1), weight_kg=12.0, height_cm=85
        )

    def test_list_returns_only_own_measurements(self):
        """Parent sees only their own measurements, not other parents'."""
        resp = self.client.get('/api/measurements/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data['results'] if isinstance(resp.data, dict) and 'results' in resp.data else resp.data
        self.assertEqual(len(results), 2)
        parent_ids = {m['parent_id'] for m in results}
        self.assertEqual(parent_ids, {str(self.user_id)})

    def test_filter_by_child_id(self):
        """?child_id= filters correctly to only that child's measurements."""
        resp = self.client.get('/api/measurements/', {'child_id': str(self.child_id)})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data['results'] if isinstance(resp.data, dict) and 'results' in resp.data else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['child_id'], str(self.child_id))

    @patch('measurements.views.publish_audit_event')
    @patch('measurements.views.get_collaboration_access_details')
    @patch('measurements.permissions.check_collaboration_access')
    def test_doctor_shared_list_is_read_only_scoped_and_audited(
        self, mock_access, mock_details, mock_audit
    ):
        mock_access.return_value = True
        mock_details.return_value = {'allowed': True, 'parent_id': str(self.user_id)}
        doctor_token, doctor_id = make_token(role='doctor', email='doctor@test.com')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {doctor_token}')

        resp = self.client.get('/api/measurements/', {'child_id': str(self.child_id)})

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data['results'] if isinstance(resp.data, dict) and 'results' in resp.data else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['parent_id'], str(self.user_id))
        mock_audit.assert_called_once()
        self.assertEqual(mock_audit.call_args.kwargs['parent_id'], str(self.user_id))
        self.assertEqual(mock_audit.call_args.kwargs['actor_id'], doctor_id)

    def test_unauthenticated_blocked(self):
        self.client.credentials()
        resp = self.client.get('/api/measurements/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class MeasurementUpdateDeleteTests(TestCase):
    """Tests for PATCH and DELETE /api/measurements/{id}/"""

    def setUp(self):
        self.client = APIClient()
        self.token, self.user_id = make_token(role='parent')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.child_id = uuid.uuid4()

        self.measurement = Measurement.objects.create(
            child_id=self.child_id, parent_id=self.user_id,
            date_recorded=date.today() - datetime.timedelta(days=1), weight_kg=10.5, height_cm=80
        )

        # Another parent's measurement
        other_parent = uuid.uuid4()
        self.other_measurement = Measurement.objects.create(
            child_id=self.child_id, parent_id=other_parent,
            date_recorded=date.today() - datetime.timedelta(days=1), weight_kg=12.0, height_cm=85
        )

    @patch('measurements.permissions.check_collaboration_access', return_value=True)
    def test_shared_doctor_cannot_patch_or_delete_measurement(self, mock_access):
        doctor_token, _ = make_token(role='doctor', email='doctor@test.com')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {doctor_token}')
        url = f'/api/measurements/{self.measurement.id}/'

        self.assertEqual(self.client.patch(url, {'weight_kg': '99.00'}).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_update(self):
        """Owner can PATCH their measurement."""
        resp = self.client.patch(
            f'/api/measurements/{self.measurement.id}/',
            {'notes': 'Updated note'}
        )
        if resp.status_code != status.HTTP_200_OK:
            print("PATCH failed:", resp.data)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['notes'], 'Updated note')

    def test_update_recalculates_bmi(self):
        """Updating weight triggers BMI recalculation."""
        resp = self.client.patch(
            f'/api/measurements/{self.measurement.id}/',
            {'weight_kg': '12.00'}
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        expected = round(12.00 / (0.80 ** 2), 2)
        self.assertAlmostEqual(float(resp.data['bmi']), expected, delta=0.01)

    def test_owner_can_delete(self):
        """Owner can DELETE their measurement."""
        resp = self.client.delete(f'/api/measurements/{self.measurement.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Measurement.objects.filter(id=self.measurement.id).exists())

    def test_non_owner_gets_404_on_update(self):
        """Non-owner gets 404 on PATCH (queryset filtering, no info leak)."""
        resp = self.client.patch(
            f'/api/measurements/{self.other_measurement.id}/',
            {'notes': 'Hack attempt'}
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_owner_gets_404_on_delete(self):
        """Non-owner gets 404 on DELETE."""
        resp = self.client.delete(f'/api/measurements/{self.other_measurement.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class OCRImportProvenanceTests(TestCase):
    """Tests for ocr_import_id provenance and internal creation."""

    def setUp(self):
        self.client = APIClient()
        self.token, self.user_id = make_token(role='parent')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.child_id = uuid.uuid4()
        self.ocr_import_id = str(uuid.uuid4())

    def _payload(self, **overrides):
        base = {
            'child_id': str(self.child_id),
            'date_recorded': str(date.today() - datetime.timedelta(days=1)),
            'weight_kg': '10.50',
            'height_cm': '80.00',
            'source': 'manual',
            'ocr_import_id': self.ocr_import_id
        }
        base.update(overrides)
        return base

    def test_public_post_cannot_set_ocr_import_id(self):
        """Public POST ignores ocr_import_id because it is read-only."""
        resp = self.client.post('/api/measurements/', self._payload())
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data.get('ocr_import_id'))
        
        # Verify in DB
        meas = Measurement.objects.get(id=resp.data['id'])
        self.assertIsNone(meas.ocr_import_id)

    def test_public_patch_cannot_change_ocr_import_id(self):
        """Public PATCH cannot set or modify ocr_import_id."""
        # Create without ocr_import_id
        payload = self._payload()
        payload.pop('ocr_import_id', None)
        resp = self.client.post('/api/measurements/', payload)
        meas_id = resp.data['id']
        
        # Attempt to patch
        resp_patch = self.client.patch(f'/api/measurements/{meas_id}/', {'ocr_import_id': self.ocr_import_id})
        self.assertEqual(resp_patch.status_code, status.HTTP_200_OK)
        
        # Verify in DB
        meas = Measurement.objects.get(id=meas_id)
        self.assertIsNone(meas.ocr_import_id)

    def test_internal_create_can_set_ocr_import_id(self):
        """Internal endpoint can securely set ocr_import_id."""
        self.client.credentials()  # Remove JWT
        import os
        expected_token = os.environ.get('INTERNAL_SERVICE_TOKEN')
        headers = {
            'HTTP_X_INTERNAL_SERVICE_TOKEN': expected_token,
            'HTTP_X_PARENT_ID': str(self.user_id)
        }
        resp = self.client.post('/api/measurements/internal/create/', self._payload(), **headers)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['ocr_import_id'], str(self.ocr_import_id))

    def test_internal_create_invalid_token_rejected(self):
        """Invalid internal token is rejected."""
        self.client.credentials()
        headers = {
            'HTTP_X_INTERNAL_SERVICE_TOKEN': 'invalid_token',
            'HTTP_X_PARENT_ID': str(self.user_id)
        }
        resp = self.client.post('/api/measurements/internal/create/', self._payload(), **headers)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_repeated_internal_create_produces_one_row(self):
        """Repeated internal create with same ocr_import_id returns the same measurement (idempotency)."""
        self.client.credentials()
        import os
        expected_token = os.environ.get('INTERNAL_SERVICE_TOKEN')
        headers = {
            'HTTP_X_INTERNAL_SERVICE_TOKEN': expected_token,
            'HTTP_X_PARENT_ID': str(self.user_id)
        }
        resp1 = self.client.post('/api/measurements/internal/create/', self._payload(), **headers)
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        
        resp2 = self.client.post('/api/measurements/internal/create/', self._payload(), **headers)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        
        self.assertEqual(resp1.data['id'], resp2.data['id'])
        self.assertEqual(Measurement.objects.filter(ocr_import_id=self.ocr_import_id).count(), 1)


class InternalMeasurementContextTests(TestCase):
    def test_context_returns_only_minimized_measurement_fields(self):
        parent_id = uuid.uuid4()
        child_id = uuid.uuid4()
        Measurement.objects.create(
            parent_id=parent_id,
            child_id=child_id,
            date_recorded=date.today(),
            weight_kg=Decimal('12.00'),
            height_cm=Decimal('90.00'),
            notes='private note',
        )
        client = APIClient()
        with patch.dict('os.environ', {'INTERNAL_SERVICE_TOKEN': 'x' * 64}):
            response = client.get(
                f'/api/measurements/internal/context/?parent_id={parent_id}&child_id={child_id}',
                HTTP_X_INTERNAL_SERVICE_TOKEN='x' * 64,
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data['measurements'][0]
        self.assertIn('bmi', row)
        self.assertNotIn('notes', row)
        self.assertNotIn('parent_id', row)
