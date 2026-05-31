"""
Analytics Service — Integration Tests.

Tests cover: rule engine correctness, WHO reference lookup, API endpoints,
alert ownership, duplicate-alert protection, mark-read, and access control.
"""
import uuid
from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken

from .models import Alert
from .rules import (
    analyze_measurement,
    SUDDEN_WEIGHT_CHANGE_KG,
)
from .oms_references import (
    get_growth_reference,
    get_growth_curve,
    is_metric_available,
    get_oms_reference,
)


def make_token(user_id=None, role='parent', email='test@test.com'):
    """Create a signed JWT for testing without calling auth_service."""
    if user_id is None:
        user_id = uuid.uuid4()
    token = AccessToken()
    token['user_id'] = str(user_id)
    token['role'] = role
    token['email'] = email
    return str(token), user_id


def make_payload(child_id, measurement_id=None, weight=None, height=None, bmi=None,
                 head=None, previous=None, age_months=None, sex=None):
    """Build an analyze request payload."""
    payload = {'child_id': str(child_id)}
    if measurement_id:
        payload['measurement_id'] = str(measurement_id)
    if weight is not None:
        payload['weight_kg'] = str(weight)
    if height is not None:
        payload['height_cm'] = str(height)
    if bmi is not None:
        payload['bmi'] = str(bmi)
    if head is not None:
        payload['head_circumference_cm'] = str(head)
    if previous is not None:
        payload['previous_measurement'] = previous
    if age_months is not None:
        payload['age_at_recording_months'] = age_months
    if sex is not None:
        payload['sex'] = sex
    return payload


# ─────────────────────────────────────────────────────────────────────────────
# WHO Reference Lookup Tests
# ─────────────────────────────────────────────────────────────────────────────

class WHOReferenceTests(TestCase):
    """Tests for the canonical WHO reference module (oms_references.py)."""

    def test_valid_reference_returns_p3_p50_p97(self):
        """Valid lookup returns available=True with P3/P50/P97 Decimals."""
        ref = get_growth_reference('M', 'weight', 12)
        self.assertTrue(ref['available'])
        self.assertIn('p3', ref)
        self.assertIn('p50', ref)
        self.assertIn('p97', ref)
        self.assertEqual(ref['sex'], 'M')
        self.assertEqual(ref['metric'], 'weight')
        self.assertEqual(ref['age_months'], 12)

    def test_lookup_interpolates_between_ages(self):
        """Age between two known points returns interpolated values."""
        ref = get_growth_reference('M', 'weight', 10)  # Between 9 and 12
        self.assertTrue(ref['available'])
        # P50 at 9mo = 8.9, P50 at 12mo = 9.6 → P50 at 10mo should be ~9.13
        p50 = float(ref['p50'])
        self.assertGreater(p50, 8.9)
        self.assertLess(p50, 9.6)

    def test_head_circumference_after_60_unavailable(self):
        """Head circumference reference is NOT available after 60 months."""
        self.assertFalse(is_metric_available('M', 'head_circumference', 72))
        ref = get_growth_reference('M', 'head_circumference', 72)
        self.assertFalse(ref['available'])
        self.assertIn('reason', ref)

    def test_weight_at_144_unavailable(self):
        """Weight-for-age reference is NOT available at 144 months (12 years)."""
        self.assertFalse(is_metric_available('M', 'weight', 144))
        ref = get_growth_reference('M', 'weight', 144)
        self.assertFalse(ref['available'])
        self.assertIn('reason', ref)

    def test_weight_at_120_available(self):
        """Weight-for-age reference IS available at 120 months (10 years)."""
        self.assertTrue(is_metric_available('M', 'weight', 120))
        ref = get_growth_reference('M', 'weight', 120)
        self.assertTrue(ref['available'])

    def test_height_at_180_available(self):
        """Height-for-age reference is available at 180 months (15 years)."""
        self.assertTrue(is_metric_available('M', 'height', 180))
        ref = get_growth_reference('M', 'height', 180)
        self.assertTrue(ref['available'])

    def test_bmi_at_168_available(self):
        """BMI-for-age reference is available at 168 months (14 years)."""
        self.assertTrue(is_metric_available('F', 'bmi', 168))
        ref = get_growth_reference('F', 'bmi', 168)
        self.assertTrue(ref['available'])

    def test_get_growth_curve_returns_points(self):
        """get_growth_curve returns available=True with a list of points."""
        result = get_growth_curve('M', 'weight', 0, 60)
        self.assertTrue(result['available'])
        self.assertGreater(len(result['points']), 5)
        for pt in result['points']:
            self.assertIn('age_months', pt)
            self.assertIn('p3', pt)
            self.assertIn('p50', pt)
            self.assertIn('p97', pt)

    def test_get_growth_curve_respects_age_limits(self):
        """Weight curve max is 120. Requesting 0-228 should not return points > 120."""
        result = get_growth_curve('M', 'weight', 0, 228)
        self.assertTrue(result['available'])
        for pt in result['points']:
            self.assertLessEqual(pt['age_months'], 120)

    def test_get_growth_curve_unavailable_range(self):
        """Requesting weight for 130-228 should return unavailable."""
        result = get_growth_curve('M', 'weight', 130, 228)
        self.assertFalse(result['available'])

    def test_backward_compat_get_oms_reference(self):
        """get_oms_reference backward-compat function works for available data."""
        ref = get_oms_reference('M', 'weight', 12)
        self.assertIsNotNone(ref)
        self.assertIn('p3', ref)
        self.assertIn('p50', ref)
        self.assertIn('p97', ref)

    def test_backward_compat_get_oms_reference_unavailable(self):
        """get_oms_reference returns None for unavailable metric/age."""
        ref = get_oms_reference('M', 'weight', 144)
        self.assertIsNone(ref)

    def test_female_reference_different_from_male(self):
        """F and M references at the same age should be different."""
        ref_m = get_growth_reference('M', 'weight', 12)
        ref_f = get_growth_reference('F', 'weight', 12)
        self.assertTrue(ref_m['available'])
        self.assertTrue(ref_f['available'])
        # P50 values should differ between sexes
        self.assertNotEqual(float(ref_m['p50']), float(ref_f['p50']))


