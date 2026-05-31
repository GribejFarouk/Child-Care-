import logging
import os
import requests


logger = logging.getLogger(__name__)


def publish_audit_event(
    *, actor_id, actor_role, event_type, outcome, resource_type, source_service,
    summary, child_id=None, parent_id=None, resource_id=None, metadata=None,
    visible_to_parent=False
):
    token = os.environ.get('INTERNAL_SERVICE_TOKEN')
    if not token:
        return
    endpoint = f"{os.environ.get('AUDIT_INTERNAL_URL', 'http://audit_service:8000').rstrip('/')}/api/audit/internal/events/"
    payload = {
        'actor_id': str(actor_id) if actor_id else None,
        'actor_role': actor_role,
        'event_type': event_type,
        'outcome': outcome,
        'child_id': str(child_id) if child_id else None,
        'parent_id': str(parent_id) if parent_id else None,
        'resource_type': resource_type,
        'resource_id': str(resource_id) if resource_id else None,
        'source_service': source_service,
        'summary': summary,
        'metadata': metadata or {},
        'visible_to_parent': visible_to_parent,
    }
    try:
        requests.post(
            endpoint,
            json=payload,
            headers={'Host': 'localhost', 'X-Internal-Service-Token': token},
            timeout=2,
        )
    except requests.RequestException as exc:
        logger.warning('Audit publication unavailable: %s', exc)
