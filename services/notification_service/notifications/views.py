import os
import requests
from rest_framework import views, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q
from .models import Notification
from .serializers import NotificationSerializer

COLLABORATION_SERVICE_URL = os.environ.get('COLLABORATION_SERVICE_URL', 'http://collaboration_service:8000')
INTERNAL_SERVICE_TOKEN = os.environ.get('INTERNAL_SERVICE_TOKEN')


def _get_doctor_allowed_notification_ids(request):
    """
    For a doctor user, fetch active shares from the collaboration service
    and return a set of notification IDs the doctor is allowed to access.
    Returns None for non-doctor users (meaning "all allowed").
    Returns an empty set if the collaboration service is unreachable or returns an error.
    """
    role = getattr(request.user, 'role', 'parent')
    if role != 'doctor':
        return None  # No filtering needed

    user_id = request.user.id
    auth_header = request.headers.get('Authorization')
    queryset = Notification.objects.filter(recipient_id=user_id)

    try:
        resp = requests.get(
            f"{COLLABORATION_SERVICE_URL}/api/collaboration/shares/",
            headers={'Host': 'localhost', 'Authorization': auth_header},
            timeout=3
        )
        if resp.status_code == 200:
            shares = resp.json()
            allowed_child_ids = []
            valid_scopes_per_child = {}
            for share in shares:
                if share['status'] == 'active':
                    cid = share['child_id']
                    allowed_child_ids.append(cid)
                    valid_scopes_per_child[cid] = share.get('permissions', {})

            final_ids = set()
            for notif in queryset:
                cid = str(notif.child_id) if notif.child_id else None
                if not cid:
                    final_ids.add(notif.id)
                    continue
                if cid in allowed_child_ids:
                    scope = notif.permission_scope
                    if not scope or valid_scopes_per_child[cid].get(scope, False):
                        final_ids.add(notif.id)
            return final_ids
        else:
            return set()  # Fail-safe: deny all
    except Exception:
        return set()  # Fail-safe: deny all

class InternalCreateNotificationView(views.APIView):
    """
    Internal endpoint to create notifications.
    Protected by X-Internal-Service-Token header.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        auth_header = request.headers.get('X-Internal-Service-Token')
        if not auth_header or auth_header != INTERNAL_SERVICE_TOKEN:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        is_many = isinstance(request.data, list)
        serializer = NotificationSerializer(data=request.data, many=is_many)
        if serializer.is_valid():
            items = serializer.validated_data if is_many else [serializer.validated_data]
            
            # Fan out logic: fetch shares for all child_ids involved
            child_ids = list(set([str(item['child_id']) for item in items if item.get('child_id')]))
            shares_by_child = {}
            if child_ids:
                try:
                    # Using internal API token to bypass JWT since this is a backend-to-backend request
                    resp = requests.post(
                        f"{COLLABORATION_SERVICE_URL}/api/collaboration/internal/shares-by-children/",
                        json={"child_ids": child_ids},
                        headers={'Host': 'localhost', 'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN},
                        timeout=5
                    )
                    if resp.status_code == 200:
                        shares_by_child = resp.json()  # expects { child_id: [ { doctor_id, permissions }, ... ] }
                except Exception as e:
                    print("Error fetching shares for fan-out:", e)

            created_data = []
            for item in items:
                # 1. Create for parent
                obj, _ = Notification.objects.get_or_create(
                    idempotency_key=item['idempotency_key'],
                    defaults=item
                )
                created_data.append(NotificationSerializer(obj).data)
                
                # 2. Fan out to doctors
                cid = str(item.get('child_id'))
                scope = item.get('permission_scope')
                
                if cid and cid in shares_by_child:
                    for share in shares_by_child[cid]:
                        # Check permission
                        if not scope or share.get('permissions', {}).get(scope, False):
                            doc_id = share['doctor_id']
                            doc_item = item.copy()
                            doc_item['recipient_id'] = doc_id
                            doc_item['recipient_role'] = 'doctor'
                            doc_item['idempotency_key'] = f"{item['idempotency_key']}:doc:{doc_id}"
                            
                            doc_obj, _ = Notification.objects.get_or_create(
                                idempotency_key=doc_item['idempotency_key'],
                                defaults=doc_item
                            )
            
            if is_many:
                return Response(created_data, status=status.HTTP_201_CREATED)
            else:
                return Response(created_data[0], status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class NotificationListView(generics.ListAPIView):
    """
    List notifications for the current user.
    For doctors, re-verifies active access and permissions dynamically.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.request.user.id
        role = getattr(self.request.user, 'role', 'parent')
        
        # Base query: recipient is the current user
        queryset = Notification.objects.filter(recipient_id=user_id)
        
        if role == 'doctor':
            # Dynamically check permissions
            # Forward the JWT token to get doctor shares
            auth_header = self.request.headers.get('Authorization')
            try:
                resp = requests.get(
                    f"{COLLABORATION_SERVICE_URL}/api/collaboration/shares/",
                    headers={'Host': 'localhost', 'Authorization': auth_header},
                    timeout=3
                )
                if resp.status_code == 200:
                    shares = resp.json()
                    # Filter notifications based on active shares
                    allowed_child_ids = []
                    valid_scopes_per_child = {}
                    for share in shares:
                        if share['status'] == 'active':
                            cid = share['child_id']
                            allowed_child_ids.append(cid)
                            valid_scopes_per_child[cid] = share.get('permissions', {})
                    
                    # Filter logic:
                    # Keep notification if:
                    # 1. child_id is in allowed_child_ids
                    # 2. notification.permission_scope is null OR the doctor has that permission
                    
                    # We can fetch the filtered set in Python since notifications per doctor shouldn't be massive
                    final_ids = []
                    for notif in queryset:
                        cid = str(notif.child_id) if notif.child_id else None
                        if not cid:
                            final_ids.append(notif.id)
                            continue
                            
                        if cid in allowed_child_ids:
                            scope = notif.permission_scope
                            if not scope or valid_scopes_per_child[cid].get(scope, False):
                                final_ids.append(notif.id)
                                
                    return Notification.objects.filter(id__in=final_ids)
                else:
                    return Notification.objects.none() # Fallback safe
            except Exception:
                return Notification.objects.none() # Fallback safe
                
        return queryset

