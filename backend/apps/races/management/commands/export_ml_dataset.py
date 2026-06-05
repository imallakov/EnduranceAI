"""
Export a (features → outcome) dataset for ML retraining of the marathon
finish-time model.

One row per MarathonAttempt with status='completed' and actual_time_sec
populated. Features come from the frozen snapshots (vdot, CTL/ATL/TSB,
course coefficient, weather) and from the user's profile at attempt time.

Usage:
    python manage.py export_ml_dataset --out dataset.csv
    python manage.py export_ml_dataset --out dataset.csv --opt-in-only

The --opt-in-only flag is the gate for using data in a model that serves
all users. Per the Privacy Policy v1.0.1, only users who have set
analytics_opt_in=True may have their data used for cross-user training.
For per-user retraining you don't need the gate, but the flag is there
to keep the discipline explicit.
"""
from __future__ import annotations
import csv
from django.core.management.base import BaseCommand
from apps.races.models import MarathonAttempt


# Stable column order so downstream notebooks can rely on positions.
COLUMNS = [
    # Identity
    'attempt_id', 'user_id', 'marathon_id', 'marathon_name', 'race_date',
    # Outcome (target)
    'actual_time_sec', 'actual_pace_sec_per_km',
    # User profile snapshot
    'user_age', 'user_sex', 'user_max_hr',
    # Fitness snapshots (frozen)
    'vdot_snapshot', 'ctl_snapshot', 'atl_snapshot', 'tsb_snapshot',
    'plan_compliance_pct',
    # Training-load snapshot (16-week build-up) — the volume/endurance signal
    'avg_weekly_km_16w', 'peak_weekly_km_16w', 'total_km_16w',
    'long_runs_25k_plus', 'peak_long_run_km',
    # Course
    'distance_km', 'elevation_gain_m', 'elevation_loss_m',
    'course_coefficient_used',
    # Race-day weather (real, not climate norm)
    'temp_c_avg', 'temp_c_max', 'humidity_pct_avg', 'dew_point_c_avg',
    'wind_ms_avg', 'precipitation_mm_total',
    # What we predicted at the time
    'predicted_time_sec', 'prediction_model_version',
    # Derived for diagnostics
    'prediction_error_sec',
]


class Command(BaseCommand):
    help = 'Export completed marathon attempts as a CSV dataset for ML training.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--out', type=str, required=True,
            help='Output CSV path.',
        )
        parser.add_argument(
            '--opt-in-only', action='store_true',
            help='Include only users with analytics_opt_in=True (required for '
                 'cross-user model retraining per Privacy Policy v1.0.1).',
        )

    def handle(self, *args, **opts):
        qs = (
            MarathonAttempt.objects
            .filter(status='completed', actual_time_sec__isnull=False)
            .select_related('user', 'marathon', 'activity', 'prediction')
        )
        if opts['opt_in_only']:
            qs = qs.filter(user__analytics_opt_in=True)

        out_path = opts['out']
        n_rows = 0
        with open(out_path, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=COLUMNS)
            w.writeheader()
            for a in qs.iterator():
                w.writerow(_row(a))
                n_rows += 1

        self.stdout.write(self.style.SUCCESS(
            f'Wrote {n_rows} attempts to {out_path}'
            + (' (opt-in only)' if opts['opt_in_only'] else '')
        ))


def _row(a: MarathonAttempt) -> dict:
    """Map a MarathonAttempt to a flat CSV row."""
    weather = a.weather_snapshot or {}
    training = a.training_snapshot or {}
    user = a.user
    marathon = a.marathon
    pred = a.prediction

    distance_km = float(marathon.distance_km) if marathon.distance_km else None
    pace = (
        a.actual_time_sec / distance_km
        if a.actual_time_sec and distance_km else None
    )
    pred_error = (
        a.actual_time_sec - pred.predicted_time_sec
        if pred and a.actual_time_sec is not None else None
    )

    return {
        'attempt_id': str(a.id),
        'user_id': str(user.id),
        'marathon_id': str(marathon.id),
        'marathon_name': marathon.name,
        'race_date': a.race_date.isoformat(),

        'actual_time_sec': a.actual_time_sec,
        'actual_pace_sec_per_km': round(pace, 2) if pace else None,

        'user_age': user.age,
        'user_sex': user.sex or '',
        'user_max_hr': user.max_hr,

        'vdot_snapshot': float(a.vdot_snapshot) if a.vdot_snapshot else None,
        'ctl_snapshot': float(a.ctl_snapshot) if a.ctl_snapshot else None,
        'atl_snapshot': float(a.atl_snapshot) if a.atl_snapshot else None,
        'tsb_snapshot': float(a.tsb_snapshot) if a.tsb_snapshot else None,
        'plan_compliance_pct': a.plan_compliance_pct,

        'avg_weekly_km_16w': training.get('avg_weekly_km'),
        'peak_weekly_km_16w': training.get('peak_weekly_km'),
        'total_km_16w': training.get('total_km'),
        'long_runs_25k_plus': training.get('long_runs_25k_plus'),
        'peak_long_run_km': training.get('peak_long_run_km'),

        'distance_km': distance_km,
        'elevation_gain_m': float(marathon.elevation_gain_m) if marathon.elevation_gain_m else None,
        'elevation_loss_m': float(marathon.elevation_loss_m) if marathon.elevation_loss_m else None,
        'course_coefficient_used': float(a.course_coefficient_used) if a.course_coefficient_used else None,

        'temp_c_avg': weather.get('temp_c_avg'),
        'temp_c_max': weather.get('temp_c_max'),
        'humidity_pct_avg': weather.get('humidity_pct_avg'),
        'dew_point_c_avg': weather.get('dew_point_c_avg'),
        'wind_ms_avg': weather.get('wind_ms_avg'),
        'precipitation_mm_total': weather.get('precipitation_mm_total'),

        'predicted_time_sec': pred.predicted_time_sec if pred else None,
        'prediction_model_version': pred.model_version if pred else '',
        'prediction_error_sec': pred_error,
    }