# ─────────────────────────────────────────────────────────────────────────────
# Rule Engine Unit Tests
# ─────────────────────────────────────────────────────────────────────────────

class RuleEngineUnitTests(TestCase):
    """Unit tests for analytics/rules.py — no HTTP, no DB."""

    def _run(self, weight=None, height=None, bmi=None, head=None,
             age_months=None, sex='M', previous=None):
        current = {
            'child_id': str(uuid.uuid4()),
            'parent_id': str(uuid.uuid4()),
            'measurement_id': str(uuid.uuid4()),
            'weight_kg': weight,
            'height_cm': height,
            'bmi': bmi,
            'head_circumference_cm': head,
            'age_at_recording_months': age_months,
            'sex': sex,
        }
        return analyze_measurement(current, previous)

    def test_normal_measurement_no_alerts(self):
        """Normal BMI, no missing data → zero alerts."""
        # P50 BMI at 12mo M ≈ 16.4, well within P3-P97
        alerts = self._run(weight=10.5, height=80.0, bmi=16.4, age_months=12)
        growth_alerts = [a for a in alerts if a['alert_type'] in ('bmi', 'growth')]
        self.assertEqual(len(growth_alerts), 0)

    def test_bmi_below_p3_triggers_warning(self):
        """BMI below P3 → bmi warning alert (using WHO lookup)."""
        # P3 BMI at 12mo M ≈ 13.4, so BMI=10.0 is well below
        alerts = self._run(weight=8.0, height=80.0, bmi=10.0, age_months=12)
        types = [a['alert_type'] for a in alerts]
        self.assertIn('bmi', types)

    def test_bmi_above_p97_triggers_warning(self):
        """BMI above P97 → bmi warning alert (using WHO lookup)."""
        # P97 BMI at 12mo M ≈ 19.5, so BMI=25.0 is well above
        alerts = self._run(weight=20.0, height=80.0, bmi=25.0, age_months=12)
        types = [a['alert_type'] for a in alerts]
        self.assertIn('bmi', types)

    def test_bmi_no_alert_without_age(self):
        """BMI alert should NOT trigger when age is not available."""
        # Even with extreme BMI, no OMS comparison without age
        alerts = self._run(weight=20.0, height=80.0, bmi=25.0, age_months=None)
        bmi_alerts = [a for a in alerts if a['alert_type'] == 'bmi']
        self.assertEqual(len(bmi_alerts), 0)

    def test_missing_weight_triggers_info(self):
        """Missing weight → missing_data info alert."""
        alerts = self._run(weight=None, height=80.0, bmi=None)
        types = [a['alert_type'] for a in alerts]
        self.assertIn('missing_data', types)

    def test_missing_height_triggers_info(self):
        """Missing height → missing_data info alert."""
        alerts = self._run(weight=10.0, height=None, bmi=None)
        types = [a['alert_type'] for a in alerts]
        self.assertIn('missing_data', types)

    def test_sudden_weight_change_triggers_warning(self):
        """Weight change >= threshold → growth warning."""
        delta = float(SUDDEN_WEIGHT_CHANGE_KG) + 0.5
        previous = {'weight_kg': 10.0, 'height_cm': 80.0}
        alerts = self._run(weight=10.0 + delta, height=80.0, bmi=16.0, previous=previous)
        types = [a['alert_type'] for a in alerts]
        self.assertIn('growth', types)

    def test_normal_weight_change_no_growth_alert(self):
        """Small weight change → no growth alert."""
        previous = {'weight_kg': 10.0, 'height_cm': 80.0}
        alerts = self._run(weight=10.3, height=80.0, bmi=16.1, previous=previous, age_months=12)
        growth_alerts = [a for a in alerts if a['alert_type'] == 'growth' and 'Variation' in a['title']]
        self.assertEqual(len(growth_alerts), 0)

    def test_warning_alert_has_recommendation(self):
        """All warning alerts must have a non-empty recommendation field."""
        alerts = self._run(weight=8.0, height=80.0, bmi=10.0, age_months=12)
        for a in alerts:
            if a['severity'] == 'warning':
                self.assertTrue(len(a['recommendation']) > 0)

    def test_info_alert_recommendation_empty(self):
        """Info (missing data) alerts have empty recommendation."""
        alerts = self._run(weight=None, height=80.0)
        for a in alerts:
            if a['alert_type'] == 'missing_data':
                self.assertEqual(a['recommendation'], '')


