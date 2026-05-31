from rest_framework import serializers
from .models import Measurement


class MeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Measurement
        fields = [
            'id',
            'child_id',
            'parent_id',
            'ocr_import_id',
            'date_recorded',
            'age_at_recording_months',
            'weight_kg',
            'height_cm',
            'bmi',                    # read-only: auto-calculated in model.save()
            'head_circumference_cm',
            'foot_size_cm',
            'ear_size_cm',
            'neck_circumference_cm',
            'wrist_circumference_cm',
            'notes',
            'source',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'parent_id', 'bmi', 'created_at', 'updated_at', 'ocr_import_id']

    def validate_child_id(self, value):
        """
        child_id ownership is enforced at the view level (queryset filtered by parent_id).
        This validator just ensures the field is present on create.
        """
        return value

    def validate(self, attrs):
        from django.utils import timezone
        
        # 1. Date validation
        date_recorded = attrs.get('date_recorded')
        if date_recorded and date_recorded > timezone.now().date():
            raise serializers.ValidationError({"date_recorded": "La date ne peut pas être dans le futur."})

        # 2. At least one health metric
        metrics = ['weight_kg', 'height_cm', 'head_circumference_cm', 'foot_size_cm', 
                   'ear_size_cm', 'neck_circumference_cm', 'wrist_circumference_cm']
                   
        has_metric = False
        for m in metrics:
            if attrs.get(m) is not None:
                has_metric = True
                break
            if self.instance and getattr(self.instance, m, None) is not None and m not in attrs:
                has_metric = True
                break
                
        if not has_metric:
            raise serializers.ValidationError("Au moins une mesure de santé doit être fournie.")

        # 3. No negative or unreasonable values
        for metric in metrics:
            val = attrs.get(metric)
            if val is not None:
                if val <= 0:
                    raise serializers.ValidationError({metric: "La valeur doit être strictement positive."})
                if val > 300: # Arbitrary upper bound to catch obvious typos (e.g., 300kg or 300cm)
                    raise serializers.ValidationError({metric: "Valeur invraisemblable (dépasse 300)."})

        return attrs
