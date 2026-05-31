# ChildCare+ Walkthrough

## Official Development Workflow

ChildCare+ now uses this workflow:

- Docker Compose runs the backend stack: Django services, PostgreSQL databases, and Nginx.
- The React frontend runs locally with Vite using `npm.cmd run dev`.

This keeps the frontend easy to work on while still giving the backend a clean microservices + PostgreSQL setup.

## Backend Services

The backend is implemented with Django REST Framework microservices:

- `services/auth_service/` - registration, login, JWT refresh/logout, current user.
- `services/profile_service/` - parent profiles, doctor profiles, child profile CRUD.
- `services/measurements_service/` - child measurement CRUD and server-side BMI calculation.
- `services/analytics_service/` - rule-based measurement analysis and alerts.

Each service has:

- its own `manage.py`
- its own `config/settings.py`
- its own Django app
- its own migrations
- its own Dockerfile
- its own PostgreSQL database in Docker

## PostgreSQL

PostgreSQL is the official database for the project.

Docker Compose defines one database per service:

- `auth_db`
- `profile_db`
- `measurements_db`
- `analytics_db`

SQLite fallback still exists in Django settings for local tests and emergency development, but the documented project architecture uses PostgreSQL.

## API Gateway

Nginx exposes one backend entry point:

```text
http://localhost
```

Routes:

```text
/api/auth/          -> auth_service
/api/profiles/      -> profile_service
/api/measurements/  -> measurements_service
/api/analytics/     -> analytics_service
```

The React frontend should use:

```env
VITE_API_BASE_URL=http://localhost
```

This is stored in:

```text
frontend/.env.development
```

## Environment

Use `.env.example` as the template:

```powershell
copy .env.example .env
```

The `.env` file is intentionally ignored by Git. It contains local development secrets and Docker database settings.

## Run Backend With Docker

From the project root:

```powershell
cd "C:\Users\GIGABYTE\My Pc\Desktop\projet PFE"
docker compose up --build
```

Expected containers:

- `auth_service`
- `profile_service`
- `measurements_service`
- `analytics_service`
- `auth_db`
- `profile_db`
- `measurements_db`
- `analytics_db`
- `nginx`

Important: Docker Desktop is not currently installed on this machine, so runtime Docker validation is blocked until Docker is installed. Static configuration has been prepared and reviewed.

## Run Frontend

In another terminal:

```powershell
cd "C:\Users\GIGABYTE\My Pc\Desktop\projet PFE\frontend"
npm.cmd run dev
```

Open:

```text
http://localhost:5173/Child-Care-/
```

## Backend Test Commands

Run these without Docker:

```powershell
cd "C:\Users\GIGABYTE\My Pc\Desktop\projet PFE\services\auth_service"
python manage.py test

cd "..\profile_service"
python manage.py test

cd "..\measurements_service"
python manage.py test

cd "..\analytics_service"
python manage.py test
```

Check migrations:

```powershell
python manage.py makemigrations --check --dry-run
```

Run that command inside each service folder.

## Frontend Build

```powershell
cd "C:\Users\GIGABYTE\My Pc\Desktop\projet PFE\frontend"
npm.cmd run build
```

## Phase 12.1: Correction Pass and Hardening

- **Frontend Fixes**: Corrected the `apiClient` path for the Activity Journal to `/api/audit/activity/` so it correctly routes through Nginx.
- **Privacy Safe Audit Storage**: Enhanced the `MetadataSanitizer` in the `audit_service` with recursive filtering, preventing any nested dictionary from exposing sensitive fields such as URLs or raw content.
- **S2S Internal Tokens**: Strengthened `INTERNAL_SERVICE_TOKEN` requirements across all services, removing insecure fallbacks and enforcing exact validation using a strong `.env` secret.
- **Infrastructure Safety**: Modified `docker-compose.yml` to bind all PostgreSQL instances strictly to `127.0.0.1`, effectively restricting all DB access to the host machine and internal docker networks.
- **Auditing Read Operations**: Extracted child ownership logic to reliably log doctor read access via the `publish_audit_event` with `parent_id` injection:
  - Added doctor read tracking in `measurements_service` lists.
  - Added doctor read tracking in `calendar_service` lists.
  - Added doctor read tracking in `ocr_service` lists.
- **Documentation**: Updated `docs/DEPLOYMENT.md` to clearly mark the application as "demo-ready" and to explicitly state it is not HIPAA/GDPR/HDS compliant.
- **Verification**: Verified that all backend service tests pass successfully, confirming that the new S2S interactions and timezone calculations work as expected in the continuous integration environment.:

## End-to-End Demo Scenario

After Docker is installed and the backend stack is running:

1. Start backend with `docker compose up --build`.
2. Start frontend with `npm.cmd run dev`.
3. Register a parent.
4. Create a child profile.
5. Add a measurement.
6. Confirm BMI is calculated by Measurements Service.
7. Confirm Analytics Service creates alerts for abnormal values.
8. Confirm alerts appear in the Alerts Center.

## Current Status

Phase 3.5 static stabilization is complete:

- Docker Compose configuration exists for all backend services and PostgreSQL databases.
- Nginx routes all API prefixes.
- `.env.example` uses Docker service names for database hosts.
- CORS allows Vite and Nginx origins.
- `frontend/.env.development` points React to `http://localhost`.

Remaining blocker:

- Install Docker Desktop to perform real runtime validation of `docker compose up --build`.
