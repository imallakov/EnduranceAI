import logging
import requests

logger = logging.getLogger(__name__)

# How many days ahead of "today" we trust a real weather forecast. Open-Meteo
# (and the underlying ECMWF/NOAA models) become noisier past day 14 — past
# that horizon a climatological average is a better estimator than a
# specific forecast value, so we fall back.
FORECAST_HORIZON_DAYS = 14
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Race window — averaged temp/humidity within these local hours, same as
# our climate-fetch and historical-archive commands so the three sources
# are directly comparable.
RACE_HOUR_START = 8
RACE_HOUR_END = 13  # inclusive


def get_race_day_temperature(marathon, race_date):
    """
    Best available (temp_c, humidity_pct, source) for a marathon at a given
    race date. Tries forecast first inside the forecast horizon, otherwise
    falls back to the climatological monthly average we already keep on
    Marathon.avg_temp_by_month.

    Source values: 'forecast' | 'climate' | 'default'.
    Never raises — on any failure returns climate fallback.
    """
    from datetime import date

    days_to_race = (race_date - date.today()).days
    if (0 <= days_to_race <= FORECAST_HORIZON_DAYS
            and marathon.start_lat and marathon.start_lon):
        forecast = _fetch_forecast_for_race_day(
            float(marathon.start_lat), float(marathon.start_lon), race_date,
        )
        if forecast:
            return forecast['temp_c'], forecast['humidity_pct'], 'forecast'

    # Climate fallback. get_avg_temp returns 15.0 if month missing, which
    # is itself a default — we mark the source so callers can distinguish.
    temp_c = marathon.avg_temp_by_month.get(str(race_date.month)) if marathon.avg_temp_by_month else None
    if temp_c is not None:
        return float(temp_c), 65.0, 'climate'
    return 15.0, 65.0, 'default'


def _fetch_forecast_for_race_day(lat, lon, race_date):
    """
    Hit Open-Meteo forecast for the race day, averaged over race hours
    (08:00-13:00 local). Returns dict with temp_c, humidity_pct, or None
    on failure.
    """
    race_date_str = race_date.isoformat()
    try:
        resp = requests.get(OPEN_METEO_FORECAST_URL, params={
            'latitude': lat,
            'longitude': lon,
            'start_date': race_date_str,
            'end_date': race_date_str,
            'hourly': 'temperature_2m,relative_humidity_2m',
            'timezone': 'auto',
        }, timeout=8)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("forecast fetch failed: %s", exc)
        return None

    hourly = data.get('hourly', {}) or {}
    times = hourly.get('time', []) or []
    temps = hourly.get('temperature_2m', []) or []
    humids = hourly.get('relative_humidity_2m', []) or []
    if not times or len(times) != len(temps):
        return None

    race_temps, race_humids = [], []
    for i, ts in enumerate(times):
        if len(ts) < 13:
            continue
        try:
            hour = int(ts[11:13])
        except ValueError:
            continue
        if RACE_HOUR_START <= hour <= RACE_HOUR_END:
            if i < len(temps) and temps[i] is not None:
                race_temps.append(temps[i])
            if i < len(humids) and humids[i] is not None:
                race_humids.append(humids[i])

    if not race_temps:
        return None

    return {
        'temp_c': round(sum(race_temps) / len(race_temps), 1),
        'humidity_pct': round(sum(race_humids) / len(race_humids), 1) if race_humids else 65.0,
    }

# How long to back off after an auto-prediction failure before retrying for
# the same (user, marathon) pair. Dashboard GETs fire repeatedly; without
# this guard a broken ML config produces a fresh stack trace on every page
# load, drowning the logs and masking real errors.
_AUTO_PRED_FAIL_TTL_SEC = 300


def _fail_cache_key(user_id, marathon_id):
    return f"auto_pred_fail:{user_id}:{marathon_id}"


# Don't reuse a prior result older than this — the repeat model was trained on
# 1-6 year gaps, and beyond that a stale time says little about current fitness
# (a lot can change in 7+ years). Past this we fall back to the analytic tier.
_PRIOR_MAX_GAP_YEARS = 7.0


