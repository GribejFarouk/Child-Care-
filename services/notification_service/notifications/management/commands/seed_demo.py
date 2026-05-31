import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from notifications.models import Notification


class Command(BaseCommand):
    help = 'Seed idempotent demo parent and doctor notifications.'

    def add_arguments(self, parser):
        parser.add_argument('--parent-id', required=True)
        parser.add_argument('--doctor-id', required=True)
        parser.add_argument('--full-child-id', required=True)
        parser.add_argument('--partial-child-id', required=True)

    def handle(self, *args, **options):
        parent_id = uuid.UUID(options['parent_id'])
        doctor_id = uuid.UUID(options['doctor_id'])
        full_child_id = uuid.UUID(options['full_child_id'])
        partial_child_id = uuid.UUID(options['partial_child_id'])
        rows = [
            ('parent', parent_id, full_child_id, 'vaccination_reminder', 'Vaccin DTP demain', 'Le vaccin DTP de Sanad est prevu demain.', 'calendar', '/calendar', False),
            ('parent', parent_id, full_child_id, 'anomaly_alert', 'Mesure a verifier pour Sanad', 'Une variation importante a ete detectee. Consultez les explications.', 'alerts', '/alerts', False),
            ('parent', parent_id, partial_child_id, 'appointment_reminder', 'Consultation prochaine', 'Une consultation de suivi est programmee pour Youssef.', 'calendar', '/calendar', True),
            ('doctor', doctor_id, full_child_id, 'anomaly_alert', 'Alerte partagee - Sanad', 'Un constat de croissance partage merite votre attention.', 'alerts', f'/doctor/patients/{full_child_id}', False),
            ('doctor', doctor_id, full_child_id, 'appointment_reminder', 'Rendez-vous partage - Sanad', 'Un rendez-vous est prevu pour le patient partage.', 'calendar', f'/doctor/patients/{full_child_id}', False),
        ]
        for role, recipient, child, notif_type, title, message, scope, url, read in rows:
            key = f'demo:{role}:{child}:{notif_type}'
            Notification.objects.update_or_create(
                idempotency_key=key,
                defaults={
                    'recipient_id': recipient,
                    'recipient_role': role,
                    'child_id': child,
                    'notification_type': notif_type,
                    'title': title,
                    'message': message,
                    'source_service': 'demo_seed',
                    'source_object_id': uuid.uuid5(uuid.NAMESPACE_URL, key),
                    'permission_scope': scope,
                    'action_url': url,
                    'is_read': read,
                    'due_at': timezone.now() + timedelta(days=1),
                },
            )
        self.stdout.write(self.style.SUCCESS('Demo notifications ready: 5 records seeded.'))
