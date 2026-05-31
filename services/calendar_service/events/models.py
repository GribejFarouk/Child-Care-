import uuid
from django.db import models

class HealthEvent(models.Model):
    """
    Represents a health-related event for a child (e.g., vaccination, appointment).
    Only the parent can see or modify these events.
    """
    EVENT_TYPES = [
        ('vaccination', 'Vaccination'),
        ('appointment', 'Rendez-vous'),
        ('checkup', 'Visite de contrôle'),
        ('other', 'Autre'),
    ]

    STATUS_CHOICES = [
        ('planned', 'Planifié'),
        ('awaiting_confirmation', 'En attente de confirmation'),
        ('completed', 'Terminé'),
        ('cancelled', 'Annulé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent_id = models.UUIDField(db_index=True)
    child_id = models.UUIDField(db_index=True)
    
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    scheduled_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='planned')
    
    doctor_name = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=200, blank=True)
    vaccine_name = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'health_events'
        ordering = ['-scheduled_date', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_event_type_display()}) - {self.status}"
