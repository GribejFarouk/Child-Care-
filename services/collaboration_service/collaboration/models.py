import uuid
import string
import random
from django.db import models

def generate_sharing_code():
    """Generates a random 6-character uppercase alphanumeric code."""
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choice(chars) for _ in range(6))
        # Ensure it's unique
        if not ChildShare.objects.filter(sharing_code=code).exists():
            return code

class ChildShare(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('revoked', 'Revoked'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent_id = models.UUIDField()
    child_id = models.UUIDField()
    doctor_id = models.UUIDField(null=True, blank=True)
    doctor_email = models.EmailField(blank=True)
    doctor_display_name = models.CharField(max_length=255, blank=True)
    sharing_code = models.CharField(max_length=8, unique=True, default=generate_sharing_code)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    permissions = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Share {self.child_id} ({self.status})"

class Message(models.Model):
    ROLE_CHOICES = [
        ('parent', 'Parent'),
        ('doctor', 'Doctor'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    share = models.ForeignKey(ChildShare, on_delete=models.CASCADE, related_name='messages')
    sender_id = models.UUIDField()
    sender_role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender_role} on {self.created_at}"

import secrets

def generate_room_token():
    """Generates a secure, URL-safe random string for Jitsi room IDs."""
    return secrets.token_urlsafe(32)

class ConsultationSession(models.Model):
    class SessionType(models.TextChoices):
        VIDEO = 'video', 'Vidéo'
        AUDIO = 'audio', 'Audio'

    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Planifiée'
        ACTIVE = 'active', 'En cours'
        COMPLETED = 'completed', 'Terminée'
        CANCELLED = 'cancelled', 'Annulée'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    share = models.ForeignKey(ChildShare, on_delete=models.CASCADE, related_name='consultation_sessions')
    created_by_id = models.UUIDField()
    created_by_role = models.CharField(max_length=20, choices=[('parent', 'Parent'), ('doctor', 'Médecin')])
    session_type = models.CharField(max_length=10, choices=SessionType.choices, default=SessionType.VIDEO)
    room_token = models.CharField(max_length=128, unique=True, default=generate_room_token)
    provider = models.CharField(max_length=30, default='jitsi')
    scheduled_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.session_type.capitalize()} Consultation for Share {self.share_id} ({self.status})"

