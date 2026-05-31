from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.conf import settings
import uuid

class AuthenticatedUser:
    """Lightweight user object representing an authenticated user from a JWT."""
    def __init__(self, user_id, email, role):
        self.id = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        self.email = email
        self.role = role
        self.is_authenticated = True

    def __str__(self):
        return f"{self.email} ({self.role})"


class SharedJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that uses SimpleJWT's token validation
    but creates a lightweight AuthenticatedUser instead of querying a local DB user model.
    """
    def get_user(self, validated_token):
        """
        Returns a stateless user object constructed from the token claims.
        We override this to avoid the default behavior of querying get_user_model().
        """
        user_id = validated_token.get(settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id'))
        email = validated_token.get('email')
        role = validated_token.get('role')

        if not user_id or not role:
            raise InvalidToken('Token payload incomplete (missing user_id or role).')

        return AuthenticatedUser(user_id=user_id, email=email, role=role)
