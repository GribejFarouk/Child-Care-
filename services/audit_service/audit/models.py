import uuid
from django.db import models

class AuditEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor_id = models.UUIDField(null=True, blank=True)
    
    ACTOR_ROLE_CHOICES = [
        ('parent', 'Parent'),
        ('doctor', 'Doctor'),
        ('system', 'System'),
    ]
    actor_role = models.CharField(max_length=50, choices=ACTOR_ROLE_CHOICES)
    
    event_type = models.CharField(max_length=255, db_index=True)
    
    OUTCOME_CHOICES = [
        ('success', 'Success'),
        ('failure', 'Failure'),
        ('denied', 'Denied'),
    ]
    outcome = models.CharField(max_length=50, choices=OUTCOME_CHOICES)
    
    child_id = models.UUIDField(null=True, blank=True, db_index=True)
    parent_id = models.UUIDField(null=True, blank=True, db_index=True)
    share_id = models.UUIDField(null=True, blank=True)
    
    resource_type = models.CharField(max_length=255)
    resource_id = models.UUIDField(null=True, blank=True)
    
    source_service = models.CharField(max_length=255)
    summary = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    
    visible_to_parent = models.BooleanField(default=False)
    
    occurred_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-occurred_at']

    def __str__(self):
        return f"[{self.occurred_at}] {self.event_type} - {self.outcome}"
