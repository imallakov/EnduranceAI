"""Weather correction for marathon finish time (ACSM formula)."""
import requests
from django.conf import settings


def compute_weather_index(temp_c: float, humidity_pct: float, wind_ms: float = 0.0) -> float:
    base_temp = 10.0
    temp_penalty = max(0.0, (temp_c - base_temp) * 0.004)
    humidity_penalty = max(0.0, (humidity_pct - 60) * 0.001)
    wind_bonus = min(0.01, wind_ms * 0.0005) if wind_ms > 3 else 0.0
    return round(1.0 + temp_penalty + humidity_penalty - wind_bonus, 4)


def fetch_weather(lat: float, lon: float) -> dict | None:
    """Fetch current/forecast weather from OpenWeatherMap. Returns None on failure."""
    api_key = getattr(settings, 'OPENWEATHERMAP_API_KEY', '')
    if not api_key:
        return None
    try:
        url = "https://api.openweathermap.org/data/2.5/weather"
        resp = requests.get(url, params={
            'lat': lat, 'lon': lon, 'appid': api_key, 'units': 'metric'
        }, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        return {
            'temp_c': data['main']['temp'],
            'humidity_pct': data['main']['humidity'],
            'wind_ms': data.get('wind', {}).get('speed', 0.0),
        }
    except Exception:
        return None
