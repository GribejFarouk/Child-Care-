from rest_framework import serializers
from .models import AuditEvent

PROHIBITED_METADATA_KEYS = {
    'password', 'access_token', 'refresh_token', 'token', 'authorization', 'jwt', 'secret',
    'room_token', 'join_url', 'file', 'file_url', 'document_url', 'raw_text', 'raw_bytes',
    'image_bytes', 'pdf_bytes'
}

def is_key_prohibited(key):
    key_lower = key.lower()
    return any(
        key_lower == prohibited or key_lower.endswith(f'_{prohibited}')
        for prohibited in PROHIBITED_METADATA_KEYS
    )

def validate_metadata_recursive(data):
    if isinstance(data, dict):
        for k, v in data.items():
            if is_key_prohibited(k):
                raise serializers.ValidationError(f"Metadata contains prohibited sensitive key: {k}")
            validate_metadata_recursive(v)
    elif isinstance(data, list):
        for item in data:
            validate_metadata_recursive(item)

class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = '__all__'
        read_only_fields = ['id', 'occurred_at']

    def validate_metadata(self, value):
        if value:
            if not isinstance(value, dict):
                raise serializers.ValidationError("Metadata must be a dictionary.")
            validate_metadata_recursive(value)
        return value

class PublicActivityEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = ['id', 'event_type', 'outcome', 'child_id', 'resource_type', 'summary', 'occurred_at']
        read_only_fields = fields
