import os
import requests
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import HealthEvent
from .serializers import HealthEventSerializer
from .permissions import IsParent, IsParentOrSharedDoctor, get_collaboration_access_details

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from audit_client import publish_audit_event
except ImportError:
    def publish_audit_event(*args, **kwargs): pass


class HealthEventListCreateView(generics.ListCreateAPIView):
    """
    GET: List all health events for the authenticated parent.
         Can filter by child_id, status, event_type.
    POST: Create a new health event.
    """
    serializer_class = HealthEventSerializer
    permission_classes = [IsAuthenticated, IsParentOrSharedDoctor]

    def get_queryset(self):
        user = self.request.user
        queryset = HealthEvent.objects.all()
        
        if getattr(user, 'role', None) == 'parent':
            queryset = queryset.filter(parent_id=user.id)
        elif getattr(user, 'role', None) == 'doctor':
            child_id = self.request.query_params.get('child_id')
            if child_id:
                access = get_collaboration_access_details(user.id, child_id, 'calendar')
                if access.get('allowed') and access.get('parent_id'):
                    queryset = queryset.filter(child_id=child_id, parent_id=access['parent_id'])
                else:
                    return HealthEvent.objects.none()
            else:
                return HealthEvent.objects.none()
        else:
            return HealthEvent.objects.none()
        
        # Optional filters
        child_id = self.request.query_params.get('child_id')
        status = self.request.query_params.get('status')
        event_type = self.request.query_params.get('event_type')
        
        if child_id:
            queryset = queryset.filter(child_id=child_id)
        if status:
            queryset = queryset.filter(status=status)
        if event_type:
            queryset = queryset.filter(event_type=event_type)
            
        return queryset

    def perform_create(self, serializer):
        # Enforce parent_id from token
        event = serializer.save(parent_id=self.request.user.id)
        
        publish_audit_event(
            actor_id=self.request.user.id,
            actor_role=getattr(self.request.user, 'role', 'parent'),
            event_type='calendar_event_created',
            outcome='success',
            child_id=event.child_id,
            parent_id=event.parent_id,
            resource_type='health_event',
            resource_id=event.id,
            source_service='calendar_service',
            summary="Calendar event created",
            visible_to_parent=True
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if getattr(request.user, 'role', None) == 'doctor':
            child_id = request.query_params.get('child_id')
            if child_id:
                access = get_collaboration_access_details(request.user.id, child_id, 'calendar')
                parent_id = access.get('parent_id') if access.get('allowed') else None
                if parent_id:
                    publish_audit_event(
                        actor_id=request.user.id,
                        actor_role='doctor',
                        event_type='calendar_events_list_accessed',
                        outcome='success',
                        child_id=child_id,
                        parent_id=parent_id,
                        resource_type='health_event',
                        source_service='calendar_service',
                        summary="Doctor read child calendar events list",
                        visible_to_parent=True
                    )
        return response


class HealthEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a health event.
    PUT/PATCH: Update a health event (e.g. mark as completed).
    DELETE: Delete a health event.
    """
    serializer_class = HealthEventSerializer
    permission_classes = [IsAuthenticated, IsParentOrSharedDoctor]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'parent':
            return HealthEvent.objects.filter(parent_id=user.id)
        if getattr(user, 'role', None) == 'doctor':
            return HealthEvent.objects.all()
        return HealthEvent.objects.none()

    def retrieve(self, request, *args, **kwargs):
        event = self.get_object()
        response = Response(self.get_serializer(event).data)
        if getattr(request.user, 'role', None) == 'doctor':
            publish_audit_event(
                actor_id=request.user.id,
                actor_role='doctor',
                event_type='calendar_event_detail_accessed',
                outcome='success',
                child_id=event.child_id,
                parent_id=event.parent_id,
                resource_type='health_event',
                resource_id=event.id,
                source_service='calendar_service',
                summary="Doctor read calendar event detail",
                visible_to_parent=True
            )
        return response

    def perform_update(self, serializer):
        event = serializer.save(parent_id=self.request.user.id)
        publish_audit_event(
            actor_id=self.request.user.id,
            actor_role=getattr(self.request.user, 'role', 'parent'),
            event_type='calendar_event_updated',
            outcome='success',
            child_id=event.child_id,
            parent_id=event.parent_id,
            resource_type='health_event',
            resource_id=event.id,
            source_service='calendar_service',
            summary="Calendar event updated",
            visible_to_parent=True
        )

    def perform_destroy(self, instance):
        publish_audit_event(
            actor_id=self.request.user.id,
            actor_role=getattr(self.request.user, 'role', 'parent'),
            event_type='calendar_event_deleted',
            outcome='success',
            child_id=instance.child_id,
            parent_id=instance.parent_id,
            resource_type='health_event',
            resource_id=instance.id,
            source_service='calendar_service',
            summary="Calendar event deleted",
            visible_to_parent=True
        )
        instance.delete()

from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404

class HealthEventConfirmView(APIView):
    permission_classes = [IsAuthenticated, IsParent]

    def patch(self, request, pk, *args, **kwargs):
        event = get_object_or_404(HealthEvent, pk=pk, parent_id=request.user.id)

        is_overdue_planned = event.status == 'planned' and event.scheduled_date < timezone.now().date()

        # Only awaiting_confirmation events, or overdue planned events that the worker
        # has not processed yet, may be confirmed or cancelled.
        if event.status != 'awaiting_confirmation' and not is_overdue_planned:
            return Response(
                {"error": f"Cannot confirm/cancel an event with status '{event.status}'. Only overdue or awaiting-confirmation events are eligible."},
                status=status.HTTP_409_CONFLICT,
            )

        action = request.data.get('action') # 'confirm' or 'cancel'
        if action == 'confirm':
            event.status = 'completed'
            event.completed_date = timezone.now().date()
            
            # Send notification to notification_service for parent (and fan-out to doctor if shared)
            import os
            import requests
            NOTIFICATION_SERVICE_URL = os.environ.get('NOTIFICATION_SERVICE_URL', 'http://notification_service:8000')
            INTERNAL_SERVICE_TOKEN = os.environ.get('INTERNAL_SERVICE_TOKEN')
            
            notif_data = {
                "recipient_id": str(event.parent_id),
                "recipient_role": "parent",
                "child_id": str(event.child_id),
                "notification_type": "event_confirmed",
                "title": f"Événement complété: {event.get_event_type_display()}",
                "message": f"L'événement '{event.title}' pour votre enfant a été marqué comme complété.",
                "source_service": "calendar",
                "source_object_id": str(event.id),
                "permission_scope": "calendar",
                "action_url": "/calendar",
                "idempotency_key": f"calendar:{event.id}:confirm:{event.parent_id}"
            }
            try:
                requests.post(
                    f"{NOTIFICATION_SERVICE_URL}/api/notifications/internal/create/",
                    json=notif_data,
                    headers={"X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN},
                    timeout=5
                )
            except Exception as e:
                # Log error and continue; we don't want to fail confirmation if notification service has transient issue
                print(f"Error sending confirmation notification: {e}")
                
        elif action == 'cancel':
            event.status = 'cancelled'
        else:
            return Response({"error": "action must be 'confirm' or 'cancel'"}, status=status.HTTP_400_BAD_REQUEST)
            
        event.save()
        
        publish_audit_event(
            actor_id=request.user.id,
            actor_role=getattr(request.user, 'role', 'parent'),
            event_type='calendar_event_confirmed' if action == 'confirm' else 'calendar_event_cancelled',
            outcome='success',
            child_id=event.child_id,
            parent_id=event.parent_id,
            resource_type='health_event',
            resource_id=event.id,
            source_service='calendar_service',
            summary=f"Calendar event {action}ed",
            visible_to_parent=True
        )
        
        return Response(HealthEventSerializer(event).data)


class InternalUpcomingEventsContextView(APIView):
    """GET /api/calendar/internal/upcoming-context/ - safe assistant context only."""
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        expected = os.environ.get('INTERNAL_SERVICE_TOKEN')
        provided = request.headers.get('X-Internal-Service-Token') or request.META.get('HTTP_X_INTERNAL_SERVICE_TOKEN')
        if not expected or provided != expected:
            return Response({"error": "Unauthorized internal request"}, status=status.HTTP_403_FORBIDDEN)
        parent_id = request.query_params.get('parent_id')
        child_id = request.query_params.get('child_id')
        if not parent_id or not child_id:
            return Response({"error": "parent_id and child_id are required"}, status=status.HTTP_400_BAD_REQUEST)
        events = HealthEvent.objects.filter(
            parent_id=parent_id,
            child_id=child_id,
            status='planned',
            scheduled_date__gte=timezone.now().date(),
        ).order_by('scheduled_date').values('event_type', 'title', 'scheduled_date', 'status')[:5]
        return Response({"upcoming_events": list(events)})
