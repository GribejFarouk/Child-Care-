import os
import requests
from datetime import datetime, date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from analytics.models import Alert, Recommendation, ClinicalFinding
from analytics.rules import analyze_measurement
from analytics.recommendation_engine import (
    compute_risk_score,
    generate_recommendations,
    generate_clinical_findings
)

class Command(BaseCommand):
    help = "Idempotently regenerates alerts, clinical findings, and recommendations for seeded demo children."

    def handle(self, *args, **options):
        self.stdout.write("Starting demo findings regeneration...")

        # 1. Determine service URLs (route through Nginx gateway to bypass underscore-in-hostname validation errors)
        AUTH_URL = os.environ.get('AUTH_SERVICE_URL', 'http://nginx')
        PROFILES_URL = os.environ.get('PROFILE_SERVICE_URL', 'http://nginx')
        MEASUREMENTS_URL = os.environ.get('MEASUREMENTS_SERVICE_URL', 'http://nginx')

        # Fallbacks for host-based local running if internal container DNS is not resolving (e.g. running manually outside docker)
        try:
            requests.get(f"{AUTH_URL}/api/auth/login/", timeout=5)
        except requests.RequestException as e:
            self.stdout.write(self.style.WARNING(f"Could not connect to {AUTH_URL} (error: {e}). Falling back to localhost port mappings..."))
            AUTH_URL = "http://localhost"
            PROFILES_URL = "http://localhost"
            MEASUREMENTS_URL = "http://localhost"

        # 2. Login as Demo Parent
        demo_email = "parent.demo@childcare.test"
        demo_password = "Demo1234!"

        self.stdout.write(f"Logging in as demo parent ({demo_email})...")
        try:
            login_resp = requests.post(f"{AUTH_URL}/api/auth/login/", json={
                "email": demo_email,
                "password": demo_password
            }, timeout=5)
        except requests.RequestException as e:
            self.stdout.write(self.style.ERROR(f"Auth Service unreachable: {e}"))
            return

        if login_resp.status_code != 200:
            self.stdout.write(self.style.ERROR(f"Login failed! Status: {login_resp.status_code}, Body: {login_resp.text}"))
            return

        tokens = login_resp.json().get('tokens', {})
        access_token = tokens.get('access')
        if not access_token:
            self.stdout.write(self.style.ERROR("No access token returned in login response."))
            return

        headers = {"Authorization": f"Bearer {access_token}"}

        # 3. Fetch children
        self.stdout.write("Fetching children profiles...")
        try:
            children_resp = requests.get(f"{PROFILES_URL}/api/profiles/children/", headers=headers, timeout=5)
        except requests.RequestException as e:
            self.stdout.write(self.style.ERROR(f"Profile Service unreachable: {e}"))
            return

        if children_resp.status_code != 200:
            self.stdout.write(self.style.ERROR(f"Failed to fetch children! Status: {children_resp.status_code}"))
            return

        children = children_resp.json()
        if not children:
            self.stdout.write(self.style.WARNING("No children profiles found for the demo parent."))
            return

        self.stdout.write(f"Found {len(children)} children. Processing each...")

        for child in children:
            child_id = child['id']
            sex = child.get('sex', 'M')
            birth_date_str = child.get('date_of_birth') or child.get('birth_date')
            self.stdout.write(self.style.MIGRATE_LABEL(f"\nProcessing Child: {child_id} (Sex: {sex}, Birthdate: {birth_date_str})"))

            # Fetch measurements
            self.stdout.write(f"Fetching measurements for child {child_id}...")
            try:
                meas_resp = requests.get(f"{MEASUREMENTS_URL}/api/measurements/?child_id={child_id}", headers=headers, timeout=5)
            except requests.RequestException as e:
                self.stdout.write(self.style.ERROR(f"Measurements Service unreachable for child {child_id}: {e}"))
                continue

            if meas_resp.status_code != 200:
                self.stdout.write(self.style.ERROR(f"Failed to fetch measurements! Status: {meas_resp.status_code}"))
                continue

            measurements = meas_resp.json()
            if not measurements:
                self.stdout.write(self.style.WARNING(f"No measurements found for child {child_id}."))
                continue

            # Sort measurements oldest to newest
            measurements.sort(key=lambda m: m['date_recorded'])
            self.stdout.write(f"Found {len(measurements)} measurements. Regenerating findings chronologically...")

            parent_id = login_resp.json().get('user', {}).get('id')
            if not parent_id:
                # Fallback to decode token or use a default if user object not returned
                parent_id = child.get('parent_id')

            measurement_ids = [measurement['id'] for measurement in measurements]
            removed_findings, _ = ClinicalFinding.objects.filter(
                parent_id=parent_id, child_id=child_id, measurement_id__in=measurement_ids
            ).delete()
            removed_recommendations, _ = Recommendation.objects.filter(
                parent_id=parent_id, child_id=child_id, measurement_id__in=measurement_ids
            ).delete()
            self.stdout.write(
                f"Removed {removed_findings} prior demo findings and "
                f"{removed_recommendations} prior demo recommendations before rebuild."
            )

            for idx, meas in enumerate(measurements):
                meas_id = meas['id']
                date_recorded_str = meas['date_recorded']
                
                # Calculate age in months if missing
                age_months = meas.get('age_at_recording_months')
                if not age_months and birth_date_str:
                    try:
                        birth = datetime.strptime(birth_date_str[:10], "%Y-%m-%d").date()
                        rec = datetime.strptime(date_recorded_str[:10], "%Y-%m-%d").date()
                        age_months = (rec.year - birth.year) * 12 + rec.month - birth.month
                    except Exception:
                        age_months = 12

                # Format current measurement
                current = {
                    'child_id': child_id,
                    'parent_id': parent_id,
                    'measurement_id': meas_id,
                    'weight_kg': float(meas['weight_kg']) if meas.get('weight_kg') is not None else None,
                    'height_cm': float(meas['height_cm']) if meas.get('height_cm') is not None else None,
                    'bmi': float(meas['bmi']) if meas.get('bmi') is not None else None,
                    'head_circumference_cm': float(meas['head_circumference_cm']) if meas.get('head_circumference_cm') is not None else None,
                    'age_at_recording_months': age_months,
                    'sex': sex,
                }

                # Determine previous measurement
                previous = None
                if idx > 0:
                    prev_meas = measurements[idx - 1]
                    previous = {
                        'weight_kg': float(prev_meas['weight_kg']) if prev_meas.get('weight_kg') is not None else None,
                        'height_cm': float(prev_meas['height_cm']) if prev_meas.get('height_cm') is not None else None,
                        'head_circumference_cm': float(prev_meas['head_circumference_cm']) if prev_meas.get('head_circumference_cm') is not None else None,
                    }

                # Run rule engine -> alerts
                alert_dicts = analyze_measurement(current, previous)
                
                # Save alerts idempotently
                created_alerts_count = 0
                for a_data in alert_dicts:
                    _, created = Alert.objects.get_or_create(
                        measurement_id=meas_id,
                        alert_type=a_data['alert_type'],
                        title=a_data['title'],
                        defaults={
                            'child_id': child_id,
                            'parent_id': parent_id,
                            'severity': a_data['severity'],
                            'message': a_data['message'],
                            'recommendation': a_data['recommendation'],
                        }
                    )
                    if created:
                        created_alerts_count += 1

                # Gather alert history for risk score calculation (last 90 days)
                recent_cutoff = timezone.now() - timedelta(days=90)
                recent_alerts = list(
                    Alert.objects.filter(
                        child_id=child_id,
                        parent_id=parent_id,
                        created_at__gte=recent_cutoff,
                    ).values('alert_type', 'severity', 'created_at')
                )

                child_context = {
                    'child_id': child_id,
                    'sex': sex,
                    'age_at_recording_months': age_months,
                    'current_measurement': current,
                    'previous_measurement': previous,
                    'alerts_history': recent_alerts,
                }

                # Run scoring and findings/recommendations generators
                score_result = compute_risk_score(child_context)
                rec_dicts = generate_recommendations(score_result, child_context)
                finding_dicts = generate_clinical_findings(score_result, child_context)

                # Save Clinical Findings
                created_findings_count = 0
                updated_findings_count = 0
                for f_dict in finding_dicts:
                    _, created = ClinicalFinding.objects.update_or_create(
                        measurement_id=meas_id,
                        finding_code=f_dict['finding_code'],
                        defaults={
                            'child_id': child_id,
                            'parent_id': parent_id,
                            'metric': f_dict['metric'],
                            'severity': f_dict['severity'],
                            'child_friendly_title': f_dict['child_friendly_title'],
                            'parent_explanation': f_dict['parent_explanation'],
                            'possible_meaning': f_dict.get('possible_meaning', ''),
                            'recommended_actions': f_dict.get('recommended_actions', []),
                            'evidence': f_dict.get('evidence', {}),
                            'disclaimer': f_dict.get('disclaimer', ''),
                        }
                    )
                    if created:
                        created_findings_count += 1
                    else:
                        updated_findings_count += 1

                # Save Recommendations
                created_recs_count = 0
                updated_recs_count = 0
                for rec in rec_dicts:
                    _, created = Recommendation.objects.update_or_create(
                        measurement_id=meas_id,
                        category=rec['category'],
                        title=rec['title'],
                        defaults={
                            'child_id': child_id,
                            'parent_id': parent_id,
                            'risk_score': score_result['score'],
                            'risk_level': score_result['risk_level'],
                            'risk_label': score_result['risk_label'],
                            'message': rec['message'],
                            'why': rec['why'],
                            'priority': rec['priority'],
                            'factors_json': score_result['factors'],
                            'disclaimer': score_result['disclaimer'],
                        }
                    )
                    if created:
                        created_recs_count += 1
                    else:
                        updated_recs_count += 1

                self.stdout.write(
                    f"  - Measurement {meas_id} ({date_recorded_str}): "
                    f"Created {created_alerts_count} alerts, "
                    f"{created_findings_count} findings created / {updated_findings_count} updated, "
                    f"{created_recs_count} recommendations created / {updated_recs_count} updated."
                )

        self.stdout.write(self.style.SUCCESS("\nDemo findings regeneration complete!"))
