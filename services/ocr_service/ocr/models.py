import uuid
from django.db import models


class OCRImport(models.Model):
    """
    Stores an OCR import attempt: the uploaded file, extracted raw text,
    parsed candidate values, and processing status.

    The extracted data is presented to the parent for review and correction
    before being saved as a Measurement through the Measurements Service.
    This model is purely for traceability — it does NOT create measurements.
    """
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('processing', 'En cours'),
        ('completed', 'Terminé'),
        ('failed', 'Échoué'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent_id = models.UUIDField(
        db_index=True,
        help_text='Set from JWT — never from request body'
    )
    child_id = models.UUIDField(
        null=True, blank=True, db_index=True,
        help_text='Optional: references Child in profile_service'
    )
    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to='ocr_imports/%Y/%m/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    raw_text = models.TextField(blank=True)
    extracted_data = models.JSONField(
        default=dict,
        help_text='Candidate measurement values parsed from OCR text. Must be verified by parent.'
    )
    warnings = models.JSONField(
        default=list,
        help_text='List of warning messages about extraction quality.'
    )
    
    # --- New Fields for Phase 10: Audit Trail & Confirmation ---
    preprocessing_metadata = models.JSONField(
        default=dict, blank=True,
        help_text='Metadata about preprocessing methods (e.g., Deskew applied, contrast applied).'
    )
    confirmed_data = models.JSONField(
        default=dict, blank=True,
        help_text='Final values chosen or typed by the parent.'
    )
    corrections = models.JSONField(
        default=dict, blank=True,
        help_text='Differences between best OCR extraction and the confirmed data.'
    )
    
    CONFIRMATION_CHOICES = [
        ('pending_review', 'En attente de révision'),
        ('confirmed', 'Confirmé'),
        ('discarded', 'Rejeté'),
    ]
    confirmation_status = models.CharField(
        max_length=20,
        choices=CONFIRMATION_CHOICES,
        default='pending_review'
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    measurement_id = models.UUIDField(
        null=True, blank=True, db_index=True,
        help_text='Reference to the created Measurement in Measurements Service.'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ocr_imports'
        ordering = ['-created_at']

    def __str__(self):
        return f"OCRImport {self.original_filename} ({self.status})"
