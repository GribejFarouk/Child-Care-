from rest_framework import serializers
from .models import ChildShare, Message, ConsultationSession

class ChildShareSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChildShare
        fields = ['id', 'parent_id', 'child_id', 'doctor_id', 'doctor_email', 'doctor_display_name', 'sharing_code', 'status', 'permissions', 'created_at', 'updated_at']
        read_only_fields = ['id', 'parent_id', 'doctor_id', 'doctor_email', 'doctor_display_name', 'sharing_code', 'created_at', 'updated_at']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['parent_id'] = user.id
        return super().create(validated_data)

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'share', 'sender_id', 'sender_role', 'content', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender_id', 'sender_role', 'is_read', 'created_at']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['sender_id'] = user.id
        validated_data['sender_role'] = user.role
        return super().create(validated_data)

class ConsultationSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultationSession
        fields = [
            'id', 'share', 'created_by_id', 'created_by_role', 'session_type', 
            'room_token', 'provider', 'scheduled_at', 'started_at', 'ended_at', 
            'status', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'share', 'created_by_id', 'created_by_role', 'room_token', 
            'provider', 'started_at', 'ended_at', 'status', 'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by_id'] = user.id
        validated_data['created_by_role'] = user.role
        return super().create(validated_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret.pop('room_token', None)
        ret.pop('provider', None)
        return ret

