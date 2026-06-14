"""
Regenerate finish-time predictions for every user who has a target marathon.

Existing Prediction rows store the course coefficient / predicted time from
when they were generated. After the Minetti model change (and the catalog
re-import) those are stale. This command produces a fresh prediction per user
using the current live coefficient; the new row becomes the latest.

Runs synchronously (no Celery worker required). Safe to re-run.

Usage:
    python manage.py refresh_target_predictions [--dry-run]
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.races.services import auto_create_prediction_for_target

User = get_user_model()


class Command(BaseCommand):
    help = "Regenerate predictions for all users with a target marathon."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help="List affected users without generating.")

    def handle(self, *args, **opts):
        dry = opts['dry_run']
        qs = (User.objects
              .filter(target_marathon__isnull=False, current_vdot__isnull=False)
              .exclude(current_vdot=0))
        total = qs.count()
        self.stdout.write(f"Users with a target marathon and VDOT: {total}")
        ok = failed = 0
        for user in qs.iterator():
            if dry:
                self.stdout.write(f"  would refresh: {user.id} ({user.email})")
                continue
            pred = auto_create_prediction_for_target(user)
            if pred:
                ok += 1
                self.stdout.write(
                    f"  {user.email}: {pred.predicted_time_sec}s "
                    f"(coeff {pred.course_difficulty_coefficient})")
            else:
                failed += 1
                self.stderr.write(f"  FAILED/skipped: {user.email}")
        if dry:
            self.stdout.write(self.style.SUCCESS(f"Dry run: {total} users."))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Done. generated {ok}, failed/skipped {failed}, total {total}."))
