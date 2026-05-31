# Phase 12.1 Correction Pass Implementation Plan

This plan addresses all defects identified in the security and audit infrastructure, ensuring the system is defensively hardened for the PFE demonstration. Note that this makes the architecture defensible, but does not claim full GDPR/HIPAA compliance or production-readiness.

## Proposed Changes

### 1. Frontend Activity Journal Build Blocker
- **Modify `frontend/src/api/audit.js`**: Update import to use the named export `import { apiClient } from './client';` and correct the endpoint to `/api/audit/activity/`.
- **Modify `frontend/src/pages/activity/ActivityJournalPage.jsx`**: Change `log.created_at` to `log.occurred_at`. Implement robust date parsing to prevent crashes. Add UI filter controls for `child_id` and `event_type`. Remove all internal IDs and raw metadata from the UI presentation.

### 2. Prevent Public Audit Data Leakage
- **Modify `services/audit_service/audit/serializers.py`**: Create `PublicActivityEventSerializer` exposing strictly UI-safe fields: `id`, `event_type`, `outcome`, `child_id`, `resource_type`, `summary`, and `occurred_at`.
- **Modify `services/audit_service/audit/views.py`**: Update `ActivityJournalViewSet` to use `PublicActivityEventSerializer`. Explicitly raise a `PermissionDenied` (HTTP 403) for users with the `doctor` role rather than returning an empty list. Filter by `parent_id=request.user.id` and `visible_to_parent=True`.

### 3. Harden Audit Metadata Sanitization
- **Modify `services/audit_service/audit/serializers.py`**: Implement recursive, case-insensitive prohibited-key rejection using an explicit list: `password, access_token, refresh_token, token, authorization, jwt, secret, room_token, join_url, file, file_url, document_url, raw_text, raw_bytes, image_bytes, pdf_bytes`. Safe metadata will remain accepted.
- **Modify `services/audit_service/audit/test_audit.py`**: Add tests to ensure recursive metadata detection correctly raises validation errors (HTTP 400) for nested, mixed-case, and exact matched keys, while accepting safe metadata.

### 4. Internal Service Token Hardening
- **Modify `config/settings.py`, `views.py`, `permissions.py`, `audit_client.py`, and commands (All Services)**: Inventory every occurrence of `INTERNAL_SERVICE_TOKEN`. Remove all fallback/default behavior everywhere. Reject missing tokens, tokens shorter than 32 characters, and tokens starting with `change_me_` or `replace_with_`.
- **Modify `.env.example` & Local `.env`**: Update `.env.example` with a clear, non-runnable placeholder. Generate a real local token in `.env` without printing it in documentation. Ensure all container environments receive the strong token.

### 5. Fix Analytics Audit Events Invisible to Parents
- **Modify `services/analytics_service/analytics/views.py`**: 
    - If `?child_id=` is supplied and authorized, publish one child-specific parent-visible access event with `parent_id` and `child_id`.
    - If no child filter is supplied, publish a non-parent-visible aggregate system event.
    - Never assign an arbitrary `parent_id`.

### 6. Add Missing Audits for Doctor Medical Data Reads
- **Modify `services/measurements_service/measurements/views.py`**: Implement and test audit publishing for authorized doctor reads of measurements, omitting medical values.
- **Modify `services/calendar_service/events/views.py`**: Implement and test audit publishing for authorized doctor reads of calendar events.
- **Resilience Tests**: Add tests proving requests still succeed if `audit_service` is unavailable for login, measurements, calendar, OCR, analytics, and collaboration.

### 7. Secure Docker Port Exposure
- **Modify `docker-compose.yml`**: Bind required PostgreSQL developer ports only to `127.0.0.1` (e.g., `127.0.0.1:5433:5432`). Keep backend application ports entirely private without `ports:` mappings.

### 8. Nginx Live Routing
- **Modify `nginx/nginx.conf`**: Ensure the external internal-route deny rule is preserved and `/api/audit/` is routed correctly.
- **Verification**: Run live HTTP probes for POST `/api/audit/internal/events/` (403), GET `/api/audit/activity/` unauthenticated (401), doctor GET (403), parent GET (200), and internal profile/collaboration routes (403).

### 9. Correct Documentation
- **Modify `docs/DEPLOYMENT.md`**: Describe the app as security-hardened for the PFE demonstration, not production-ready or GDPR/HIPAA compliant. Accurately document Jitsi meeting links, OCR media privacy, localhost-only database port binding, and real token rules.

## Execution Order
1. Frontend fixes and build test.
2. `audit_service` serializers, views, and recursive metadata validation + tests.
3. Inventory and enforce `INTERNAL_SERVICE_TOKEN` rules globally + tests.
4. Add medical read audits + analytics rules + resilience tests.
5. Docker port mapping + Nginx config.
6. Deployment Documentation updates.
7. End-to-end container rebuild and runtime verifications.
