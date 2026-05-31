import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from collaboration.models import ChildShare, ConsultationSession, Message


FULL_PERMISSIONS = {
    'profile': True,
    'measurements': True,
    'alerts': True,
    'calendar': True,
    'ocr': True,
    'consultation': True,
}
PARTIAL_PERMISSIONS = {
    'profile': True,
    'measurements': True,
    'alerts': False,
    'calendar': False,
    'ocr': False,
    'consultation': False,
}


class Command(BaseCommand):
    help = 'Seed demo doctor sharing, messages, and consultation history.'

    def add_arguments(self, parser):
        parser.add_argument('--parent-id', required=True)
        parser.add_argument('--doctor-id', required=True)
        parser.add_argument('--full-child-id', required=True)
        parser.add_argument('--partial-child-id', required=True)

    def _share(self, parent_id, doctor_id, child_id, permissions):
        share = ChildShare.objects.filter(
            parent_id=parent_id, doctor_id=doctor_id, child_id=child_id,
        ).first()
        if share is None:
            share = ChildShare.objects.create(
                parent_id=parent_id,
                doctor_id=doctor_id,
                child_id=child_id,
                doctor_email='doctor.demo@childcare.test',
                doctor_display_name='Dr Karim Messaoudi',
                status='active',
                permissions=permissions,
            )
        else:
            share.doctor_email = 'doctor.demo@childcare.test'
            share.doctor_display_name = 'Dr Karim Messaoudi'
            share.status = 'active'
            share.permissions = permissions
            share.save()
        return share

    def handle(self, *args, **options):
        parent_id = uuid.UUID(options['parent_id'])
        doctor_id = uuid.UUID(options['doctor_id'])
        full_child_id = uuid.UUID(options['full_child_id'])
        partial_child_id = uuid.UUID(options['partial_child_id'])
        full = self._share(parent_id, doctor_id, full_child_id, FULL_PERMISSIONS)
        partial = self._share(parent_id, doctor_id, partial_child_id, PARTIAL_PERMISSIONS)

        chat_rows = [
            (full, parent_id, 'parent', 'Bonjour docteur, je souhaite discuter de la derniere mesure de Sanad.', True),
            (full, doctor_id, 'doctor', 'Bonjour, je vois les mesures. Nous pouvons verifier ensemble les valeurs saisies.', True),
            (full, parent_id, 'parent', 'Merci. Le rendez-vous de suivi est-il toujours conseille ?', False),
            (partial, parent_id, 'parent', 'Bonjour, je partage uniquement le profil et les mesures de Youssef.', True),
            (partial, doctor_id, 'doctor', 'Bien recu. Je respecterai les autorisations accordees.', False),
        ]
        for share, sender_id, sender_role, content, is_read in chat_rows:
            Message.objects.update_or_create(
                share=share,
                sender_role=sender_role,
                content=content,
                defaults={'sender_id': sender_id, 'is_read': is_read},
            )

        completed, _ = ConsultationSession.objects.update_or_create(
            share=full,
            notes='Consultation de demonstration terminee.',
            defaults={
                'created_by_id': parent_id,
                'created_by_role': 'parent',
                'session_type': 'video',
                'scheduled_at': timezone.now() - timedelta(days=8),
                'started_at': timezone.now() - timedelta(days=8, minutes=-5),
                'ended_at': timezone.now() - timedelta(days=8, minutes=-30),
                'status': ConsultationSession.Status.COMPLETED,
            },
        )
        ConsultationSession.objects.filter(pk=completed.pk).update(
            created_at=timezone.now() - timedelta(days=8),
        )
        self.stdout.write(self.style.SUCCESS(
            f'Demo collaboration ready: full share {full.id}, partial share {partial.id}.'
        ))
