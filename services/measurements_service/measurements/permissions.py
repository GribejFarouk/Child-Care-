import os
import requests
from rest_framework.permissions import BasePermission, SAFE_METHODS

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

def check_measurement_or_growth_access(doctor_id, child_id):
    measurements = get_collaboration_access_details(doctor_id, child_id, 'measurements')
    if measurements.get('allowed', False):
        return measurements
    growth = get_collaboration_access_details(doctor_id, child_id, 'growth')
    return growth if growth.get('allowed', False) else {'allowed': False}

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
            if request.method not in SAFE_METHODS:
                return False
            # Require child_id in query params for list operations
            if request.method in SAFE_METHODS:
                child_id = request.query_params.get('child_id') or request.data.get('child_id')
                if child_id:
                    return check_measurement_or_growth_access(request.user.id, child_id).get('allowed', False)
                # If no child_id is provided, let has_object_permission handle it or block it if list
                # For list views, if child_id is missing, deny
                if not view.kwargs.get(getattr(view, 'lookup_field', 'pk')):
                    return False
            return True
            
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'parent':
            return obj.parent_id == request.user.id
        if request.user.role == 'doctor':
            if request.method not in SAFE_METHODS:
                return False
            # For obj, we need the child_id
            child_id = getattr(obj, 'child_id', None)
            if child_id:
                details = check_measurement_or_growth_access(request.user.id, child_id)
                return (
                    details.get('allowed', False)
                    and str(details.get('parent_id')) == str(getattr(obj, 'parent_id', ''))
                )
        return False
