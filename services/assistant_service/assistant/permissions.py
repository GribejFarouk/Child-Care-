from rest_framework import permissions

class IsParent(permissions.BasePermission):
    """
    Allows access only to parents.
    """
    def has_permission(self, request, view):
        return bool(request.user and getattr(request.user, 'role', None) == 'parent')
