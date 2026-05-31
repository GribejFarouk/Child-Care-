# ChildCare+ — Demo Data Guide

This guide explains how to populate the ChildCare+ platform with realistic demo data for presentation/demonstration.

> **Note:** All data is fictional. No real patient data is included.

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Parent | `parent.demo@childcare.test` | `Demo1234!` |
| Doctor | `doctor.demo@childcare.test` | `Demo1234!` |

---

## Step-by-Step Instructions

### Prerequisites

The full Docker Compose stack must be running:

```bash
docker compose up --build
```

Wait for all services to be healthy.

---

### Step 1 — Seed Auth Accounts

```bash
docker compose exec auth_service python manage.py seed_demo
```

**Expected output:**
```
  [+] Parent created: parent.demo@childcare.test
  [+] Doctor created: doctor.demo@childcare.test

Done. 2 account(s) created.
Parent ID : <PARENT_UUID>
Doctor ID : <DOCTOR_UUID>
```

> **Copy the Parent ID and Doctor ID** — you will need them in the next steps.

---

### Step 2 — Seed Children Profiles

```bash
docker compose exec profile_service python manage.py seed_demo \
  --parent-id <PARENT_UUID> \
  --doctor-id <DOCTOR_UUID>
```

**Expected output:**
```
  [+] Child created: Youssef Benali (id=<CHILD1_UUID>)
  [+] Child created: Meriem Benali (id=<CHILD2_UUID>)

Done. 2 child(ren) created.
Child IDs: ['<CHILD1_UUID>', '<CHILD2_UUID>']
```

> **Copy the Child IDs** for Step 3.

---

### Step 3 — Seed Measurements

```bash
docker compose exec measurements_service python manage.py seed_demo \
  --parent-id <PARENT_UUID> \
  --child-ids <CHILD1_UUID> <CHILD2_UUID>
```

**Expected output:**
```
  [+] Measurement: child=<CHILD1>... date=2024-01-15 weight=11.2kg height=83.0cm
  [+] Measurement: child=<CHILD1>... date=2024-07-15 weight=11.8kg height=86.5cm
  ...

Done. 11 measurement(s) created.
```

---

### Step 4 — Share Profile with Doctor (Manual via UI)

1. Log in as the **Parent** (`parent.demo@childcare.test`)
2. Navigate to **Médecins** → **Partager un dossier**
3. Select a child (e.g., Youssef) and choose permissions (Profil, Mesures, Alertes)
4. Copy the generated sharing code (e.g., `AB12CD`)
5. Log out, then log in as the **Doctor** (`doctor.demo@childcare.test`)
6. Navigate to **Mes Patients** → **Ajouter un patient**
7. Enter the sharing code → confirm

---

### Step 5 — Send a Demo Message

1. As **Parent**, go to **Médecins** → click the active share → **Messages**
2. Send: *"Bonjour Docteur, Youssef a eu de la fièvre cette semaine."*
3. As **Doctor**, the unread message count appears on the dashboard

---

## Complete Seeded Demonstration Scene

For the final presentation, use one child with abnormal growth as
`<FULL_CHILD_UUID>` and one normal child as `<PARTIAL_CHILD_UUID>`.
The full child is visible to the doctor for profile, measurements, alerts,
calendar, OCR and consultation. The partial child exposes profile and
measurements only.

Run these commands from PowerShell after Steps 1 to 3:

```powershell
docker compose exec calendar_service python manage.py seed_demo --parent-id <PARENT_UUID> --children <FULL_CHILD_UUID>:AbnormalChild <PARTIAL_CHILD_UUID>:NormalChild
docker compose exec collaboration_service python manage.py seed_demo --parent-id <PARENT_UUID> --doctor-id <DOCTOR_UUID> --full-child-id <FULL_CHILD_UUID> --partial-child-id <PARTIAL_CHILD_UUID>
docker compose exec notification_service python manage.py seed_demo --parent-id <PARENT_UUID> --doctor-id <DOCTOR_UUID> --full-child-id <FULL_CHILD_UUID> --partial-child-id <PARTIAL_CHILD_UUID>
docker compose exec ocr_service python manage.py seed_demo --parent-id <PARENT_UUID> --child-id <FULL_CHILD_UUID>
docker compose exec assistant_service python manage.py seed_demo --parent-id <PARENT_UUID> --child-id <FULL_CHILD_UUID>
docker compose exec audit_service python manage.py seed_demo --parent-id <PARENT_UUID> --doctor-id <DOCTOR_UUID> --child-id <FULL_CHILD_UUID>
docker compose exec analytics_service python manage.py regenerate_demo_findings
```

This fills:

- parent and doctor messaging, including one unread doctor-dashboard message;
- one completed consultation in the consultation history;
- medical calendar with planned, completed, and awaiting-confirmation events;
- parent and authorized-doctor notifications;
- confirmed and pending-review OCR import history;
- structured alerts, clinical findings and recommendations;
- a parent assistant conversation;
- a parent-visible activity journal.

For the current populated workspace, the full shared child is **Sanad** and
the limited shared child is **Youssef**.

---

## Demo Flow for Presentation

| Order | Action | Where |
|-------|--------|-------|
| 1 | Login as parent | `/login` |
| 2 | Show child list (Youssef, Meriem) | `/children` |
| 3 | Open Youssef's profile | `/children/<id>` |
| 4 | Add a new measurement | `/children/<id>/measurements/add` |
| 5 | Show growth charts with WHO reference curves | `/growth` |
| 6 | Show alerts (if generated) | `/alerts` |
| 7 | Show OCR import flow | `/ocr` |
| 8 | Go to Médecins → share with doctor | `/collaboration` |
| 9 | Login as doctor | `/login` |
| 10 | Show Mes Patients → open patient | `/doctor/patients` |
| 11 | Doctor reads messages | `/doctor/messages` |
| 12 | Parent revokes access | `/collaboration` |
| 13 | Doctor loses patient access | `/doctor/patients` |

---

## Idempotency

All `seed_demo` commands are **idempotent**: running them twice will not create duplicate records. They check for existing records by key identifiers before creating.

---

## Resetting Demo Data

To start fresh (drops and recreates all Docker volumes):

```bash
docker compose down -v
docker compose up --build
# Then re-run all seed steps above
```

> ⚠️ This deletes all data in all databases. Use only in a development environment.
