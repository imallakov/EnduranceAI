"""Weather correction for marathon finish time (ACSM formula)."""
import requests
from django.conf import settings


def compute_weather_index(temp_c: float, humidity_pct: float, wind_ms: float = 0.0) -> float:
    """
    Multiplicative slowdown factor for marathon finish time vs ideal conditions.
    1.0 = no penalty; 1.08 = +8% slower.

    Grounded in the heat-and-performance literature (Ely 2007, El Helou 2012),
    fixing three flaws of the old linear formula:

      1. Heat × humidity INTERACT. Humidity impairs sweat evaporation only when
         it's already warm — so it amplifies the heat penalty above ~15 °C and
         is near-irrelevant when cool (the old code penalised humidity even at
         5 °C).
      2. The heat penalty ACCELERATES above the optimum (quadratic), rather than
         being linear — matching the sharp drop-off seen above ~20 °C.
      3. Wind is a NET PENALTY, not a bonus. Drag rises with the square of air
         speed, so on a loop / out-and-back the headwind leg costs more than the
         tailwind leg saves. (The old code subtracted a "tailwind bonus", which
         is backwards for any non-point-to-point course.)
    """
    OPT_TEMP = 10.0  # ~ideal racing temperature

    # Effective (felt) temperature: humidity adds heat only when warm.
    humidity_excess = max(0.0, humidity_pct - 50.0) / 100.0          # 0 .. ~0.5
    effective_temp = temp_c + humidity_excess * max(0.0, temp_c - 15.0) * 0.9

    dt = effective_temp - OPT_TEMP
    if dt > 0:
        temp_penalty = 0.0020 * dt + 0.00020 * dt * dt              # accelerating
    else:
        # Genuinely cold (below ~0 °C) costs a little; cool is otherwise ideal.
        temp_penalty = 0.0010 * max(0.0, -dt - 10.0)

    # Net wind penalty above a calm threshold (~2 m/s).
    wind_penalty = 0.0015 * max(0.0, wind_ms - 2.0)

    return round(1.0 + temp_penalty + wind_penalty, 4)


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
