from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
import os
import uuid


from .models import ChildShare, Message, ConsultationSession
from .serializers import ChildShareSerializer, MessageSerializer, ConsultationSessionSerializer
from .permissions import IsParent, IsDoctor, IsParentOrDoctor
from rest_framework.exceptions import PermissionDenied, ValidationError
import requests
from django.utils import timezone

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from audit_client import publish_audit_event
except ImportError:
    def publish_audit_event(*args, **kwargs): pass

INTERNAL_SERVICE_TOKEN = os.environ.get('INTERNAL_SERVICE_TOKEN')


class ChildShareViewSet(viewsets.ModelViewSet):
    serializer_class = ChildShareSerializer
    permission_classes = [IsAuthenticated, IsParentOrDoctor]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'parent':
            return ChildShare.objects.filter(parent_id=user.id)
        elif getattr(user, 'role', None) == 'doctor':
            return ChildShare.objects.filter(doctor_id=user.id, status='active')
        return ChildShare.objects.none()

    def perform_create(self, serializer):
        # Only parents can create shares
        if getattr(self.request.user, 'role', None) != 'parent':
            raise PermissionDenied("Only parents can share child profiles.")
        share = serializer.save()
        publish_audit_event(
            actor_id=self.request.user.id,
            actor_role='parent',
            event_type='share_created',
            outcome='success',
            child_id=share.child_id,
            parent_id=share.parent_id,
            share_id=share.id,
            resource_type='child_share',
            resource_id=share.id,
            source_service='collaboration_service',
            summary="Parent generated a new sharing code",
            visible_to_parent=True
        )

    def update(self, request, *args, **kwargs):
        # Parents can update permissions or revoke
        if getattr(request.user, 'role', None) != 'parent':
            return Response({'detail': 'Only parents can modify shares.'}, status=status.HTTP_403_FORBIDDEN)
        
        # If updating status, only allow setting to 'revoked'
        if 'status' in request.data and request.data['status'] != 'revoked':
            return Response({'detail': 'You can only revoke a share.'}, status=status.HTTP_400_BAD_REQUEST)

        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Merge permissions if provided
        data = request.data.copy()
        if 'permissions' in data and isinstance(data['permissions'], dict):
            existing_perms = instance.permissions or {}
            merged = existing_perms.copy()
            merged.update(data['permissions'])
            data['permissions'] = merged

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        event_type = 'share_revoked' if request.data.get('status') == 'revoked' else 'share_permissions_updated'
        publish_audit_event(
            actor_id=request.user.id,
            actor_role='parent',
            event_type=event_type,
            outcome='success',
            child_id=instance.child_id,
            parent_id=instance.parent_id,
            share_id=instance.id,
            resource_type='child_share',
            resource_id=instance.id,
            source_service='collaboration_service',
            summary=f"Parent {event_type}",
            visible_to_parent=True
        )
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsDoctor])
    def accept(self, request):
        """Doctor accepts a sharing code."""
        code = request.data.get('code')
        if not code:
            return Response({'detail': 'Sharing code is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            share = ChildShare.objects.get(sharing_code=code.upper(), status='pending')
        except ChildShare.DoesNotExist:
            return Response({'detail': 'Invalid, expired, or already used sharing code.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if this doctor already has access to this child
        if ChildShare.objects.filter(child_id=share.child_id, doctor_id=request.user.id, status='active').exists():
            return Response({'detail': 'You already have access to this child.'}, status=status.HTTP_400_BAD_REQUEST)

        share.doctor_id = request.user.id
        share.doctor_email = getattr(request.user, 'email', '')
        share.doctor_display_name = getattr(request.user, 'email', '')
        share.status = 'active'
        share.save()

        return Response(ChildShareSerializer(share).data, status=status.HTTP_200_OK)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated, IsParentOrDoctor]

    def get_queryset(self):
        share_id = self.request.query_params.get('share_id')
        if not share_id:
            return Message.objects.none()
        
        # Verify access to the share
        user = self.request.user
        try:
            if getattr(user, 'role', None) == 'parent':
                share = ChildShare.objects.get(id=share_id, parent_id=user.id)
            else:
                share = ChildShare.objects.get(id=share_id, doctor_id=user.id, status='active')
        except ChildShare.DoesNotExist:
            return Message.objects.none()

        # Mark as read if fetched by the other party
        messages = Message.objects.filter(share_id=share_id)
        unread = messages.exclude(sender_id=user.id).filter(is_read=False)
        if unread.exists():
            unread.update(is_read=True)

        return messages

    def perform_create(self, serializer):
        share_id = self.request.data.get('share')
        user = self.request.user
        
        # Verify access before sending
        try:
            if getattr(user, 'role', None) == 'parent':
                share = ChildShare.objects.get(id=share_id, parent_id=user.id)
            else:
                share = ChildShare.objects.get(id=share_id, doctor_id=user.id, status='active')
        except ChildShare.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have access to this conversation.")

        serializer.save()

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        user = request.user
        if getattr(user, 'role', None) == 'doctor':
            shares = ChildShare.objects.filter(doctor_id=user.id, status='active')
        elif getattr(user, 'role', None) == 'parent':
            shares = ChildShare.objects.filter(parent_id=user.id)
        else:
            return Response({'unread_count': 0}, status=status.HTTP_200_OK)
            
        count = Message.objects.filter(share__in=shares, is_read=False).exclude(sender_id=user.id).count()
        return Response({'unread_count': count}, status=status.HTTP_200_OK)

class InternalAccessCheckView(views.APIView):
    """
    Internal endpoint called by other microservices to verify doctor access.
    Protected by X-Internal-Service-Token header.
    Query params: doctor_id, child_id, section
    """
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        # Verify internal service token
        token = request.headers.get('X-Internal-Service-Token')
        if not token or token != INTERNAL_SERVICE_TOKEN:
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        doctor_id = request.query_params.get('doctor_id')
        child_id = request.query_params.get('child_id')
        section = request.query_params.get('section')

        if not doctor_id or not child_id:
            return Response({'allowed': False, 'detail': 'Missing parameters'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            doc_uuid = uuid.UUID(str(doctor_id))
            child_uuid = uuid.UUID(str(child_id))
            share = ChildShare.objects.get(doctor_id=doc_uuid, child_id=child_uuid, status='active')
        except (ValueError, TypeError, ChildShare.DoesNotExist):
            return Response({'allowed': False}, status=status.HTTP_200_OK)

        # Check section permission
        permissions = share.permissions or {}
        if section and not permissions.get(section, False):
            return Response({
                'allowed': False,
                'share_id': str(share.id),
                'parent_id': str(share.parent_id),
            }, status=status.HTTP_200_OK)

        return Response({
            'allowed': True,
            'share_id': str(share.id),
            'parent_id': str(share.parent_id),
            'permissions': permissions
        }, status=status.HTTP_200_OK)

class InternalSharesByChildrenView(views.APIView):
    """
    Internal endpoint to get all active shares for a list of child_ids.
    Protected by X-Internal-Service-Token header.
    Used by notification_service for fan-out.
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        # Verify internal service token
        token = request.headers.get('X-Internal-Service-Token')
        if not token or token != INTERNAL_SERVICE_TOKEN:
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        child_ids = request.data.get('child_ids', [])
        if not child_ids:
            return Response({}, status=status.HTTP_200_OK)

        # Convert to UUIDs
        uuids = []
        for cid in child_ids:
            try:
                uuids.append(uuid.UUID(str(cid)))
            except (ValueError, TypeError):
                pass
        
        shares = ChildShare.objects.filter(child_id__in=uuids, status='active')
        
        result = {}
        for share in shares:
            cid = str(share.child_id)
            if cid not in result:
                result[cid] = []
            result[cid].append({
                "doctor_id": str(share.doctor_id),
                "permissions": share.permissions or {}
            })
            
        return Response(result, status=status.HTTP_200_OK)

class ConsultationViewSet(viewsets.ModelViewSet):
    serializer_class = ConsultationSessionSerializer
    permission_classes = [IsAuthenticated, IsParentOrDoctor]
    http_method_names = ['get', 'post', 'head', 'options']
    
    def _get_active_share(self, share_id, require_active=True):
        user = self.request.user
        try:
            if getattr(user, 'role', None) == 'parent':
                share = ChildShare.objects.get(id=share_id, parent_id=user.id)
                if require_active and share.status != 'active':
                    return None
            else:
                share = ChildShare.objects.get(id=share_id, doctor_id=user.id, status='active')
        except ChildShare.DoesNotExist:
            return None
            
        if not share.permissions or not share.permissions.get('consultation', False):
            return None
        return share

    def get_queryset(self):
        user = self.request.user
        qs = ConsultationSession.objects.all()

        if getattr(user, 'role', None) == 'parent':
            qs = qs.filter(share__parent_id=user.id)
        elif getattr(user, 'role', None) == 'doctor':
            qs = qs.filter(
                share__doctor_id=user.id,
                share__status='active',
                share__permissions__consultation=True
            )
        else:
            return qs.none()

        if self.action == 'list':
            share_id = self.request.query_params.get('share_id')
            if not share_id:
                return qs.none()
            try:
                share_id = uuid.UUID(str(share_id))
            except (ValueError, TypeError):
                raise ValidationError({"share_id": "Invalid share identifier."})
            qs = qs.filter(share_id=share_id)

        return qs

    def perform_create(self, serializer):
        share_id = self.request.data.get('share')
        if not share_id:
            raise ValidationError({"share": "This field is required."})
            
        share = self._get_active_share(share_id, require_active=True)
        if not share:
            raise PermissionDenied("You do not have active consultation permission for this share.")
            
        # Check if there is already an open session
        if ConsultationSession.objects.filter(share=share, status__in=['scheduled', 'active']).exists():
            raise PermissionDenied("An active or scheduled consultation already exists for this share.")
            
        session = serializer.save(share=share, status='scheduled')
        
        publish_audit_event(
            actor_id=self.request.user.id,
            actor_role=getattr(self.request.user, 'role', 'parent'),
            event_type='consultation_created',
            outcome='success',
            child_id=share.child_id,
            parent_id=share.parent_id,
            share_id=share.id,
            resource_type='consultation_session',
            resource_id=session.id,
            source_service='collaboration_service',
            summary="Consultation session created",
            visible_to_parent=True
        )
        
        # Notify if scheduled
        if session.scheduled_at:
            self._notify_other_party(session, share, "scheduled")

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        session = self.get_object()
        share = self._get_active_share(session.share_id, require_active=True)
        if not share:
            raise PermissionDenied("You do not have access to this consultation.")
            
        if session.status in [ConsultationSession.Status.COMPLETED, ConsultationSession.Status.CANCELLED]:
            return Response({"detail": "Consultation has already ended."}, status=status.HTTP_400_BAD_REQUEST)
            
        if session.status == ConsultationSession.Status.SCHEDULED:
            session.status = ConsultationSession.Status.ACTIVE
            session.started_at = timezone.now()
            session.save()
            
        base_url = os.environ.get('MEETING_PROVIDER_BASE_URL', 'https://meet.jit.si')
        join_url = f"{base_url.rstrip('/')}/{session.room_token}"
        
        publish_audit_event(
            actor_id=request.user.id,
            actor_role=getattr(request.user, 'role', 'parent'),
            event_type='consultation_joined',
            outcome='success',
            child_id=share.child_id,
            parent_id=share.parent_id,
            share_id=share.id,
            resource_type='consultation_session',
            resource_id=session.id,
            source_service='collaboration_service',
            summary="User joined consultation session",
            visible_to_parent=True
        )
        
        return Response({"join_url": join_url}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        session = self.get_object()
        share = self._get_active_share(session.share_id, require_active=True)
        if not share:
            raise PermissionDenied("You do not have access.")
            
        if session.status != ConsultationSession.Status.ACTIVE:
            return Response({"detail": "Only active sessions can be completed."}, status=status.HTTP_400_BAD_REQUEST)
            
        session.status = ConsultationSession.Status.COMPLETED
        session.ended_at = timezone.now()
        session.save()
        
        publish_audit_event(
            actor_id=request.user.id,
            actor_role=getattr(request.user, 'role', 'parent'),
            event_type='consultation_completed',
            outcome='success',
            child_id=share.child_id,
            parent_id=share.parent_id,
            share_id=share.id,
            resource_type='consultation_session',
            resource_id=session.id,
            source_service='collaboration_service',
            summary="Consultation session completed",
            visible_to_parent=True
        )
        
        return Response({"status": session.status}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        session = self.get_object()
        share = self._get_active_share(session.share_id, require_active=True)
        if not share:
            raise PermissionDenied("You do not have access.")
            
        if session.status not in [ConsultationSession.Status.SCHEDULED, ConsultationSession.Status.ACTIVE]:
            return Response({"detail": "Cannot cancel this session."}, status=status.HTTP_400_BAD_REQUEST)
            
        session.status = ConsultationSession.Status.CANCELLED
        session.ended_at = timezone.now()
        session.save()
        
        publish_audit_event(
            actor_id=request.user.id,
            actor_role=getattr(request.user, 'role', 'parent'),
            event_type='consultation_cancelled',
            outcome='success',
            child_id=share.child_id,
            parent_id=share.parent_id,
            share_id=share.id,
            resource_type='consultation_session',
            resource_id=session.id,
            source_service='collaboration_service',
            summary="Consultation session cancelled",
            visible_to_parent=True
        )
        
        self._notify_other_party(session, share, "cancelled")
        return Response({"status": session.status}, status=status.HTTP_200_OK)
        
    def _notify_other_party(self, session, share, event_type):
        host = os.environ.get('NOTIFICATION_SERVICE_HOST', 'notification_service')
        port = os.environ.get('NOTIFICATION_SERVICE_PORT', '8000')
        url = f"http://{host}:{port}/api/notifications/internal/create/"
        
        sender_role = getattr(self.request.user, 'role', 'parent')
        if sender_role == 'parent':
            recipient_id = str(share.doctor_id)
            recipient_role = 'doctor'
        else:
            recipient_id = str(share.parent_id)
            recipient_role = 'parent'
            
        title = "Consultation planifiée" if event_type == "scheduled" else "Consultation annulée"
        msg = "Une consultation a été planifiée." if event_type == "scheduled" else "La consultation a été annulée."
        
        payload = {
            "recipient_id": recipient_id,
            "recipient_role": recipient_role,
            "child_id": str(share.child_id),
            "notification_type": f"consultation_{event_type}",
            "title": title,
            "message": msg,
            "source_service": "collaboration_service",
            "source_object_id": str(session.id),
            "permission_scope": "consultation",
            "action_url": "/doctor/messages" if recipient_role == 'doctor' else "/collaboration"
        }
        headers = {
            'Host': 'localhost',
            'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN
        }
        try:
            requests.post(url, json=payload, headers=headers, timeout=2)
        except Exception:
            pass
