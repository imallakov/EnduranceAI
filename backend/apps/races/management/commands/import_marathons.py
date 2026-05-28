"""
python manage.py import_marathons

Imports all marathon data and computes course difficulty from GPX files.
"""
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.races.models import Marathon
from ml.src.minetti import compute_course_difficulty

GPX_DIR = settings.GPX_DATA_DIR

WMM_NAMES = {
    "Berlin Marathon", "London Marathon", "Chicago Marathon",
    "Boston Marathon", "New York City Marathon", "Tokyo Marathon",
}

MARATHONS_DATA = [
    # ── World Marathon Majors ──────────────────────────────────
    {
        "name": "Berlin Marathon", "city": "Berlin", "country": "DE",
        "distance_km": 42.195, "gpx_file": "berlin.gpx",
        "start_lat": 52.5200, "start_lon": 13.3693,
        "official_url": "https://www.bmw-berlin-marathon.com",
        "avg_temp_by_month": {"9": 17.0},
        "elevation_gain_m": 130,
    },
    {
        "name": "London Marathon", "city": "London", "country": "GB",
        "distance_km": 42.195, "gpx_file": "london.gpx",
        "start_lat": 51.4779, "start_lon": -0.0015,
        "official_url": "https://www.londonmarathonevents.co.uk",
        "avg_temp_by_month": {"4": 12.0},
        "elevation_gain_m": 115,
    },
    {
        "name": "Chicago Marathon", "city": "Chicago", "country": "US",
        "distance_km": 42.195, "gpx_file": "chicago.gpx",
        "start_lat": 41.8826, "start_lon": -87.6233,
        "official_url": "https://www.chicagomarathon.com",
        "avg_temp_by_month": {"10": 13.0},
        "elevation_gain_m": 95,
    },
    {
        "name": "Boston Marathon", "city": "Boston", "country": "US",
        "distance_km": 42.195, "gpx_file": "boston.gpx",
        "start_lat": 42.2299, "start_lon": -71.5227,
        "official_url": "https://www.baa.org",
        "avg_temp_by_month": {"4": 11.0},
        "elevation_gain_m": 400,
    },
    {
        "name": "New York City Marathon", "city": "New York", "country": "US",
        "distance_km": 42.195, "gpx_file": "nyc.gpx",
        "start_lat": 40.6019, "start_lon": -74.0553,
        "official_url": "https://www.nyrr.org",
        "avg_temp_by_month": {"11": 10.0},
        "elevation_gain_m": 500,
    },
    {
        "name": "Tokyo Marathon", "city": "Tokyo", "country": "JP",
        "distance_km": 42.195, "gpx_file": "tokyo.gpx",
        "start_lat": 35.6762, "start_lon": 139.6503,
        "official_url": "https://www.marathon.tokyo",
        "avg_temp_by_month": {"3": 10.0},
        "elevation_gain_m": 185,
    },
    # ── Turkey ────────────────────────────────────────────────
    {
        "name": "İstanbul Avrasya Maratonu", "city": "Istanbul", "country": "TR",
        "distance_km": 42.195, "gpx_file": "istanbul.gpx",
        "start_lat": 41.0082, "start_lon": 28.9784,
        "official_url": "https://www.istanbulmarathon.org",
        "avg_temp_by_month": {"11": 13.0},
        "elevation_gain_m": 380,
    },
    {
        "name": "Antalya Marathon", "city": "Antalya", "country": "TR",
        "distance_km": 42.195, "gpx_file": "antalya.gpx",
        "start_lat": 36.8969, "start_lon": 30.7133,
        "official_url": "https://www.runtalya.com",
        "avg_temp_by_month": {"3": 14.0},
        "elevation_gain_m": 145,
    },
    # ── Europe ────────────────────────────────────────────────
    {
        "name": "Valencia Marathon", "city": "Valencia", "country": "ES",
        "distance_km": 42.195, "gpx_file": "valencia.gpx",
        "start_lat": 39.4699, "start_lon": -0.3763,
        "avg_temp_by_month": {"12": 14.0},
        "elevation_gain_m": 65,
    },
    {
        "name": "Paris Marathon", "city": "Paris", "country": "FR",
        "distance_km": 42.195, "gpx_file": "paris.gpx",
        "start_lat": 48.8566, "start_lon": 2.3522,
        "avg_temp_by_month": {"4": 12.0},
        "elevation_gain_m": 260,
    },
    {
        "name": "Amsterdam Marathon", "city": "Amsterdam", "country": "NL",
        "distance_km": 42.195, "gpx_file": "amsterdam.gpx",
        "start_lat": 52.3676, "start_lon": 4.9041,
        "avg_temp_by_month": {"10": 12.0},
        "elevation_gain_m": 45,
    },
    {
        "name": "Frankfurt Marathon", "city": "Frankfurt", "country": "DE",
        "distance_km": 42.195, "gpx_file": "frankfurt.gpx",
        "start_lat": 50.1109, "start_lon": 8.6821,
        "avg_temp_by_month": {"10": 12.0},
        "elevation_gain_m": 140,
    },
    {
        "name": "Prague Marathon", "city": "Prague", "country": "CZ",
        "distance_km": 42.195, "gpx_file": "prague.gpx",
        "start_lat": 50.0755, "start_lon": 14.4378,
        "avg_temp_by_month": {"5": 15.0},
        "elevation_gain_m": 180,
    },
    {
        "name": "Barcelona Marathon", "city": "Barcelona", "country": "ES",
        "distance_km": 42.195, "gpx_file": "barcelona.gpx",
        "start_lat": 41.3851, "start_lon": 2.1734,
        "avg_temp_by_month": {"3": 13.0},
        "elevation_gain_m": 240,
    },
    # ── Central Asia ──────────────────────────────────────────
    {
        "name": "Almaty Marathon", "city": "Almaty", "country": "KZ",
        "distance_km": 42.195, "gpx_file": "almaty.gpx",
        "start_lat": 43.2389, "start_lon": 76.9460,
        "official_url": "https://almaty-marathon.kz",
        "avg_temp_by_month": {"9": 16.0, "10": 10.0},
        "elevation_gain_m": 280,
    },
    # ── Oceania ───────────────────────────────────────────────
    {
        "name": "Sydney Marathon", "city": "Sydney", "country": "AU",
        "distance_km": 42.195, "gpx_file": "sydney.gpx",
        "start_lat": -33.8688, "start_lon": 151.2093,
        "avg_temp_by_month": {"9": 16.0},
        "elevation_gain_m": 310,
    },
]


