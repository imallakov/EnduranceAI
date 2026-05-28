import io
import json
import os
import unicodedata
import zipfile
from datetime import datetime, timezone


_README_TEMPLATE = """\
=== EnduranceAI Data Export ===

Generated: {timestamp}
User: {email}
Format version: 1.0

WHAT IS THIS?

This archive contains all personal data EnduranceAI holds about your account,
exported under GDPR Article 20 (Right to Data Portability) and Russian Federal
Law No. 152-FZ Article 20.

CONTENTS:
- profile.json              Your account data
- strava.json               Strava integration metadata (no auth tokens)
- activities.json           All your training activities
- activities/               Original uploaded FIT/GPX/TCX files (if any)
- predictions.json          Marathon predictions history
- plans.json                Training plans
- metrics.json              Daily metrics (VDOT, CTL, ATL, TSB)
- custom_marathons/         Your custom race routes (GPX files if available)
- policy_acceptances.json   Audit trail of policy acceptances

HOW TO USE:
- JSON files: open in any text editor, or load with json.load() in Python
- FIT/GPX files: re-upload to Strava, Garmin Connect, TrainingPeaks, or any
  compatible service
- Custom GPX: open in any mapping tool (Google Earth, gpx.studio, etc.)

QUESTIONS: support@endurance.yuzapp.space

----------------------------------------

=== Экспорт данных EnduranceAI ===

Создано: {timestamp}
Пользователь: {email}
Версия формата: 1.0

ЧТО ЭТО?

Этот архив содержит все личные данные, которые EnduranceAI хранит о вашем
аккаунте, экспортированные в соответствии со статьёй 20 GDPR (право на
переносимость данных) и статьёй 20 ФЗ № 152-ФЗ.

СОДЕРЖИМОЕ:
- profile.json              Данные аккаунта
- strava.json               Метаданные интеграции со Strava (без токенов)
- activities.json           Все ваши тренировки
- activities/               Исходные файлы FIT/GPX/TCX (если есть)
- predictions.json          История прогнозов марафона
- plans.json                Тренировочные планы
- metrics.json              Ежедневные метрики (VDOT, CTL, ATL, TSB)
- custom_marathons/         Ваши пользовательские маршруты (GPX, если есть)
- policy_acceptances.json   История принятия политик

КАК ИСПОЛЬЗОВАТЬ:
- JSON: откройте в любом текстовом редакторе или загрузите через json.load() в Python
- FIT/GPX: загрузите повторно в Strava, Garmin Connect, TrainingPeaks или
  любой совместимый сервис
- Пользовательские GPX: откройте в любом картографическом инструменте
  (Google Earth, gpx.studio и др.)

ВОПРОСЫ: support@endurance.yuzapp.space
"""


def _dumps(data) -> bytes:
    return json.dumps(data, indent=2, ensure_ascii=False, default=str).encode('utf-8')


def _dir_entry(name: str) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(name if name.endswith('/') else name + '/')
    return info


def _safe_filename(name: str) -> str:
    normalized = unicodedata.normalize('NFKD', name)
    ascii_str = normalized.encode('ascii', 'ignore').decode('ascii')
    return ''.join(c if c.isalnum() or c in '-_ ' else '_' for c in ascii_str).strip()[:80] or 'marathon'


def _resolve_path(raw_path: str) -> str | None:
    if not raw_path:
        return None
    if os.path.isabs(raw_path):
        return raw_path
    from django.conf import settings
    return os.path.join(settings.MEDIA_ROOT, raw_path)


def _build_profile(user) -> dict:
    target = None
    if user.target_marathon_id:
        m = user.target_marathon
        if m:
            target = {'id': str(m.id), 'name': m.name}
    return {
        'id': str(user.id),
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'date_of_birth': user.date_of_birth,
        'sex': user.sex,
        'max_hr': user.max_hr,
        'units': user.units,
        'lang': user.lang,
        'target_marathon': target,
        'target_race_date': user.target_race_date,
        'target_finish_sec': user.target_finish_sec,
        'current_vdot': user.current_vdot,
        'marketing_emails_consent': user.marketing_emails_consent,
        'created_at': user.created_at,
    }


def _build_strava(user) -> dict | None:
    try:
        sc = user.strava_connection
        return {
            'athlete_id': sc.athlete_id,
            'athlete_username': sc.athlete_username,
            'scope': sc.scope,
            'last_sync_at': sc.last_sync_at,
            'total_imported': sc.total_imported,
            'is_broken': sc.is_broken,
            'connected_at': sc.connected_at,
        }
    except Exception:
        return None


def _serialize_activity(a) -> dict:
    """Serializer used by the main archive loop. Kept as a helper so the schema
    lives in one place even though raw file attachment forces inlining the loop."""
    return {
        'id': str(a.id),
        'source': a.source,
        'start_time': a.start_time,
        'distance_km': a.distance_km,
        'duration_sec': a.duration_sec,
        'avg_pace_sec_per_km': a.avg_pace_sec_per_km,
        'avg_hr': a.avg_hr,
        'max_hr': a.max_hr,
        'elevation_gain_m': a.elevation_gain_m,
        'elevation_loss_m': a.elevation_loss_m,
        'avg_cadence': a.avg_cadence,
        'calories': a.calories,
        'vdot_estimate': a.vdot_estimate,
        'tss': a.tss,
        'laps': a.laps,
        'hr_zones_sec': a.hr_zones_sec,
        'polyline': a.polyline,
        'external_strava_id': a.external_strava_id,
        'is_valid': a.is_valid,
        'created_at': a.created_at,
    }


