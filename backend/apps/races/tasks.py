"""
Celery tasks for the races app.

Currently the only background job here is fetching real day-of weather for
a recorded marathon attempt. Kept out of services.py so the synchronous
service function (record_marathon_attempt) is import-free of Celery — it
only enqueues the task — making it safe to call from views, tests, and
management commands without a worker running.
"""
from __future__ import annotations
import logging
from celery import shared_task

logger = logging.getLogger(__name__)

# Open-Meteo's historical archive ("ERA5 reanalysis") is free, requires no
# API key, and covers any (lat, lon, past date) with hourly resolution.
# Same source we use for climate norms in fetch_marathon_climate command.
OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"

# Hours during which the race is actually being run. Most city marathons
# start 08:00-09:30 local and the recreational pack finishes 12:00-14:30,
# so averaging only this window gives weather a runner actually felt.
RACE_HOUR_START = 8
RACE_HOUR_END = 13  # inclusive


@shared_task(bind=True, max_retries=2, default_retry_delay=600)
def fetch_race_weather(self, attempt_id: str):
    """
    Fetch real weather conditions during the race window for a
    MarathonAttempt and store them in attempt.weather_snapshot.

    Idempotent — if weather_snapshot is already populated we skip. Retries
    twice on transient failures (network / Open-Meteo 5xx) before giving up;
    the attempt stays usable without weather, just with empty snapshot.
    """
    import requests
    from .models import MarathonAttempt

    try:
        attempt = MarathonAttempt.objects.select_related('marathon').get(pk=attempt_id)
    except MarathonAttempt.DoesNotExist:
        logger.warning("fetch_race_weather: attempt %s not found", attempt_id)
        return

    # Skip if already populated — protects against duplicate enqueue races.
    if attempt.weather_snapshot:
        return

    marathon = attempt.marathon
    if not (marathon.start_lat and marathon.start_lon):
        logger.info(
            "fetch_race_weather: marathon %s has no coordinates, skipping",
            marathon.name,
        )
        return

    race_date_str = attempt.race_date.isoformat()
    try:
        resp = requests.get(OPEN_METEO_URL, params={
            'latitude': float(marathon.start_lat),
            'longitude': float(marathon.start_lon),
            # Same start/end → one day of hourly data
            'start_date': race_date_str,
            'end_date': race_date_str,
            'hourly': (
                'temperature_2m,relative_humidity_2m,dew_point_2m,'
                'wind_speed_10m,precipitation'
            ),
            'timezone': 'auto',
        }, timeout=20)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("fetch_race_weather: Open-Meteo request failed: %s", exc)
        # Retry transient failures up to max_retries
        raise self.retry(exc=exc)

    hourly = data.get('hourly', {}) or {}
    times = hourly.get('time', []) or []
    if not times:
        logger.info("fetch_race_weather: empty hourly response for attempt %s", attempt_id)
        return

    # Aggregate over race window. Each metric is averaged independently so
    # missing samples in one variable don't sink the others. Precipitation
    # is summed (total mm fallen during the race) rather than averaged.
    def _race_window(values):
        out = []
        for ts, v in zip(times, values or []):
            if v is None or len(ts) < 13:
                continue
            try:
                hour = int(ts[11:13])
            except ValueError:
                continue
            if RACE_HOUR_START <= hour <= RACE_HOUR_END:
                out.append(v)
        return out

    temps = _race_window(hourly.get('temperature_2m'))
    humid = _race_window(hourly.get('relative_humidity_2m'))
    dew = _race_window(hourly.get('dew_point_2m'))
    wind = _race_window(hourly.get('wind_speed_10m'))
    precip = _race_window(hourly.get('precipitation'))

    def _avg(xs):
        return round(sum(xs) / len(xs), 2) if xs else None

    snapshot = {
        'source': 'open-meteo-archive',
        'fetched_at': self.request.id,  # task id, for debug
        'temp_c_avg': _avg(temps),
        'temp_c_max': round(max(temps), 2) if temps else None,
        'humidity_pct_avg': _avg(humid),
        'dew_point_c_avg': _avg(dew),
        'wind_ms_avg': _avg(wind),
        'precipitation_mm_total': round(sum(precip), 2) if precip else 0.0,
        'race_window_hours': [RACE_HOUR_START, RACE_HOUR_END],
        'sample_count': len(temps),
    }

    MarathonAttempt.objects.filter(pk=attempt_id).update(weather_snapshot=snapshot)
    logger.info("fetch_race_weather: stored snapshot for attempt %s: %s",
                attempt_id, snapshot)