# ─────────────────────────────────────────────────────────────────────────────
# OMS Rule Unit Tests — P3/P97 comparison
# ─────────────────────────────────────────────────────────────────────────────

class OMSRuleUnitTests(TestCase):
    """Tests for the OMS P3/P97 comparison rules (Rules 8–10)."""

    def _run(self, weight=None, height=None, head=None, bmi=None,
             age_months=None, sex='M', previous=None):
        current = {
            'child_id': str(uuid.uuid4()),
            'parent_id': str(uuid.uuid4()),
            'measurement_id': str(uuid.uuid4()),
            'weight_kg': weight,
            'height_cm': height,
            'bmi': bmi,
            'head_circumference_cm': head,
            'age_at_recording_months': age_months,
            'sex': sex,
        }
        return analyze_measurement(current, previous)

    def test_weight_above_p97_triggers_oms_alert(self):
        """20kg at 12mo M (P97=11.9kg) → growth alert."""
        alerts = self._run(weight=20.0, height=75.0, bmi=35.0, age_months=12, sex='M')
        titles = [a['title'] for a in alerts]
        self.assertTrue(any('P97' in t for t in titles),
                        f'Expected OMS P97 alert in: {titles}')

    def test_weight_below_p3_triggers_oms_alert(self):
        """5kg at 24mo M (P3=9.5kg) → growth alert."""
        alerts = self._run(weight=5.0, height=80.0, bmi=7.8, age_months=24, sex='M')
        titles = [a['title'] for a in alerts]
        self.assertTrue(any('P3' in t for t in titles),
                        f'Expected OMS P3 alert in: {titles}')

    def test_normal_weight_no_oms_alert(self):
        """9.5kg at 12mo M (within P3–P97) → no OMS alert."""
        alerts = self._run(weight=9.5, height=75.0, bmi=16.9, age_months=12, sex='M')
        oms_alerts = [a for a in alerts if 'P3' in a.get('title', '') or 'P97' in a.get('title', '')]
        self.assertEqual(len(oms_alerts), 0, f'No OMS alert expected, got: {[a["title"] for a in oms_alerts]}')

    def test_no_alert_when_reference_unavailable(self):
        """Weight at 144mo → no OMS alert (reference unavailable)."""
        alerts = self._run(weight=50.0, height=150.0, bmi=22.0, age_months=144, sex='M')
        weight_oms_alerts = [a for a in alerts if 'Poids' in a.get('title', '') and 'OMS' in a.get('title', '')]
        self.assertEqual(len(weight_oms_alerts), 0)

    def test_oms_alert_has_disclaimer(self):
        """OMS alerts must include medical disclaimer."""
        alerts = self._run(weight=20.0, height=75.0, bmi=35.0, age_months=12, sex='M')
        growth_alerts = [a for a in alerts if 'P97' in a.get('title', '')]
        self.assertTrue(len(growth_alerts) > 0)
        rec = growth_alerts[0]['recommendation']
        self.assertIn('diagnostic', rec.lower())
        self.assertIn('pédiatre', rec.lower())

    def test_female_reference_used(self):
        """15kg at 12mo F (P97=11.3kg) → triggers alert."""
        alerts = self._run(weight=15.0, height=74.0, bmi=27.4, age_months=12, sex='F')
        titles = [a['title'] for a in alerts]
        self.assertTrue(any('P97' in t for t in titles),
                        f'Expected female P97 alert in: {titles}')

    def test_bmi_above_p97_triggers_alert(self):
        """BMI above P97 at 84mo triggers bmi alert (using WHO lookup)."""
        # P97 BMI at 84mo M ≈ 20.3. BMI=25 is well above.
        alerts = self._run(weight=25.0, height=120.0, bmi=25.0, age_months=84, sex='M')
        bmi_alerts = [a for a in alerts if a['alert_type'] == 'bmi']
        self.assertTrue(len(bmi_alerts) > 0, f'Expected BMI alert, got none')


