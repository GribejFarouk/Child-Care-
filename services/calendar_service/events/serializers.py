from rest_framework import serializers
from .models import HealthEvent

class HealthEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthEvent
        fields = [
            'id', 'parent_id', 'child_id', 'event_type', 'title',
            'description', 'scheduled_date', 'completed_date', 'status',
            'doctor_name', 'location', 'vaccine_name', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'parent_id', 'created_at', 'updated_at', 'status', 'completed_date']

    def validate(self, attrs):
        # Additional validation could be added here
        return attrs
