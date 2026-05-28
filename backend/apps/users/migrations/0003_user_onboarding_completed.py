from django.db import migrations, models


def backfill_existing(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.update(onboarding_completed=True)


def reverse_backfill(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.update(onboarding_completed=False)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_add_marketing_emails_consent'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='onboarding_completed',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(backfill_existing, reverse_backfill),
    ]
