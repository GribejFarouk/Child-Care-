"""
Management command: seed_demo

Seeds measurement history for demo children.
Requires child UUIDs from profile_service seed_demo and parent UUID from auth_service seed_demo.

Usage:
    python manage.py seed_demo --parent-id <UUID> --child-ids <UUID1> <UUID2>

Arguments:
    --parent-id  UUID of the demo parent (from auth_service seed_demo)
    --child-ids  One or more child UUIDs (from profile_service seed_demo, in order)
                 Child 0 (Youssef) = normal growth curve
                 Child 1 (Meriem) = includes intentionally abnormal weight jump (demo purposes)

Idempotent: checks by date+child to avoid duplicates.
"""
import uuid
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from measurements.models import Measurement


def months_ago(n):
    """Return a date approximately n months ago from today."""
    return date.today() - timedelta(days=int(n * 30.4375))


class Command(BaseCommand):
    help = 'Seed demo measurements for demo children (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument('--parent-id', type=str, required=True,
                            help='UUID of the demo parent')
        parser.add_argument('--child-ids', nargs='+', type=str, required=True,
                            help='Child UUIDs in order: [Youssef, Meriem]')

    def handle(self, *args, **options):
        parent_id = uuid.UUID(options['parent_id'])
        child_ids = [uuid.UUID(c) for c in options['child_ids']]
        created_count = 0

        # ─────────────────────────────────────────────────────────────────────
        # CHILD 0: Youssef (garçon, né 2022-03-15)
        # Normal growth curve — values within P3–P97 OMS
        # age_at_recording_months is approximate from DOB
        # ─────────────────────────────────────────────────────────────────────
        # Each tuple: (months_ago, weight_kg, height_cm, head_cm, age_months, sex)
        child0_data = [
            #  mo_ago  wt    ht     hd    age  sex
            (27, 11.2,  83.0, 47.0,  3,  'M'),  # 3 months
            (24, 11.8,  86.5, 47.5,  6,  'M'),  # 6 months
            (18, 12.5,  90.0, 48.0, 12,  'M'),  # 12 months
            (12, 13.2,  93.5, 48.5, 18,  'M'),  # 18 months
            ( 6, 13.9,  96.0, 49.0, 24,  'M'),  # 24 months
            ( 0, 14.3,  98.0, 49.5, 30,  'M'),  # 30 months (approx)
        ]

        # ─────────────────────────────────────────────────────────────────────
        # CHILD 1: Meriem (fille, née 2019-11-02)
        # Intentionally includes an abnormal weight jump above P97 for demo.
        # This triggers an OMS alert and a sudden-change alert.
        # ─────────────────────────────────────────────────────────────────────
        child1_data = [
            #  mo_ago  wt    ht      hd    age  sex
            (40, 15.0,  99.0, 50.0, 28,  'F'),  # normal
            (32, 16.5, 104.0, 50.5, 36,  'F'),  # normal (P50 for 36mo F = 14.1kg; P97 = 18.7kg)
            (24, 17.2, 107.0, 50.8, 44,  'F'),  # normal
            (16, 20.5, 110.0, 51.0, 52,  'F'),  # near P97 top (P97 for 54mo F = 23.4kg)
            # ABNORMAL: large weight jump → triggers "above P97" + sudden-change alert
            ( 8, 28.0, 112.0, 51.3, 60,  'F'),  # 28kg at 60mo — P97 for 60mo F is 25.0kg → ABOVE P97
            ( 0, 30.0, 114.0, 51.5, 68,  'F'),  # beyond 60 months — no OMS ref, but large change
        ]

        datasets = [child0_data, child1_data]

        for idx, child_id in enumerate(child_ids):
            data = datasets[idx] if idx < len(datasets) else datasets[-1]
            for (months, weight, height, head, age_months, sex) in data:
                record_date = months_ago(months)
                existing = Measurement.objects.filter(
                    child_id=child_id,
                    date_recorded=record_date
                ).first()
                if existing:
                    self.stdout.write(f'  [=] Already exists: child={str(child_id)[:8]} date={record_date}')
                    continue

                Measurement.objects.create(
                    child_id=child_id,
                    parent_id=parent_id,
                    date_recorded=record_date,
                    weight_kg=weight,
                    height_cm=height,
                    head_circumference_cm=head,
                    age_at_recording_months=age_months,
                    source='manual',
                    notes=f'Données de démo fictives. Sexe: {sex}.',
                )
                created_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f'  [+] Measurement: child={str(child_id)[:8]}... '
                    f'date={record_date} age={age_months}mo '
                    f'wt={weight}kg ht={height}cm'
                ))

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {created_count} measurement(s) created.\n'
            f'Youssef (child[0]): normal curve — values within OMS P3–P97\n'
            f'Meriem (child[1]):  includes abnormal weight jump > P97 at 60 months\n'
            f'  → Should generate alerts in analytics_service if triggered.\n'
        ))
