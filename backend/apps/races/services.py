import logging

logger = logging.getLogger(__name__)

# How long to back off after an auto-prediction failure before retrying for
# the same (user, marathon) pair. Dashboard GETs fire repeatedly; without
# this guard a broken ML config produces a fresh stack trace on every page
# load, drowning the logs and masking real errors.
_AUTO_PRED_FAIL_TTL_SEC = 300


def _fail_cache_key(user_id, marathon_id):
    return f"auto_pred_fail:{user_id}:{marathon_id}"


def auto_create_prediction_for_target(user):
    """Generate prediction for user's current target marathon.

    Returns the created Prediction or None on failure.
    Idempotent-safe: caller should check existing predictions first.
    Skips the work entirely for 5 min after a failure to avoid log spam.
    """
    from datetime import date, timedelta
    from django.core.cache import cache
    from apps.races.models import Marathon, Prediction
    from ml.src.predict import predict_finish_time

    if not user.current_vdot or not user.target_marathon_id:
        logger.info("auto-prediction skipped: user %s has no VDOT or target", user.id)
        return None

    fail_key = _fail_cache_key(user.id, user.target_marathon_id)
    if cache.get(fail_key):
        # Recent failure — bail without re-running ML and re-logging the
        # exception. After TTL we'll try again automatically.
        return None

    try:
        marathon = Marathon.objects.get(pk=user.target_marathon_id)
    except Marathon.DoesNotExist:
        logger.warning("auto-prediction: marathon %s not found", user.target_marathon_id)
        return None

    race_date = user.target_race_date or (date.today() + timedelta(weeks=6))
    temp_c = 15.0
    if marathon.avg_temp_by_month:
        temp_c = marathon.get_avg_temp(race_date.month) or 15.0

    try:
        result = predict_finish_time(user, marathon, race_date, temp_c, 65.0, 0.0)
    except Exception:
        logger.exception(
            "auto-prediction failed for user=%s marathon=%s",
            user.id, user.target_marathon_id,
        )
        cache.set(fail_key, True, _AUTO_PRED_FAIL_TTL_SEC)
        return None

    return Prediction.objects.create(
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
            'humidity_pct': 65.0,
            'mode': result['mode'],
            'is_marathon_distance': result.get('is_marathon_distance', True),
            'auto_generated': True,
        },
    )


# ── Marathon attempt detection ─────────────────────────────────────────────

# How close an activity's distance must be to the marathon's official
# distance to count as a race attempt. Generous (±3 km on a 42.195 km race)
# because GPS error, "long courses" certified at +0.1%, and runners who
# legitimately add warm-up/cool-down to the same FIT file are all common.
_RACE_DISTANCE_TOLERANCE_KM = 3.0


def record_marathon_attempt(activity):
    """
    If this activity is the user's race at their target marathon, freeze a
    MarathonAttempt row capturing all the snapshots we need for retraining.

    Called from the Strava webhook handler after a new activity is imported,
    and from manual upload completion. Idempotent — re-invocation on the
    same activity returns the existing attempt without mutating it.

    Detection rules:
      - User has target_marathon and target_race_date set
      - Activity start_date == target_race_date
      - |Activity.distance_km - Marathon.distance_km| ≤ tolerance
      - No existing attempt for (user, marathon, race_date)

    All snapshots are best-effort: missing User VDOT or DailyMetrics doesn't
    block creation, the row just records None for those fields and the ML
    export filters them out later.

    Returns the MarathonAttempt (created or existing), or None if not a race.
    """
    from apps.metrics.models import DailyMetrics
    from .models import MarathonAttempt, Prediction

    user = activity.user
    target = user.target_marathon
    target_date = user.target_race_date

    if not (target and target_date):
        return None

    activity_date = activity.start_time.date()
    if activity_date != target_date:
        return None

    dist_diff = abs(float(activity.distance_km) - float(target.distance_km))
    if dist_diff > _RACE_DISTANCE_TOLERANCE_KM:
        return None

    # Idempotent: one attempt per (user, marathon, race_date). If a pending
    # row exists (target set ahead of time) we update it rather than create
    # a duplicate.
    attempt, created = MarathonAttempt.objects.get_or_create(
        user=user, marathon=target, race_date=target_date,
        defaults={'status': 'completed'},
    )

    # Already finalised — don't clobber snapshots a second time.
    if attempt.activity_id is not None and attempt.status == 'completed':
        return attempt

    # Pre-race fitness snapshot: take the DailyMetrics row from the day
    # before the race. If absent (no metrics history yet), fall back to the
    # User's current cached values — they're our best guess for race-day
    # fitness even if not perfectly aligned to "the day before".
    pre_race_metrics = (
        DailyMetrics.objects
        .filter(user=user, date__lt=activity_date)
        .order_by('-date')
        .first()
    )

    # Latest prediction created BEFORE the race — captures what we told
    # the user to expect.
    pre_race_prediction = (
        Prediction.objects
        .filter(user=user, marathon=target, created_at__lt=activity.start_time)
        .order_by('-created_at')
        .first()
    )

    attempt.activity = activity
    attempt.prediction = pre_race_prediction
    attempt.actual_time_sec = activity.duration_sec
    attempt.status = 'completed'
    attempt.vdot_snapshot = user.current_vdot
    attempt.ctl_snapshot = pre_race_metrics.ctl if pre_race_metrics else user.current_ctl
    attempt.atl_snapshot = pre_race_metrics.atl if pre_race_metrics else user.current_atl
    attempt.tsb_snapshot = pre_race_metrics.tsb if pre_race_metrics else user.current_tsb
    attempt.course_coefficient_used = target.difficulty_coefficient
    attempt.plan_compliance_pct = _compute_plan_compliance_pct(user, target_date)
    attempt.save()

    # Async fetch of real day-of weather. We don't await it — the attempt
    # is usable without weather data, and Open-Meteo can be slow / down.
    try:
        from .tasks import fetch_race_weather
        fetch_race_weather.delay(str(attempt.id))
    except Exception:
        logger.exception("Failed to enqueue fetch_race_weather for attempt %s", attempt.id)

    return attempt


def _compute_plan_compliance_pct(user, race_date):
    """
    Percentage of planned workouts in the 12 weeks before race_date that
    were linked to an actual completed activity. Returns None if the user
    had no training plan over that window.
    """
    from datetime import timedelta
    from apps.plans.models import PlanWorkout

    cutoff_start = race_date - timedelta(weeks=12)
    qs = PlanWorkout.objects.filter(
        plan_week__plan__user=user,
        plan_week__plan__start_date__lte=race_date,
    )
    if not qs.exists():
        return None

    total = qs.count()
    if total == 0:
        return None
    completed = qs.filter(activity__isnull=False).count()
    return round(100 * completed / total)
