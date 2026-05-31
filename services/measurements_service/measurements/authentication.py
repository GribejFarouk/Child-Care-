from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from django.conf import settings
import uuid


class AuthenticatedUser:
    """
    Lightweight user object representing an authenticated user reconstructed
    from a JWT issued by auth_service. No local DB query is performed.
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
    Validates JWTs signed with the shared JWT_SIGNING_KEY (same key used by
    auth_service). Builds an AuthenticatedUser from token claims without
    touching any local user table.
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
