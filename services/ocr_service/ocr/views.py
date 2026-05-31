import logging
import os
import requests

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import PermissionDenied, ValidationError, ParseError
from rest_framework.views import APIView

from .models import OCRImport
from .serializers import OCRUploadSerializer, OCRImportSerializer
from .permissions import IsParent, IsParentOrSharedDoctor, IsImportOwner, get_collaboration_access_details
from .parser import parse_measurement_variants
from .preprocessing import generate_preprocessing_variants
from pdf2image import pdfinfo_from_path

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from audit_client import publish_audit_event
except ImportError:
    def publish_audit_event(*args, **kwargs): pass

logger = logging.getLogger(__name__)


def check_child_ownership(parent_id, child_id):
    """
    Internal call to profile_service to verify the parent owns the child.
    We assume profile_service exposes an internal endpoint for this.
    """
    host = os.environ.get('PROFILE_SERVICE_HOST', 'profile_service')
    port = os.environ.get('PROFILE_SERVICE_PORT', '8000')
    internal_token = os.environ.get('INTERNAL_SERVICE_TOKEN')
    url = f"http://{host}:{port}/api/profiles/internal/check-ownership/"
    try:
        resp = requests.get(
            url,
            params={
                'parent_id': str(parent_id),
                'child_id': str(child_id),
            },
            headers={'Host': 'localhost', 'X-Internal-Service-Token': internal_token},
            timeout=2,
        )
        if resp.status_code == 200:
            return resp.json().get('owned', False)
    except requests.RequestException:
        pass
    return False


def run_ocr_extraction_variants(file_obj, filename):
    """
    Extract text using OpenCV preprocessing variants.
    Returns a list of dicts: [{'text': str, 'variant': str, 'page': int}]
    """
    import tempfile
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    
    # Save uploaded file to temp path for OpenCV/pdf2image
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as temp_file:
        for chunk in file_obj.chunks():
            temp_file.write(chunk)
        temp_path = temp_file.name

    variants_text_list = []
    metadata = {}

    try:
        if ext == 'pdf':
            from pdf2image import convert_from_path
            
            try:
                images = convert_from_path(temp_path, first_page=1, last_page=5)
            except Exception as e:
                raise ValueError("Impossible de lire les métadonnées ou d'extraire les pages du PDF.")
                
            metadata['pages'] = len(images)
            
            for i, pil_image in enumerate(images):
                page_num = i + 1
                # Save PIL to temp for OpenCV
                with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as p_temp:
                    pil_image.save(p_temp.name)
                    p_path = p_temp.name
                
                try:
                    page_variants, _ = generate_preprocessing_variants(p_path)
                    import pytesseract
                    for v_name, v_img in page_variants.items():
                        text = pytesseract.image_to_string(v_img, lang='fra+eng')
                        variants_text_list.append({'text': text, 'variant': v_name, 'page': page_num})
                finally:
                    os.remove(p_path)
        else:
            page_variants, p_meta = generate_preprocessing_variants(temp_path)
            metadata.update(p_meta)
            import pytesseract
            for v_name, v_img in page_variants.items():
                text = pytesseract.image_to_string(v_img, lang='fra+eng')
                variants_text_list.append({'text': text, 'variant': v_name, 'page': 1})
                
    finally:
        os.remove(temp_path)

    return variants_text_list, metadata


class OCRExtractView(generics.CreateAPIView):
    """
    POST /api/ocr/extract/
    Upload document, generate variants, extract candidates.
    """
    serializer_class = OCRUploadSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsParent]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = serializer.validated_data['file']
        child_id = serializer.validated_data.get('child_id')
        
        if child_id and not check_child_ownership(request.user.id, child_id):
            return Response(
                {"detail": "Enfant non trouvé ou accès refusé."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 4. Early PDF Page-Limit Rejection
        if uploaded_file.name.lower().endswith('.pdf'):
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                for chunk in uploaded_file.chunks():
                    temp_file.write(chunk)
                temp_path = temp_file.name
                
            try:
                info = pdfinfo_from_path(temp_path)
                if info["Pages"] > 5:
                    return Response(
                        {"detail": "Le fichier PDF contient plus de 5 pages (limite atteinte)."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception:
                pass # If it fails to read pdfinfo, we'll catch it during extraction
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

        ocr_import = OCRImport.objects.create(
            parent_id=request.user.id,
            child_id=child_id,
            original_filename=uploaded_file.name,
            file=uploaded_file,
            status='processing',
        )

        try:
            variants_text_list, metadata = run_ocr_extraction_variants(uploaded_file, uploaded_file.name)
        except ValueError as e:
            ocr_import.status = 'failed'
            ocr_import.warnings = [str(e)]
            ocr_import.save()
            return Response(
                OCRImportSerializer(ocr_import).data,
                status=status.HTTP_201_CREATED,
            )

        # Parse variants
        result = parse_measurement_variants(variants_text_list)
        
        # Keep raw_text as a concatenated string for legacy compat or simple viewing
        raw_texts = [f"--- Variant: {v['variant']}, Page: {v['page']} ---\n{v['text']}" for v in variants_text_list]

        ocr_import.status = 'completed'
        ocr_import.raw_text = "\n\n".join(raw_texts)
        ocr_import.extracted_data = result['extracted_data']
        ocr_import.warnings = result['warnings']
        ocr_import.preprocessing_metadata = metadata
        ocr_import.save()

        publish_audit_event(
            actor_id=request.user.id,
            actor_role=getattr(request.user, 'role', 'parent'),
            event_type='ocr_extracted',
            outcome='success',
            child_id=child_id,
            parent_id=request.user.id,
            resource_type='ocr_import',
            resource_id=ocr_import.id,
            source_service='ocr_service',
            summary="Extracted text from uploaded medical document",
            visible_to_parent=True
        )

        return Response(
            OCRImportSerializer(ocr_import).data,
            status=status.HTTP_201_CREATED,
        )


class OCRImportListView(generics.ListAPIView):
    serializer_class = OCRImportSerializer
    permission_classes = [IsParentOrSharedDoctor]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'parent':
            qs = OCRImport.objects.filter(parent_id=user.id)
            child_id = self.request.query_params.get('child_id')
            if child_id:
                qs = qs.filter(child_id=child_id)
            return qs

        if getattr(user, 'role', None) == 'doctor':
            child_id = self.request.query_params.get('child_id')
            if child_id:
                access = get_collaboration_access_details(user.id, child_id, 'ocr')
                if access.get('allowed') and access.get('parent_id'):
                    return OCRImport.objects.filter(child_id=child_id, parent_id=access['parent_id'])
            return OCRImport.objects.none()
        return OCRImport.objects.none()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if getattr(request.user, 'role', None) == 'doctor':
            child_id = request.query_params.get('child_id')
            if child_id:
                access = get_collaboration_access_details(request.user.id, child_id, 'ocr')
                parent_id = access.get('parent_id') if access.get('allowed') else None
                if parent_id:
                    publish_audit_event(
                        actor_id=request.user.id,
                        actor_role='doctor',
                        event_type='ocr_imports_list_accessed',
                        outcome='success',
                        child_id=child_id,
                        parent_id=parent_id,
                        resource_type='ocr_import',
                        source_service='ocr_service',
                        summary="Doctor read child OCR imports list",
                        visible_to_parent=True
                    )
        return response


class OCRImportDetailView(generics.RetrieveAPIView):
    serializer_class = OCRImportSerializer
    permission_classes = [IsParentOrSharedDoctor]
    lookup_field = 'id'

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'parent':
            return OCRImport.objects.filter(parent_id=user.id)
        if getattr(user, 'role', None) == 'doctor':
            return OCRImport.objects.all()
        return OCRImport.objects.none()

    def retrieve(self, request, *args, **kwargs):
        ocr_import = self.get_object()
        response = Response(self.get_serializer(ocr_import).data)
        user = request.user
        
        # Log doctor access to OCR
        if getattr(user, 'role', None) == 'doctor':
            publish_audit_event(
                actor_id=user.id,
                actor_role='doctor',
                event_type='ocr_record_accessed',
                outcome='success',
                child_id=ocr_import.child_id,
                parent_id=ocr_import.parent_id,
                resource_type='ocr_import',
                resource_id=ocr_import.id,
                source_service='ocr_service',
                summary="Doctor viewed OCR medical document",
                visible_to_parent=True
            )
        return response


class OCRConfirmView(APIView):
    """
    POST /api/ocr/imports/<id>/confirm/
    Confirms an OCR extraction and creates the measurement.
    """
    permission_classes = [IsParent, IsImportOwner]

    def post(self, request, id):
        try:
            ocr_import = OCRImport.objects.get(id=id)
        except OCRImport.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, ocr_import)

        data = request.data
        child_id = data.get('child_id') or ocr_import.child_id
        
        if not child_id:
            raise ParseError("L'enfant est requis pour confirmer la mesure.")
            
        if not check_child_ownership(request.user.id, child_id):
            return Response({"detail": "Enfant non trouvé ou accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        # Idempotency check: if already confirmed, we MUST return the full measurement
        # by calling the internal endpoint again, which natively handles get_or_create.
        is_retry = False
        if ocr_import.confirmation_status == 'confirmed' and ocr_import.measurement_id:
            is_retry = True
            # Even if it's a retry, we will proceed to call the internal endpoint with the stored ocr_import_id
            # so the Measurements Service returns the *existing* complete measurement securely,
            # completely ignoring the resent 'data' values from the browser.

        # Validate date
        date_recorded = data.get('date_recorded')
        if not date_recorded and not is_retry:
            raise ParseError("La date est requise.")
            
        # We also want to forward age_at_recording_months
        age_months = data.get('age_at_recording_months')

        # Create measurement payload
        measurement_payload = {
            "child_id": str(child_id),
            "date_recorded": date_recorded if not is_retry else str(ocr_import.confirmed_data.get('date_recorded')),
            "ocr_import_id": str(ocr_import.id),
            "weight_kg": data.get('weight_kg') if not is_retry else ocr_import.confirmed_data.get('weight_kg'),
            "height_cm": data.get('height_cm') if not is_retry else ocr_import.confirmed_data.get('height_cm'),
            "head_circumference_cm": data.get('head_circumference_cm') if not is_retry else ocr_import.confirmed_data.get('head_circumference_cm'),
            "notes": data.get('notes', '') if not is_retry else ocr_import.confirmed_data.get('notes', ''),
            "source": "ocr_import"
        }
        
        if age_months is not None and not is_retry:
            measurement_payload["age_at_recording_months"] = age_months

        # Call Measurements Service internally
        host = os.environ.get('MEASUREMENTS_SERVICE_HOST', 'measurements_service')
        port = os.environ.get('MEASUREMENTS_SERVICE_PORT', '8000')
        internal_token = os.environ.get('INTERNAL_SERVICE_TOKEN')
        
        url = f"http://{host}:{port}/api/measurements/internal/create/"
        headers = {
            'Host': 'localhost', 
            'X-Internal-Service-Token': internal_token,
            # We must pass the parent_id to the measurement service
            'X-Parent-Id': str(request.user.id)
        }
        
        try:
            resp = requests.post(url, json=measurement_payload, headers=headers, timeout=5)
            if resp.status_code not in (200, 201):
                logger.error(f"Measurements service creation failed: {resp.text}")
                return Response(
                    {"detail": "Erreur lors de la création de la mesure.", "errors": resp.json()},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            meas_data = resp.json()
            meas_id = meas_data.get('id')
            
        except requests.RequestException as e:
            logger.error(f"Measurements service unreachable: {e}")
            return Response(
                {"detail": "Le service des mesures est indisponible."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if is_retry:
            return Response(
                {
                    "detail": "Import déjà confirmé.",
                    "measurement_id": meas_id,
                    "measurement": meas_data,
                    "import": OCRImportSerializer(ocr_import).data
                },
                status=status.HTTP_200_OK
            )

        # Calculate corrections
        corrections = {}
        for field in ['weight_kg', 'height_cm', 'head_circumference_cm', 'date_recorded']:
            val = data.get(field)
            # Find best guess
            if isinstance(ocr_import.extracted_data.get(field), dict):
                best = ocr_import.extracted_data[field].get('best_guess')
            else:
                best = ocr_import.extracted_data.get(field)
                
            if str(val) != str(best):
                corrections[field] = {'extracted': best, 'confirmed': val}

        # Update OCRImport
        ocr_import.child_id = child_id
        ocr_import.confirmed_data = data
        ocr_import.corrections = corrections
        ocr_import.measurement_id = meas_id
        ocr_import.confirmation_status = 'confirmed'
        ocr_import.confirmed_at = timezone.now()
        ocr_import.save()

        publish_audit_event(
            actor_id=request.user.id,
            actor_role=getattr(request.user, 'role', 'parent'),
            event_type='ocr_confirmed',
            outcome='success',
            child_id=child_id,
            parent_id=ocr_import.parent_id,
            resource_type='ocr_import',
            resource_id=ocr_import.id,
            source_service='ocr_service',
            summary="User confirmed OCR results to create measurement",
            visible_to_parent=True
        )

        return Response(
            {
                "detail": "Import confirmé avec succès.",
                "measurement_id": meas_id,
                "measurement": meas_data,
                "import": OCRImportSerializer(ocr_import).data
            },
            status=status.HTTP_201_CREATED
        )
