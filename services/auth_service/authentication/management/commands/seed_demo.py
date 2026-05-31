"""
Management command: seed_demo

Creates demo accounts for ChildCare+ presentation.
Idempotent: running twice will not duplicate accounts.

Usage (inside Docker or with venv active):
    python manage.py seed_demo

Demo accounts created:
    Parent: parent.demo@childcare.test   / Demo1234!
    Doctor: doctor.demo@childcare.test   / Demo1234!
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

PARENT_EMAIL = 'parent.demo@childcare.test'
DOCTOR_EMAIL = 'doctor.demo@childcare.test'
DEMO_PASSWORD = 'Demo1234!'


class Command(BaseCommand):
    help = 'Seed demo accounts for ChildCare+ presentation (idempotent).'

    def handle(self, *args, **options):
        created_count = 0

        # Parent account
        parent, created = User.objects.get_or_create(
            email=PARENT_EMAIL,
            defaults={
                'first_name': 'Amina',
                'last_name':  'Benali',
                'role':       'parent',
                'is_active':  True,
            }
        )
        if created:
            parent.set_password(DEMO_PASSWORD)
            parent.save()
            created_count += 1
            self.stdout.write(self.style.SUCCESS(f'  [+] Parent created: {PARENT_EMAIL}'))
        else:
            self.stdout.write(f'  [=] Parent already exists: {PARENT_EMAIL}')

        # Doctor account
        doctor, created = User.objects.get_or_create(
            email=DOCTOR_EMAIL,
            defaults={
                'first_name': 'Karim',
                'last_name':  'Messaoudi',
                'role':       'doctor',
                'is_active':  True,
            }
        )
        if created:
            doctor.set_password(DEMO_PASSWORD)
            doctor.save()
            created_count += 1
            self.stdout.write(self.style.SUCCESS(f'  [+] Doctor created: {DOCTOR_EMAIL}'))
        else:
            self.stdout.write(f'  [=] Doctor already exists: {DOCTOR_EMAIL}')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {created_count} account(s) created.\n'
            f'Parent ID : {parent.id}\n'
            f'Doctor ID : {doctor.id}\n'
        ))
