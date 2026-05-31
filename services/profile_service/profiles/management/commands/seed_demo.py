"""
Management command: seed_demo

Creates demo children profiles for the demo parent account.
Requires knowing the demo parent_id from auth_service.

Usage:
    python manage.py seed_demo --parent-id <UUID>

Run after auth_service seed_demo, using the parent ID printed there.
Idempotent: will not create duplicate children.
"""
import uuid
from datetime import date
from django.core.management.base import BaseCommand
from profiles.models import Child, ParentProfile, DoctorProfile


class Command(BaseCommand):
    help = 'Seed demo children for the demo parent (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument('--parent-id', type=str, required=True,
                            help='UUID of the demo parent from auth_service seed_demo')
        parser.add_argument('--doctor-id', type=str, default=None,
                            help='UUID of the demo doctor from auth_service seed_demo')

    def handle(self, *args, **options):
        parent_id = uuid.UUID(options['parent_id'])
        doctor_id = uuid.UUID(options['doctor_id']) if options['doctor_id'] else None
        created_count = 0

        # Create/update ParentProfile
        pp, _ = ParentProfile.objects.get_or_create(user_id=parent_id)
        if not pp.city:
            pp.city = 'Alger'
            pp.save()

        # Create/update DoctorProfile
        if doctor_id:
            dp, _ = DoctorProfile.objects.get_or_create(user_id=doctor_id)
            if not dp.specialty:
                dp.specialty = 'Pédiatrie'
                dp.clinic_name = 'Clinique Médicale Centrale'
                dp.save()
            self.stdout.write(f'  [=] DoctorProfile updated: {doctor_id}')

        # Demo children
        demo_children = [
            {
                'first_name': 'Youssef',
                'last_name':  'Benali',
                'date_of_birth': date(2022, 3, 15),
                'sex': 'M',
            },
            {
                'first_name': 'Meriem',
                'last_name':  'Benali',
                'date_of_birth': date(2019, 11, 2),
                'sex': 'F',
            },
        ]

        created_ids = []
        for child_data in demo_children:
            existing = Child.objects.filter(
                parent_id=parent_id,
                first_name=child_data['first_name'],
                date_of_birth=child_data['date_of_birth']
            ).first()
            if not existing:
                child = Child.objects.create(parent_id=parent_id, **child_data)
                created_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f"  [+] Child created: {child.first_name} {child.last_name} (id={child.id})"
                ))
                created_ids.append(child.id)
            else:
                self.stdout.write(f'  [=] Child already exists: {existing.first_name} (id={existing.id})')
                created_ids.append(existing.id)

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {created_count} child(ren) created.\n'
            f'Child IDs: {[str(i) for i in created_ids]}\n'
            f'Use these IDs in measurements_service seed_demo.\n'
        ))