class NotificationReadView(views.APIView):
    """
    Mark a notification as read.
    For doctors, re-verifies active access and permissions dynamically.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, *args, **kwargs):
        try:
            notification = Notification.objects.get(pk=pk, recipient_id=request.user.id)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # Doctor permission recheck
        allowed_ids = _get_doctor_allowed_notification_ids(request)
        if allowed_ids is not None and notification.id not in allowed_ids:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        notification.is_read = True
        notification.save()
        return Response({"status": "marked as read"})

class NotificationMarkAllReadView(views.APIView):
    """
    Mark all notifications as read for current user.
    For doctors, only marks notifications the doctor still has access to.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        allowed_ids = _get_doctor_allowed_notification_ids(request)
        if allowed_ids is not None:
            # Doctor: only mark allowed notifications
            Notification.objects.filter(
                id__in=allowed_ids, is_read=False
            ).update(is_read=True)
        else:
            # Parent: mark all own notifications
            Notification.objects.filter(
                recipient_id=request.user.id, is_read=False
            ).update(is_read=True)
        return Response({"status": "all marked as read"})

class NotificationUnreadCountView(views.APIView):
    """
    GET /api/notifications/unread-count/
    Returns the unread count for the current user (same permission logic as list).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user_id = request.user.id
        role = getattr(request.user, 'role', 'parent')
        
        queryset = Notification.objects.filter(recipient_id=user_id, is_read=False)
        
        if role == 'doctor':
            auth_header = request.headers.get('Authorization')
            try:
                resp = requests.get(
                    f"{COLLABORATION_SERVICE_URL}/api/collaboration/shares/",
                    headers={'Host': 'localhost', 'Authorization': auth_header},
                    timeout=3
                )
                if resp.status_code == 200:
                    shares = resp.json()
                    allowed_child_ids = []
                    valid_scopes_per_child = {}
                    for share in shares:
                        if share['status'] == 'active':
                            cid = share['child_id']
                            allowed_child_ids.append(cid)
                            valid_scopes_per_child[cid] = share.get('permissions', {})
                    
                    count = 0
                    for notif in queryset:
                        cid = str(notif.child_id) if notif.child_id else None
                        if not cid:
                            count += 1
                            continue
                        if cid in allowed_child_ids:
                            scope = notif.permission_scope
                            if not scope or valid_scopes_per_child[cid].get(scope, False):
                                count += 1
                    return Response({"unread_count": count})
                else:
                    return Response({"unread_count": 0})
            except Exception:
                return Response({"unread_count": 0})
        
        return Response({"unread_count": queryset.count()})
