"""
Recompute difficulty_coefficient for user-uploaded (custom) marathons.

`import_marathons` only refreshes the seeded WMM catalog. Custom marathons
store their coefficient computed at upload time, so after a change to the
Minetti model they must be recomputed from their saved GPX file.

Usage:
    python manage.py recompute_custom_courses [--dry-run]
"""
from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.races.models import Marathon
from ml.src.minetti import compute_course_difficulty


class Command(BaseCommand):
    help = "Recompute course difficulty for custom marathons from their GPX files."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help="Show changes without saving.")

    def handle(self, *args, **opts):
        dry = opts['dry_run']
        qs = Marathon.objects.filter(is_custom=True).exclude(gpx_file_path='')
        total = qs.count()
        self.stdout.write(f"Custom marathons to check: {total}")
        changed = skipped = 0
        for m in qs:
            try:
                new_coeff = round(compute_course_difficulty(m.gpx_file_path), 4)
            except Exception as exc:  # noqa: BLE001
                skipped += 1
                self.stderr.write(f"  SKIP id={m.id} '{m.name}': {exc}")
                continue
            old = float(m.difficulty_coefficient or 0)
            mark = '' if abs(old - new_coeff) < 1e-4 else '  <-- changed'
            self.stdout.write(f"  id={m.id} '{m.name}': {old:.4f} -> {new_coeff:.4f}{mark}")
            if not dry and mark:
                m.difficulty_coefficient = Decimal(str(new_coeff))
                m.save(update_fields=['difficulty_coefficient'])
                changed += 1
        verb = "would update" if dry else "updated"
        self.stdout.write(self.style.SUCCESS(
            f"Done. {verb} {changed}, skipped {skipped}, total {total}."))