def get_prior_marathon_features(user, target_race_date=None, target_marathon=None):
    """
    The runner's marathon HISTORY as the Tier-A input. Returns a feature dict
    for the history model, or None if there's no usable prior.

    Uses ALL completed full-marathon attempts (not just the last), so a single
    stale result is cushioned by the broader picture:
      - prev_finish / prev_coeff / years_since_prev: the ANCHOR — the most
        recent attempt at the SAME target marathon if available (cleanest
        signal), else the most recent attempt overall.
      - best_prior / mean_prior / n_prior: across all valid priors.
      - trend_sec_per_year: improvement/decline from first to most recent prior.
      - same_marathon: whether any prior is at the target course (tightens CI).

    Validity: full-marathon distance, sane finish, anchor within
    _PRIOR_MAX_GAP_YEARS; priors older than 10 y are ignored entirely.
    """
    from datetime import date
    from .models import MarathonAttempt

    ref = target_race_date or date.today()
    target_pk = getattr(target_marathon, 'pk', None)

    qs = (MarathonAttempt.objects
          .filter(user=user, status='completed', actual_time_sec__isnull=False)
          .select_related('marathon')
          .order_by('race_date'))          # ascending (oldest first)

    priors = []  # dicts, chronological
    for att in qs:
        dist = float(att.marathon.distance_km or 0)
        if not (40.0 <= dist <= 45.0):
            continue
        finish = int(att.actual_time_sec)
        if not (5400 <= finish <= 36000):   # 1:30 .. 10:00, same as training clean
            continue
        gap = max(0.0, (ref - att.race_date).days / 365.25)
        if gap > 10.0:                       # ancient — ignore entirely
            continue
        priors.append({
            'date': att.race_date, 'finish': finish, 'gap': gap,
            'coeff': float(att.course_coefficient_used
                           or att.marathon.difficulty_coefficient or 1.0),
            'marathon_id': att.marathon_id,
        })

    if not priors:
        return None

    # Anchor = most recent same-course prior (if any, within the staleness cap),
    # else most recent overall. Require the anchor to be recent enough.
    same = [p for p in priors if target_pk is not None and p['marathon_id'] == target_pk
            and p['gap'] <= _PRIOR_MAX_GAP_YEARS]
    recent = priors[-1]
    if recent['gap'] > _PRIOR_MAX_GAP_YEARS and not same:
        return None
    anchor = same[-1] if same else recent

    finishes = [p['finish'] for p in priors]
    n = len(priors)
    span_years = (priors[-1]['date'] - priors[0]['date']).days / 365.25
    trend = ((priors[-1]['finish'] - priors[0]['finish']) / span_years
             if span_years > 0 else 0.0)

    return {
        'finish_sec': anchor['finish'],          # display / feature_importance
        'prev_finish': anchor['finish'],
        'prev_coeff': anchor['coeff'],
        'years_since_prev': round(anchor['gap'], 2),
        'best_prior': float(min(finishes)),
        'mean_prior': round(sum(finishes) / n, 1),
        'n_prior': n,
        'trend_sec_per_year': round(trend, 1),
        'same_marathon': bool(same),
    }


def get_training_load(user, race_date=None, weeks: int = 8):
    """
    8-week training-load summary for the Tanda tier (Tier A.5).

    Returns {weekly_km, train_pace_sec, weeks_with_data} over the most recent
    `weeks` weeks ending today (never looks into the future for a race that
    hasn't happened — Tanda predicts from CURRENT training). None if no runs.

    weekly_km    = total distance / weeks
    train_pace_sec = total duration / total distance  (overall mean training pace)
    """
    from datetime import date, timedelta

    ref = race_date or date.today()
    end = min(ref, date.today())
    start = end - timedelta(weeks=weeks)

    rows = user.activities.filter(
        is_valid=True,
        start_time__date__gte=start,
        start_time__date__lt=end,
    ).values_list('distance_km', 'duration_sec', 'start_time')

    total_km = 0.0
    total_sec = 0.0
    iso_weeks = set()
    for dist, dur, st in rows:
        d = float(dist or 0)
        s = float(dur or 0)
        if d <= 0 or s <= 0:
            continue
        total_km += d
        total_sec += s
        iso_weeks.add(st.isocalendar()[:2])

    if total_km <= 0:
        return None
    return {
        'weekly_km': round(total_km / weeks, 1),
        'train_pace_sec': round(total_sec / total_km, 1),
        'weeks_with_data': len(iso_weeks),
    }


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
    # Forecast-aware temperature: inside the 14-day forecast horizon we hit
    # Open-Meteo and use the real forecast; outside it we use climatological
    # averages. Single source of truth, never raises — falls back internally.
    temp_c, humidity_pct, weather_source = get_race_day_temperature(marathon, race_date)

    prior = get_prior_marathon_features(user, race_date, target_marathon=marathon)
    training_load = get_training_load(user, race_date)
    try:
        result = predict_finish_time(user, marathon, race_date, temp_c, humidity_pct, 0.0,
                                     prior_marathon=prior, training_load=training_load)
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
        model_version='tiered_v1',
        features_snapshot={
            'vdot': float(user.current_vdot),
            'temp_c': temp_c,
            'humidity_pct': humidity_pct,
            'weather_source': weather_source,
            'mode': result['mode'],
            'tier': result.get('tier'),
            'prior_marathon_sec': prior['finish_sec'] if prior else None,
            'weekly_km': training_load['weekly_km'] if training_load else None,
            'is_marathon_distance': result.get('is_marathon_distance', True),
            'auto_generated': True,
        },
    )


