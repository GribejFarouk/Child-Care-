from rest_framework import serializers
from .models import Conversation, Message

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'fallback_used', 'safety_escalation', 'model_name', 'created_at']
        read_only_fields = fields

class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'child_id', 'parent_id', 'title', 'created_at', 'updated_at', 'is_active', 'messages']
        read_only_fields = ['id', 'parent_id', 'created_at', 'updated_at', 'messages']

class SendMessageSerializer(serializers.Serializer):
    child_id = serializers.UUIDField(required=False)
    message = serializers.CharField(max_length=2000)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs.get('conversation_id') and not attrs.get('child_id'):
            raise serializers.ValidationError({'child_id': 'Ce champ est requis pour une nouvelle discussion.'})
        return attrs
