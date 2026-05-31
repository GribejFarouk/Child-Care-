import uuid
from django.db import models

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient_id = models.UUIDField(db_index=True)
    recipient_role = models.CharField(max_length=20)
    child_id = models.UUIDField(db_index=True, null=True, blank=True)
    
    notification_type = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    source_service = models.CharField(max_length=50)
    source_object_id = models.UUIDField(null=True, blank=True)
    permission_scope = models.CharField(max_length=50, null=True, blank=True)
    action_url = models.CharField(max_length=255, null=True, blank=True)
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    due_at = models.DateTimeField(null=True, blank=True)
    
    idempotency_key = models.CharField(max_length=255, unique=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.recipient_role}"
