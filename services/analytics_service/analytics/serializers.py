from rest_framework import serializers
from .models import Alert, Recommendation, ClinicalFinding


class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = [
            'id',
            'child_id',
            'parent_id',
            'measurement_id',
            'alert_type',
            'severity',
            'title',
            'message',
            'recommendation',
            'is_read',
            'created_at',
        ]
        read_only_fields = ['id', 'parent_id', 'created_at']


class AnalyzeMeasurementSerializer(serializers.Serializer):
    """
    Input serializer for POST /api/analytics/measurements/analyze/

    The frontend sends the current measurement and optionally the previous one.
    parent_id is NOT accepted from the body — it is injected from the JWT in the view.
    """
    # Current measurement fields
    child_id              = serializers.UUIDField()
    measurement_id        = serializers.UUIDField(required=False, allow_null=True, default=None)
    date_recorded         = serializers.DateField(required=False, allow_null=True)
    weight_kg             = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    height_cm             = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    bmi                   = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    head_circumference_cm = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)

    # OMS comparison fields — optional but strongly recommended
    age_at_recording_months = serializers.IntegerField(required=False, allow_null=True, default=None,
                                                       min_value=0, max_value=216)
    sex                   = serializers.CharField(required=False, allow_null=True, allow_blank=True,
                                                  default=None, max_length=10)

    # Optional: previous measurement for change-detection rules
    previous_measurement  = serializers.DictField(required=False, allow_null=True, default=None)


class RecommendationSerializer(serializers.ModelSerializer):
    """
    Full recommendation serializer — used for detail views.
    The `risk_score` field is conditionally hidden for parent users.
    """
    class Meta:
        model = Recommendation
        fields = [
            'id',
            'child_id',
            'parent_id',
            'measurement_id',
            'risk_score',
            'risk_level',
            'risk_label',
            'category',
            'title',
            'message',
            'why',
            'priority',
            'factors_json',
            'is_read',
            'is_dismissed',
            'disclaimer',
            'created_at',
        ]
        read_only_fields = ['id', 'parent_id', 'created_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and getattr(request.user, 'role', None) != 'doctor':
            # Parent must NOT see numeric score (Adjustment #3)
            data.pop('risk_score', None)
        return data


class RecommendationListSerializer(serializers.ModelSerializer):
    """
    Lighter serializer for recommendation list views — excludes factors_json.
    """
    class Meta:
        model = Recommendation
        fields = [
            'id',
            'child_id',
            'parent_id',
            'measurement_id',
            'risk_score',
            'risk_level',
            'risk_label',
            'category',
            'title',
            'message',
            'why',
            'priority',
            'is_read',
            'is_dismissed',
            'disclaimer',
            'created_at',
        ]
        read_only_fields = ['id', 'parent_id', 'created_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and getattr(request.user, 'role', None) != 'doctor':
            data.pop('risk_score', None)
        return data


class RiskScoreResponseSerializer(serializers.Serializer):
    """Output serializer for GET /api/analytics/risk-score/{child_id}/"""
    available   = serializers.BooleanField()
    risk_score  = serializers.IntegerField(required=False, allow_null=True)
    risk_level  = serializers.CharField()
    risk_label  = serializers.CharField(required=False)
    message     = serializers.CharField(required=False)
    factors     = serializers.ListField(required=False)
    disclaimer  = serializers.CharField(required=False)


class ClinicalFindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalFinding
        fields = [
            'id',
            'child_id',
            'parent_id',
            'measurement_id',
            'finding_code',
            'metric',
            'severity',
            'child_friendly_title',
            'parent_explanation',
            'possible_meaning',
            'recommended_actions',
            'evidence',
            'disclaimer',
            'created_at',
        ]
        read_only_fields = ['id', 'parent_id', 'created_at']
