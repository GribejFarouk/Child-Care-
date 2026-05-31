from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import ParentProfile, DoctorProfile, Child
from .serializers import ParentProfileSerializer, DoctorProfileSerializer, ChildSerializer
from .permissions import IsParent, IsDoctor, IsParentOrSharedDoctor

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from audit_client import publish_audit_event
except ImportError:
    def publish_audit_event(*args, **kwargs): pass


class ParentProfileMeView(APIView):
    """GET/PATCH /api/profiles/parent/me/"""
    permission_classes = [IsAuthenticated, IsParent]

    def get_object(self):
        obj, created = ParentProfile.objects.get_or_create(user_id=self.request.user.id)
        return obj

    def get(self, request):
        profile = self.get_object()
        serializer = ParentProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile = self.get_object()
        serializer = ParentProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DoctorProfileMeView(APIView):
    """GET/PATCH /api/profiles/doctor/me/"""
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_object(self):
        obj, created = DoctorProfile.objects.get_or_create(user_id=self.request.user.id)
        return obj

    def get(self, request):
        profile = self.get_object()
        serializer = DoctorProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile = self.get_object()
        serializer = DoctorProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DoctorProfilePublicView(generics.RetrieveAPIView):
    """GET /api/profiles/doctors/{user_id}/"""
    serializer_class = DoctorProfileSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'user_id'
    queryset = DoctorProfile.objects.all()


class ChildListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/profiles/children/"""
    serializer_class = ChildSerializer
    permission_classes = [IsAuthenticated, IsParent]

    def get_queryset(self):
        return Child.objects.filter(parent_id=self.request.user.id)

    def perform_create(self, serializer):
        serializer.save(parent_id=self.request.user.id)


class ChildRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/profiles/children/{id}/"""
    serializer_class = ChildSerializer
    permission_classes = [IsAuthenticated, IsParentOrSharedDoctor]
    lookup_field = 'id'

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'parent':
            return Child.objects.filter(parent_id=user.id)
        # For doctors, let the permission class check the access for the specific child
        return Child.objects.all()

    def retrieve(self, request, *args, **kwargs):
        child = self.get_object()
        response = Response(self.get_serializer(child).data)
        user = request.user
        
        # Only log doctor access
        if getattr(user, 'role', None) == 'doctor':
            publish_audit_event(
                actor_id=user.id,
                actor_role='doctor',
                event_type='child_record_accessed',
                outcome='success',
                child_id=child.id,
                parent_id=child.parent_id,
                resource_type='child_profile',
                resource_id=child.id,
                source_service='profile_service',
                summary=f"Doctor accessed child record",
                visible_to_parent=True
            )
        return response

class InternalCheckOwnershipView(APIView):
    """GET /api/profiles/internal/check-ownership/"""
    permission_classes = [] # Handled by custom token check below

    def get(self, request):
        import os
        expected_token = os.environ.get('INTERNAL_SERVICE_TOKEN')
        provided_token = request.headers.get('X-Internal-Service-Token')
        
        if not provided_token or provided_token != expected_token:
            return Response({"error": "Unauthorized internal request"}, status=status.HTTP_403_FORBIDDEN)
            
        parent_id = request.query_params.get('parent_id')
        child_id = request.query_params.get('child_id')
        
        if not parent_id or not child_id:
            return Response({"error": "Missing parameters"}, status=status.HTTP_400_BAD_REQUEST)
            
        is_owned = Child.objects.filter(id=child_id, parent_id=parent_id).exists()
        if not is_owned:
            return Response({"owned": False}, status=status.HTTP_200_OK)
        child = Child.objects.get(id=child_id, parent_id=parent_id)
        return Response({
            "owned": True,
            "child": {
                "sex": child.sex,
                "date_of_birth": child.date_of_birth.isoformat(),
                "allergies": child.allergies or [],
            },
        }, status=status.HTTP_200_OK)
