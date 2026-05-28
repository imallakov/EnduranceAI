"""
Generate a realistic sample GPX file for testing EnduranceAI's Activity Detail.

Creates a ~12 km loop run through Berlin Tiergarten — same route shape as the
Claude Design mockups — with realistic GPS jitter, heart rate variation, and
rolling elevation. Designed to fully exercise the Activity Detail UI:
  - Map renders a real-looking polyline with corners (not a Bezier curve)
  - Per-km charts get 12 data points (pace + HR + elevation)
  - Splits table fills with realistic per-km variation
  - HR zones donut shows distribution across Z2-Z5

Usage:
  cd backend
  python scripts/generate_sample_gpx.py
  # → writes to backend/tests/fixtures/tiergarten_long_run.gpx

Then drag-and-drop the file into the Activities page.
"""
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Tiergarten loop waypoints — same shape as Claude Design mockup ──
# (lat, lng) — real Berlin Tiergarten coordinates, approximating the
# pixel-space ROUTE_WAYPOINTS from design-handoff-phase3-v2.
TIERGARTEN_WAYPOINTS = [
    # SW corner — near Potsdamer Platz, start point
    (52.5095, 13.3760),
    (52.5097, 13.3792),  # east along Schöneberger Ufer
    (52.5100, 13.3820),
    (52.5108, 13.3845),
    (52.5118, 13.3870),
    # Brandenburg Gate area
    (52.5128, 13.3878),
    (52.5142, 13.3777),  # turn west into the park along Strasse des 17. Juni
    (52.5145, 13.3700),
    (52.5147, 13.3620),
    # Northern park edge
    (52.5163, 13.3550),
    (52.5172, 13.3480),
    (52.5180, 13.3415),
    (52.5183, 13.3360),
    # Loop back south through park interior
    (52.5165, 13.3340),
    (52.5142, 13.3360),
    (52.5125, 13.3410),
    # Inner pond loop (Neuer See / Goldfish Pond)
    (52.5113, 13.3460),
    (52.5108, 13.3505),
    (52.5103, 13.3548),
    (52.5108, 13.3590),  # around the pond
    (52.5118, 13.3580),
    (52.5128, 13.3550),  # back from pond
    (52.5135, 13.3490),
    # Continue east through park
    (52.5142, 13.3540),
    (52.5148, 13.3600),
    (52.5152, 13.3660),
    (52.5155, 13.3720),
    # Exit south
    (52.5140, 13.3760),
    (52.5120, 13.3780),
    # West along southern street back to start
    (52.5100, 13.3770),
    (52.5096, 13.3762),  # finish — ~50m from start
]

# ── Parameters ─────────────────────────────────────────────────────
TARGET_DISTANCE_KM = 12.0        # ~12 km loop
TARGET_AVG_PACE_SEC = 318         # 5:18 /km
BASE_HR = 145                     # avg HR ~145 bpm
HR_NOISE = 8                      # ±8 bpm short-term variation
HR_DRIFT = 12                     # +12 bpm cardiac drift over the run
ELEV_BASE = 35.0                  # base elevation ~35m (Berlin)
ELEV_VARIATION = 18.0             # ±18m rolling hills
GPS_JITTER_M = 2.5                # ±2.5m GPS noise per point
SAMPLE_INTERVAL_M = 8             # one trkpt every ~8m

START_TIME = datetime(2026, 5, 18, 8, 14, 0, tzinfo=timezone.utc)


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in meters."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def interpolate_waypoints(waypoints, step_m):
    """Densify the waypoint list — emit one point every ~step_m meters."""
    points = [waypoints[0]]
    for i in range(1, len(waypoints)):
        lat1, lon1 = waypoints[i - 1]
        lat2, lon2 = waypoints[i]
        seg_dist = haversine(lat1, lon1, lat2, lon2)
        n_steps = max(1, int(seg_dist / step_m))
        for s in range(1, n_steps + 1):
            t = s / n_steps
            points.append((lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t))
    return points


def add_gps_jitter(points, jitter_m, rng):
    """Add small random offset to each point — simulates GPS noise."""
    # 1 degree of lat ≈ 111_000 m. Convert jitter from m to degrees.
    deg_per_m_lat = 1 / 111_000
    out = [points[0]]  # keep start exact
    for lat, lon in points[1:-1]:  # don't jitter endpoints
        deg_per_m_lon = 1 / (111_000 * math.cos(math.radians(lat)))
        d_lat = (rng.random() - 0.5) * 2 * jitter_m * deg_per_m_lat
        d_lon = (rng.random() - 0.5) * 2 * jitter_m * deg_per_m_lon
        out.append((lat + d_lat, lon + d_lon))
    out.append(points[-1])
    return out


def cumulative_distances(points):
    """Distance traveled at each point in meters."""
    dists = [0.0]
    for i in range(1, len(points)):
        d = haversine(points[i-1][0], points[i-1][1], points[i][0], points[i][1])
        dists.append(dists[-1] + d)
    return dists


