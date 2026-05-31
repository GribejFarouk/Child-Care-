import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from audit.models import AuditEvent


class Command(BaseCommand):
    help = 'Seed readable parent-visible activity journal records.'

    def add_arguments(self, parser):
        parser.add_argument('--parent-id', required=True)
        parser.add_argument('--doctor-id', required=True)
        parser.add_argument('--child-id', required=True)

    def handle(self, *args, **options):
        parent_id = uuid.UUID(options['parent_id'])
        doctor_id = uuid.UUID(options['doctor_id'])
        child_id = uuid.UUID(options['child_id'])
        rows = [
            ('share_created', parent_id, 'parent', 'Dossier partage avec Dr Karim Messaoudi', 'collaboration', 'child_share'),
            ('measurement_created', parent_id, 'parent', 'Nouvelle mesure de croissance enregistree', 'measurements', 'measurement'),
            ('alert_generated', None, 'system', 'Une mesure necessite une verification', 'analytics', 'clinical_finding'),
            ('ocr_document_confirmed', parent_id, 'parent', 'Document OCR verifie et confirme', 'ocr', 'ocr_import'),
            ('child_record_accessed', doctor_id, 'doctor', 'Dr Karim Messaoudi a consulte le dossier partage', 'profiles', 'child'),
            ('consultation_completed', doctor_id, 'doctor', 'Consultation video terminee', 'collaboration', 'consultation'),
            ('assistant_response_generated', parent_id, 'parent', 'Assistant sante consulte pour une explication', 'assistant', 'assistant_conversation'),
        ]
        now = timezone.now()
        for index, (event_type, actor_id, role, summary, service, resource_type) in enumerate(rows):
            resource_id = uuid.uuid5(uuid.NAMESPACE_URL, f'demo-audit:{event_type}:{child_id}')
            record, _ = AuditEvent.objects.update_or_create(
                parent_id=parent_id,
                child_id=child_id,
                event_type=f'demo_{event_type}',
                resource_id=resource_id,
                defaults={
                    'actor_id': actor_id,
                    'actor_role': role,
                    'outcome': 'success',
                    'resource_type': resource_type,
                    'source_service': service,
                    'summary': summary,
                    'metadata': {'demo': True},
                    'visible_to_parent': True,
                },
            )
            AuditEvent.objects.filter(pk=record.pk).update(occurred_at=now - timedelta(hours=index + 1))
        self.stdout.write(self.style.SUCCESS('Demo activity journal ready: 7 records seeded.'))
