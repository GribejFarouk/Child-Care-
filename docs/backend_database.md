# ChildCare+ — Backend Database Architecture

## Overview

ChildCare+ uses a **microservices** architecture where each Django service has its **own dedicated PostgreSQL database**. There are no cross-service foreign keys. All cross-service references use **UUID values only**.

---

## Measurement Table Architecture

One of the key architectural decisions in this project is that **all measurements are stored in a single table** called `measurements`, located in the `measurements_service` database.

### Design Decision

Rather than creating one table per measurement type (a "narrow table" design), we use a **wide table design**:

- **One row** = one measurement session/event for one child on one date
- **Multiple optional columns** store the different metric values

### Table: `measurements`

Located in: `measurements_db` (PostgreSQL, dedicated to `measurements_service`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique measurement ID |
| `child_id` | UUID | Reference to Child in `profile_service` |
| `parent_id` | UUID | Reference to User in `auth_service` (from JWT) |
| `date_recorded` | DATE | Date the measurement was taken |
| `age_at_recording_months` | INT (nullable) | Age of child at measurement time |
| `weight_kg` | DECIMAL(5,2) nullable | Weight in kilograms |
| `height_cm` | DECIMAL(5,2) nullable | Height in centimeters |
| `bmi` | DECIMAL(5,2) nullable | Auto-calculated from weight/height |
| `head_circumference_cm` | DECIMAL(5,2) nullable | Périmètre crânien (tour de tête) |
| `foot_size_cm` | DECIMAL(5,2) nullable | Foot size (complementary) |
| `ear_size_cm` | DECIMAL(5,2) nullable | Ear size (complementary) |
| `neck_circumference_cm` | DECIMAL(5,2) nullable | Neck circumference (complementary) |
| `wrist_circumference_cm` | DECIMAL(5,2) nullable | Wrist circumference (complementary) |
| `notes` | TEXT | Free-text observations |
| `source` | VARCHAR | `manual`, `ocr_import`, etc. |
| `created_at` | TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

### Why One Table?

This design is chosen because:

1. **Medical records are typically recorded per visit**: all measurements in a single visit belong together.
2. **Partial entry is expected**: not every visit records all metrics — nullable columns handle this naturally.
3. **Simplicity**: avoids complex joins or multi-table insertions for a single visit.
4. **WHO-standard metrics** (weight, height, head circumference) are distinguished from complementary metrics by documentation and UI, not by table separation.

---

## Inspecting the Database

To inspect the measurements table directly via Docker Compose:

```bash
# Enter the measurements_db PostgreSQL shell
docker compose exec measurements_db psql -U childcare -d childcare_measurements

# List all tables
\dt

# View the measurements table structure
\d measurements

# Show the first 5 rows
SELECT id, child_id, date_recorded, weight_kg, height_cm, head_circumference_cm, bmi
FROM measurements
LIMIT 5;

# Count measurements per child
SELECT child_id, COUNT(*) as total
FROM measurements
GROUP BY child_id;
```

To inspect other databases:

```bash
# auth_db
docker compose exec auth_db psql -U childcare -d childcare_auth
\d users

# profile_db
docker compose exec profile_db psql -U childcare -d childcare_profiles
\d children

# analytics_db
docker compose exec analytics_db psql -U childcare -d childcare_analytics
\d alerts
```

---

## Database per Service Summary

| Service | Database | Key Tables |
|---------|----------|------------|
| `auth_service` | `childcare_auth` | `users` |
| `profile_service` | `childcare_profiles` | `parent_profiles`, `doctor_profiles`, `children` |
| `measurements_service` | `childcare_measurements` | `measurements` |
| `analytics_service` | `childcare_analytics` | `alerts` |
| `ocr_service` | `childcare_ocr` | `ocrimports` |
| `calendar_service` | `childcare_calendar` | `healthevents` |
| `collaboration_service` | `childcare_collaboration` | `child_shares`, `messages` |

---

## Cross-Service Data Access

Services **do not query each other's databases directly**. Instead:

- **JWT claims** carry `user_id`, `email`, and `role` across all services.
- **Doctor access** is verified by calling the internal API of `collaboration_service`:
  ```
  GET /api/collaboration/internal/access-check/?doctor_id=...&child_id=...&section=...
  ```
- If `collaboration_service` is unreachable, access is **denied by default** (fail-safe).

---

## Measurement Form Architecture Note

The measurement form in the frontend computes:
- **BMI** client-side for preview (server also calculates and stores it authoritatively)
- **Age in months** from `child.date_of_birth` and `form.date` for the `age_at_recording_months` field

This enables the growth charts to correlate measurements with WHO reference curves by age.
