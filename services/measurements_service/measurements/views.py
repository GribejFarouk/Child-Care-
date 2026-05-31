from rest_framework import generics, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Measurement
from .serializers import MeasurementSerializer
from .permissions import IsParent, IsParentOrSharedDoctor, get_collaboration_access_details, check_measurement_or_growth_access

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from audit_client import publish_audit_event
except ImportError:
    def publish_audit_event(*args, **kwargs): pass


class MeasurementListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/measurements/           — list all measurements for authenticated parent
    POST /api/measurements/           — create a new measurement

    Optional query param: ?child_id=<uuid> to filter by child.
    parent_id is always injected from the JWT; it is never trusted from request body.
    """
    serializer_class = MeasurementSerializer
    permission_classes = [IsParentOrSharedDoctor]

    def get_queryset(self):
        user = self.request.user
        qs = Measurement.objects.all()
        
        if getattr(user, 'role', None) == 'parent':
            qs = qs.filter(parent_id=user.id)
        elif getattr(user, 'role', None) == 'doctor':
            child_id = self.request.query_params.get('child_id')
            if child_id:
                access = check_measurement_or_growth_access(user.id, child_id)
                if access.get('allowed') and access.get('parent_id'):
                    qs = qs.filter(child_id=child_id, parent_id=access['parent_id'])
                else:
                    return Measurement.objects.none()
            else:
                return Measurement.objects.none()
        else:
            return Measurement.objects.none()
            
        child_id = self.request.query_params.get('child_id')
        if child_id and getattr(user, 'role', None) == 'parent':
            qs = qs.filter(child_id=child_id)
        return qs

    def perform_create(self, serializer):
        # parent_id is always set from the authenticated user — never from request body
        measurement = serializer.save(parent_id=self.request.user.id)
        publish_audit_event(
            actor_id=self.request.user.id,
            actor_role=getattr(self.request.user, 'role', 'parent'),
            event_type='measurement_created',
            outcome='success',
            child_id=measurement.child_id,
            parent_id=measurement.parent_id,
            resource_type='measurement',
            resource_id=measurement.id,
            source_service='measurements_service',
            summary="Measurement created manually",
            visible_to_parent=True
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if getattr(request.user, 'role', None) == 'doctor':
            child_id = request.query_params.get('child_id')
            if child_id:
                access = check_measurement_or_growth_access(request.user.id, child_id)
                parent_id = access.get('parent_id') if access.get('allowed') else None
                if parent_id:
                    publish_audit_event(
                        actor_id=request.user.id,
                        actor_role='doctor',
                        event_type='measurements_list_accessed',
                        outcome='success',
                        child_id=child_id,
                        parent_id=parent_id,
                        resource_type='measurement',
                        source_service='measurements_service',
                        summary="Doctor read child measurements list",
                        visible_to_parent=True
                    )
        return response


class MeasurementRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/measurements/{id}/    — retrieve a measurement
    PATCH  /api/measurements/{id}/    — partial update
    DELETE /api/measurements/{id}/    — delete

    Ownership enforced by filtering queryset on parent_id (404 for non-owners).
    """
    serializer_class = MeasurementSerializer
    permission_classes = [IsParentOrSharedDoctor]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        qs = Measurement.objects.all()
        if getattr(user, 'role', None) == 'parent':
            qs = qs.filter(parent_id=user.id)
        elif getattr(user, 'role', None) != 'doctor':
            return Measurement.objects.none()
        return qs

    def perform_update(self, serializer):
        # Ensure parent_id cannot be changed on update
        measurement = serializer.save(parent_id=self.request.user.id)
        publish_audit_event(
            actor_id=self.request.user.id,
            actor_role=getattr(self.request.user, 'role', 'parent'),
            event_type='measurement_updated',
            outcome='success',
            child_id=measurement.child_id,
            parent_id=measurement.parent_id,
            resource_type='measurement',
            resource_id=measurement.id,
            source_service='measurements_service',
            summary="Measurement updated",
            visible_to_parent=True
        )

    def retrieve(self, request, *args, **kwargs):
        measurement = self.get_object()
        response = Response(self.get_serializer(measurement).data)
        if getattr(request.user, 'role', None) == 'doctor':
            publish_audit_event(
                actor_id=request.user.id,
                actor_role='doctor',
                event_type='measurement_detail_accessed',
                outcome='success',
                child_id=measurement.child_id,
                parent_id=measurement.parent_id,
                resource_type='measurement',
                resource_id=measurement.id,
                source_service='measurements_service',
                summary="Doctor read measurement detail",
                visible_to_parent=True
            )
        return response

from rest_framework.views import APIView
import os

class InternalMeasurementCreateView(APIView):
    """POST /api/measurements/internal/create/"""
    permission_classes = []

    def post(self, request):
        expected_token = os.environ.get('INTERNAL_SERVICE_TOKEN')
        provided_token = request.headers.get('X-Internal-Service-Token') or request.META.get('HTTP_X_INTERNAL_SERVICE_TOKEN')
        
        if not provided_token or provided_token != expected_token:
            return Response({"error": "Unauthorized internal request"}, status=status.HTTP_403_FORBIDDEN)
            
        parent_id = request.headers.get('X-Parent-Id') or request.META.get('HTTP_X_PARENT_ID')
        if not parent_id:
            return Response({"error": "X-Parent-Id header is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        ocr_import_id = request.data.get('ocr_import_id')
        if ocr_import_id:
            existing = Measurement.objects.filter(ocr_import_id=ocr_import_id).first()
            if existing:
                return Response(MeasurementSerializer(existing).data, status=status.HTTP_200_OK)
            
        serializer = MeasurementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from django.db import IntegrityError
        try:
            # ocr_import_id is read-only in the serializer to protect public endpoints.
            # We explicitly pass it as a kwarg here to bypass that protection safely.
            kwargs = {'parent_id': parent_id}
            if ocr_import_id:
                kwargs['ocr_import_id'] = ocr_import_id
            serializer.save(**kwargs)
        except IntegrityError:
            # Handle concurrent creation race condition
            if ocr_import_id:
                existing = Measurement.objects.filter(ocr_import_id=ocr_import_id).first()
                if existing:
                    return Response(MeasurementSerializer(existing).data, status=status.HTTP_200_OK)
            return Response({"error": "Erreur d'intégrité lors de la création de la mesure"}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class InternalMeasurementContextView(APIView):
    """GET /api/measurements/internal/context/ - minimized data for analytics context."""
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        expected_token = os.environ.get('INTERNAL_SERVICE_TOKEN')
        provided_token = request.headers.get('X-Internal-Service-Token') or request.META.get('HTTP_X_INTERNAL_SERVICE_TOKEN')
        if not expected_token or provided_token != expected_token:
            return Response({"error": "Unauthorized internal request"}, status=status.HTTP_403_FORBIDDEN)
        child_id = request.query_params.get('child_id')
        parent_id = request.query_params.get('parent_id')
        if not child_id or not parent_id:
            return Response({"error": "child_id and parent_id are required"}, status=status.HTTP_400_BAD_REQUEST)
        measurements = Measurement.objects.filter(
            child_id=child_id,
            parent_id=parent_id,
        ).order_by('-date_recorded', '-created_at')[:2]
        safe_fields = (
            'date_recorded', 'age_at_recording_months', 'weight_kg',
            'height_cm', 'head_circumference_cm', 'bmi',
        )
        data = [
            {field: getattr(measurement, field) for field in safe_fields}
            for measurement in measurements
        ]
        return Response({"measurements": data})
