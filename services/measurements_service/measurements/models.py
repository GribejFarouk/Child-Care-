import uuid
from decimal import Decimal, ROUND_HALF_UP
from django.db import models


class Measurement(models.Model):
    """
    Health measurement record for a child.

    child_id and parent_id are UUID references to Profile Service and
    Auth Service respectively — no Django ForeignKey across services.
    parent_id is always injected from the JWT at creation; it is never
    accepted from the request body.
    """

    class SourceChoices(models.TextChoices):
        MANUAL       = 'manual',       'Saisie manuelle'
        OCR_IMPORT   = 'ocr_import',   'Import OCR'
        # doctor_entry is reserved for a future doctor-access phase
        DOCTOR_ENTRY = 'doctor_entry', 'Saisie médecin (futur)'
        IMPORTED     = 'imported',     'Importé'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Cross-service references — UUID values only, no FK
    child_id  = models.UUIDField(db_index=True, help_text="References Child in profile_service")
    parent_id = models.UUIDField(db_index=True, help_text="References CustomUser in auth_service — set from JWT")
    ocr_import_id = models.UUIDField(null=True, blank=True, unique=True, help_text="References OCRImport in ocr_service for idempotency")

    date_recorded           = models.DateField()
    age_at_recording_months = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="Age in months at time of measurement (optional, can be calculated client-side)"
    )

    # --- Anthropometric measurements (all optional, support partial entry) ---
    weight_kg             = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm             = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bmi                   = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Auto-calculated from weight and height. Do not set manually."
    )
    head_circumference_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    foot_size_cm          = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ear_size_cm           = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    neck_circumference_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    wrist_circumference_cm= models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    notes  = models.TextField(blank=True)
    source = models.CharField(
        max_length=20,
        choices=SourceChoices.choices,
        default=SourceChoices.MANUAL,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'measurements'
        ordering = ['-date_recorded', '-created_at']

    def __str__(self):
        return f"Measurement(child={self.child_id}, date={self.date_recorded})"

    def _calculate_bmi(self):
        """Returns BMI as Decimal or None if weight/height unavailable."""
        if self.weight_kg and self.height_cm and self.height_cm > 0:
            height_m = Decimal(str(self.height_cm)) / Decimal('100')
            bmi = Decimal(str(self.weight_kg)) / (height_m ** 2)
            return bmi.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return None

    def save(self, *args, **kwargs):
        """Auto-calculate BMI before saving. Clear it if weight or height missing."""
        self.bmi = self._calculate_bmi()
        super().save(*args, **kwargs)