# ─────────────────────────────────────────────────────────────────────────────
# Analyze Endpoint Tests
# ─────────────────────────────────────────────────────────────────────────────

class AnalyzeEndpointTests(TestCase):
    """Tests for POST /api/analytics/measurements/analyze/"""

    def setUp(self):
        self.client = APIClient()
        self.token, self.user_id = make_token(role='parent')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.child_id = uuid.uuid4()

    def test_normal_measurement_returns_no_alerts(self):
        """Normal measurement → 201 with empty alert list."""
        payload = make_payload(self.child_id, bmi=16.0, weight=10.5, height=80.0, age_months=12)
        resp = self.client.post('/api/analytics/measurements/analyze/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(resp.data), 0)

    def test_low_bmi_creates_alert(self):
        """Low BMI → 201 with bmi warning alert."""
        payload = make_payload(self.child_id, bmi=9.0, weight=7.0, height=80.0, age_months=12)
        resp = self.client.post('/api/analytics/measurements/analyze/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertGreater(len(resp.data), 0)
        types = [a['alert_type'] for a in resp.data]
        self.assertIn('bmi', types)

    def test_parent_id_injected_from_jwt(self):
        """parent_id in created alert must match JWT, not any body value."""
        payload = make_payload(self.child_id, bmi=9.0, weight=7.0, height=80.0, age_months=12)
        resp = self.client.post('/api/analytics/measurements/analyze/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        for alert in resp.data:
            self.assertEqual(alert['parent_id'], str(self.user_id))

    def test_duplicate_analyze_does_not_create_duplicate_alert(self):
        """Calling analyze twice with the same measurement_id creates alert only once."""
        m_id = uuid.uuid4()
        payload = make_payload(self.child_id, measurement_id=m_id, bmi=9.0, weight=7.0, height=80.0, age_months=12)
        resp1 = self.client.post('/api/analytics/measurements/analyze/', payload, format='json')
        resp2 = self.client.post('/api/analytics/measurements/analyze/', payload, format='json')
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        # Second call returns 0 new alerts (all already exist)
        self.assertEqual(len(resp2.data), 0)
        # DB should have only 1 alert for this measurement+type
        count = Alert.objects.filter(measurement_id=m_id).count()
        self.assertEqual(count, len(resp1.data))

    def test_unauthenticated_blocked(self):
        self.client.credentials()
        resp = self.client.post('/api/analytics/measurements/analyze/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_doctor_blocked(self):
        doc_token, _ = make_token(role='doctor')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {doc_token}')
        payload = make_payload(self.child_id, bmi=16.0)
        resp = self.client.post('/api/analytics/measurements/analyze/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ─────────────────────────────────────────────────────────────────────────────
# Growth Reference API Tests
# ─────────────────────────────────────────────────────────────────────────────

class GrowthReferenceAPITests(TestCase):
    """Tests for GET /api/analytics/references/growth/"""

    def setUp(self):
        self.client = APIClient()

    def test_returns_curve_points(self):
        """Valid request returns available=True with points array."""
        resp = self.client.get('/api/analytics/references/growth/', {
            'sex': 'M', 'metric': 'weight', 'min_age_months': 0, 'max_age_months': 60
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['available'])
        self.assertGreater(len(resp.data['points']), 5)

    def test_returns_unavailable_for_bad_range(self):
        """Weight at 130-228 months returns unavailable."""
        resp = self.client.get('/api/analytics/references/growth/', {
            'sex': 'M', 'metric': 'weight', 'min_age_months': 130, 'max_age_months': 228
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data['available'])

    def test_missing_metric_returns_400(self):
        """Missing metric parameter returns 400."""
        resp = self.client.get('/api/analytics/references/growth/', {'sex': 'M'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_auth_required(self):
        """Growth reference endpoint does not require authentication."""
        resp = self.client.get('/api/analytics/references/growth/', {
            'sex': 'F', 'metric': 'height', 'min_age_months': 0, 'max_age_months': 228
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['available'])

    def test_bmi_curve_extends_to_228(self):
        """BMI curve includes points up to 228 months."""
        resp = self.client.get('/api/analytics/references/growth/', {
            'sex': 'M', 'metric': 'bmi', 'min_age_months': 0, 'max_age_months': 228
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['available'])
        max_age = max(pt['age_months'] for pt in resp.data['points'])
        self.assertEqual(max_age, 228)

    def test_head_circumference_capped_at_60(self):
        """Head circumference points do not exceed 60 months."""
        resp = self.client.get('/api/analytics/references/growth/', {
            'sex': 'M', 'metric': 'head_circumference', 'min_age_months': 0, 'max_age_months': 228
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['available'])
        max_age = max(pt['age_months'] for pt in resp.data['points'])
        self.assertLessEqual(max_age, 60)


# ─────────────────────────────────────────────────────────────────────────────
# Alert List & Mark-Read Tests
# ─────────────────────────────────────────────────────────────────────────────

class AlertListTests(TestCase):
    """Tests for GET /api/analytics/alerts/"""

    def setUp(self):
        self.client = APIClient()
        self.token, self.user_id = make_token(role='parent')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.child_id = uuid.uuid4()
        self.other_parent_id = uuid.uuid4()

        Alert.objects.create(
            child_id=self.child_id, parent_id=self.user_id,
            alert_type='bmi', severity='warning',
            title='Test', message='Test', recommendation='Consult'
        )
        Alert.objects.create(
            child_id=self.child_id, parent_id=self.other_parent_id,
            alert_type='bmi', severity='warning',
            title='Other', message='Other', recommendation='Consult'
        )

    def test_list_returns_only_own_alerts(self):
        """Parent sees only their own alerts."""
        resp = self.client.get('/api/analytics/alerts/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data['results'] if isinstance(resp.data, dict) and 'results' in resp.data else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['parent_id'], str(self.user_id))

    def test_unauthenticated_blocked(self):
        self.client.credentials()
        resp = self.client.get('/api/analytics/alerts/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class AlertMarkReadTests(TestCase):
    """Tests for PATCH /api/analytics/alerts/{id}/read/"""

    def setUp(self):
        self.client = APIClient()
        self.token, self.user_id = make_token(role='parent')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.child_id = uuid.uuid4()

        self.alert = Alert.objects.create(
            child_id=self.child_id, parent_id=self.user_id,
            alert_type='bmi', severity='warning',
            title='Test', message='Test', recommendation='Consult',
            is_read=False
        )
        other = uuid.uuid4()
        self.other_alert = Alert.objects.create(
            child_id=self.child_id, parent_id=other,
            alert_type='bmi', severity='info',
            title='Other', message='Other', recommendation=''
        )

    def test_mark_alert_as_read(self):
        """Owner can mark their alert as read."""
        resp = self.client.patch(f'/api/analytics/alerts/{self.alert.id}/read/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['is_read'])
        self.alert.refresh_from_db()
        self.assertTrue(self.alert.is_read)

    def test_non_owner_gets_404(self):
        """Non-owner gets 404 on mark-read."""
        resp = self.client.patch(f'/api/analytics/alerts/{self.other_alert.id}/read/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ---------- Notification behaviour ──────────────────────────────────────

from unittest.mock import patch, MagicMock
import requests as _requests_lib


class AnalyticsNotificationTests(TestCase):
    """Verify that the analyze endpoint fires notifications for high/elevated risk
    and gracefully handles notification service failures."""

    def setUp(self):
        self.client = APIClient()
        self.token, self.uid = make_token()
        self.child_id = uuid.uuid4()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def _analyze(self, weight=10.5, height=80.0, bmi=16.4, age_months=12, **extra):
        payload = make_payload(
            self.child_id,
            weight=weight,
            height=height,
            bmi=bmi,
            age_months=age_months,
        )
        payload.update(extra)
        return self.client.post('/api/analytics/measurements/analyze/', payload, format='json')

    @patch('requests.post')
    def test_high_risk_triggers_notification(self, mock_post):
        """Extreme values should trigger elevated/high risk and fire a notification POST."""
        mock_post.return_value = MagicMock(status_code=201)
        # Very low weight for age should trigger high risk
        resp = self._analyze(weight=2.5, height=80.0, bmi=3.9, age_months=12)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # The notification POST must have been called
        self.assertTrue(mock_post.called, "Expected requests.post to be called for high-risk notification")
        # Verify at least one call contains analytics_alert in the JSON payload
        found_alert = False
        for call in mock_post.call_args_list:
            json_arg = call.kwargs.get('json') or (call[1].get('json') if len(call) > 1 else None)
            if json_arg and isinstance(json_arg, list):
                for notif in json_arg:
                    if notif.get('notification_type') == 'analytics_alert':
                        found_alert = True
                        break
        self.assertTrue(found_alert, "Expected analytics_alert in notification payload")

    @patch('requests.post')
    def test_normal_risk_no_notification(self, mock_post):
        """Normal values should NOT trigger any notification POST."""
        mock_post.return_value = MagicMock(status_code=201)
        resp = self._analyze(weight=10.5, height=80.0, bmi=16.4, age_months=12)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # For normal risk, no notification should be sent
        # Check that no call to requests.post contains analytics_alert
        for call in mock_post.call_args_list:
            json_arg = call.kwargs.get('json') or (call[1].get('json') if len(call) > 1 else None)
            if json_arg and isinstance(json_arg, list):
                for notif in json_arg:
                    self.assertNotEqual(
                        notif.get('notification_type'), 'analytics_alert',
                        "Normal risk should NOT trigger analytics_alert notification"
                    )

    @patch('requests.post')
    def test_notification_failure_does_not_fail_analysis(self, mock_post):
        """If notification service is unreachable, analyze must still return 201."""
        mock_post.side_effect = _requests_lib.exceptions.ConnectionError("Connection refused")
        resp = self._analyze(weight=2.5, height=80.0, bmi=3.9, age_months=12)
        # The analyze endpoint catches RequestException and continues
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)


class OCRAnalyticsIntegrationTests(TestCase):
    """
    Automated OCR-to-Analytics integration tests proving:
    - abnormal OCR measurement triggers OMS alert/recommendation;
    - sudden change is detected with previous history;
    - normal OCR measurement does not generate false high risk.
    """
    
    def setUp(self):
        self.client = APIClient()
        self.token, self.uid = make_token()
        self.child_id = uuid.uuid4()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def _analyze(self, **kwargs):
        payload = make_payload(self.child_id, **kwargs)
        # Ensure OCR source flag is set to simulate the measurement source
        payload['source'] = 'ocr_import'
        return self.client.post('/api/analytics/measurements/analyze/', payload, format='json')

    def test_abnormal_ocr_measurement_triggers_oms_alert(self):
        """Test abnormal OCR measurement triggers OMS alert/recommendation."""
        # 3.0 kg at 12 months is severely underweight (P3 alert)
        resp = self._analyze(weight=3.0, height=80.0, bmi=4.7, age_months=12, sex='M')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        alerts = resp.data
        self.assertGreater(len(alerts), 0)
        
        # Verify an OMS alert (growth) is created
        oms_alerts = [a for a in alerts if a['alert_type'] == 'growth' and ('P3' in a['title'] or 'OMS' in a['title'])]
        self.assertGreater(len(oms_alerts), 0)
        self.assertIn('recommendation', oms_alerts[0])
        self.assertGreater(len(oms_alerts[0]['recommendation']), 0)

    def test_sudden_change_detected_with_previous_history(self):
        """Test sudden change is detected with previous history."""
        # Previous: 10kg, Current OCR: 8kg (loss of 2kg, threshold is usually 1.0kg)
        previous = {'weight_kg': 10.0, 'height_cm': 80.0, 'date_recorded': '2023-01-01'}
        resp = self._analyze(weight=8.0, height=80.0, bmi=12.5, age_months=13, sex='M', previous=previous)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        alerts = resp.data
        self.assertGreater(len(alerts), 0)
        
        # Verify a sudden-change variation alert is created
        variation_alerts = [a for a in alerts if a['alert_type'] == 'growth' and 'Variation' in a['title']]
        self.assertGreater(len(variation_alerts), 0)

    def test_normal_ocr_measurement_no_false_high_risk(self):
        """Test normal OCR measurement does not generate false high risk."""
        # 10.5 kg at 12 months is totally normal
        resp = self._analyze(weight=10.5, height=80.0, bmi=16.4, age_months=12, sex='M')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        alerts = resp.data
        # Missing data info alerts might be generated (e.g. head_circumference), but no high risk (warning) alerts
        warning_alerts = [a for a in alerts if a['severity'] in ['warning', 'critical']]
        self.assertEqual(len(warning_alerts), 0)


class ClinicalFindingsTests(TestCase):
    """Tests for Phase 12.5 Clinical Findings and Assistant Context endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.token, self.parent_id = make_token(role='parent')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.child_id = uuid.uuid4()
        
        # Create a clinical finding
        from .models import ClinicalFinding, Recommendation
        self.finding = ClinicalFinding.objects.create(
            child_id=self.child_id,
            parent_id=self.parent_id,
            finding_code='bmi_below_reference',
            metric='bmi',
            severity='warning',
            child_friendly_title="IMC faible",
            parent_explanation="IMC en dessous du P3.",
            possible_meaning="Insuffisance pondérale.",
            recommended_actions=["Vérifier les données", "Consulter"],
            evidence={"value": 12.0, "p3": 13.4},
            disclaimer="Pas un diagnostic"
        )
        
        # Create a recommendation
        self.rec = Recommendation.objects.create(
            child_id=self.child_id,
            parent_id=self.parent_id,
            category='nutrition',
            title="Suivi nutritionnel",
            message="Suivi requis",
            why="IMC bas",
            risk_level='elevated',
            disclaimer="Pas un diagnostic"
        )

    def test_list_findings_returns_findings(self):
        """GET /api/analytics/findings/ returns the findings for the parent."""
        resp = self.client.get(f'/api/analytics/findings/?child_id={self.child_id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data['results'] if isinstance(resp.data, dict) and 'results' in resp.data else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['finding_code'], 'bmi_below_reference')

    def test_list_findings_other_parent_excluded(self):
        """Parent should not see findings from other parents."""
        other_token, _ = make_token(role='parent')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {other_token}')
        resp = self.client.get(f'/api/analytics/findings/?child_id={self.child_id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data['results'] if isinstance(resp.data, dict) and 'results' in resp.data else resp.data
        self.assertEqual(len(results), 0)

    def test_assistant_context_requires_internal_token(self):
        """GET /api/analytics/internal/assistant-context/ blocks direct requests without internal token."""
        self.client.credentials()  # clear auth
        resp = self.client.get(f'/api/analytics/internal/assistant-context/?child_id={self.child_id}&parent_id={self.parent_id}')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    @patch('analytics.views.requests.get')
    def test_assistant_context_returns_valid_context(self, request_get):
        """GET /api/analytics/internal/assistant-context/ returns correct structured context with valid internal token."""
        self.client.credentials()  # clear standard auth
        import os
        internal_token = os.environ.get('INTERNAL_SERVICE_TOKEN')
        ownership = MagicMock(status_code=200)
        ownership.json.return_value = {'owned': True, 'child': {'sex': 'F', 'date_of_birth': '2023-01-01'}}
        measurements = MagicMock(status_code=200)
        measurements.json.return_value = {'measurements': [
            {'date_recorded': '2025-01-01', 'age_at_recording_months': 24, 'weight_kg': '10.00', 'height_cm': '84.00', 'bmi': '14.17'},
            {'date_recorded': '2024-12-01', 'age_at_recording_months': 23, 'weight_kg': '10.50', 'height_cm': '83.00', 'bmi': '15.24'},
        ]}
        request_get.side_effect = [ownership, measurements]
        resp = self.client.get(
            f'/api/analytics/internal/assistant-context/?child_id={self.child_id}&parent_id={self.parent_id}',
            HTTP_X_INTERNAL_SERVICE_TOKEN=internal_token,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['child']['sex'], 'F')
        self.assertEqual(resp.data['child']['age_months'], 24)
        self.assertIn('clinical_findings', resp.data)
        self.assertIn('trend_summary', resp.data)
        self.assertIn('recommendations', resp.data)
        self.assertEqual(len(resp.data['clinical_findings']), 1)
        self.assertEqual(resp.data['clinical_findings'][0]['finding_code'], 'bmi_below_reference')
        self.assertEqual(resp.data['recommendations'][0]['title'], 'Suivi nutritionnel')
        self.assertNotIn('parent_id', resp.data)
        self.assertNotIn('child_id', resp.data)

    @patch('analytics.views.requests.get')
    def test_assistant_context_fetches_upcoming_events_only_when_requested(self, request_get):
        self.client.credentials()
        import os
        internal_token = os.environ.get('INTERNAL_SERVICE_TOKEN')
        ownership = MagicMock(status_code=200)
        ownership.json.return_value = {'owned': True, 'child': {'sex': 'F', 'date_of_birth': '2023-01-01'}}
        measurements = MagicMock(status_code=200)
        measurements.json.return_value = {'measurements': []}
        calendar = MagicMock(status_code=200)
        calendar.json.return_value = {'upcoming_events': [
            {'event_type': 'vaccination', 'title': 'Vaccin DTP', 'scheduled_date': '2026-06-01', 'status': 'planned'}
        ]}
        request_get.side_effect = [ownership, measurements, calendar]
        resp = self.client.get(
            f'/api/analytics/internal/assistant-context/?child_id={self.child_id}&parent_id={self.parent_id}&include_events=true',
            HTTP_X_INTERNAL_SERVICE_TOKEN=internal_token,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['upcoming_events'][0]['title'], 'Vaccin DTP')
        self.assertEqual(request_get.call_count, 3)