class Command(BaseCommand):
    help = 'Import marathon data and compute course difficulty from GPX files'

    def handle(self, *args, **kwargs):
        from apps.activities.parsers.base import encode_polyline
        from apps.activities.parsers.gpx_parser import _parse_gpx_obj
        import gpxpy

        def _parse_gpx_full(gpx_path: str):
            """
            Return (polyline_str, gain_m, loss_m, elevation_profile) by running
            the production GPX parser. Returns ('', None, None, []) on any error.
            elevation_profile is a list of {km, elevation_m} per-km points
            derived from the parser's per-lap avg_elevation_m.
            """
            try:
                with open(gpx_path, encoding='utf-8') as f:
                    gpx = gpxpy.parse(f)
            except Exception:
                return '', None, None, []

            # Polyline (lat/lon only, ignore elevation)
            pts = []
            for track in gpx.tracks:
                for seg in track.segments:
                    for p in seg.points:
                        pts.append((p.latitude, p.longitude))
            poly = encode_polyline(pts) if pts else ''

            # Full parser for elevation_gain/loss + per-km profile
            data = _parse_gpx_obj(gpx)
            if not data:
                return poly, None, None, []

            gain = data.get('elevation_gain_m')
            loss = data.get('elevation_loss_m')

            # Build per-km profile. Parser's `laps` already aggregates 1km buckets
            # with avg_elevation_m. Use lap index as km marker.
            profile = []
            for lap in data.get('laps', []):
                ele = lap.get('avg_elevation_m')
                if ele is not None:
                    profile.append({
                        'km': lap['lap'],
                        'elevation_m': round(ele, 1),
                    })
            return poly, gain, loss, profile

        imported = 0
        for data in MARATHONS_DATA:
            gpx_file = data.pop('gpx_file', None)
            preset_coeff = data.pop('difficulty_coefficient', None)
            # Hardcoded gain in MARATHONS_DATA is a fallback; if GPX yields a real
            # value we prefer that (and also get real loss + per-km profile).
            preset_gain = data.pop('elevation_gain_m', None)

            is_major = data['name'] in WMM_NAMES
            coeff = preset_coeff
            gpx_path = None
            poly = ''
            gpx_gain = None
            gpx_loss = None
            profile: list = []

            if gpx_file:
                gpx_path = os.path.join(GPX_DIR, gpx_file)
                if os.path.exists(gpx_path):
                    try:
                        coeff = compute_course_difficulty(gpx_path)
                        poly, gpx_gain, gpx_loss, profile = _parse_gpx_full(gpx_path)
                        self.stdout.write(
                            f"  GPX coeff={coeff:.4f} gain={gpx_gain} loss={gpx_loss} "
                            f"profile_points={len(profile)} for {gpx_file}"
                        )
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f"  GPX error for {gpx_file}: {e}")
                        )
                else:
                    self.stdout.write(self.style.WARNING(f"  GPX not found: {gpx_path}"))

            if coeff is None:
                coeff = 1.010  # default for unknown courses

            # Prefer GPX-derived values; fall back to hardcoded preset for legacy
            # entries without GPX.
            final_gain = gpx_gain if gpx_gain is not None else preset_gain
            final_loss = gpx_loss

            defaults = {
                **data,
                'difficulty_coefficient': coeff,
                'major': is_major,
                'polyline': poly,
                'elevation_gain_m': final_gain,
                'elevation_loss_m': final_loss,
                'elevation_profile': profile,
            }
            # Always set gpx_file_path explicitly — empty when no file, so stale
            # paths from previous imports (e.g. deleted fake files) get cleared
            # instead of silently lingering in the database.
            defaults['gpx_file_path'] = gpx_path if (gpx_path and os.path.exists(gpx_path)) else ''

            marathon, created = Marathon.objects.update_or_create(
                name=data['name'],
                defaults=defaults,
            )
            action = 'Created' if created else 'Updated'
            try:
                self.stdout.write(
                    self.style.SUCCESS(f"{action}: {marathon.name} - coeff: {coeff:.4f} major={is_major}")
                )
            except UnicodeEncodeError:
                safe = marathon.name.encode('ascii', errors='replace').decode()
                self.stdout.write(
                    self.style.SUCCESS(f"{action}: {safe} - coeff: {coeff:.4f} major={is_major}")
                )
            imported += 1

        self.stdout.write(self.style.SUCCESS(f"Done. {imported} marathons imported."))
