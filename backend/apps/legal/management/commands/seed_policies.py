import datetime
from pathlib import Path
from django.core.management.base import BaseCommand
from apps.legal.models import PolicyVersion

SEED_DIR = Path(__file__).resolve().parent.parent.parent / 'seed_content'

POLICIES = [
    {
        'policy_type': 'privacy',
        'version': '1.0.1',
        'file_en': 'privacy_v1.txt',
        'file_ru': 'privacy_v1_ru.txt',
    },
    {
        'policy_type': 'terms',
        'version': '1.0.1',
        'file_en': 'terms_v1.txt',
        'file_ru': 'terms_v1_ru.txt',
    },
    {
        'policy_type': 'cookies',
        'version': '1.0.1',
        'file_en': 'cookies_v1.txt',
        'file_ru': 'cookies_v1_ru.txt',
    },
]


class Command(BaseCommand):
    help = 'Seed PolicyVersion records (privacy, terms, cookies — current version)'

    def handle(self, *args, **options):
        effective = datetime.date(2026, 5, 26)

        for p in POLICIES:
            content_en = (SEED_DIR / p['file_en']).read_text(encoding='utf-8')
            ru_path = SEED_DIR / p['file_ru']
            content_ru = ru_path.read_text(encoding='utf-8') if ru_path.exists() else ''

            obj, created = PolicyVersion.objects.update_or_create(
                policy_type=p['policy_type'],
                version=p['version'],
                defaults={
                    'effective_date': effective,
                    'content_en': content_en,
                    'content_ru': content_ru,
                    'is_active': True,
                },
            )
            # Ensure only this version is active for its type
            PolicyVersion.objects.filter(
                policy_type=p['policy_type']
            ).exclude(pk=obj.pk).update(is_active=False)

            verb = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(f'{verb}: {obj} (RU: {"yes" if content_ru else "empty"})'))

        self.stdout.write(self.style.SUCCESS(f'Done — {len(POLICIES)} policy versions seeded.'))
