# Phase 12.1 Tasks

## 1. Frontend Activity Journal Fixes
- [x] Fix `frontend/src/api/audit.js` API call structure and endpoint.
- [x] Update `ActivityJournalPage.jsx` to use `occurred_at`, add filters, and remove metadata exposure.
- [x] Verify `npm run build` succeeds with zero errors.

## 2. Public Audit Data Security
- [x] Refactor `recommendation_engine.py` to output deterministic structured finding payloads based on existing logic.
- [x] Update `AnalyzeMeasurementView` to generate and persist `ClinicalFinding` alongside `Alert` and `Recommendation`.
- [x] Implement `GET /api/analytics/findings/?child_id=<uuid>` (parent-facing endpoint).
- [x] Implement secure internal endpoint `GET /api/analytics/internal/assistant-context/`.
- [ ] Add `regenerate_demo_findings` management command.
- [ ] Write and verify `analytics_service` unit tests.

## Layer 2: Gemini Parent Assistant (`assistant_service`)
- [x] Initialize new `assistant_service` Django project (Dockerfile, requirements, base settings).
- [x] Create `assistant_db` in `docker-compose.yml` and add `assistant_service`.
- [x] Add Gemini config variables (`ASSISTANT_MODEL`, `GEMINI_API_KEY`, etc.) to `.env` and `.env.example`.
- [x] Update Nginx routing to expose `/api/assistant/` (while keeping internal blocked).
- [x] Define `Conversation` and `AssistantMessage` models with migrations.
- [x] Implement Gemini AI client wrapper with official SDK (`google-genai`).
- [x] Implement safety guardrails (regex check for emergency symptoms).
- [x] Implement structured prompt construction fetching context via `analytics_service`.
- [x] Implement deterministic fallback mode.
- [x] Expose parent-only `assistant` API endpoints (conversations, messages).
- [x] Implement audit logging for assistant events via `audit_client`.
- [x] Write and verify `assistant_service` unit tests (mocking Gemini).

## Frontend Implementation
- [x] Create `src/api/assistant.js` client module.
- [x] Create `AssistantChat` component and integrate into `GrowthChartsPage` (parent only).
- [x] Add "Assistant santé" to the parent sidebar navigation.

## 6. Doctor Medical Read Coverage
- [x] Update `measurements_service` to audit doctor reads.
- [x] Update `calendar_service` to audit doctor reads.
- [x] Add resilience unit tests verifying audit failures don't crash medical endpoints.

## 7. Docker and Nginx Configuration
- [x] Secure `docker-compose.yml` DB ports to `127.0.0.1` and remove unused ones.
- [x] Verify Nginx routes `/api/audit/` correctly.

## 8. Documentation
- [x] Correct claims in `docs/DEPLOYMENT.md` regarding PFE scope, Jitsi, OCR privacy, and database ports.

## 9. Verification and Runtime Probes
- [x] Rebuild and recreate all modified services.
- [x] Run backend test suites.
- [x] Perform live HTTP and port probes as requested.

### Phase 12.1: Correction Pass
- [x] Fix frontend audit endpoint path
- [x] Implement recursive metadata sanitization
- [x] Enforce explicit `INTERNAL_SERVICE_TOKEN` validation and remove fallbacks
- [x] Bind database ports to `127.0.0.1` for security
- [x] Implement doctor read audits (`parent_id` injection) in:
  - [x] Measurements Service
  - [x] Calendar Service
  - [x] OCR Service
- [x] Verify infrastructure and test suite passing
- [x] Update deployment documentation regarding security claims as requested.
