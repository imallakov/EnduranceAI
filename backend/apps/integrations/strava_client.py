"""Strava OAuth + API client helpers."""
import time
import logging
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize'
STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
STRAVA_API_URL = 'https://www.strava.com/api/v3'
STRAVA_DEAUTH_URL = 'https://www.strava.com/oauth/deauthorize'

RUNNING_TYPES = {'Run', 'TrailRun', 'VirtualRun'}


def get_authorize_url(state: str) -> str:
    params = {
        'client_id': settings.STRAVA_CLIENT_ID,
        'redirect_uri': settings.STRAVA_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'read,activity:read_all',
        'approval_prompt': 'force',
        'state': state,
    }
    return f'{STRAVA_AUTH_URL}?{urlencode(params)}'


def exchange_code(code: str) -> dict:
    resp = requests.post(STRAVA_TOKEN_URL, data={
        'client_id': settings.STRAVA_CLIENT_ID,
        'client_secret': settings.STRAVA_CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code',
    }, timeout=15)
    resp.raise_for_status()
    return resp.json()


def refresh_access_token(connection) -> None:
    resp = requests.post(STRAVA_TOKEN_URL, data={
        'client_id': settings.STRAVA_CLIENT_ID,
        'client_secret': settings.STRAVA_CLIENT_SECRET,
        'refresh_token': connection.refresh_token,
        'grant_type': 'refresh_token',
    }, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    connection.access_token = data['access_token']
    connection.refresh_token = data['refresh_token']
    connection.expires_at = datetime.fromtimestamp(data['expires_at'], tz=timezone.utc)
    connection.save(update_fields=['access_token', 'refresh_token', 'expires_at'])


def ensure_fresh_token(connection) -> None:
    from django.utils import timezone as dj_tz
    if connection.expires_at < dj_tz.now() + timedelta(minutes=5):
        refresh_access_token(connection)


def deauthorize(access_token: str) -> None:
    try:
        requests.post(STRAVA_DEAUTH_URL, data={'access_token': access_token}, timeout=10)
    except Exception:
        logger.warning("Failed to deauthorize Strava token — safe to ignore")


def list_activities(connection, after: int = None) -> list:
    """Fetch all running activities since `after` (unix timestamp). Auto-throttles between pages."""
    results = []
    page = 1
    while True:
        params = {'per_page': 200, 'page': page}
        if after:
            params['after'] = after

        resp = requests.get(
            f'{STRAVA_API_URL}/athlete/activities',
            headers={'Authorization': f'Bearer {connection.access_token}'},
            params=params,
            timeout=30,
        )

        if resp.status_code == 429:
            logger.warning("Strava rate limit hit — sleeping 60s")
            time.sleep(60)
            continue

        if resp.status_code == 401:
            connection.is_broken = True
            connection.save(update_fields=['is_broken'])
            raise PermissionError("Strava access revoked — re-connect required")

        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break

        running = [
            a for a in batch
            if a.get('type') in RUNNING_TYPES or a.get('sport_type') in RUNNING_TYPES
        ]
        results.extend(running)

        if len(batch) < 200:
            break
        page += 1
        time.sleep(1)

    return results


def convert_activity(strava_act: dict):
    """Convert Strava activity dict to Activity model kwargs. Returns None for junk entries."""
    from django.utils.dateparse import parse_datetime

    dist_m = strava_act.get('distance') or 0
    moving_time = strava_act.get('moving_time') or 0
    avg_speed = strava_act.get('average_speed') or 0

    if dist_m < 100 or moving_time < 60:
        return None

    distance_km = dist_m / 1000
    avg_pace = round(1000 / avg_speed, 2) if avg_speed > 0 else None

    cadence = strava_act.get('average_cadence')
    if cadence:
        cadence = round(cadence * 2)  # Strava: strides/min → steps/min (both feet)

    start_time_str = strava_act.get('start_date_local') or strava_act.get('start_date', '')
    start_time = parse_datetime(start_time_str)
    if start_time and start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)

    return {
        'external_strava_id': strava_act['id'],
        'start_time': start_time,
        'distance_km': distance_km,
        'duration_sec': moving_time,
        'avg_pace_sec_per_km': avg_pace,
        'avg_hr': strava_act.get('average_heartrate'),
        'max_hr': strava_act.get('max_heartrate'),
        'elevation_gain_m': strava_act.get('total_elevation_gain'),
        'avg_cadence': cadence,
        'calories': strava_act.get('calories'),
        'polyline': (strava_act.get('map') or {}).get('summary_polyline', ''),
        'source': 'strava',
        'is_valid': True,
        'laps': [],
    }
