"""
Fetch real climatological averages for each marathon's race month from
Open-Meteo's free historical archive API (ERA5 reanalysis, no API key needed).

Strategy: for the last 5 calendar years, take the daily mean temperature
across the full race month, then average across years. This gives a stable
climatological average attributable to a real public data source.

Usage:
    python manage.py fetch_marathon_climate                # all marathons
    python manage.py fetch_marathon_climate --dry-run      # show, don't save
    python manage.py fetch_marathon_climate --name "Berlin"  # one only
"""
from __future__ import annotations
import time
from datetime import date
from typing import Optional

import requests
from django.core.management.base import BaseCommand

from apps.races.models import Marathon


OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"
YEARS_OF_HISTORY = 5
# Days margin on each side of the calendar month — covers race scheduling
# variation (some marathons move ±2 weeks year to year).
MONTH_DAYS = {
    1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
    7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
}


# Race-relevant hours: most city marathons start 08:00-09:30 local and the
# pack finishes 12:00-14:30. Average temperature inside this window better
# represents what runners actually feel than a 24h daily mean.
RACE_HOUR_START = 8
RACE_HOUR_END = 13  # inclusive


def _fetch_mean_temp_for_month(lat: float, lon: float, month: int) -> Optional[float]:
    """
    Hit Open-Meteo's archive API for the given month across YEARS_OF_HISTORY
    most recent complete years. Averages only race-hours (08:00-13:00 local)
    so the number reflects what a runner experiences during the event.

    Returns rounded °C, or None on failure.
    """
    end_year = date.today().year - 1  # last fully completed year
    start_year = end_year - YEARS_OF_HISTORY + 1
    last_day = MONTH_DAYS[month]

    start = f"{start_year}-{month:02d}-01"
    end = f"{end_year}-{month:02d}-{last_day:02d}"

    try:
        resp = requests.get(OPEN_METEO_URL, params={
            'latitude': lat,
            'longitude': lon,
            'start_date': start,
            'end_date': end,
            'hourly': 'temperature_2m',
            'timezone': 'auto',
        }, timeout=20)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return None

    hourly = data.get('hourly', {}) or {}
    times = hourly.get('time', []) or []
    temps = hourly.get('temperature_2m', []) or []
    if not times or len(times) != len(temps):
        return None

    # times look like "2020-09-01T08:00" — parse hour cheaply from the string
    race_temps = []
    for ts, t in zip(times, temps):
        if t is None or len(ts) < 13:
            continue
        try:
            hour = int(ts[11:13])
        except ValueError:
            continue
        if RACE_HOUR_START <= hour <= RACE_HOUR_END:
            race_temps.append(t)

    if not race_temps:
        return None

    return round(sum(race_temps) / len(race_temps), 1)


class Command(BaseCommand):
    help = "Backfill avg_temp_by_month for each marathon using Open-Meteo historical data."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Print fetched values without saving to DB.')
        parser.add_argument('--name', type=str, default=None,
                            help='Only update the marathon whose name contains this string.')

    def handle(self, *args, **opts):
        dry = opts['dry_run']
        name_filter = opts['name']

        qs = Marathon.objects.exclude(start_lat=None).exclude(start_lon=None)
        if name_filter:
            qs = qs.filter(name__icontains=name_filter)

        if not qs.exists():
            self.stdout.write(self.style.WARNING("No marathons with coordinates found."))
            return

        updated = 0
        for m in qs:
            # Determine race month from existing avg_temp_by_month keys (set by
            # the import command) or skip if unknown.
            keys = list(m.avg_temp_by_month.keys()) if m.avg_temp_by_month else []
            if not keys:
                self.stdout.write(self.style.WARNING(
                    f"  {m.name}: no race month known, skipping"
                ))
                continue
            month = int(keys[0])
            if not (1 <= month <= 12):
                continue

            lat = float(m.start_lat)
            lon = float(m.start_lon)
            old = m.avg_temp_by_month.get(str(month))

            real = _fetch_mean_temp_for_month(lat, lon, month)
            if real is None:
                self.stdout.write(self.style.ERROR(
                    f"  {m.name}: fetch failed (network or API limit)"
                ))
                continue

            change = ''
            if old is not None:
                delta = round(real - old, 1)
                sign = '+' if delta >= 0 else ''
                change = f" (was {old}, Δ {sign}{delta})"

            try:
                self.stdout.write(
                    f"  {m.name} month={month}: {real}°C{change}"
                )
            except UnicodeEncodeError:
                safe = m.name.encode('ascii', errors='replace').decode()
                self.stdout.write(
                    f"  {safe} month={month}: {real}°C{change}"
                )

            if not dry:
                m.avg_temp_by_month = {str(month): real}
                m.save(update_fields=['avg_temp_by_month'])
                updated += 1

            # Open-Meteo is generous (10000 req/day on free tier) but be polite.
            time.sleep(0.4)

        if dry:
            self.stdout.write(self.style.SUCCESS(f"Dry run complete. Would update {qs.count()} marathons."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated {updated} marathons."))
