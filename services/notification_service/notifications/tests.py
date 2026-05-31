"""
Phase 9 — notification_service test suite.

Covers:
- Internal create with/without token
- Idempotency (duplicate key)
- Parent lists own notifications
- Mark one as read (only affects its recipient)
- Mark all as read (only affects current user)
"""
import uuid
from unittest.mock import patch, MagicMock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from notifications.models import Notification


# ---------- helpers ---------------------------------------------------------

def _parent_user(uid=None):
    """Return a mock user object that looks like a decoded JWT parent."""
    u = MagicMock()
    u.id = uid or uuid.uuid4()
    u.role = 'parent'
    u.is_authenticated = True
    return u


def _doctor_user(uid=None):
    u = MagicMock()
    u.id = uid or uuid.uuid4()
    u.role = 'doctor'
    u.is_authenticated = True
    return u


def _make_notif(recipient_id, **kw):
    defaults = dict(
        recipient_role='parent',
        child_id=uuid.uuid4(),
        notification_type='analytics_alert',
        title='Test notification',
        message='Test body',
        source_service='analytics',
        permission_scope='alerts',
        idempotency_key=str(uuid.uuid4()),
    )
    defaults.update(kw)
    return Notification.objects.create(recipient_id=recipient_id, **defaults)


INTERNAL_TOKEN = 'childcare_internal_service_token_2026_secure'


# ---------- InternalCreateNotificationView ----------------------------------

@override_settings(DATABASES={
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
})
class InternalCreateTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/notifications/internal/create/'

    # ── Token tests ─────────────────────────────────────────────────────────

    def test_no_token_returns_403(self):
        resp = self.client.post(self.url, data={
            'recipient_id': str(uuid.uuid4()),
            'recipient_role': 'parent',
            'notification_type': 'test',
            'title': 'T',
            'message': 'M',
            'source_service': 'test',
            'idempotency_key': 'key-1',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_wrong_token_returns_403(self):
        resp = self.client.post(
            self.url,
            data={
                'recipient_id': str(uuid.uuid4()),
                'recipient_role': 'parent',
                'notification_type': 'test',
                'title': 'T',
                'message': 'M',
                'source_service': 'test',
                'idempotency_key': 'key-2',
            },
            format='json',
            HTTP_X_INTERNAL_SERVICE_TOKEN='wrong-token',
        )
        self.assertEqual(resp.status_code, 403)

    @patch('notifications.views.INTERNAL_SERVICE_TOKEN', INTERNAL_TOKEN)
    @patch('notifications.views.requests.post')  # prevent fan-out HTTP
    def test_valid_token_creates_notification(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {})
        idem_key = f'test-{uuid.uuid4()}'
        resp = self.client.post(
            self.url,
            data={
                'recipient_id': str(uuid.uuid4()),
                'recipient_role': 'parent',
                'notification_type': 'test',
                'title': 'Created',
                'message': 'Body',
                'source_service': 'test',
                'idempotency_key': idem_key,
            },
            format='json',
            HTTP_X_INTERNAL_SERVICE_TOKEN=INTERNAL_TOKEN,
        )
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Notification.objects.filter(idempotency_key=idem_key).exists())

    @patch('notifications.views.INTERNAL_SERVICE_TOKEN', INTERNAL_TOKEN)
    @patch('notifications.views.requests.post')
    def test_duplicate_idempotency_key_no_second_row(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {})
        payload = {
            'recipient_id': str(uuid.uuid4()),
            'recipient_role': 'parent',
            'notification_type': 'test',
            'title': 'Once',
            'message': 'Body',
            'source_service': 'test',
            'idempotency_key': 'dup-key-1',
        }
        r1 = self.client.post(self.url, data=payload, format='json',
                              HTTP_X_INTERNAL_SERVICE_TOKEN=INTERNAL_TOKEN)
        r2 = self.client.post(self.url, data=payload, format='json',
                              HTTP_X_INTERNAL_SERVICE_TOKEN=INTERNAL_TOKEN)
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r2.status_code, 201)
        self.assertEqual(Notification.objects.filter(idempotency_key='dup-key-1').count(), 1)


# ---------- NotificationListView (parent) -----------------------------------

class ParentListTests(TestCase):

    def setUp(self):
        self.parent_a = _parent_user()
        self.parent_b = _parent_user()
        self.n1 = _make_notif(self.parent_a.id, title='For A')
        self.n2 = _make_notif(self.parent_b.id, title='For B')
        self.client = APIClient()

    def test_parent_lists_only_own(self):
        self.client.force_authenticate(user=self.parent_a)
        resp = self.client.get('/api/notifications/')
        self.assertEqual(resp.status_code, 200)
        ids = [n['id'] for n in resp.data]
        self.assertIn(str(self.n1.id), ids)
        self.assertNotIn(str(self.n2.id), ids)


# ---------- Mark read -------------------------------------------------------

