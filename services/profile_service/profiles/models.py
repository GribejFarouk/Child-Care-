import uuid
from django.db import models

class ParentProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(unique=True, help_text="References auth_service user id")
    city = models.CharField(max_length=100, blank=True)
    preferred_language = models.CharField(max_length=5, default='fr')
    notification_preferences = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'parent_profiles'

    def __str__(self):
        return f"ParentProfile for user {self.user_id}"


class DoctorProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(unique=True, help_text="References auth_service user id")
    specialty = models.CharField(max_length=100, blank=True)
    clinic_name = models.CharField(max_length=200, blank=True)
    license_number = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=300, blank=True)
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doctor_profiles'

    def __str__(self):
        return f"DoctorProfile for user {self.user_id}"


class Child(models.Model):
    class SexChoices(models.TextChoices):
        MALE = 'M', 'Male'
        FEMALE = 'F', 'Female'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent_id = models.UUIDField(db_index=True, help_text="References auth_service user id of the parent")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField()
    sex = models.CharField(max_length=1, choices=SexChoices.choices)
    blood_group = models.CharField(max_length=5, blank=True)
    allergies = models.JSONField(default=list)
    pediatrician = models.CharField(max_length=200, blank=True)
    profile_picture_url = models.URLField(blank=True, max_length=500)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'children'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
