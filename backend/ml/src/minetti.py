"""Course difficulty via Minetti energy cost model."""
import math
from haversine import haversine as _haversine, Unit


FLAT_ENERGY_COST = 2.5  # J/kg/m on flat

# Resample raw GPS points to fixed-distance segments before computing slopes.
# Raw point-to-point slopes are dominated by GPS/barometric noise (and by
# variable point density), which spuriously inflates difficulty. 50 m is short
# enough to keep real hills, long enough to average out jitter.
SEGMENT_M = 50.0
# Light moving-average over the resampled elevation profile (window in segments,
# so 3 -> ~150 m) to remove residual high-frequency noise without flattening
# genuine climbs.
SMOOTH_WINDOW = 3

# Steep descents cost little ENERGY (Minetti) but tax the quads eccentrically
# and wreck late-race pace — a pure energy integral rates a quad-trashing
# downhill course as trivially easy. We add a heuristic damage penalty (in
# energy-equivalent units) for grades steeper than ~3% downhill so net-downhill
# courses aren't under-rated.
DOWNHILL_DAMAGE_GRADE = 0.03
DOWNHILL_DAMAGE_K = 8.0


def _haversine_m(lat1, lon1, lat2, lon2) -> float:
    return _haversine((lat1, lon1), (lat2, lon2), unit=Unit.METERS)


def minetti_energy_cost(slope: float) -> float:
    """slope is dimensionless (0.1 = 10% grade)."""
    return (280.5 * slope ** 5
            - 58.7 * slope ** 4
            - 76.8 * slope ** 3
            + 51.9 * slope ** 2
            + 19.6 * slope
            + 2.5)


def _smooth(values: list, window: int) -> list:
    """Centered moving average; returns a list the same length as input."""
    if window <= 1 or len(values) <= window:
        return list(values)
    half = window // 2
    out = []
    for i in range(len(values)):
        lo = max(0, i - half)
        hi = min(len(values), i + half + 1)
        out.append(sum(values[lo:hi]) / (hi - lo))
    return out


def _resample_elevation(points: list, segment_m: float):
    """
    Build a fixed-distance elevation profile from raw (lat, lon, ele) points.
    Returns (sampled_elevations, total_distance_m). Linear interpolation by
    cumulative distance removes the bias from uneven GPS point spacing.
    """
    import bisect

    cum = [0.0]
    elev = [points[0][2] or 0.0]
    for i in range(1, len(points)):
        d = _haversine_m(points[i - 1][0], points[i - 1][1],
                         points[i][0], points[i][1])
        if d <= 0:
            continue
        cum.append(cum[-1] + d)
        elev.append(points[i][2] or 0.0)

    total = cum[-1]
    if total < segment_m or len(cum) < 2:
        return [], total

    n_seg = int(total // segment_m)
    sampled = []
    for k in range(n_seg + 1):
        d = k * segment_m
        j = bisect.bisect_right(cum, d) - 1
        j = max(0, min(j, len(cum) - 2))
        span = cum[j + 1] - cum[j]
        frac = (d - cum[j]) / span if span > 0 else 0.0
        sampled.append(elev[j] + frac * (elev[j + 1] - elev[j]))
    return sampled, total


def compute_course_difficulty_from_points(points: list, segment_m: float = SEGMENT_M) -> float:
    """
    points: list of (lat, lon, elevation_m)
    Returns coefficient: 1.0 = perfectly flat, >1 = harder, <1 = net easier.

    Pipeline: resample elevation to fixed segments → smooth (kill GPS noise) →
    Minetti energy cost per segment + eccentric downhill-damage penalty.
    """
    if len(points) < 2:
        return 1.0

    sampled, total = _resample_elevation(points, segment_m)
    if not sampled:
        return 1.0
    sampled = _smooth(sampled, SMOOTH_WINDOW)

    total_cost = 0.0
    for k in range(len(sampled) - 1):
        slope = (sampled[k + 1] - sampled[k]) / segment_m
        slope = max(-0.45, min(0.45, slope))
        cost = minetti_energy_cost(slope)
        if slope < -DOWNHILL_DAMAGE_GRADE:
            cost += DOWNHILL_DAMAGE_K * (-slope - DOWNHILL_DAMAGE_GRADE)
        total_cost += cost * segment_m

    seg_dist = (len(sampled) - 1) * segment_m
    if seg_dist == 0:
        return 1.0
    return round(total_cost / (FLAT_ENERGY_COST * seg_dist), 4)


def compute_course_difficulty(gpx_path: str) -> float:
    """Parse a GPX file and compute course difficulty coefficient."""
    import gpxpy
    try:
        with open(gpx_path, encoding='utf-8') as f:
            gpx = gpxpy.parse(f)
    except Exception:
        return 1.0

    points = []
    for track in gpx.tracks:
        for segment in track.segments:
            for p in segment.points:
                points.append((p.latitude, p.longitude, p.elevation or 0))

    if not points:
        for route in gpx.routes:
            for p in route.points:
                points.append((p.latitude, p.longitude, p.elevation or 0))

    return compute_course_difficulty_from_points(points)
