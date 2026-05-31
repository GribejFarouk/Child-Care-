import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from assistant.models import Conversation, Message


class Command(BaseCommand):
    help = 'Seed an idempotent parent assistant conversation for the demo child.'

    def add_arguments(self, parser):
        parser.add_argument('--parent-id', required=True)
        parser.add_argument('--child-id', required=True)

    def handle(self, *args, **options):
        parent_id = uuid.UUID(options['parent_id'])
        child_id = uuid.UUID(options['child_id'])
        conversation, _ = Conversation.objects.update_or_create(
            parent_id=parent_id,
            child_id=child_id,
            title='Comprendre la variation de poids',
            defaults={'is_active': True},
        )
        rows = [
            (
                'user',
                "Pourquoi le poids de mon enfant demande une verification ?",
                False,
                '',
            ),
            (
                'assistant',
                "La derniere mesure se situe hors de la zone de reference OMS et change fortement par rapport a la mesure precedente. Verifiez d'abord la saisie, puis demandez l'avis d'un pediatre si la valeur est confirmee.\n\nCet assistant ne pose pas de diagnostic et ne remplace pas l'avis d'un professionnel de sante.",
                False,
                'demo-deterministic',
            ),
        ]
        for role, content, escalation, model_name in rows:
            Message.objects.update_or_create(
                conversation=conversation,
                role=role,
                content=content,
                defaults={
                    'fallback_used': role == 'assistant',
                    'safety_escalation': escalation,
                    'model_name': model_name,
                },
            )
        Conversation.objects.filter(pk=conversation.pk).update(updated_at=timezone.now() - timedelta(hours=2))
        self.stdout.write(self.style.SUCCESS('Demo assistant conversation ready.'))