def generate_elevation(n_points, rng):
    """Rolling hills — sum of a few sine waves with low frequencies."""
    elevs = []
    phase1 = rng.random() * 2 * math.pi
    phase2 = rng.random() * 2 * math.pi
    for i in range(n_points):
        t = i / n_points
        # Long wave (one full cycle over the run) + medium wave (3 cycles)
        e = ELEV_BASE + ELEV_VARIATION * (
            0.6 * math.sin(2 * math.pi * t + phase1) +
            0.4 * math.sin(6 * math.pi * t + phase2)
        )
        elevs.append(e)
    return elevs


def generate_hr_series(n_points, total_seconds, rng):
    """HR with warmup ramp + cardiac drift + short-term noise."""
    hrs = []
    for i in range(n_points):
        t = i / max(1, n_points - 1)
        # Warmup ramp during first 5% of run
        warmup = 0.0 if t > 0.05 else (1 - t / 0.05) * -25
        # Cardiac drift over the whole run
        drift = t * HR_DRIFT
        # Short-term noise
        noise = (rng.random() - 0.5) * 2 * HR_NOISE
        hr = int(BASE_HR + warmup + drift + noise)
        hrs.append(max(80, min(190, hr)))
    return hrs


def write_gpx(points, dists, elevs, hrs, times, out_path):
    """Write a Garmin-compatible GPX 1.1 with TrackPointExtension HR."""
    NS_GPX = 'http://www.topografix.com/GPX/1/1'
    NS_GPXTPX = 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1'

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<gpx version="1.1" creator="EnduranceAI sample generator"',
        f'     xmlns="{NS_GPX}"',
        f'     xmlns:gpxtpx="{NS_GPXTPX}">',
        '  <metadata>',
        f'    <name>Tiergarten long run</name>',
        f'    <time>{times[0].isoformat().replace("+00:00", "Z")}</time>',
        '  </metadata>',
        '  <trk>',
        '    <name>Tiergarten long run</name>',
        '    <type>running</type>',
        '    <trkseg>',
    ]

    for (lat, lon), elev, hr, t in zip(points, elevs, hrs, times):
        ts = t.isoformat().replace('+00:00', 'Z')
        lines.append(f'      <trkpt lat="{lat:.7f}" lon="{lon:.7f}">')
        lines.append(f'        <ele>{elev:.1f}</ele>')
        lines.append(f'        <time>{ts}</time>')
        lines.append(f'        <extensions>')
        lines.append(f'          <gpxtpx:TrackPointExtension>')
        lines.append(f'            <gpxtpx:hr>{hr}</gpxtpx:hr>')
        lines.append(f'          </gpxtpx:TrackPointExtension>')
        lines.append(f'        </extensions>')
        lines.append(f'      </trkpt>')

    lines.append('    </trkseg>')
    lines.append('  </trk>')
    lines.append('</gpx>')

    out_path.write_text('\n'.join(lines), encoding='utf-8')


def main():
    rng = random.Random(20260518)

    # 1. Densify the waypoint list to ~SAMPLE_INTERVAL_M per point
    points = interpolate_waypoints(TIERGARTEN_WAYPOINTS, SAMPLE_INTERVAL_M)
    # 2. Add GPS noise so the line doesn't look ruler-straight
    points = add_gps_jitter(points, GPS_JITTER_M, rng)
    # 3. Distance series
    dists = cumulative_distances(points)
    total_dist_m = dists[-1]

    # 4. Scale times so the total matches TARGET_AVG_PACE_SEC × distance
    total_sec = (total_dist_m / 1000) * TARGET_AVG_PACE_SEC
    # Time at each point is proportional to cumulative distance,
    # plus a tiny per-km pace variation (humans don't run perfectly even pace)
    pace_var = [1.0 + (rng.random() - 0.5) * 0.06 for _ in points]  # ±3% noise
    times = [START_TIME]
    for i in range(1, len(points)):
        seg_dist = dists[i] - dists[i - 1]
        seg_sec = (seg_dist / 1000) * TARGET_AVG_PACE_SEC * pace_var[i]
        times.append(times[-1] + timedelta(seconds=seg_sec))

    # 5. HR and elevation series
    elevs = generate_elevation(len(points), rng)
    hrs = generate_hr_series(len(points), total_sec, rng)

    # 6. Write GPX
    out_dir = Path(__file__).resolve().parent.parent / 'tests' / 'fixtures'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / 'tiergarten_long_run.gpx'
    write_gpx(points, dists, elevs, hrs, times, out_path)

    avg_pace = total_sec / (total_dist_m / 1000)
    avg_hr = sum(hrs) // len(hrs)
    print(f'✓ Generated {out_path}')
    print(f'  Points:     {len(points):,}')
    print(f'  Distance:   {total_dist_m / 1000:.2f} km')
    print(f'  Duration:   {int(total_sec // 60)}:{int(total_sec % 60):02d}')
    print(f'  Avg pace:   {int(avg_pace // 60)}:{int(avg_pace % 60):02d} /km')
    print(f'  Avg HR:     {avg_hr} bpm')
    print(f'  Elev range: {min(elevs):.1f} - {max(elevs):.1f} m')
    print(f'\nDrag-and-drop this file into the Activities page to test.')


if __name__ == '__main__':
    main()
