"""Parse Garmin .fit files using fitparse."""
from datetime import timezone
from .base import encode_polyline, detect_hr_zones

RUNNING_SPORT_TYPES = {'running', 'run', 'trail_running', 'treadmill'}


def parse_fit(file_bytes: bytes) -> dict | None:
    """Return activity dict or None if not a running activity."""
    import fitparse

    try:
        fit = fitparse.FitFile(file_bytes)
    except Exception as e:
        raise ValueError(f"Cannot parse FIT file: {e}")

    records = []
    session = None
    laps_raw = []

    for msg in fit.get_messages():
        name = msg.name
        if name == 'session':
            session = {f.name: f.value for f in msg.fields}
        elif name == 'record':
            rec = {f.name: f.value for f in msg.fields}
            records.append(rec)
        elif name == 'lap':
            laps_raw.append({f.name: f.value for f in msg.fields})

    if session is None and not records:
        raise ValueError("No session or records in FIT file")

    sport = (session or {}).get('sport', '')
    if sport and str(sport).lower() not in RUNNING_SPORT_TYPES:
        return None  # not a run

    # Extract fields from session or calculate from records
    def _get(d, *keys, default=None):
        for k in keys:
            if k in d and d[k] is not None:
                return d[k]
        return default

    if session:
        start_time = _get(session, 'start_time')
        distance_m = _get(session, 'total_distance', default=0)
        duration_sec = _get(session, 'total_elapsed_time', default=0)
        avg_hr = _get(session, 'avg_heart_rate')
        max_hr = _get(session, 'max_heart_rate')
        elevation_gain = _get(session, 'total_ascent')
        elevation_loss = _get(session, 'total_descent')
        avg_cadence = _get(session, 'avg_running_cadence', 'avg_cadence')
        calories = _get(session, 'total_calories')
    else:
        start_time = None
        distance_m = 0
        duration_sec = 0
        avg_hr = None
        max_hr = None
        elevation_gain = None
        elevation_loss = None
        avg_cadence = None
        calories = None

    # Build GPS points and HR series from records
    gps_points = []
    hr_series = []
    for r in records:
        lat = r.get('position_lat')
        lon = r.get('position_long')
        if lat is not None and lon is not None:
            # FIT stores coords as semicircles
            if abs(lat) > 180:
                lat = lat * (180 / 2 ** 31)
                lon = lon * (180 / 2 ** 31)
            gps_points.append((lat, lon))
        hr = r.get('heart_rate')
        if hr:
            hr_series.append(hr)

    # Auto-detect running by pace if sport unknown
    if not sport and distance_m and duration_sec:
        pace_sec_km = (duration_sec / 60) / (distance_m / 1000) * 60
        if not (120 <= pace_sec_km <= 900):
            return None

    distance_km = (distance_m or 0) / 1000
    avg_pace = (duration_sec / (distance_km or 1)) if distance_km else None

    if start_time and hasattr(start_time, 'replace'):
        start_time = start_time.replace(tzinfo=timezone.utc)

    # Build laps list — Garmin FIT laps already include elevation + HR per lap.
    laps = []
    for i, lap in enumerate(laps_raw):
        lap_dist = lap.get('total_distance', 0) or 0
        lap_time = lap.get('total_elapsed_time', 0) or 0
        lap_gain = lap.get('total_ascent')
        lap_loss = lap.get('total_descent')
        lap_avg_alt = lap.get('avg_altitude') or lap.get('enhanced_avg_altitude')
        laps.append({
            'lap': i + 1,
            'distance_km': round(lap_dist / 1000, 3),
            'duration_sec': int(lap_time),
            'avg_hr': lap.get('avg_heart_rate'),
            'avg_pace_sec_per_km': round(lap_time / (lap_dist / 1000), 1) if lap_dist else None,
            'elevation_gain_m': round(float(lap_gain), 1) if lap_gain is not None else None,
            'elevation_loss_m': round(float(lap_loss), 1) if lap_loss is not None else None,
            'avg_elevation_m': round(float(lap_avg_alt), 1) if lap_avg_alt is not None else None,
        })

    return {
        'start_time': start_time,
        'distance_km': round(distance_km, 3),
        'duration_sec': int(duration_sec or 0),
        'avg_pace_sec_per_km': round(avg_pace, 2) if avg_pace else None,
        'avg_hr': int(avg_hr) if avg_hr else None,
        'max_hr': int(max_hr) if max_hr else None,
        'elevation_gain_m': float(elevation_gain) if elevation_gain is not None else None,
        'elevation_loss_m': float(elevation_loss) if elevation_loss is not None else None,
        'avg_cadence': int(avg_cadence) if avg_cadence else None,
        'calories': int(calories) if calories else None,
        'laps': laps,
        'hr_zones_sec': detect_hr_zones(hr_series, max_hr or 190),
        'polyline': encode_polyline(gps_points),
        'source': 'fit',
    }
