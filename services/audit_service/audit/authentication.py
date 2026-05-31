from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from django.conf import settings
import uuid


class AuthenticatedUser:
    """
    Lightweight user object from a JWT issued by auth_service.
    No local DB query performed.
    """
    def __init__(self, user_id, email, role):
        self.id = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        self.email = email
        self.role = role
        self.is_authenticated = True

    def __str__(self):
        return f"{self.email} ({self.role})"


class SharedJWTAuthentication(JWTAuthentication):
    """
    Validates JWTs locally using the shared JWT_SIGNING_KEY.
    Same pattern as profile_service and measurements_service.
    """
    def get_user(self, validated_token):
        user_id = validated_token.get(
            settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id')
        )
        email = validated_token.get('email')
        role = validated_token.get('role')

        if not user_id or not role:
            raise InvalidToken('Token payload incomplete (missing user_id or role).')

        return AuthenticatedUser(user_id=user_id, email=email, role=role)
