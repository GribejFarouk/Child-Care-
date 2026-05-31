import os
import requests


def _headers():
    return {
        'Host': 'localhost',
        'X-Internal-Service-Token': os.environ.get('INTERNAL_SERVICE_TOKEN', ''),
    }


def parent_owns_child(parent_id, child_id):
    url = os.environ.get('PROFILE_INTERNAL_URL', 'http://profile_service:8000')
    try:
        response = requests.get(
            f"{url.rstrip('/')}/api/profiles/internal/check-ownership/",
            params={'parent_id': str(parent_id), 'child_id': str(child_id)},
            headers=_headers(),
            timeout=5,
        )
        return response.status_code == 200 and response.json().get('owned') is True
    except requests.RequestException:
        return False
