"""Shared utilities for activity parsers."""
import hashlib
import polyline as _polyline


def sha256_file(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def encode_polyline(points: list[tuple]) -> str:
    """Encode [(lat, lon), ...] to Google Encoded Polyline."""
    if not points:
        return ''
    try:
        return _polyline.encode(points)
    except Exception:
        return ''


def detect_hr_zones(hr_data: list[int], max_hr: int) -> dict:
    """Assign seconds in each Daniels HR zone based on % max_hr."""
    if not hr_data or not max_hr:
        return {}
    zones = {'E': 0, 'M': 0, 'T': 0, 'I': 0, 'R': 0}
    for hr in hr_data:
        pct = hr / max_hr
        if pct < 0.74:
            zones['E'] += 1
        elif pct < 0.84:
            zones['M'] += 1
        elif pct < 0.88:
            zones['T'] += 1
        elif pct < 0.95:
            zones['I'] += 1
        else:
            zones['R'] += 1
    return zones


def validate_activity_data(data: dict) -> tuple[bool, list[str]]:
    """Return (is_valid, list_of_errors)."""
    errors = []
    if data.get('distance_km', 0) <= 0.1:
        errors.append('distance_km must be > 0.1')
    if data.get('duration_sec', 0) <= 60:
        errors.append('duration_sec must be > 60')
    avg_hr = data.get('avg_hr')
    if avg_hr is not None and not (40 <= avg_hr <= 220):
        errors.append(f'avg_hr {avg_hr} out of range 40-220')
    elevation = data.get('elevation_gain_m', 0) or 0
    if elevation < 0:
        errors.append('elevation_gain_m must be >= 0')
    return len(errors) == 0, errors