# ── Marathon attempt detection ─────────────────────────────────────────────

# Completion tolerance is ASYMMETRIC. A finisher's GPS very rarely reads more
# than ~1.5 km short (tight tangents + drift), so anything shorter than that is
# almost certainly a DNF/cut course — the old symmetric ±3 km counted a 39.2 km
# run as a "finished marathon", which is wrong. The long side stays generous:
# warm-up/cool-down packed into the same file, or weaving, reads long.
_COMPLETED_SHORT_TOL_KM = 1.5
_COMPLETED_LONG_TOL_KM = 3.0
# Minimum distance for an activity to count as a "started but did not finish"
# race attempt. Below this it's a regular short run on race day (e.g. shakeout).
_DNF_MIN_DISTANCE_KM = 10.0
# start_time is UTC; its .date() can differ by a day from the race's LOCAL date.
# Allow ±1 day on the date match so a tz boundary doesn't drop a real race.
_RACE_DATE_TOLERANCE_DAYS = 1


def _classify_race_outcome(activity_distance_km, marathon_distance_km):
    """
    Classify a race-day activity as 'completed', 'dnf', or None (not a race).

    'completed' — from 1.5 km short to 3 km long of the official distance.
                  Short side is tight on purpose (a finisher doesn't read
                  3 km short); long side absorbs warm-up/weaving.
    'dnf'       — ran at least 10 km but stopped well short of the finish.
                  actual_time_sec stays the activity's duration; the ML export
                  filters DNFs out, but the row stays as historical record.
    None        — too short to be a DNF, or far longer than the marathon (ultra).
    """
    diff = activity_distance_km - marathon_distance_km
    if -_COMPLETED_SHORT_TOL_KM <= diff <= _COMPLETED_LONG_TOL_KM:
        return 'completed'
    if diff > _COMPLETED_LONG_TOL_KM:
        # Far longer than the marathon (ultra) — auto-detection isn't safe.
        return None
    # Ran meaningfully less than the marathon.
    if activity_distance_km >= _DNF_MIN_DISTANCE_KM:
        return 'dnf'
    return None