def _build_predictions(user) -> list:
    return [
        {
            'id': str(p.id),
            'marathon_name': p.marathon.name if p.marathon else None,
            'target_distance_km': p.target_distance_km,
            'race_date': p.race_date,
            'base_time_sec': p.base_time_sec,
            'course_difficulty_coefficient': p.course_difficulty_coefficient,
            'weather_index': p.weather_index,
            'predicted_time_sec': p.predicted_time_sec,
            'confidence_interval_sec': p.confidence_interval_sec,
            'race_readiness_score': p.race_readiness_score,
            'feature_importance': p.feature_importance,
            'model_version': p.model_version,
            'created_at': p.created_at,
        }
        for p in user.predictions.select_related('marathon').all()
    ]


def _build_plans(user) -> list:
    from apps.plans.models import TrainingPlan
    plans = TrainingPlan.objects.filter(user=user).prefetch_related('weeks__workouts')
    result = []
    for plan in plans:
        weeks = []
        for week in plan.weeks.all():
            weeks.append({
                'id': str(week.id),
                'week_number': week.week_number,
                'phase': week.phase,
                'total_km': week.total_km,
                'notes': week.notes,
                'workouts': [
                    {
                        'id': str(w.id),
                        'day_of_week': w.day_of_week,
                        'workout_type': w.workout_type,
                        'distance_km': w.distance_km,
                        'structure': w.structure,
                        'pace_min_sec': w.pace_min_sec,
                        'pace_max_sec': w.pace_max_sec,
                        'hr_min': w.hr_min,
                        'hr_max': w.hr_max,
                        'completed': w.completed,
                    }
                    for w in week.workouts.all()
                ],
            })
        result.append({
            'id': str(plan.id),
            'start_date': plan.start_date,
            'race_date': plan.race_date,
            'target_time_sec': plan.target_time_sec,
            'vdot_at_creation': plan.vdot_at_creation,
            'days_per_week': plan.days_per_week,
            'status': plan.status,
            'created_at': plan.created_at,
            'weeks': weeks,
        })
    return result


def _build_metrics(user) -> list:
    return [
        {
            'date': m.date,
            'ctl': m.ctl,
            'atl': m.atl,
            'tsb': m.tsb,
            'vdot_rolling': m.vdot_rolling,
            'hr_efficiency': m.hr_efficiency,
        }
        for m in user.daily_metrics.order_by('date')
    ]


def _build_policy_acceptances(user) -> list:
    return [
        {
            'policy_type': a.policy.policy_type,
            'policy_version': a.policy.version,
            'accepted_at': a.accepted_at,
            'ip_address': a.ip_address,
            'user_agent': a.user_agent,
        }
        for a in user.policy_acceptances.select_related('policy').all()
    ]


# TODO: switch to async Celery task when avg archive size > 50 MB
def build_export_archive(user) -> bytes:
    """Build and return a ZIP archive of all data for the given user (in memory)."""
    buf = io.BytesIO()
    timestamp = datetime.now(tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    with zipfile.ZipFile(buf, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('README.txt', _README_TEMPLATE.format(timestamp=timestamp, email=user.email).encode('utf-8'))

        zf.writestr('profile.json', _dumps(_build_profile(user)))
        zf.writestr('strava.json', _dumps(_build_strava(user)))

        # activities.json + raw files
        zf.writestr(_dir_entry('activities'), b'')
        activities_data = []
        for a in user.activities.all():
            activities_data.append(_serialize_activity(a))
            if a.raw_file_path:
                abs_path = _resolve_path(a.raw_file_path)
                if abs_path and os.path.isfile(abs_path):
                    ext = os.path.splitext(a.raw_file_path)[1] or ''
                    zf.write(abs_path, f'activities/{a.id}{ext}')
        zf.writestr('activities.json', _dumps(activities_data))

        zf.writestr('predictions.json', _dumps(_build_predictions(user)))
        zf.writestr('plans.json', _dumps(_build_plans(user)))
        zf.writestr('metrics.json', _dumps(_build_metrics(user)))

        # custom_marathons/
        zf.writestr(_dir_entry('custom_marathons'), b'')
        from apps.races.models import Marathon
        for marathon in Marathon.objects.filter(created_by=user):
            if marathon.gpx_file_path:
                abs_path = _resolve_path(marathon.gpx_file_path)
                if abs_path and os.path.isfile(abs_path):
                    slug = _safe_filename(marathon.name)
                    zf.write(abs_path, f'custom_marathons/{slug}.gpx')

        zf.writestr('policy_acceptances.json', _dumps(_build_policy_acceptances(user)))

    return buf.getvalue()
