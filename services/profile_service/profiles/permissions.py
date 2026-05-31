import os
import requests
from rest_framework.permissions import BasePermission

def check_collaboration_access(doctor_id, child_id, section):
    host = os.environ.get('COLLABORATION_SERVICE_HOST', 'collaboration_service')
    port = os.environ.get('COLLABORATION_SERVICE_PORT', '8000')
    internal_token = os.environ.get('INTERNAL_SERVICE_TOKEN')
    url = f"http://{host}:{port}/api/collaboration/internal/access-check/"
    try:
        resp = requests.get(
            url,
            params={
                'doctor_id': str(doctor_id),
                'child_id': str(child_id),
                'section': section
            },
            headers={'Host': 'localhost', 'X-Internal-Service-Token': internal_token},
            timeout=2,
        )
        if resp.status_code == 200:
            return resp.json().get('allowed', False)
    except requests.RequestException:
        pass
    return False

class IsParent(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'parent')

class IsDoctor(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'doctor')

class IsParentOrSharedDoctor(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.role == 'parent':
            return True
            
        if request.user.role == 'doctor':
            # Require child_id in query params for list operations if not detail view
            # In profile_service, if doctor lists children, they shouldn't just get all, they should provide child_id
            if request.method in ['GET', 'POST']:
                # The doctor can only request a specific child profile via GET /api/profiles/children/{id}/
                # So we let has_object_permission handle it.
                pass
            return True
            
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'parent':
            return obj.parent_id == request.user.id
        if request.user.role == 'doctor':
            if request.method not in ['GET', 'HEAD', 'OPTIONS']:
                return False
            # For obj (Child), obj.id is child_id
            child_id = getattr(obj, 'id', None)
            if child_id:
                return check_collaboration_access(request.user.id, child_id, 'profile')
        return False
