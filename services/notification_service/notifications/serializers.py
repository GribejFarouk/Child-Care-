from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient_id', 'recipient_role', 'child_id',
            'notification_type', 'title', 'message',
            'source_service', 'source_object_id', 'permission_scope',
            'action_url', 'is_read', 'created_at', 'due_at',
            'idempotency_key'
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'idempotency_key': {
                'validators': []
            }
        }

    def create(self, validated_data):
        return Notification.objects.create(**validated_data)
