from rest_framework import serializers
from .models import ParentProfile, DoctorProfile, Child

class ParentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentProfile
        fields = ['id', 'user_id', 'city', 'preferred_language', 'notification_preferences', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user_id', 'created_at', 'updated_at']

class DoctorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = ['id', 'user_id', 'specialty', 'clinic_name', 'license_number', 'address', 'bio', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user_id', 'created_at', 'updated_at']

class ChildSerializer(serializers.ModelSerializer):
    class Meta:
        model = Child
        fields = ['id', 'parent_id', 'first_name', 'last_name', 'date_of_birth', 'sex', 'blood_group', 'allergies', 'pediatrician', 'profile_picture_url', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'parent_id', 'created_at', 'updated_at']
