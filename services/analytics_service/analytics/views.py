from datetime import datetime, timedelta

import requests

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Alert, Recommendation, ClinicalFinding
from .serializers import (
    AlertSerializer,
    AnalyzeMeasurementSerializer,
    RecommendationSerializer,
    RecommendationListSerializer,
    ClinicalFindingSerializer,
)
from .permissions import IsParent, IsParentOrSharedDoctor, get_collaboration_access_details
from .rules import analyze_measurement
from .oms_references import get_growth_curve
from .recommendation_engine import compute_risk_score, generate_recommendations, generate_clinical_findings, DISCLAIMER

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from audit_client import publish_audit_event
except ImportError:
    def publish_audit_event(*args, **kwargs): pass


class AnalyzeMeasurementView(APIView):
    """
    POST /api/analytics/measurements/analyze/

    Accepts the current measurement data and optionally the previous measurement.
    1. Runs the rule engine and creates Alert objects for any triggered rules.
    2. Runs the recommendation engine and creates Recommendation objects.

    Duplicate-alert protection: if an alert with the same (measurement_id, alert_type, title)
    already exists, it is skipped (via the database UniqueConstraint + get_or_create).

    Duplicate-recommendation protection: same pattern with get_or_create.

    parent_id is ALWAYS injected from the authenticated JWT — never trusted from request body.
    """
    permission_classes = [IsParent]

    def post(self, request):
        serializer = AnalyzeMeasurementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Inject parent_id from JWT — this is the key security requirement
        current = {
            'child_id':              str(data['child_id']),
            'parent_id':             str(request.user.id),   # from JWT, not body
            'measurement_id':        str(data['measurement_id']) if data.get('measurement_id') else None,
            'weight_kg':             data.get('weight_kg'),
            'height_cm':             data.get('height_cm'),
            'bmi':                   data.get('bmi'),
            'head_circumference_cm': data.get('head_circumference_cm'),
            'age_at_recording_months': data.get('age_at_recording_months'),
            'sex':                   data.get('sex') or 'M',
        }
        previous = data.get('previous_measurement')

        # ── Step 1: Run rule engine → create alerts ───────────────────────────
        alert_dicts = analyze_measurement(current, previous)

        created_alerts = []
        for alert_data in alert_dicts:
            measurement_id = alert_data.get('measurement_id')
            alert_type = alert_data['alert_type']

            if measurement_id:
                alert, created = Alert.objects.get_or_create(
                    measurement_id=measurement_id,
                    alert_type=alert_type,
                    title=alert_data['title'],
                    defaults={
                        'child_id':       alert_data['child_id'],
                        'parent_id':      alert_data['parent_id'],
                        'severity':       alert_data['severity'],
                        'message':        alert_data['message'],
                        'recommendation': alert_data['recommendation'],
                    }
                )
                if created:
                    created_alerts.append(alert)
            else:
                alert = Alert.objects.create(**{
                    k: alert_data[k] for k in alert_data if k != 'measurement_id'
                }, measurement_id=None)
                created_alerts.append(alert)

        # ── Step 2: Run recommendation engine ─────────────────────────────────
        # Build child context from the analyze payload (Adjustment #4)
        child_id = str(data['child_id'])
        parent_id = str(request.user.id)

        # Get recent alert history from DB (last 90 days for this child)
        recent_cutoff = timezone.now() - timedelta(days=90)
        recent_alerts = list(
            Alert.objects.filter(
                child_id=child_id,
                parent_id=parent_id,
                created_at__gte=recent_cutoff,
            ).values('alert_type', 'severity', 'created_at')
        )
        # Include alerts just created in this call
        for a in created_alerts:
            recent_alerts.append({
                'alert_type': a.alert_type,
                'severity': a.severity,
                'created_at': a.created_at,
            })

        child_context = {
            'child_id': child_id,
            'sex': current.get('sex', 'M'),
            'age_at_recording_months': current.get('age_at_recording_months'),
            'current_measurement': {
                'weight_kg': float(current['weight_kg']) if current.get('weight_kg') is not None else None,
                'height_cm': float(current['height_cm']) if current.get('height_cm') is not None else None,
                'bmi': float(current['bmi']) if current.get('bmi') is not None else None,
                'head_circumference_cm': float(current['head_circumference_cm']) if current.get('head_circumference_cm') is not None else None,
            },
            'previous_measurement': previous,
            'alerts_history': recent_alerts,
        }

        score_result = compute_risk_score(child_context)
        rec_dicts = generate_recommendations(score_result, child_context)
        finding_dicts = generate_clinical_findings(score_result, child_context)

        measurement_id = current.get('measurement_id')
        notifications_to_send = []
        
        # Phase 12.5: Save ClinicalFindings
        for f_dict in finding_dicts:
            if measurement_id:
                ClinicalFinding.objects.update_or_create(
                    measurement_id=measurement_id,
                    finding_code=f_dict['finding_code'],
                    defaults={
                        'child_id': child_id,
                        'parent_id': parent_id,
                        'metric': f_dict['metric'],
                        'severity': f_dict['severity'],
                        'child_friendly_title': f_dict['child_friendly_title'],
                        'parent_explanation': f_dict['parent_explanation'],
                        'possible_meaning': f_dict['possible_meaning'],
                        'recommended_actions': f_dict['recommended_actions'],
                        'evidence': f_dict['evidence'],
                        'disclaimer': f_dict['disclaimer'],
                    }
                )
            else:
                ClinicalFinding.objects.create(
                    child_id=child_id,
                    parent_id=parent_id,
                    measurement_id=None,
                    **f_dict
                )

        for rec in rec_dicts:
            if measurement_id:
                # Duplicate protection (Adjustment #6)
                obj, created = Recommendation.objects.update_or_create(
                    measurement_id=measurement_id,
                    category=rec['category'],
                    title=rec['title'],
                    defaults={
                        'child_id':      child_id,
                        'parent_id':     parent_id,
                        'risk_score':    score_result['score'],
                        'risk_level':    score_result['risk_level'],
                        'risk_label':    score_result['risk_label'],
                        'message':       rec['message'],
                        'why':           rec['why'],
                        'priority':      rec['priority'],
                        'factors_json':  score_result['factors'],
                        'disclaimer':    score_result['disclaimer'],
                    }
                )
            else:
                obj = Recommendation.objects.create(
                    child_id=child_id,
                    parent_id=parent_id,
                    measurement_id=None,
                    risk_score=score_result['score'],
                    risk_level=score_result['risk_level'],
                    risk_label=score_result['risk_label'],
                    category=rec['category'],
                    title=rec['title'],
                    message=rec['message'],
                    why=rec['why'],
                    priority=rec['priority'],
                    factors_json=score_result['factors'],
                    disclaimer=score_result['disclaimer'],
                )
                created = True
                
            # If a new recommendation is elevated or high, generate a notification
            if created and score_result['risk_level'] in ['elevated', 'high']:
                notifications_to_send.append({
                    "recipient_id": parent_id,
                    "recipient_role": "parent",
                    "child_id": child_id,
                    "notification_type": "analytics_alert",
                    "title": "Alerte de santé: " + rec['title'],
                    "message": rec['message'],
                    "source_service": "analytics",
                    "source_object_id": str(obj.id),
                    "permission_scope": "alerts",
                    "action_url": "/alerts",
                    "idempotency_key": f"recommendation:{obj.id}:{parent_id}"
                })

        if notifications_to_send:
            import os, requests
            NOTIFICATION_SERVICE_URL = os.environ.get('NOTIFICATION_SERVICE_URL', 'http://notification_service:8000')
            INTERNAL_SERVICE_TOKEN = os.environ.get('INTERNAL_SERVICE_TOKEN')
            try:
                requests.post(
                    f"{NOTIFICATION_SERVICE_URL}/api/notifications/internal/create/",
                    json=notifications_to_send,
                    headers={"X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN},
                    timeout=3
                )
            except requests.RequestException:
                # Analytics failure is non-blocking — measurement was already saved.
                pass

        serializer_out = AlertSerializer(created_alerts, many=True)
        return Response(serializer_out.data, status=status.HTTP_201_CREATED)


class AlertListView(generics.ListAPIView):
    """
    GET /api/analytics/alerts/

    Lists all alerts for the authenticated parent.
    Optional filter: ?child_id=<uuid>
    Optional filter: ?is_read=false
    """
    serializer_class = AlertSerializer
    permission_classes = [IsParentOrSharedDoctor]

    def get_queryset(self):
        user = self.request.user
        qs = Alert.objects.all()
        if getattr(user, 'role', None) == 'parent':
            qs = qs.filter(parent_id=user.id)
        elif getattr(user, 'role', None) == 'doctor':
            child_id = self.request.query_params.get('child_id')
            if child_id:
                access = get_collaboration_access_details(user.id, child_id, 'alerts')
                if access.get('allowed') and access.get('parent_id'):
                    qs = qs.filter(child_id=child_id, parent_id=access['parent_id'])
                else:
                    return Alert.objects.none()
            else:
                return Alert.objects.none()
        else:
            return Alert.objects.none()
            
        child_id = self.request.query_params.get('child_id')
        if child_id and getattr(user, 'role', None) == 'parent':
            qs = qs.filter(child_id=child_id)
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == 'true')
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if getattr(request.user, 'role', None) == 'doctor':
            child_id = request.query_params.get('child_id')
            if child_id:
                access = get_collaboration_access_details(request.user.id, child_id, 'alerts')
                parent_id = access.get('parent_id') if access.get('allowed') else None
                if parent_id:
                    publish_audit_event(
                        actor_id=request.user.id,
                        actor_role='doctor',
                        event_type='alerts_list_accessed',
                        outcome='success',
                        child_id=child_id,
                        parent_id=parent_id,
                        resource_type='alert',
                        source_service='analytics_service',
                        summary="Doctor read child alerts list",
                        visible_to_parent=True
                    )
        return response


