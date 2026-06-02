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
