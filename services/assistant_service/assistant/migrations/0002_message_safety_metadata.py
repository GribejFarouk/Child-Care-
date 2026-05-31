from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('assistant', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='fallback_used',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='message',
            name='model_name',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='message',
            name='safety_escalation',
            field=models.BooleanField(default=False),
        ),
    ]
