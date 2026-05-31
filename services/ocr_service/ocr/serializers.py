from rest_framework import serializers
from .models import OCRImport


# Allowed file extensions and max size
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class OCRUploadSerializer(serializers.Serializer):
    """
    Validates the incoming file upload for OCR extraction.
    parent_id is injected from JWT in the view — never accepted from the request.
    """
    file = serializers.FileField(required=True)
    child_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_file(self, value):
        # Validate file extension
        ext = value.name.rsplit('.', 1)[-1].lower() if '.' in value.name else ''
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"Type de fichier non supporté : .{ext}. "
                f"Formats acceptés : {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Validate MIME type using magic
        import magic
        file_content = value.read(2048)  # Read first 2KB for magic
        value.seek(0)  # Reset pointer
        mime = magic.from_buffer(file_content, mime=True)
        
        allowed_mimes = ['image/png', 'image/jpeg', 'application/pdf']
        if mime not in allowed_mimes:
            raise serializers.ValidationError(
                f"Le contenu du fichier est invalide ({mime}). "
                "Seuls les images et les PDF réels sont acceptés."
            )

        # Validate file size
        if value.size > MAX_FILE_SIZE:
            max_mb = MAX_FILE_SIZE // (1024 * 1024)
            raise serializers.ValidationError(
                f"Le fichier est trop volumineux ({value.size // (1024 * 1024)} MB). "
                f"Taille maximale : {max_mb} MB."
            )

        return value


class OCRImportSerializer(serializers.ModelSerializer):
    """
    Read serializer for OCRImport records returned to the client.
    """
    class Meta:
        model = OCRImport
        fields = [
            'id', 'parent_id', 'child_id', 'original_filename',
            'status', 'raw_text', 'extracted_data', 'warnings',
            'preprocessing_metadata', 'confirmed_data', 'corrections',
            'confirmation_status', 'confirmed_at', 'measurement_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields
