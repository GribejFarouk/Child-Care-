import uuid
import json
from unittest.mock import patch
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile

from .models import OCRImport
from .authentication import AuthenticatedUser


class OCRServiceTests(APITestCase):

    def setUp(self):
        self.parent_id = uuid.uuid4()
        self.child_id = uuid.uuid4()
        self.doctor_id = uuid.uuid4()
        
        self.parent_user = AuthenticatedUser(user_id=str(self.parent_id), email='parent@test.com', role='parent')
        self.doctor_user = AuthenticatedUser(user_id=str(self.doctor_id), email='doctor@test.com', role='doctor')

        self.list_url = reverse('ocr-import-list')
        self.extract_url = reverse('ocr-extract')
        
        # Valid dummy image file
        from PIL import Image
        import io
        img = Image.new('RGB', (100, 100))
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        
        self.valid_image = SimpleUploadedFile(
            "test_image.png",
            img_byte_arr.getvalue(),
            content_type="image/png"
        )
        
        self.valid_pdf = SimpleUploadedFile(
            "test_doc.pdf",
            b"%PDF-1.4...",
            content_type="application/pdf"
        )

    def test_unauthenticated_upload_returns_401(self):
        response = self.client.post(self.extract_url, {'file': self.valid_image})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_doctor_upload_returns_403(self):
        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.post(self.extract_url, {'file': self.valid_image})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('ocr.views.get_collaboration_access_details')
    @patch('ocr.permissions.check_collaboration_access')
    def test_doctor_lists_shared_child_ocr_imports_when_allowed(self, mock_check, mock_details):
        mock_check.return_value = True
        mock_details.return_value = {'allowed': True, 'parent_id': str(self.parent_id)}
        OCRImport.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            original_filename='shared.pdf',
            status='completed',
            raw_text='Poids: 12 kg',
            extracted_data={'weight_kg': '12.00'},
        )
        OCRImport.objects.create(
            parent_id=self.parent_id,
            child_id=uuid.uuid4(),
            original_filename='other.pdf',
            status='completed',
        )

        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.get(self.list_url, {'child_id': str(self.child_id)})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['original_filename'], 'shared.pdf')
        mock_check.assert_called_with(self.doctor_id, str(self.child_id), 'ocr')

    @patch('ocr.permissions.check_collaboration_access')
    def test_doctor_cannot_list_ocr_without_permission(self, mock_check):
        mock_check.return_value = False
        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.get(self.list_url, {'child_id': str(self.child_id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('ocr.views.check_child_ownership')
    @patch('ocr.views.run_ocr_extraction_variants')
    def test_parent_upload_valid_image(self, mock_extract, mock_check_ownership):
        mock_check_ownership.return_value = True
        mock_extract.return_value = ([{'text': "Date: 20/05/2026\nPoids: 12.5 kg", 'variant': 'original', 'page': 1}], {})
        self.client.force_authenticate(user=self.parent_user)
        
        image = self.valid_image
        data = {
            'file': image,
            'child_id': str(self.child_id)
        }
        
        response = self.client.post(self.extract_url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'completed')
        self.assertIn('weight_kg', response.data['extracted_data'])
        self.assertEqual(response.data['extracted_data']['weight_kg']['best_guess'], '12.50')
        
        # Verify db record
        ocr_import = OCRImport.objects.get(id=response.data['id'])
        self.assertEqual(ocr_import.parent_id, self.parent_id)
        self.assertEqual(ocr_import.child_id, self.child_id)

    @patch('ocr.views.check_child_ownership')
    @patch('ocr.views.run_ocr_extraction_variants')
    def test_parent_upload_invalid_file_type(self, mock_extract, mock_check_ownership):
        mock_check_ownership.return_value = True
        self.client.force_authenticate(user=self.parent_user)
        bad_file = SimpleUploadedFile("virus.exe", b"bad", content_type="application/x-msdownload")
        
        response = self.client.post(self.extract_url, {'file': bad_file}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_extract.assert_not_called()

    @patch('ocr.views.check_child_ownership')
    @patch('ocr.views.run_ocr_extraction_variants')
    def test_ocr_failure_handled_gracefully(self, mock_extract, mock_check_ownership):
        mock_check_ownership.return_value = True
        # Simulate OCR crashing
        mock_extract.side_effect = ValueError("Format illisible")
        self.client.force_authenticate(user=self.parent_user)
        
        from PIL import Image
        import io
        img = Image.new('RGB', (10, 10))
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        
        img_file = SimpleUploadedFile(
            "test_image2.png",
            img_byte_arr.getvalue(),
            content_type="image/png"
        )

        response = self.client.post(self.extract_url, {'file': img_file}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'failed')
        self.assertIn("Format illisible", response.data['warnings'][0])

    @patch('ocr.views.check_child_ownership')
    @patch('ocr.views.requests.post')
    def test_confirm_ocr_import(self, mock_post, mock_check_ownership):
        mock_check_ownership.return_value = True
        # Create an OCR import record
        ocr_import = OCRImport.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            original_filename="test.jpg",
            status="completed",
            extracted_data={"weight_kg": {"best_guess": "12.0"}},
            confirmation_status="pending"
        )
        
        # Mock creating the measurement via profile service
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.status_code = 201
        
        mock_measurement_id = str(uuid.uuid4())
        mock_full_measurement = {
            "id": mock_measurement_id,
            "bmi": 17.3,
            "age_at_recording_months": 15,
            "child_id": str(self.child_id),
            "weight_kg": 12.5,
            "height_cm": 85.0
        }
        mock_response.json.return_value = mock_full_measurement
        mock_post.return_value = mock_response

        self.client.force_authenticate(user=self.parent_user)
        url = reverse('ocr-import-confirm', kwargs={'id': ocr_import.id})
        data = {
            'child_id': str(self.child_id),
            'date_recorded': '2023-01-01',
            'weight_kg': 12.5,
            'height_cm': 85.0,
            'age_at_recording_months': 15
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ocr_import.refresh_from_db()
        self.assertEqual(ocr_import.confirmation_status, "confirmed")
        self.assertEqual(str(ocr_import.measurement_id), mock_measurement_id)
        self.assertEqual(ocr_import.confirmed_data['weight_kg'], 12.5)
        
        # Verify age_at_recording_months is forwarded in payload
        self.assertEqual(mock_post.call_count, 2)
        sent_payload = mock_post.call_args_list[0][1]['json']
        self.assertEqual(sent_payload.get('age_at_recording_months'), 15)
        
        # Verify response includes full measurement object
        self.assertIn("measurement", response.data)
        self.assertEqual(response.data["measurement"]["bmi"], 17.3)
        self.assertEqual(response.data["measurement"]["age_at_recording_months"], 15)

    @patch('ocr.views.check_child_ownership')
    @patch('ocr.views.requests.post')
    def test_confirm_ocr_import_idempotency(self, mock_post, mock_check_ownership):
        mock_check_ownership.return_value = True
        meas_id = str(uuid.uuid4())
        # Already confirmed import
        ocr_import = OCRImport.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            original_filename="test.jpg",
            status="completed",
            confirmation_status="confirmed",
            measurement_id=meas_id,
            confirmed_data={'date_recorded': '2023-01-01', 'weight_kg': 12.5}
        )
        
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_full_measurement = {
            "id": meas_id,
            "weight_kg": 12.5,
            "child_id": str(self.child_id),
            "age_at_recording_months": 15,
            "bmi": 17.3
        }
        mock_response.json.return_value = mock_full_measurement
        mock_post.return_value = mock_response

        self.client.force_authenticate(user=self.parent_user)
        url = reverse('ocr-import-confirm', kwargs={'id': ocr_import.id})
        data = {
            'child_id': str(self.child_id),
            'date_recorded': '2023-01-01',
            'weight_kg': 12.5,
        }
        response = self.client.post(url, data, format='json')

        # Should return 200 OK, not create a new one, but MUST have called the internal service
        # to fetch the existing measurement.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data['measurement_id']), meas_id)
        self.assertEqual(response.data['detail'], "Import déjà confirmé.")
        
        # Verify the FULL existing measurement is returned, not just ID
        self.assertIn("measurement", response.data)
        self.assertEqual(response.data["measurement"]["bmi"], 17.3)
        self.assertEqual(response.data["measurement"]["id"], meas_id)
        
        mock_post.assert_called_once()

    @patch('ocr.views.check_child_ownership')
    def test_upload_ownership_denial(self, mock_check_ownership):
        mock_check_ownership.return_value = False
        self.client.force_authenticate(user=self.parent_user)
        
        response = self.client.post(self.extract_url, {
            'file': self.valid_image,
            'child_id': str(self.child_id)
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('ocr.views.check_child_ownership')
    @patch('ocr.views.pdfinfo_from_path')
    def test_pdf_page_limit_exceeded(self, mock_pdfinfo, mock_check_ownership):
        mock_check_ownership.return_value = True
        mock_pdfinfo.return_value = {"Pages": 6}
        self.client.force_authenticate(user=self.parent_user)
        
        initial_count = OCRImport.objects.count()
        response = self.client.post(self.extract_url, {
            'file': self.valid_pdf,
            'child_id': str(self.child_id)
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("limite atteinte", response.data['detail'])
        self.assertEqual(OCRImport.objects.count(), initial_count)

    @patch('ocr.views.check_child_ownership')
    @patch('ocr.views.pdfinfo_from_path')
    @patch('ocr.views.run_ocr_extraction_variants')
    def test_pdf_page_limit_valid_proceeds(self, mock_extract, mock_pdfinfo, mock_check_ownership):
        mock_check_ownership.return_value = True
        mock_pdfinfo.return_value = {"Pages": 3}
        mock_extract.return_value = ([], {})
        self.client.force_authenticate(user=self.parent_user)
        
        response = self.client.post(self.extract_url, {
            'file': self.valid_pdf,
            'child_id': str(self.child_id)
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch('ocr.permissions.get_collaboration_access_details')
    def test_doctor_detail_access_allowed(self, mock_details):
        mock_details.return_value = {'allowed': True, 'parent_id': str(self.parent_id)}
        ocr_import = OCRImport.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            original_filename='shared.pdf',
            status='completed',
            extracted_data={'weight_kg': '12.00'},
        )
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse('ocr-import-detail', kwargs={'id': ocr_import.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('file', response.data)  # Doctor must not see raw file URL
        mock_details.assert_called_with(self.doctor_id, self.child_id, 'ocr')

    @patch('ocr.permissions.get_collaboration_access_details')
    def test_doctor_detail_access_denied_or_revoked(self, mock_details):
        mock_details.return_value = {'allowed': False}
        ocr_import = OCRImport.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            original_filename='shared.pdf',
            status='completed',
        )
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse('ocr-import-detail', kwargs={'id': ocr_import.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_cannot_confirm_ocr(self):
        ocr_import = OCRImport.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            status='completed',
        )
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse('ocr-import-confirm', kwargs={'id': ocr_import.id})
        response = self.client.post(url, {'date_recorded': '2023-01-01'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)



class ParserTests(APITestCase):
    
    def test_parser_extracts_weight(self):
        from ocr.parser import parse_measurement_variants
        result = parse_measurement_variants([{'text': "Poids : 12,5 kg \n Taille: 86 cm", 'variant': 'v1', 'page': 1}])
        
        self.assertEqual(result['extracted_data']['weight_kg']['best_guess'], '12.50')
        self.assertEqual(result['extracted_data']['height_cm']['best_guess'], '86.00')

    def test_parser_extracts_head_circumference(self):
        from ocr.parser import parse_measurement_variants
        result = parse_measurement_variants([{'text': "Périmètre crânien : 48 cm", 'variant': 'v1', 'page': 1}])
        
        self.assertEqual(result['extracted_data']['head_circumference_cm']['best_guess'], '48.00')

    def test_parser_graceful_on_garbage(self):
        from ocr.parser import parse_measurement_variants
        result = parse_measurement_variants([{'text': "random noise $$$ 123 nothing useful", 'variant': 'v1', 'page': 1}])
        
        self.assertIsNone(result['extracted_data']['weight_kg']['best_guess'])
        self.assertIsNone(result['extracted_data']['height_cm']['best_guess'])
