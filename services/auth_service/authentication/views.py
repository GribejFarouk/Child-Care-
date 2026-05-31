from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from .serializers import (
    RegisterParentSerializer,
    RegisterDoctorSerializer,
    LoginSerializer,
    UserSerializer,
    UpdateUserSerializer,
)
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from audit_client import publish_audit_event
except ImportError:
    def publish_audit_event(*args, **kwargs): pass

User = get_user_model()


def _get_tokens_with_claims(user):
    """Generate JWT tokens with custom claims (user_id, email, role)."""
    refresh = RefreshToken.for_user(user)
    refresh['email'] = user.email
    refresh['role'] = user.role
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


class RegisterParentView(APIView):
    """POST /api/auth/register/parent/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterParentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = _get_tokens_with_claims(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
        }, status=status.HTTP_201_CREATED)


class RegisterDoctorView(APIView):
    """POST /api/auth/register/doctor/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterDoctorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = _get_tokens_with_claims(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
        )
        
        email_provided = serializer.validated_data['email']
        
        if user is None:
            # Try to get the user to log their ID for failure
            failed_user = User.objects.filter(email=email_provided).first()
            actor_id = failed_user.id if failed_user else None
            actor_role = failed_user.role if failed_user else 'system'
            visible_to_parent = bool(failed_user and failed_user.role == 'parent')
            publish_audit_event(
                actor_id=actor_id,
                actor_role=actor_role,
                event_type='user_login',
                outcome='failure',
                parent_id=failed_user.id if visible_to_parent else None,
                resource_type='auth',
                source_service='auth_service',
                summary='Tentative de connexion échouée.',
                visible_to_parent=visible_to_parent,
            )
            return Response(
                {'detail': 'Identifiants invalides.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            
        if not user.is_active:
            visible_to_parent = user.role == 'parent'
            publish_audit_event(
                actor_id=user.id,
                actor_role=user.role,
                event_type='user_login',
                outcome='denied',
                parent_id=user.id if visible_to_parent else None,
                resource_type='auth',
                source_service='auth_service',
                summary='Tentative de connexion sur un compte désactivé.',
                visible_to_parent=visible_to_parent,
            )
            return Response(
                {'detail': 'Ce compte est désactivé.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        visible_to_parent = user.role == 'parent'
        publish_audit_event(
            actor_id=user.id,
            actor_role=user.role,
            event_type='user_login',
            outcome='success',
            parent_id=user.id if visible_to_parent else None,
            resource_type='auth',
            source_service='auth_service',
            summary='Connexion réussie.',
            visible_to_parent=visible_to_parent,
        )

        tokens = _get_tokens_with_claims(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
        })


class LogoutView(APIView):
    """POST /api/auth/logout/ — blacklists the refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Le token refresh est requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(
                {'detail': 'Token invalide ou déjà révoqué.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MeView(APIView):
    """GET/PATCH /api/auth/me/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UpdateUserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


# Re-export SimpleJWT's refresh view for URL routing
class CustomTokenRefreshView(TokenRefreshView):
    """POST /api/auth/token/refresh/"""
    pass
