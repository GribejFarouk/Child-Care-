import os
import requests
from rest_framework.permissions import BasePermission

def get_collaboration_access_details(doctor_id, child_id, section):
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
            return resp.json()
    except requests.RequestException:
        pass
    return {'allowed': False}

def check_collaboration_access(doctor_id, child_id, section):
    return get_collaboration_access_details(doctor_id, child_id, section).get('allowed', False)

class IsParent(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'parent')

class IsParentOrSharedDoctor(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.role == 'parent':
            return True
            
        if request.user.role == 'doctor':
            if request.method in ['GET', 'POST']:
                child_id = request.query_params.get('child_id') or request.data.get('child_id')
                if child_id:
                    return check_collaboration_access(request.user.id, child_id, 'alerts')
                if not view.kwargs.get(getattr(view, 'lookup_field', 'pk')):
                    return False
            return True
            
        return False

    def has_object_permission(self, request, view, obj):
        user_id = getattr(request.user, 'id', None)
        obj_parent_id = getattr(obj, 'parent_id', None)
        role = getattr(request.user, 'role', None)

        if obj_parent_id and user_id and str(obj_parent_id) == str(user_id):
            return True

        if role == 'parent':
            return False

        if role == 'doctor':
            # Analytics might not allow PATCH/DELETE for doctors
            if request.method not in ['GET', 'HEAD', 'OPTIONS']:
                return False
            child_id = getattr(obj, 'child_id', None)
            if child_id:
                details = get_collaboration_access_details(user_id, child_id, 'alerts')
                return (
                    details.get('allowed', False)
                    and str(details.get('parent_id')) == str(obj_parent_id)
                )
        return False