class MarkReadTests(TestCase):

    def setUp(self):
        self.parent_a = _parent_user()
        self.parent_b = _parent_user()
        self.n_a = _make_notif(self.parent_a.id, is_read=False)
        self.n_b = _make_notif(self.parent_b.id, is_read=False)
        self.client = APIClient()

    def test_mark_one_read_only_affects_own(self):
        self.client.force_authenticate(user=self.parent_a)
        resp = self.client.patch(f'/api/notifications/{self.n_a.id}/read/')
        self.assertEqual(resp.status_code, 200)
        self.n_a.refresh_from_db()
        self.n_b.refresh_from_db()
        self.assertTrue(self.n_a.is_read)
        self.assertFalse(self.n_b.is_read)

    def test_mark_one_read_foreign_returns_404(self):
        self.client.force_authenticate(user=self.parent_a)
        resp = self.client.patch(f'/api/notifications/{self.n_b.id}/read/')
        self.assertEqual(resp.status_code, 404)

    def test_mark_all_read_only_affects_current_user(self):
        self.client.force_authenticate(user=self.parent_a)
        resp = self.client.post('/api/notifications/mark-all-read/')
        self.assertEqual(resp.status_code, 200)
        self.n_a.refresh_from_db()
        self.n_b.refresh_from_db()
        self.assertTrue(self.n_a.is_read)
        self.assertFalse(self.n_b.is_read)


# ---------- Doctor notification security -----------------------------------

class DoctorNotificationSecurityTests(TestCase):
    """
    Verify that NotificationReadView, NotificationMarkAllReadView, and
    NotificationListView enforce active-share permission recheck for doctors.
    """

    def setUp(self):
        self.doctor = _doctor_user()
        self.child_allowed = uuid.uuid4()
        self.child_revoked = uuid.uuid4()

        # Create notifications for the doctor
        self.n_allowed = _make_notif(
            self.doctor.id,
            recipient_role='doctor',
            child_id=self.child_allowed,
            permission_scope='alerts',
            title='Allowed notif',
            is_read=False,
        )
        self.n_revoked = _make_notif(
            self.doctor.id,
            recipient_role='doctor',
            child_id=self.child_revoked,
            permission_scope='alerts',
            title='Revoked notif',
            is_read=False,
        )
        self.client = APIClient()

    def _mock_shares(self, active_child_ids=None, permissions=None):
        """Return a MagicMock response simulating collaboration shares."""
        if active_child_ids is None:
            active_child_ids = []
        perms = permissions or {'alerts': True}
        shares = [
            {'child_id': str(cid), 'status': 'active', 'permissions': perms}
            for cid in active_child_ids
        ]
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = shares
        return mock_resp

    # ── List ────────────────────────────────────────────────────────────────

    @patch('notifications.views.requests.get')
    def test_doctor_list_returns_only_allowed_notifications(self, mock_get):
        mock_get.return_value = self._mock_shares([self.child_allowed])
        self.client.force_authenticate(user=self.doctor)
        resp = self.client.get('/api/notifications/')
        self.assertEqual(resp.status_code, 200)
        ids = [n['id'] for n in resp.data]
        self.assertIn(str(self.n_allowed.id), ids)
        self.assertNotIn(str(self.n_revoked.id), ids)

    @patch('notifications.views.requests.get')
    def test_doctor_list_empty_when_all_revoked(self, mock_get):
        mock_get.return_value = self._mock_shares([])  # no active shares
        self.client.force_authenticate(user=self.doctor)
        resp = self.client.get('/api/notifications/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 0)

    # ── Read single ─────────────────────────────────────────────────────────

    @patch('notifications.views.requests.get')
    def test_doctor_can_read_allowed_notification(self, mock_get):
        mock_get.return_value = self._mock_shares([self.child_allowed])
        self.client.force_authenticate(user=self.doctor)
        resp = self.client.patch(f'/api/notifications/{self.n_allowed.id}/read/')
        self.assertEqual(resp.status_code, 200)
        self.n_allowed.refresh_from_db()
        self.assertTrue(self.n_allowed.is_read)

    @patch('notifications.views.requests.get')
    def test_doctor_cannot_read_revoked_notification(self, mock_get):
        mock_get.return_value = self._mock_shares([self.child_allowed])  # child_revoked not in list
        self.client.force_authenticate(user=self.doctor)
        resp = self.client.patch(f'/api/notifications/{self.n_revoked.id}/read/')
        self.assertEqual(resp.status_code, 404)
        self.n_revoked.refresh_from_db()
        self.assertFalse(self.n_revoked.is_read)

    @patch('notifications.views.requests.get')
    def test_doctor_read_denied_when_permission_missing(self, mock_get):
        """Doctor has active share but 'alerts' permission is False."""
        mock_get.return_value = self._mock_shares(
            [self.child_allowed], permissions={'alerts': False}
        )
        self.client.force_authenticate(user=self.doctor)
        resp = self.client.patch(f'/api/notifications/{self.n_allowed.id}/read/')
        self.assertEqual(resp.status_code, 404)

    # ── Mark all read ───────────────────────────────────────────────────────

    @patch('notifications.views.requests.get')
    def test_doctor_mark_all_read_only_affects_allowed(self, mock_get):
        mock_get.return_value = self._mock_shares([self.child_allowed])
        self.client.force_authenticate(user=self.doctor)
        resp = self.client.post('/api/notifications/mark-all-read/')
        self.assertEqual(resp.status_code, 200)
        self.n_allowed.refresh_from_db()
        self.n_revoked.refresh_from_db()
        self.assertTrue(self.n_allowed.is_read)
        self.assertFalse(self.n_revoked.is_read)  # revoked child's notif untouched

    @patch('notifications.views.requests.get')
    def test_doctor_mark_all_read_no_effect_when_revoked(self, mock_get):
        mock_get.return_value = self._mock_shares([])  # all revoked
        self.client.force_authenticate(user=self.doctor)
        resp = self.client.post('/api/notifications/mark-all-read/')
        self.assertEqual(resp.status_code, 200)
        self.n_allowed.refresh_from_db()
        self.n_revoked.refresh_from_db()
        self.assertFalse(self.n_allowed.is_read)
        self.assertFalse(self.n_revoked.is_read)
