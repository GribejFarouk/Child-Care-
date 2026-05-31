from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Read-only user representation (used in responses)."""

    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'first_name', 'last_name', 'phone',
                  'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'role', 'is_active', 'created_at', 'updated_at']


class RegisterParentSerializer(serializers.ModelSerializer):
    """Registration serializer for parents."""
    password = serializers.CharField(write_only=True, min_length=8,
                                     validators=[validate_password])

    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name', 'phone']

    def create(self, validated_data):
        return User.objects.create_user(role='parent', **validated_data)


class RegisterDoctorSerializer(serializers.ModelSerializer):
    """Registration serializer for doctors."""
    password = serializers.CharField(write_only=True, min_length=8,
                                     validators=[validate_password])

    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name', 'phone']

    def create(self, validated_data):
        return User.objects.create_user(role='doctor', **validated_data)


class LoginSerializer(serializers.Serializer):
    """Login with email + password."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UpdateUserSerializer(serializers.ModelSerializer):
    """Allows updating first_name, last_name, phone only."""

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone']