class AlertDetailView(generics.RetrieveAPIView):
    """
    GET /api/analytics/alerts/{id}/

    Returns a single alert. Non-owners get 404 via queryset filtering.
    """
    serializer_class = AlertSerializer
    permission_classes = [IsParentOrSharedDoctor]
    lookup_field = 'id'

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'parent':
            return Alert.objects.filter(parent_id=user.id)
        return Alert.objects.all()

    def retrieve(self, request, *args, **kwargs):
        alert = self.get_object()
        response = Response(self.get_serializer(alert).data)
        if getattr(request.user, 'role', None) == 'doctor':
            publish_audit_event(
                actor_id=request.user.id,
                actor_role='doctor',
                event_type='alert_detail_accessed',
                outcome='success',
                child_id=alert.child_id,
                parent_id=alert.parent_id,
                resource_type='alert',
                resource_id=alert.id,
                source_service='analytics_service',
                summary="Doctor read alert detail",
                visible_to_parent=True
            )
        return response


class AlertMarkReadView(APIView):
    """
    PATCH /api/analytics/alerts/{id}/read/

    Marks an alert as read. Non-owners get 404.
    """
    permission_classes = [IsParent]

    def patch(self, request, id):
        try:
            alert = Alert.objects.get(id=id, parent_id=request.user.id)
        except Alert.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        alert.is_read = True
        alert.save(update_fields=['is_read'])
        return Response(AlertSerializer(alert).data)


