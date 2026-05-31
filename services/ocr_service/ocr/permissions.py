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
                'section': section,
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
    """
    Grants access only to authenticated users with role='parent'.
    Doctors are explicitly blocked from all OCR endpoints in Phase 4.
    Doctor access is reserved for a future sharing/permissions phase.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'parent'
        )


class IsParentOrSharedDoctor(BasePermission):
    """
    Parents can access their own OCR imports. Doctors can read OCR imports only
    when an active ChildShare grants the 'ocr' permission for the requested child.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.role == 'parent':
            return True

        if request.user.role == 'doctor':
            if request.method not in ['GET', 'HEAD', 'OPTIONS']:
                return False
            child_id = request.query_params.get('child_id')
            if child_id:
                return check_collaboration_access(request.user.id, child_id, 'ocr')
            return bool(view.kwargs.get(getattr(view, 'lookup_field', 'pk')))

        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'parent':
            return obj.parent_id == request.user.id
        if request.user.role == 'doctor':
            if request.method not in ['GET', 'HEAD', 'OPTIONS']:
                return False
            if obj.child_id:
                details = get_collaboration_access_details(request.user.id, obj.child_id, 'ocr')
                return (
                    details.get('allowed', False)
                    and str(details.get('parent_id')) == str(obj.parent_id)
                )
        return False


class IsImportOwner(BasePermission):
    """
    Object-level permission: grants access only if the OCR import's
    parent_id matches the authenticated user's id.
    """
    def has_object_permission(self, request, view, obj):
        return obj.parent_id == request.user.id
