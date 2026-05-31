import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "measurements_service.settings")
django.setup()

from measurements.tests import MeasurementUpdateDeleteTests
from django.test.utils import setup_test_environment

def run_test():
    try:
        from measurements.models import Measurement
        from datetime import date
        import uuid
        
        # Test serialization validation
        from measurements.serializers import MeasurementSerializer
        
        m = Measurement(weight_kg=10.5, height_cm=80, date_recorded=date.today())
        s = MeasurementSerializer(instance=m, data={'notes': 'Updated note'}, partial=True)
        if s.is_valid():
            print("VALID")
        else:
            print("INVALID:", s.errors)
    except Exception as e:
        print("ERROR:", e)

run_test()
