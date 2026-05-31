import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from ocr.models import OCRImport


class Command(BaseCommand):
    help = 'Seed idempotent, privacy-safe OCR demo history.'

    def add_arguments(self, parser):
        parser.add_argument('--parent-id', required=True)
        parser.add_argument('--child-id', required=True)
        parser.add_argument('--measurement-id', required=False)

    def handle(self, *args, **options):
        parent_id = uuid.UUID(options['parent_id'])
        child_id = uuid.UUID(options['child_id'])
        measurement_id = uuid.UUID(options['measurement_id']) if options.get('measurement_id') else None
        now = timezone.now()
        rows = [
            {
                'original_filename': 'carnet_croissance_sanad_demo.pdf',
                'status': 'completed',
                'raw_text': 'Donnees fictives - Poids: 100.0 kg - Taille: 110.0 cm - Date: 23/05/2026',
                'extracted_data': {
                    'weight_kg': {'best_guess': '100.00', 'candidates': [{'value': '100.00', 'confidence_level': 'high'}]},
                    'height_cm': {'best_guess': '110.00', 'candidates': [{'value': '110.00', 'confidence_level': 'high'}]},
                    'date_recorded': {'best_guess': '2026-05-23', 'candidates': [{'value': '2026-05-23', 'confidence_level': 'high'}]},
                },
                'warnings': ['Valeurs a verifier par le parent avant validation.'],
                'confirmed_data': {
                    'weight_kg': '100.00',
                    'height_cm': '110.00',
                    'date_recorded': '2026-05-23',
                },
                'corrections': {},
                'confirmation_status': 'confirmed',
                'confirmed_at': now - timedelta(days=3),
                'measurement_id': measurement_id,
            },
            {
                'original_filename': 'ordonnance_controle_demo.jpg',
                'status': 'completed',
                'raw_text': 'Donnees fictives - texte partiellement reconnu.',
                'extracted_data': {
                    'weight_kg': {'best_guess': '20.00', 'candidates': [{'value': '20.00', 'confidence_level': 'medium'}]},
                },
                'warnings': ['Confiance moyenne : verification manuelle necessaire.'],
                'confirmed_data': {},
                'corrections': {},
                'confirmation_status': 'pending_review',
                'confirmed_at': None,
                'measurement_id': None,
            },
        ]
        for index, row in enumerate(rows):
            document, _ = OCRImport.objects.update_or_create(
                parent_id=parent_id,
                child_id=child_id,
                original_filename=row['original_filename'],
                defaults={
                    **row,
                    'file': f'ocr_imports/demo/document_{index + 1}.pdf',
                    'preprocessing_metadata': {
                        'demo': True,
                        'variants': ['grayscale', 'adaptive_threshold'],
                    },
                },
            )
            OCRImport.objects.filter(pk=document.pk).update(created_at=now - timedelta(days=3 - index))
        self.stdout.write(self.style.SUCCESS('Demo OCR history ready: 2 records seeded.'))
