import uuid
from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse

from .models import Recommendation, Alert
from .recommendation_engine import compute_risk_score, generate_recommendations


User = get_user_model()


class RecommendationEngineUnitTests(TestCase):
    def setUp(self):
        self.child_id = str(uuid.uuid4())
        
    def test_normal_measurement_yields_low_risk(self):
        ctx = {
            'child_id': self.child_id,
            'sex': 'M',
            'age_at_recording_months': 12,
            'current_measurement': {
                'weight_kg': 9.6,  # 50th percentile is ~9.6 for 12mo M
                'height_cm': 75.7,
                'head_circumference_cm': 46.1,
                'bmi': 16.7
            },
            'previous_measurement': None,
            'alerts_history': []
        }
        res = compute_risk_score(ctx)
        self.assertEqual(res['risk_level'], 'low')
        self.assertTrue(res['score'] <= 15)
        
        recs = generate_recommendations(res, ctx)
        self.assertTrue(any(r['category'] == 'follow_up' for r in recs))

    def test_missing_data_increases_score_and_generates_rec(self):
        ctx = {
            'child_id': self.child_id,
            'sex': 'M',
            'age_at_recording_months': 12,
            'current_measurement': {
                'weight_kg': 9.6,
                'height_cm': None,  # Missing
                'head_circumference_cm': 46.1,
                'bmi': None
            },
            'previous_measurement': None,
            'alerts_history': []
        }
        res = compute_risk_score(ctx)
        missing_factor = next(f for f in res['factors'] if f['name'] == 'missing_data')
        self.assertEqual(missing_factor['status'], 'info')
        self.assertEqual(missing_factor['points'], 5)
        
        recs = generate_recommendations(res, ctx)
        self.assertTrue(any(r['category'] == 'measurement_verification' for r in recs))

    def test_sudden_weight_change_warning(self):
        ctx = {
            'child_id': self.child_id,
            'sex': 'F',
            'age_at_recording_months': 24,
            'current_measurement': {
                'weight_kg': 13.5, # High
                'height_cm': 86.4,
                'head_circumference_cm': 48.0,
                'bmi': 18.0
            },
            'previous_measurement': {
                'weight_kg': 11.5, # 2kg difference
                'height_cm': 85.0
            },
            'alerts_history': []
        }
        res = compute_risk_score(ctx)
        sw = next(f for f in res['factors'] if f['name'] == 'sudden_weight_change')
        self.assertEqual(sw['status'], 'warning')
        self.assertEqual(sw['points'], 15)
        
        recs = generate_recommendations(res, ctx)
        self.assertTrue(any(r['category'] == 'follow_up' for r in recs))

    def test_high_score_generates_doctor_consultation(self):
        # Multiple warnings: above P97 weight + high BMI + sudden change
        ctx = {
            'child_id': self.child_id,
            'sex': 'M',
            'age_at_recording_months': 12,
            'current_measurement': {
                'weight_kg': 15.0, # > P97
                'height_cm': 75.0,
                'bmi': 26.6 # > P97
            },
            'previous_measurement': {
                'weight_kg': 12.0 # Sudden change > 1.5
            },
            'alerts_history': [
                {'severity': 'warning'},
                {'severity': 'danger'},
                {'severity': 'warning'}
            ]
        }
        res = compute_risk_score(ctx)
        self.assertIn(res['risk_level'], ('elevated', 'high'))
        
        recs = generate_recommendations(res, ctx)
        self.assertTrue(any(r['category'] == 'doctor_consultation' for r in recs))
        self.assertTrue(any(r['category'] == 'nutrition' for r in recs))
        
        # Explainability check
        for r in recs:
            self.assertTrue(bool(r['why']))


class MockUser:
    def __init__(self, role):
        self.id = uuid.uuid4()
        self.role = role
        self.is_authenticated = True

class RecommendationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.parent = MockUser('parent')
        self.doctor = MockUser('doctor')

        
        self.child_id = str(uuid.uuid4())
        self.rec1 = Recommendation.objects.create(
            child_id=self.child_id,
            parent_id=self.parent.id,
            risk_score=50,
            risk_level='elevated',
            risk_label='Élevé',
            category='nutrition',
            title='Nutrition alert',
            message='Test message',
            why='Because test',
            priority='high',
            factors_json=[]
        )

    def test_parent_sees_recommendations_without_numeric_score(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.get(reverse('recommendation-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertNotIn('risk_score', res.data[0])
        self.assertEqual(res.data[0]['risk_level'], 'elevated')

    @patch('analytics.views.publish_audit_event')
    @patch('analytics.views.get_collaboration_access_details')
    @patch('analytics.permissions.check_collaboration_access')
    def test_doctor_sees_recommendations_and_access_is_parent_visible(
        self, mock_access, mock_details, mock_audit
    ):
        mock_access.return_value = True
        mock_details.return_value = {'allowed': True, 'parent_id': str(self.parent.id)}
        self.client.force_authenticate(user=self.doctor)
        res = self.client.get(reverse('recommendation-list'), {'child_id': self.child_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertIn('risk_score', res.data[0])
        mock_audit.assert_called_once()
        self.assertEqual(mock_audit.call_args.kwargs['parent_id'], str(self.parent.id))
        self.assertTrue(mock_audit.call_args.kwargs['visible_to_parent'])

    def test_parent_detail_view_no_numeric_score(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.get(reverse('recommendation-detail', args=[self.rec1.id]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertNotIn('risk_score', res.data)
        self.assertIn('factors_json', res.data)

    def test_mark_read(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.patch(reverse('recommendation-mark-read', args=[self.rec1.id]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.rec1.refresh_from_db()
        self.assertTrue(self.rec1.is_read)


class RiskScoreAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.parent = MockUser('parent')
        self.child_id = str(uuid.uuid4())

    def test_risk_score_no_recommendation_yet(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.get(reverse('child-risk-score', args=[self.child_id]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['available'])
        self.assertEqual(res.data['risk_level'], 'unknown')

    def test_risk_score_returns_latest_recommendation(self):
        Recommendation.objects.create(
            child_id=self.child_id,
            parent_id=self.parent.id,
            risk_score=20,
            risk_level='moderate',
            risk_label='Modéré',
            category='follow_up',
            title='Follow up',
            message='Test message',
            why='Because test',
            priority='medium',
            factors_json=[{'name': 'test'}]
        )
        # Create a newer one
        Recommendation.objects.create(
            child_id=self.child_id,
            parent_id=self.parent.id,
            risk_score=70,
            risk_level='high',
            risk_label='Risque élevé',
            category='doctor_consultation',
            title='Doctor',
            message='Test message 2',
            why='Because test 2',
            priority='high',
            factors_json=[{'name': 'test2'}]
        )
        
        self.client.force_authenticate(user=self.parent)
        res = self.client.get(reverse('child-risk-score', args=[self.child_id]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['available'])
        self.assertEqual(res.data['risk_level'], 'high')
        self.assertNotIn('risk_score', res.data) # Parent should not see score
        self.assertEqual(res.data['factors'][0]['name'], 'test2')
