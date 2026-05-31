import uuid
import os
import jwt
import requests
from datetime import datetime, timedelta, timezone
from django.urls import reverse
from django.conf import settings
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock
from .models import HealthEvent


from rest_framework_simplejwt.tokens import AccessToken

def generate_test_token(user_id, email, role):
    token = AccessToken()
    token['user_id'] = str(user_id)
    token['email'] = email
    token['role'] = role
    return str(token)


class HealthEventTests(APITestCase):
    def setUp(self):
        self.parent_id = uuid.uuid4()
        self.parent_token = generate_test_token(self.parent_id, 'parent@test.com', 'parent')
        self.parent_auth_header = f"Bearer {self.parent_token}"

        self.other_parent_id = uuid.uuid4()
        self.other_parent_token = generate_test_token(self.other_parent_id, 'other@test.com', 'parent')

        self.doctor_id = uuid.uuid4()
        self.doctor_token = generate_test_token(self.doctor_id, 'doctor@test.com', 'doctor')

        self.child_id = uuid.uuid4()
        self.list_create_url = reverse('event-list-create')

    def test_unauthenticated_blocked(self):
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_doctor_blocked(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('events.permissions.check_collaboration_access', return_value=True)
    def test_shared_doctor_cannot_create_event(self, mock_access):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        response = self.client.post(self.list_create_url, {
            'child_id': str(self.child_id),
            'event_type': 'appointment',
            'title': 'Unauthorized doctor event',
            'scheduled_date': '2026-06-01',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_event_and_list(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.parent_auth_header)
        data = {
            'child_id': str(self.child_id),
            'event_type': 'appointment',
            'title': 'Test Appointment',
            'scheduled_date': '2026-06-01'
        }
        
        # Create
        response = self.client.post(self.list_create_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event_id = response.data['id']
        self.assertEqual(response.data['parent_id'], str(self.parent_id))
        self.assertEqual(response.data['status'], 'planned')

        # List
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_other_parent_cannot_see_events(self):
        # Create event for parent 1
        HealthEvent.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            event_type='vaccination',
            title='Test Vax',
            scheduled_date='2026-06-01'
        )

        # List as parent 2
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.other_parent_token}")
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    @patch('events.views.publish_audit_event')
    @patch('events.views.get_collaboration_access_details')
    @patch('events.permissions.check_collaboration_access')
    def test_doctor_shared_list_is_scoped_and_audited(self, mock_access, mock_details, mock_audit):
        mock_access.return_value = True
        mock_details.return_value = {'allowed': True, 'parent_id': str(self.parent_id)}
        HealthEvent.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            event_type='appointment',
            title='Shared appointment',
            scheduled_date='2026-06-01',
        )
        HealthEvent.objects.create(
            parent_id=self.other_parent_id,
            child_id=self.child_id,
            event_type='appointment',
            title='Not shared',
            scheduled_date='2026-06-02',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        response = self.client.get(self.list_create_url, {'child_id': str(self.child_id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['parent_id'], str(self.parent_id))
        self.assertEqual(mock_audit.call_args.kwargs['parent_id'], str(self.parent_id))

    @patch('events.permissions.check_collaboration_access', return_value=True)
    def test_shared_doctor_cannot_modify_or_delete_event(self, mock_access):
        event = HealthEvent.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            event_type='appointment',
            title='Parent event',
            scheduled_date='2026-06-01',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.doctor_token}")
        detail_url = reverse('event-detail', kwargs={'pk': event.id})
        self.assertEqual(self.client.patch(detail_url, {'title': 'Changed'}).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.delete(detail_url).status_code, status.HTTP_403_FORBIDDEN)

    def test_update_event_status(self):
        """Direct PATCH of status/completed_date is ignored — must use /confirm/ endpoint."""
        self.client.credentials(HTTP_AUTHORIZATION=self.parent_auth_header)
        event = HealthEvent.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            event_type='checkup',
            title='Test Checkup',
            scheduled_date='2026-06-01'
        )

        detail_url = reverse('event-detail', kwargs={'pk': event.id})
        
        # Attempt to PATCH status and completed_date directly (should be ignored)
        response = self.client.patch(detail_url, {'status': 'completed', 'completed_date': '2026-06-02'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Status should remain 'planned' — status is read-only in serializer
        self.assertEqual(response.data['status'], 'planned')
        
        event.refresh_from_db()
        self.assertEqual(event.status, 'planned')
        self.assertIsNone(event.completed_date)

    def test_direct_patch_allows_other_fields(self):
        """Non-protected fields like title, notes, doctor_name can still be updated via PATCH."""
        self.client.credentials(HTTP_AUTHORIZATION=self.parent_auth_header)
        event = HealthEvent.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            event_type='checkup',
            title='Original Title',
            scheduled_date='2026-06-01'
        )

        detail_url = reverse('event-detail', kwargs={'pk': event.id})
        response = self.client.patch(detail_url, {'title': 'Updated Title', 'notes': 'Some notes'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event.refresh_from_db()
        self.assertEqual(event.title, 'Updated Title')
        self.assertEqual(event.notes, 'Some notes')
        self.assertEqual(event.status, 'planned')  # status unchanged

    def test_other_parent_cannot_update(self):
        event = HealthEvent.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            event_type='checkup',
            title='Test Checkup',
            scheduled_date='2026-06-01'
        )

        detail_url = reverse('event-detail', kwargs={'pk': event.id})
        
        # Patch as parent 2
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.other_parent_token}")
        response = self.client.patch(detail_url, {'status': 'completed'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ── Phase 9 tests: Confirmation endpoint ──────────────────────────────────

class HealthEventConfirmTests(APITestCase):
    def setUp(self):
        self.parent_id = uuid.uuid4()
        self.parent_token = generate_test_token(self.parent_id, 'parent@test.com', 'parent')
        self.child_id = uuid.uuid4()

    def _create_event(self, status_val='planned', scheduled_date='2026-05-20'):
        return HealthEvent.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            event_type='vaccination',
            title='Test Vaccine',
            scheduled_date=scheduled_date,
            status=status_val,
        )

    @patch('events.views.requests.post')
    def test_confirm_happened_sets_completed(self, mock_post):
        mock_post.return_value = MagicMock(status_code=201)
        event = self._create_event(status_val='awaiting_confirmation')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('event-confirm', kwargs={'pk': event.id})
        resp = self.client.patch(url, {'action': 'confirm'}, format='json')
        self.assertEqual(resp.status_code, 200)
        event.refresh_from_db()
        self.assertEqual(event.status, 'completed')
        self.assertIsNotNone(event.completed_date)
        self.assertEqual(mock_post.call_count, 2)

    def test_confirm_did_not_happen_sets_cancelled(self):
        event = self._create_event(status_val='awaiting_confirmation')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('event-confirm', kwargs={'pk': event.id})
        resp = self.client.patch(url, {'action': 'cancel'}, format='json')
        self.assertEqual(resp.status_code, 200)
        event.refresh_from_db()
        self.assertEqual(event.status, 'cancelled')

    def test_confirm_invalid_action_returns_400(self):
        event = self._create_event(status_val='awaiting_confirmation')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('event-confirm', kwargs={'pk': event.id})
        resp = self.client.patch(url, {'action': 'banana'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_other_parent_cannot_confirm(self):
        other_id = uuid.uuid4()
        other_token = generate_test_token(other_id, 'other@test.com', 'parent')
        event = self._create_event()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {other_token}")
        url = reverse('event-confirm', kwargs={'pk': event.id})
        resp = self.client.patch(url, {'action': 'confirm'}, format='json')
        self.assertEqual(resp.status_code, 404)

    def test_planned_event_cannot_be_confirmed(self):
        """A future planned event must NOT be confirmable — requires awaiting_confirmation."""
        event = self._create_event(status_val='planned', scheduled_date='2027-01-01')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('event-confirm', kwargs={'pk': event.id})
        resp = self.client.patch(url, {'action': 'confirm'}, format='json')
        self.assertEqual(resp.status_code, 409)
        event.refresh_from_db()
        self.assertEqual(event.status, 'planned')

    def test_planned_event_cannot_be_cancelled(self):
        """A planned event should not be cancelled via the confirm endpoint."""
        event = self._create_event(status_val='planned')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('event-confirm', kwargs={'pk': event.id})
        resp = self.client.patch(url, {'action': 'cancel'}, format='json')
        self.assertEqual(resp.status_code, 409)
        event.refresh_from_db()
        self.assertEqual(event.status, 'planned')

    def test_completed_event_cannot_be_confirmed_again(self):
        """An already completed event should not be re-confirmed."""
        event = self._create_event(status_val='completed')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('event-confirm', kwargs={'pk': event.id})
        resp = self.client.patch(url, {'action': 'confirm'}, format='json')
        self.assertEqual(resp.status_code, 409)

    def test_cancelled_event_cannot_be_confirmed(self):
        """A cancelled event should not be confirmable."""
        event = self._create_event(status_val='cancelled')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.parent_token}")
        url = reverse('event-confirm', kwargs={'pk': event.id})
        resp = self.client.patch(url, {'action': 'confirm'}, format='json')
        self.assertEqual(resp.status_code, 409)


# ── Phase 9 tests: process_reminders command ──────────────────────────────

from unittest.mock import patch, MagicMock
from datetime import date


class ProcessRemindersTests(APITestCase):
    def setUp(self):
        self.parent_id = uuid.uuid4()
        self.child_id = uuid.uuid4()

    def _create_event(self, scheduled_date, status_val='planned', event_type='vaccination'):
        return HealthEvent.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            event_type=event_type,
            title='Test Event',
            scheduled_date=scheduled_date,
            status=status_val,
        )

    @patch('events.management.commands.process_reminders.requests.post')
    @patch('events.management.commands.process_reminders.date')
    def test_tomorrow_vaccination_generates_reminder(self, mock_date, mock_post):
        tomorrow = date(2026, 6, 2)
        mock_date.today.return_value = date(2026, 6, 1)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        mock_post.return_value = MagicMock(status_code=201)
        
        self._create_event(scheduled_date=tomorrow, event_type='vaccination')

        from django.core.management import call_command
        call_command('process_reminders')

        mock_post.assert_called_once()
        payload = mock_post.call_args[1]['json']
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]['notification_type'], 'vaccination_reminder')

    @patch('events.management.commands.process_reminders.requests.post')
    @patch('events.management.commands.process_reminders.date')
    def test_tomorrow_appointment_generates_reminder(self, mock_date, mock_post):
        tomorrow = date(2026, 6, 2)
        mock_date.today.return_value = date(2026, 6, 1)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        mock_post.return_value = MagicMock(status_code=201)
        
        self._create_event(scheduled_date=tomorrow, event_type='appointment')

        from django.core.management import call_command
        call_command('process_reminders')

        mock_post.assert_called_once()
        payload = mock_post.call_args[1]['json']
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]['notification_type'], 'appointment_reminder')

    @patch('events.management.commands.process_reminders.requests.post')
    @patch('events.management.commands.process_reminders.date')
    def test_yesterday_planned_becomes_awaiting_confirmation(self, mock_date, mock_post):
        yesterday = date(2026, 5, 31)
        mock_date.today.return_value = date(2026, 6, 1)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        mock_post.return_value = MagicMock(status_code=201)

        event = self._create_event(scheduled_date=yesterday)

        from django.core.management import call_command
        call_command('process_reminders')

        event.refresh_from_db()
        self.assertEqual(event.status, 'awaiting_confirmation')

    @patch('events.management.commands.process_reminders.requests.post')
    @patch('events.management.commands.process_reminders.date')
    def test_yesterday_overdue_generates_confirmation_notification(self, mock_date, mock_post):
        yesterday = date(2026, 5, 31)
        mock_date.today.return_value = date(2026, 6, 1)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        mock_post.return_value = MagicMock(status_code=201)

        self._create_event(scheduled_date=yesterday)

        from django.core.management import call_command
        call_command('process_reminders')

        mock_post.assert_called_once()
        payload = mock_post.call_args[1]['json']
        overdue = [n for n in payload if n['notification_type'] == 'overdue_event']
        self.assertEqual(len(overdue), 1)

    @patch('events.management.commands.process_reminders.requests.post')
    @patch('events.management.commands.process_reminders.date')
    def test_running_twice_creates_no_duplicate_overdue(self, mock_date, mock_post):
        """Second run: event already 'awaiting_confirmation' so not re-processed."""
        yesterday = date(2026, 5, 31)
        mock_date.today.return_value = date(2026, 6, 1)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        mock_post.return_value = MagicMock(status_code=201)

        self._create_event(scheduled_date=yesterday)

        from django.core.management import call_command
        call_command('process_reminders')
        mock_post.reset_mock()
        
        # Second run — event already flipped to awaiting_confirmation
        call_command('process_reminders')
        # Should not fire again (no 'planned' events left)
        mock_post.assert_not_called()

    @patch('events.management.commands.process_reminders.requests.post')
    @patch('events.management.commands.process_reminders.date')
    def test_notification_failure_does_not_transition_status(self, mock_date, mock_post):
        """If notification service is down, events stay 'planned' for retry."""
        yesterday = date(2026, 5, 31)
        mock_date.today.return_value = date(2026, 6, 1)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        mock_post.side_effect = requests.exceptions.ConnectionError("Service unavailable")

        event = self._create_event(scheduled_date=yesterday)

        from django.core.management import call_command
        call_command('process_reminders')

        event.refresh_from_db()
        self.assertEqual(event.status, 'planned')  # NOT transitioned

    @patch('events.management.commands.process_reminders.requests.post')
    @patch('events.management.commands.process_reminders.date')
    def test_notification_failure_then_retry_succeeds(self, mock_date, mock_post):
        """First run fails (service down), second run succeeds and transitions."""
        yesterday = date(2026, 5, 31)
        mock_date.today.return_value = date(2026, 6, 1)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)

        event = self._create_event(scheduled_date=yesterday)
        from django.core.management import call_command

        # First run: notification fails
        mock_post.side_effect = requests.exceptions.ConnectionError("down")
        call_command('process_reminders')
        event.refresh_from_db()
        self.assertEqual(event.status, 'planned')

        # Second run: notification succeeds
        mock_post.side_effect = None
        mock_post.return_value = MagicMock(status_code=201)
        call_command('process_reminders')
        event.refresh_from_db()
        self.assertEqual(event.status, 'awaiting_confirmation')

    @patch('events.management.commands.process_reminders.requests.post')
    @patch('events.management.commands.process_reminders.date')
    def test_notification_non_201_does_not_transition(self, mock_date, mock_post):
        """If notification service returns non-201, events stay 'planned'."""
        yesterday = date(2026, 5, 31)
        mock_date.today.return_value = date(2026, 6, 1)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        mock_post.return_value = MagicMock(status_code=500)

        event = self._create_event(scheduled_date=yesterday)

        from django.core.management import call_command
        call_command('process_reminders')

        event.refresh_from_db()
        self.assertEqual(event.status, 'planned')


class InternalUpcomingEventsContextTests(APITestCase):
    def setUp(self):
        self.parent_id = uuid.uuid4()
        self.child_id = uuid.uuid4()
        self.url = reverse('internal-upcoming-context')
        self.token = os.environ.get('INTERNAL_SERVICE_TOKEN')
        HealthEvent.objects.create(
            parent_id=self.parent_id,
            child_id=self.child_id,
            event_type='vaccination',
            title='Vaccin DTP',
            scheduled_date=(datetime.now(timezone.utc).date() + timedelta(days=1)),
            status='planned',
            notes='Confidential parent note',
            location='Private address',
        )

    def test_internal_token_is_required(self):
        response = self.client.get(self.url, {
            'parent_id': str(self.parent_id),
            'child_id': str(self.child_id),
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_returns_minimized_upcoming_event_context(self):
        response = self.client.get(
            self.url,
            {'parent_id': str(self.parent_id), 'child_id': str(self.child_id)},
            HTTP_X_INTERNAL_SERVICE_TOKEN=self.token,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['upcoming_events']), 1)
        event = response.data['upcoming_events'][0]
        self.assertEqual(event['title'], 'Vaccin DTP')
        self.assertNotIn('notes', event)
        self.assertNotIn('location', event)
