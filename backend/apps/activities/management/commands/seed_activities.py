"""
Seed realistic 12-week training history for a user.

Generates ~70 activities with Jack Daniels-style structure:
  - Sunday: long run (18-32 km)
  - Wednesday: quality workout (tempo / intervals)
  - Tue/Thu/Sat: easy runs (8-12 km)
  - Mon: rest
  - Every 4th week: cutback (volume -35%)

Usage:
  python manage.py seed_activities --email=runner@example.com
  python manage.py seed_activities --email=runner@example.com --weeks=12 --wipe
  python manage.py seed_activities --email=runner@example.com --target=berlin

After seeding, Celery recalculate_user_metrics runs synchronously
to populate CTL/ATL/TSB and update User cached metrics.
"""
import random
import math
from datetime import timedelta, datetime, timezone
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone as dj_tz
from apps.activities.models import Activity
from apps.activities.tasks import recalculate_user_metrics
from apps.races.models import Marathon, Prediction

User = get_user_model()

# (workout_type, distance_km_base, pace_sec_per_km, hr)
WEEKLY_TEMPLATE = {
    0: None,                                  # Mon — rest
    1: ('easy',     9.0,  340, 132),          # Tue
    2: ('workout',  14.0, 280, 165),          # Wed — tempo/intervals
    3: ('easy',     10.0, 345, 134),          # Thu
    4: None,                                  # Fri — rest
    5: ('easy',     8.0,  350, 128),          # Sat
    6: ('long',     24.0, 325, 145),          # Sun — long run
}


class Command(BaseCommand):
    help = 'Seed 12-week realistic training history for a user'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True, help='User email')
        parser.add_argument('--weeks', type=int, default=12,
                            help='Number of weeks to backfill (default 12)')
        parser.add_argument('--wipe', action='store_true',
                            help='Delete existing activities before seeding')
        parser.add_argument('--target', type=str, default=None,
                            help='Marathon name slug to set as target race '
                                 '(e.g. "berlin", "boston", "london")')
        parser.add_argument('--start-vdot', type=float, default=42.0,
                            help='Starting VDOT (default 42, ends at ~48 after 12w)')

    def handle(self, *args, **opts):
        email = opts['email']
        weeks = opts['weeks']
        wipe = opts['wipe']
        target_slug = opts['target']
        start_vdot = opts['start_vdot']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f'User {email!r} not found. Register first.')

        if wipe:
            n = Activity.objects.filter(user=user).count()
            Activity.objects.filter(user=user).delete()
            self.stdout.write(f'Wiped {n} existing activities')

        # Reproducible RNG
        rng = random.Random(hash(email) & 0xFFFFFFFF)

        today = dj_tz.now().date()
        first_day = today - timedelta(weeks=weeks)
        activities_created = 0

        # Progressive overload: paces get faster, volume grows
        for w in range(weeks):
            week_start = first_day + timedelta(weeks=w)
            cutback = (w % 4 == 3)                  # every 4th week
            volume_mult = (0.65 if cutback
                           else 0.75 + (w / weeks) * 0.45)   # 0.75 → 1.20
            fitness_factor = w / weeks               # 0 → 1, drives pace

            for dow, template in WEEKLY_TEMPLATE.items():
                if template is None:
                    continue
                wtype, dist_base, pace_base, hr_base = template
                date = week_start + timedelta(days=dow)
                if date > today:
                    break

                # Occasional missed workout
                if rng.random() < 0.08 and wtype != 'long':
                    continue

                dist_km = round(
                    dist_base * volume_mult * rng.uniform(0.92, 1.08), 2
                )
                # Pace improves with fitness, varies by workout type
                pace = pace_base * (1.0 - fitness_factor * 0.04) * rng.uniform(0.97, 1.03)
                duration = int(dist_km * pace)
                avg_pace = duration / dist_km
                avg_hr = int(hr_base + rng.uniform(-4, 4))
                elevation = round(rng.uniform(20, 120), 1)

                start_time = datetime(
                    date.year, date.month, date.day,
                    rng.choice([7, 8, 17, 18]), rng.randint(0, 59),
                    tzinfo=timezone.utc,
                )

                Activity.objects.create(
                    user=user,
                    start_time=start_time,
                    distance_km=dist_km,
                    duration_sec=duration,
                    avg_pace_sec_per_km=round(avg_pace, 2),
                    avg_hr=avg_hr,
                    elevation_gain_m=elevation,
                    source='manual',
                    is_valid=True,
                )
                activities_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Created {activities_created} activities over {weeks} weeks'
        ))

        # Trigger metric recalculation BEFORE prediction (prediction needs VDOT)
        self.stdout.write('Recalculating CTL/ATL/TSB/VDOT...')
        recalculate_user_metrics(str(user.id))

        # Set target race + first prediction if requested
        if target_slug:
            matching = Marathon.objects.filter(name__icontains=target_slug).first()
            if not matching:
                count = Marathon.objects.count()
                self.stdout.write(self.style.WARNING(
                    f'No marathon matching {target_slug!r} (DB has {count} '
                    f'marathons). Run: python manage.py import_marathons'
                ))
            else:
                race_date = today + timedelta(weeks=6)
                user.target_marathon = matching
                user.target_race_date = race_date
                user.save(update_fields=['target_marathon', 'target_race_date'])
                self.stdout.write(self.style.SUCCESS(
                    f'Target race set: {matching.name} on {race_date.isoformat()}'
                ))

                # Refresh user to pick up just-computed VDOT
                user.refresh_from_db()
                if not user.current_vdot:
                    self.stdout.write(self.style.WARNING(
                        'No VDOT yet — skipping prediction. Re-run with more weeks.'
                    ))
                else:
                    self._create_prediction(user, matching, race_date)

        user.refresh_from_db()
        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Dashboard now shows:\n'
            f'  VDOT:          {user.current_vdot}\n'
            f'  CTL (fitness): {user.current_ctl}\n'
            f'  ATL (fatigue): {user.current_atl}\n'
            f'  TSB (form):    {user.current_tsb}\n'
            f'  Training wks:  {user.training_weeks}\n'
        ))

    def _create_prediction(self, user, marathon, race_date):
        """Generate first finish-time prediction using the hybrid pipeline."""
        from ml.src.predict import predict_finish_time

        # Pull climatic average for race month if available, else 15°C default
        temp_c = 15.0
        if marathon.avg_temp_by_month:
            temp_c = marathon.get_avg_temp(race_date.month) or 15.0
        humidity_pct = 65.0
        wind_ms = 0.0

        result = predict_finish_time(user, marathon, race_date, temp_c, humidity_pct, wind_ms)

        Prediction.objects.create(
            user=user,
            marathon=marathon,
            target_distance_km=marathon.distance_km,
            race_date=race_date,
            base_time_sec=result['base_time_sec'],
            course_difficulty_coefficient=result['course_difficulty_coefficient'],
            weather_index=result['weather_index'],
            predicted_time_sec=result['predicted_time_sec'],
            confidence_interval_sec=result['confidence_interval_sec'],
            feature_importance=result.get('feature_importance', []),
            model_version='hybrid_v1',
            features_snapshot={
                'vdot': float(user.current_vdot),
                'temp_c': temp_c,
                'humidity_pct': humidity_pct,
                'mode': result['mode'],
                'seeded': True,
            },
        )
        self.stdout.write(self.style.SUCCESS(
            f'Prediction created: {result["predicted_time_formatted"]} '
            f'(±{result["confidence_interval_sec"] // 60} min, mode: {result["mode"]})'
        ))
