import uuid
from datetime import date, timedelta

from django.core.management.base import BaseCommand

from events.models import HealthEvent


class Command(BaseCommand):
    help = 'Seed idempotent demo calendar events for children.'

    def add_arguments(self, parser):
        parser.add_argument('--parent-id', required=True)
        parser.add_argument(
            '--children',
            nargs='+',
            required=True,
            help='Children formatted as UUID:FirstName.',
        )

    def handle(self, *args, **options):
        parent_id = uuid.UUID(options['parent_id'])
        today = date.today()
        created = 0
        updated = 0

        for entry in options['children']:
            child_id_text, child_name = entry.split(':', 1)
            child_id = uuid.UUID(child_id_text)
            rows = [
                {
                    'title': f'Vaccin DTP - {child_name}',
                    'event_type': 'vaccination',
                    'scheduled_date': today + timedelta(days=1),
                    'status': 'planned',
                    'vaccine_name': 'DTP',
                    'description': 'Rappel vaccinal programme.',
                },
                {
                    'title': f'Consultation pediatrique - {child_name}',
                    'event_type': 'appointment',
                    'scheduled_date': today + timedelta(days=14),
                    'status': 'planned',
                    'description': 'Visite de suivi pediatrique.',
                },
                {
                    'title': f'Controle croissance - {child_name}',
                    'event_type': 'checkup',
                    'scheduled_date': today - timedelta(days=30),
                    'completed_date': today - timedelta(days=30),
                    'status': 'completed',
                    'description': 'Mesure de croissance realisee.',
                },
                {
                    'title': f'Vaccin grippe saisonniere - {child_name}',
                    'event_type': 'vaccination',
                    'scheduled_date': today - timedelta(days=120),
                    'completed_date': today - timedelta(days=120),
                    'status': 'completed',
                    'vaccine_name': 'Grippe saisonniere',
                    'description': 'Vaccination confirmee par le parent.',
                },
                {
                    'title': f'Rappel a confirmer - {child_name}',
                    'event_type': 'appointment',
                    'scheduled_date': today - timedelta(days=1),
                    'status': 'awaiting_confirmation',
                    'description': 'Evenement passe, confirmation requise.',
                },
            ]
            for row in rows:
                defaults = {
                    **row,
                    'doctor_name': 'Dr Karim Messaoudi',
                    'location': 'Clinique Medicale Centrale',
                    'notes': 'Donnees fictives de demonstration.',
                }
                _, was_created = HealthEvent.objects.update_or_create(
                    parent_id=parent_id,
                    child_id=child_id,
                    title=row['title'],
                    defaults=defaults,
                )
                created += int(was_created)
                updated += int(not was_created)

        self.stdout.write(self.style.SUCCESS(
            f'Demo calendar ready: {created} created, {updated} updated.'
        ))
