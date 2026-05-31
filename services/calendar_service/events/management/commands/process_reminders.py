import os
import requests
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from events.models import HealthEvent

NOTIFICATION_SERVICE_URL = os.environ.get('NOTIFICATION_SERVICE_URL', 'http://notification_service:8000')
INTERNAL_SERVICE_TOKEN = os.environ.get('INTERNAL_SERVICE_TOKEN')

class Command(BaseCommand):
    help = 'Process reminders for upcoming and overdue calendar events.'

    def handle(self, *args, **options):
        today = date.today()
        tomorrow = today + timedelta(days=1)

        # 1. Day-before reminders
        upcoming_events = HealthEvent.objects.filter(status='planned', scheduled_date=tomorrow)
        notifications_to_send = []
        
        for event in upcoming_events:
            notif_type = 'vaccination_reminder' if event.event_type == 'vaccination' else 'appointment_reminder'
            title = f"Rappel: {event.get_event_type_display()} demain"
            message = f"N'oubliez pas: {event.title} est prévu pour demain."
            
            notifications_to_send.append({
                "recipient_id": str(event.parent_id),
                "recipient_role": "parent",
                "child_id": str(event.child_id),
                "notification_type": notif_type,
                "title": title,
                "message": message,
                "source_service": "calendar",
                "source_object_id": str(event.id),
                "permission_scope": "calendar",
                "action_url": f"/calendar",
                "due_at": tomorrow.isoformat() + "T09:00:00Z",
                "idempotency_key": f"calendar:{event.id}:day_before:{event.parent_id}"
            })

        # 2. Collect overdue events (DO NOT transition status yet)
        overdue_events = list(HealthEvent.objects.filter(status='planned', scheduled_date__lt=today))
        for event in overdue_events:
            title = f"Confirmation requise: {event.get_event_type_display()}"
            message = f"L'événement '{event.title}' prévu le {event.scheduled_date.strftime('%d/%m/%Y')} a-t-il eu lieu ?"
            
            notifications_to_send.append({
                "recipient_id": str(event.parent_id),
                "recipient_role": "parent",
                "child_id": str(event.child_id),
                "notification_type": "overdue_event",
                "title": title,
                "message": message,
                "source_service": "calendar",
                "source_object_id": str(event.id),
                "permission_scope": "calendar",
                "action_url": f"/calendar",
                "idempotency_key": f"calendar:{event.id}:overdue:{event.parent_id}"
            })

        if not notifications_to_send:
            self.stdout.write(self.style.SUCCESS("No reminders to process."))
            return

        # 3. Send to notification_service
        try:
            resp = requests.post(
                f"{NOTIFICATION_SERVICE_URL}/api/notifications/internal/create/",
                json=notifications_to_send,
                headers={"X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN},
                timeout=5
            )
            if resp.status_code == 201:
                # 4. Only now transition overdue events to awaiting_confirmation
                for event in overdue_events:
                    event.status = 'awaiting_confirmation'
                    event.save(update_fields=['status'])
                self.stdout.write(self.style.SUCCESS(f"Successfully processed {len(notifications_to_send)} reminders."))
            else:
                self.stdout.write(self.style.ERROR(
                    f"Notification service returned {resp.status_code}. "
                    f"Events NOT transitioned — will retry next run."
                ))
        except requests.RequestException as e:
            self.stdout.write(self.style.ERROR(
                f"Notification service unavailable: {str(e)}. "
                f"Events NOT transitioned — will retry next run."
            ))