def record_marathon_attempt(activity):
    """
    If this activity is the user's race at their target marathon, freeze a
    MarathonAttempt row capturing all the snapshots we need for retraining.

    Called from the Strava webhook handler after a new activity is imported,
    and from manual upload completion. Idempotent — re-invocation on the
    same activity returns the existing attempt without mutating it.

    Detection rules:
      - User has target_marathon and target_race_date set
      - Activity start date within ±1 day of target_race_date (UTC/local tz)
      - Distance classification yields 'completed' or 'dnf'
        (see _classify_race_outcome — full marathon vs DNF vs not-a-race)

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
    if abs((activity_date - target_date).days) > _RACE_DATE_TOLERANCE_DAYS:
        return None

    outcome = _classify_race_outcome(
        float(activity.distance_km), float(target.distance_km),
    )
    if outcome is None:
        return None

    # Idempotent: one attempt per (user, marathon, race_date). If a pending
    # row exists (target set ahead of time) we update it rather than create
    # a duplicate.
    attempt, created = MarathonAttempt.objects.get_or_create(
        user=user, marathon=target, race_date=target_date,
        defaults={'status': outcome},
    )

    # Already finalised — don't clobber snapshots a second time.
    if attempt.activity_id is not None and attempt.status in ('completed', 'dnf'):
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
    # For DNF: actual_time_sec is still the activity's recorded duration
    # (how long they were running before stopping). It is NOT the marathon
    # finish time, so ML export filters DNFs out — but the row stays as
    # historical record.
    attempt.actual_time_sec = activity.duration_sec
    attempt.status = outcome
    attempt.vdot_snapshot = user.current_vdot
    attempt.ctl_snapshot = pre_race_metrics.ctl if pre_race_metrics else user.current_ctl
    attempt.atl_snapshot = pre_race_metrics.atl if pre_race_metrics else user.current_atl
    attempt.tsb_snapshot = pre_race_metrics.tsb if pre_race_metrics else user.current_tsb
    attempt.course_coefficient_used = target.difficulty_coefficient
    attempt.plan_compliance_pct = _compute_plan_compliance_pct(user, target_date)
    attempt.training_snapshot = _compute_training_snapshot(user, activity_date)
    attempt.save()

    # Async fetch of real day-of weather. We don't await it — the attempt
    # is usable without weather data, and Open-Meteo can be slow / down.
    try:
        from .tasks import fetch_race_weather
        fetch_race_weather.delay(str(attempt.id))
    except Exception:
        logger.exception("Failed to enqueue fetch_race_weather for attempt %s", attempt.id)

    return attempt


def backfill_race_attempts_for_user(user):
    """
    Re-scan the user's recent activities for race-attempt matches against
    their CURRENT target_marathon + target_race_date.

    The trigger for this is profile-update: when a user fixes a date typo
    or changes their target marathon, an already-imported activity that
    didn't match at the time should now match. Webhook events fire only
    on activity changes, not profile changes, so without this backfill the
    correction is silently lost.

    Scope: we only look at activities within ±3 days of the new target date.
    Outside this window detection couldn't match anyway, and a full-table
    scan would be wasted I/O for users with hundreds of activities.

    Returns the number of attempts created or updated.
    """
    from datetime import timedelta

    if not (user.target_marathon and user.target_race_date):
        return 0

    target_date = user.target_race_date
    window_start = target_date - timedelta(days=3)
    window_end = target_date + timedelta(days=3)

    candidates = user.activities.filter(
        start_time__date__gte=window_start,
        start_time__date__lte=window_end,
        is_valid=True,
    )

    touched = 0
    for activity in candidates:
        try:
            attempt = record_marathon_attempt(activity)
            if attempt:
                touched += 1
        except Exception:
            logger.exception("backfill: record_marathon_attempt failed for %s", activity.id)

    return touched


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


def _compute_training_snapshot(user, race_date, weeks: int = 16) -> dict:
    """
    Frozen pre-race training-load features over the `weeks`-week build-up.

    This is the signal the predictor most needs and currently ignores: not a
    single best run, but the *shape of the training* — weekly volume, whether
    the runner did long runs, how much they peaked. Stored on the attempt so a
    future model can learn (training-load → marathon outcome).

    Returns a dict; safe to call even with no activities (zeros).
    """
    from datetime import timedelta

    start = race_date - timedelta(weeks=weeks)
    rows = user.activities.filter(
        is_valid=True,
        start_time__date__gte=start,
        start_time__date__lt=race_date,
    ).values_list('start_time', 'distance_km')

    curve = [0.0] * weeks
    long_runs = 0          # runs >= 25 km (marathon-specific endurance work)
    peak_long_run = 0.0
    for st, dist in rows:
        d = float(dist or 0)
        widx = (st.date() - start).days // 7
        if 0 <= widx < weeks:
            curve[widx] += d
        if d >= 25:
            long_runs += 1
            peak_long_run = max(peak_long_run, d)

    total = sum(curve)
    return {
        'weeks': weeks,
        'weekly_km_curve': [round(x, 1) for x in curve],
        'avg_weekly_km': round(total / weeks, 1) if weeks else 0.0,
        'peak_weekly_km': round(max(curve), 1) if curve else 0.0,
        'total_km': round(total, 1),
        'long_runs_25k_plus': long_runs,
        'peak_long_run_km': round(peak_long_run, 1),
    }
