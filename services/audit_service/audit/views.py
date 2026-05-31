import os
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import AuditEvent
from rest_framework.exceptions import PermissionDenied
from .serializers import AuditEventSerializer, PublicActivityEventSerializer

class InternalAuditEventCreateView(APIView):
    """
    POST /api/audit/internal/events/
    Append-only endpoint for other services to publish audit events.
    """
    permission_classes = []
    
    def post(self, request):
        expected_token = os.environ.get('INTERNAL_SERVICE_TOKEN')
        if not expected_token or expected_token == 'change_me_internal_token_123' or expected_token.startswith('change_me_') or expected_token.startswith('replace_with_') or len(expected_token) < 32:
            return Response({"error": "Internal token not securely configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        provided_token = request.headers.get('X-Internal-Service-Token') or request.META.get('HTTP_X_INTERNAL_SERVICE_TOKEN')
        
        if not provided_token or provided_token != expected_token:
            return Response({"error": "Unauthorized internal request"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = AuditEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ActivityJournalViewSet(generics.ListAPIView):
    """
    GET /api/audit/activity/
    Returns parent-visible events for the authenticated parent.
    """
    serializer_class = PublicActivityEventSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', 'parent')
        
        if role != 'parent':
            raise PermissionDenied("Seuls les parents peuvent accéder à leur journal d'activité.")
            
        # Return events linked to this parent that are visible
        return AuditEvent.objects.filter(
            parent_id=user.id,
            visible_to_parent=True
        )