class GrowthReferenceView(APIView):
    """
    GET /api/analytics/references/growth/

    Returns WHO growth reference curve (P3/P50/P97) for a given metric, sex, and age range.
    Public endpoint (no auth required) — reference data is not user-specific.
    """
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        sex = request.query_params.get('sex', 'M')
        metric = request.query_params.get('metric')
        if not metric:
            return Response(
                {'detail': 'Le paramètre "metric" est requis (weight, height, head_circumference, bmi).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            min_age = int(request.query_params.get('min_age_months', 0))
        except (TypeError, ValueError):
            min_age = 0
        try:
            max_age = int(request.query_params.get('max_age_months', 228))
        except (TypeError, ValueError):
            max_age = 228

        result = get_growth_curve(sex, metric, min_age, max_age)
        return Response(result, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────────────────────────────────────
# Recommendation Views (Phase 8)
# ──────────────────────────────────────────────────────────────────────────────

class RecommendationListView(generics.ListAPIView):
    """
    GET /api/analytics/recommendations/

    Lists recommendations.
    Parent: returns own recommendations.
    Doctor: returns recommendations for shared children (reuses 'alerts' permission — Adjustment #5).
    Optional filter: ?child_id=<uuid>
    """
    serializer_class = RecommendationListSerializer
    permission_classes = [IsParentOrSharedDoctor]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        user = self.request.user
        qs = Recommendation.objects.all()

        if getattr(user, 'role', None) == 'parent':
            qs = qs.filter(parent_id=user.id)
        elif getattr(user, 'role', None) == 'doctor':
            child_id = self.request.query_params.get('child_id')
            if child_id:
                access = get_collaboration_access_details(user.id, child_id, 'alerts')
                if access.get('allowed') and access.get('parent_id'):
                    qs = qs.filter(child_id=child_id, parent_id=access['parent_id'])
                else:
                    return Recommendation.objects.none()
            else:
                return Recommendation.objects.none()
        else:
            return Recommendation.objects.none()

        child_id = self.request.query_params.get('child_id')
        if child_id and getattr(user, 'role', None) == 'parent':
            qs = qs.filter(child_id=child_id)

        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if getattr(request.user, 'role', None) == 'doctor':
            child_id = request.query_params.get('child_id')
            if child_id:
                access = get_collaboration_access_details(request.user.id, child_id, 'alerts')
                parent_id = access.get('parent_id') if access.get('allowed') else None
                if parent_id:
                    publish_audit_event(
                        actor_id=request.user.id,
                        actor_role='doctor',
                        event_type='recommendations_list_accessed',
                        outcome='success',
                        child_id=child_id,
                        parent_id=parent_id,
                        resource_type='recommendation',
                        source_service='analytics_service',
                        summary="Doctor read child recommendations list",
                        visible_to_parent=True
                    )
        return response


class RecommendationDetailView(generics.RetrieveAPIView):
    """
    GET /api/analytics/recommendations/{id}/

    Returns a single recommendation with full factor breakdown.
    """
    serializer_class = RecommendationSerializer
    permission_classes = [IsParentOrSharedDoctor]
    lookup_field = 'id'

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'parent':
            return Recommendation.objects.filter(parent_id=user.id)
        return Recommendation.objects.all()

    def retrieve(self, request, *args, **kwargs):
        rec = self.get_object()
        response = Response(self.get_serializer(rec).data)
        if getattr(request.user, 'role', None) == 'doctor':
            publish_audit_event(
                actor_id=request.user.id,
                actor_role='doctor',
                event_type='recommendation_detail_accessed',
                outcome='success',
                child_id=rec.child_id,
                parent_id=rec.parent_id,
                resource_type='recommendation',
                resource_id=rec.id,
                source_service='analytics_service',
                summary="Doctor read recommendation detail",
                visible_to_parent=True
            )
        return response


class RecommendationMarkReadView(APIView):
    """
    PATCH /api/analytics/recommendations/{id}/read/

    Marks a recommendation as read. Non-owners get 404.
    """
    permission_classes = [IsParent]

    def patch(self, request, id):
        try:
            rec = Recommendation.objects.get(id=id, parent_id=request.user.id)
        except Recommendation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        rec.is_read = True
        rec.save(update_fields=['is_read'])
        return Response(RecommendationSerializer(rec, context={'request': request}).data)


class ChildRiskScoreView(APIView):
    """
    GET /api/analytics/risk-score/{child_id}/

    Returns the latest stored risk/recommendation snapshot for a child.
    Does NOT recompute from measurements (Adjustment #1).

    If no recommendation exists:
      { available: false, risk_level: "unknown", message: "..." }

    Parent response omits numeric risk_score (Adjustment #3).
    Doctor response includes risk_score.
    """
    permission_classes = [IsParentOrSharedDoctor]

    def get(self, request, child_id):
        user = request.user

        # Access check
        if getattr(user, 'role', None) == 'parent':
            latest = Recommendation.objects.filter(
                child_id=child_id,
                parent_id=user.id,
            ).order_by('-risk_score', '-created_at').first()
        elif getattr(user, 'role', None) == 'doctor':
            # Reuses alerts permission (Adjustment #5)
            from .permissions import check_collaboration_access
            if not check_collaboration_access(user.id, child_id, 'alerts'):
                return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
            latest = Recommendation.objects.filter(child_id=child_id).order_by('-risk_score', '-created_at').first()
        else:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)

        if not latest:
            return Response({
                'available': False,
                'risk_level': 'unknown',
                'message': "Aucune analyse disponible pour cet enfant.",
            })

        result = {
            'available': True,
            'risk_level': latest.risk_level,
            'risk_label': latest.risk_label,
            'factors': latest.factors_json,
            'disclaimer': latest.disclaimer,
        }

        # Only doctor sees numeric score (Adjustment #3)
        if getattr(user, 'role', None) == 'doctor':
            result['risk_score'] = latest.risk_score
            publish_audit_event(
                actor_id=user.id,
                actor_role='doctor',
                event_type='risk_score_accessed',
                outcome='success',
                child_id=child_id,
                parent_id=latest.parent_id,
                resource_type='risk_score',
                source_service='analytics_service',
                summary="Doctor obtained numeric risk score",
                visible_to_parent=True
            )

        return Response(result)


# ──────────────────────────────────────────────────────────────────────────────
# Clinical Findings and Assistant Context (Phase 12.5)
# ──────────────────────────────────────────────────────────────────────────────

class ClinicalFindingListView(generics.ListAPIView):
    """
    GET /api/analytics/findings/?child_id=<uuid>
    
    Returns the history of clinical findings for a specific child.
    """
    serializer_class = ClinicalFindingSerializer
    permission_classes = [IsParent]

    def get_queryset(self):
        user = self.request.user
        qs = ClinicalFinding.objects.all()
        if getattr(user, 'role', None) == 'parent':
            qs = qs.filter(parent_id=user.id)
            child_id = self.request.query_params.get('child_id')
            if child_id:
                qs = qs.filter(child_id=child_id)
            return qs.order_by('-created_at')
        return ClinicalFinding.objects.none()


class AssistantContextView(APIView):
    """Minimized, validated clinical context for assistant_service only."""
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        token = os.environ.get('INTERNAL_SERVICE_TOKEN', '')
        provided = request.headers.get('X-Internal-Service-Token') or request.META.get('HTTP_X_INTERNAL_SERVICE_TOKEN')
        if not token or provided != token:
            return Response({'detail': 'Acces non autorise.'}, status=status.HTTP_403_FORBIDDEN)

        child_id = request.query_params.get('child_id')
        parent_id = request.query_params.get('parent_id')
        if not child_id or not parent_id:
            return Response({'detail': 'child_id et parent_id requis.'}, status=status.HTTP_400_BAD_REQUEST)

        headers = {'Host': 'localhost', 'X-Internal-Service-Token': token}
        profile_url = os.environ.get('PROFILE_INTERNAL_URL', 'http://profile_service:8000')
        measurements_url = os.environ.get('MEASUREMENTS_INTERNAL_URL', 'http://measurements_service:8000')
        calendar_url = os.environ.get('CALENDAR_INTERNAL_URL', 'http://calendar_service:8000')
        include_events = request.query_params.get('include_events', '').lower() in {'1', 'true', 'yes'}
        upcoming_events = []
        try:
            ownership = requests.get(
                f"{profile_url.rstrip('/')}/api/profiles/internal/check-ownership/",
                params={'child_id': child_id, 'parent_id': parent_id},
                headers=headers,
                timeout=5,
            )
            ownership_data = ownership.json() if ownership.status_code == 200 else {}
            if not ownership_data.get('owned'):
                return Response({'detail': 'Enfant non autorise.'}, status=status.HTTP_403_FORBIDDEN)
            measurements = requests.get(
                f"{measurements_url.rstrip('/')}/api/measurements/internal/context/",
                params={'child_id': child_id, 'parent_id': parent_id},
                headers=headers,
                timeout=5,
            )
            measurement_rows = measurements.json().get('measurements', []) if measurements.status_code == 200 else []
            if include_events:
                calendar = requests.get(
                    f"{calendar_url.rstrip('/')}/api/calendar/internal/upcoming-context/",
                    params={'child_id': child_id, 'parent_id': parent_id},
                    headers=headers,
                    timeout=5,
                )
                if calendar.status_code == 200:
                    upcoming_events = calendar.json().get('upcoming_events', [])
        except requests.RequestException:
            return Response({'detail': 'Contexte clinique indisponible.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        finding_rows = list(
            ClinicalFinding.objects.filter(child_id=child_id, parent_id=parent_id)
            .order_by('-created_at')
            .values(
                'finding_code', 'metric', 'severity', 'child_friendly_title',
                'parent_explanation', 'possible_meaning', 'recommended_actions',
                'disclaimer',
            )[:10]
        )
        recommendation_rows = list(
            Recommendation.objects.filter(child_id=child_id, parent_id=parent_id)
            .order_by('-created_at')
            .values('risk_level', 'category', 'title', 'message', 'priority')[:5]
        )
        child = ownership_data.get('child', {})
        latest = measurement_rows[0] if measurement_rows else None
        previous = measurement_rows[1] if len(measurement_rows) > 1 else None
        age_months = latest.get('age_at_recording_months') if latest else None
        if age_months is None and latest and child.get('date_of_birth'):
            try:
                born = datetime.strptime(child['date_of_birth'], '%Y-%m-%d').date()
                measured = datetime.strptime(str(latest['date_recorded'])[:10], '%Y-%m-%d').date()
                age_months = (measured.year - born.year) * 12 + measured.month - born.month
                if measured.day < born.day:
                    age_months -= 1
            except (TypeError, ValueError):
                age_months = None

        def delta(field):
            if not latest or not previous or latest.get(field) is None or previous.get(field) is None:
                return None
            return round(float(latest[field]) - float(previous[field]), 2)

        return Response({
            'child': {
                'sex': child.get('sex'),
                'age_months': age_months,
                'allergies': child.get('allergies') or [],
            },
            'latest_measurement': latest,
            'trend_summary': {
                'previous_date': previous.get('date_recorded') if previous else None,
                'weight_change_kg': delta('weight_kg'),
                'height_change_cm': delta('height_cm'),
            },
            'clinical_findings': finding_rows,
            'recommendations': recommendation_rows,
            'upcoming_events': upcoming_events,
        })
