"""Course difficulty via Minetti energy cost model."""
import math
from haversine import haversine as _haversine, Unit


FLAT_ENERGY_COST = 2.5  # J/kg/m on flat


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


def compute_course_difficulty_from_points(points: list[tuple]) -> float:
    """
    points: list of (lat, lon, elevation_m)
    Returns coefficient: 1.0 = perfectly flat, >1 = harder.
    """
    total_cost = 0.0
    total_distance = 0.0

    for i in range(1, len(points)):
        lat1, lon1, ele1 = points[i - 1]
        lat2, lon2, ele2 = points[i]

        dist = _haversine_m(lat1, lon1, lat2, lon2)
        if dist < 1:
            continue

        slope = (ele2 - ele1) / dist
        slope = max(-0.45, min(0.45, slope))

        total_cost += minetti_energy_cost(slope) * dist
        total_distance += dist

    if total_distance == 0:
        return 1.0

    flat_cost = FLAT_ENERGY_COST * total_distance
    return round(total_cost / flat_cost, 4)


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
