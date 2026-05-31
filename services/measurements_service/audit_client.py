import os
import requests
import threading
import logging

logger = logging.getLogger(__name__)

def publish_audit_event(
    actor_id, actor_role, event_type, outcome, resource_type,
    source_service, summary, child_id=None, parent_id=None, share_id=None,
    resource_id=None, metadata=None, visible_to_parent=False
):
    """
    Fire-and-forget helper to publish an audit event without blocking the main request.
    """
    audit_url = os.environ.get('AUDIT_SERVICE_URL', 'http://audit_service:8000')
    endpoint = f"{audit_url.rstrip('/')}/api/audit/internal/events/"
    token = os.environ.get('INTERNAL_SERVICE_TOKEN')

    if not token:
        logger.error("INTERNAL_SERVICE_TOKEN missing, skipping audit.")
        return

    payload = {
        "actor_id": str(actor_id) if actor_id else None,
        "actor_role": actor_role,
        "event_type": event_type,
        "outcome": outcome,
        "child_id": str(child_id) if child_id else None,
        "parent_id": str(parent_id) if parent_id else None,
        "share_id": str(share_id) if share_id else None,
        "resource_type": resource_type,
        "resource_id": str(resource_id) if resource_id else None,
        "source_service": source_service,
        "summary": summary,
        "metadata": metadata or {},
        "visible_to_parent": visible_to_parent
    }

    def _send():
        try:
            resp = requests.post(
                endpoint,
                json=payload,
                headers={"Host": "localhost", "X-Internal-Service-Token": token},
                timeout=2.0
            )
            if resp.status_code != 201:
                logger.error(f"Audit event failed to publish: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"Audit service unreachable or timed out: {e}")

    # Fire and forget
    threading.Thread(target=_send).start()
