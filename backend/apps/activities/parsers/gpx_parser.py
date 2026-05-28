"""Parse .gpx and .tcx files via gpxpy."""
from datetime import timezone
from haversine import haversine, Unit
from .base import encode_polyline, detect_hr_zones


def _parse_gpx_obj(gpx) -> dict:
    points = []
    # Per-point HR (None when missing) — must stay aligned with points list
    # so we can slice by lap index later.
    hr_per_point: list[int | None] = []

    for track in gpx.tracks:
        for segment in track.segments:
            for p in segment.points:
                points.append(p)
                # gpxpy stores extensions; try to extract HR
                hr_val: int | None = None
                for ext in (p.extensions or []):
                    # Garmin TrackPointExtension
                    for child in ext:
                        if 'hr' in child.tag.lower():
                            try:
                                hr_val = int(child.text)
                            except (ValueError, TypeError):
                                pass
                hr_per_point.append(hr_val)

    # Flat list of HR values for whole-activity avg/max (existing logic)
    hr_series = [h for h in hr_per_point if h is not None]

    if not points:
        return {}

    start_time = points[0].time
    if start_time and start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)

    end_time = points[-1].time
    duration_sec = 0
    if start_time and end_time:
        duration_sec = int((end_time - start_time).total_seconds())

    # Distance via haversine
    total_dist_m = 0.0
    gps_points = []
    elevations = []
    for i in range(1, len(points)):
        p1, p2 = points[i - 1], points[i]
        d = haversine((p1.latitude, p1.longitude),
                      (p2.latitude, p2.longitude), unit=Unit.METERS)
        total_dist_m += d
        gps_points.append((p1.latitude, p1.longitude))
        if p1.elevation is not None:
            elevations.append(p1.elevation)
    if points:
        gps_points.append((points[-1].latitude, points[-1].longitude))
        if points[-1].elevation is not None:
            elevations.append(points[-1].elevation)

    # Elevation gain/loss
    elevation_gain = 0.0
    elevation_loss = 0.0
    for i in range(1, len(elevations)):
        diff = elevations[i] - elevations[i - 1]
        if diff > 0:
            elevation_gain += diff
        else:
            elevation_loss += abs(diff)

    distance_km = total_dist_m / 1000
    avg_pace = (duration_sec / distance_km) if distance_km > 0 else None
    avg_hr = int(sum(hr_series) / len(hr_series)) if hr_series else None
    max_hr = max(hr_series) if hr_series else None

    # Build km laps with per-lap elevation gain/loss/avg + avg HR.
    # Slicing points[lap_start_idx:i+1] gives us the segment for this lap.
    laps = []
    lap_start_idx = 0
    lap_dist = 0.0
    lap_km = 1
    for i in range(1, len(points)):
        p1, p2 = points[i - 1], points[i]
        d = haversine((p1.latitude, p1.longitude),
                      (p2.latitude, p2.longitude), unit=Unit.METERS)
        lap_dist += d
        if lap_dist >= 1000:
            t1 = points[lap_start_idx].time
            t2 = points[i].time
            lap_sec = int((t2 - t1).total_seconds()) if t1 and t2 else 0

            # Per-lap elevation analysis
            lap_elevs = [
                pt.elevation for pt in points[lap_start_idx:i + 1]
                if pt.elevation is not None
            ]
            lap_gain = lap_loss = 0.0
            for j in range(1, len(lap_elevs)):
                diff = lap_elevs[j] - lap_elevs[j - 1]
                if diff > 0:
                    lap_gain += diff
                else:
                    lap_loss += abs(diff)
            lap_avg_elev = (sum(lap_elevs) / len(lap_elevs)) if lap_elevs else None

            # Per-lap HR average
            lap_hr_vals = [
                h for h in hr_per_point[lap_start_idx:i + 1] if h is not None
            ]
            lap_avg_hr = (sum(lap_hr_vals) / len(lap_hr_vals)) if lap_hr_vals else None

            laps.append({
                'lap': lap_km,
                'distance_km': round(lap_dist / 1000, 3),
                'duration_sec': lap_sec,
                'avg_pace_sec_per_km': round(lap_sec / (lap_dist / 1000), 1) if lap_dist else None,
                'avg_hr': int(lap_avg_hr) if lap_avg_hr is not None else None,
                'elevation_gain_m': round(lap_gain, 1) if lap_elevs else None,
                'elevation_loss_m': round(lap_loss, 1) if lap_elevs else None,
                'avg_elevation_m': round(lap_avg_elev, 1) if lap_avg_elev is not None else None,
            })
            lap_km += 1
            lap_dist = 0.0
            lap_start_idx = i

    return {
        'start_time': start_time,
        'distance_km': round(distance_km, 3),
        'duration_sec': duration_sec,
        'avg_pace_sec_per_km': round(avg_pace, 2) if avg_pace else None,
        'avg_hr': avg_hr,
        'max_hr': max_hr,
        'elevation_gain_m': round(elevation_gain, 1),
        'elevation_loss_m': round(elevation_loss, 1),
        'avg_cadence': None,
        'calories': None,
        'laps': laps,
        'hr_zones_sec': detect_hr_zones(hr_series, max_hr or 190),
        'polyline': encode_polyline(gps_points),
    }


def parse_gpx(file_bytes: bytes) -> dict | None:
    import gpxpy
    try:
        gpx = gpxpy.parse(file_bytes.decode('utf-8', errors='replace'))
    except Exception as e:
        raise ValueError(f"Cannot parse GPX file: {e}")

    result = _parse_gpx_obj(gpx)
    if not result:
        raise ValueError("No tracks found in GPX file")

    # Auto-detect: filter non-runs by pace
    avg_pace = result.get('avg_pace_sec_per_km')
    if avg_pace and not (120 <= avg_pace <= 900):
        return None

    result['source'] = 'gpx'
    return result


def parse_tcx(file_bytes: bytes) -> dict | None:
    import xml.etree.ElementTree as ET
    from datetime import datetime

    NS = 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2'

    try:
        root = ET.fromstring(file_bytes.decode('utf-8', errors='replace'))
    except ET.ParseError as e:
        raise ValueError(f"Cannot parse TCX file: {e}")

    def _find(el, tag):
        return el.find(f'{{{NS}}}{tag}')

    def _findall(el, tag):
        return el.findall(f'.//{{{NS}}}{tag}')

    # Find a running Activity (or first if sport not specified)
    activity = None
    for act in _findall(root, 'Activity'):
        if act.get('Sport', '').lower() in ('running', ''):
            activity = act
            break
    if activity is None:
        activity = _findall(root, 'Activity')[0] if _findall(root, 'Activity') else None
    if activity is None:
        return None

    sport = activity.get('Sport', '').lower()
    if sport and sport != 'running':
        return None

    # Parse trackpoints
    points = []
    hr_series = []
    for tp in _findall(activity, 'Trackpoint'):
        time_el = _find(tp, 'Time')
        pos = _find(tp, 'Position')
        alt_el = _find(tp, 'AltitudeMeters')
        hr_val = tp.find(f'.//{{{NS}}}HeartRateBpm/{{{NS}}}Value')

        point = {}
        if time_el is not None and time_el.text:
            try:
                point['time'] = datetime.fromisoformat(time_el.text.replace('Z', '+00:00'))
            except ValueError:
                pass

        if pos is not None:
            lat_el = _find(pos, 'LatitudeDegrees')
            lon_el = _find(pos, 'LongitudeDegrees')
            if lat_el is not None and lon_el is not None:
                try:
                    point['lat'] = float(lat_el.text)
                    point['lon'] = float(lon_el.text)
                except (ValueError, TypeError):
                    pass

        if alt_el is not None and alt_el.text:
            try:
                point['alt'] = float(alt_el.text)
            except (ValueError, TypeError):
                pass

        if hr_val is not None and hr_val.text:
            try:
                hr = int(hr_val.text)
                hr_series.append(hr)
                point['hr'] = hr
            except (ValueError, TypeError):
                pass

        if 'lat' in point and 'lon' in point:
            points.append(point)

    if not points:
        raise ValueError("No trackpoints found in TCX file")

    # Totals
    times = [p['time'] for p in points if 'time' in p]
    start_time = min(times) if times else None
    end_time = max(times) if times else None
    duration_sec = int((end_time - start_time).total_seconds()) if start_time and end_time else 0

    # Distance + elevation
    total_dist_m = 0.0
    gps_points = []
    elevations = [p['alt'] for p in points if 'alt' in p]

    for i in range(1, len(points)):
        p1, p2 = points[i - 1], points[i]
        d = haversine((p1['lat'], p1['lon']), (p2['lat'], p2['lon']), unit=Unit.METERS)
        total_dist_m += d
        gps_points.append((p1['lat'], p1['lon']))
    if points:
        gps_points.append((points[-1]['lat'], points[-1]['lon']))

    elevation_gain = 0.0
    elevation_loss = 0.0
    for i in range(1, len(elevations)):
        diff = elevations[i] - elevations[i - 1]
        if diff > 0:
            elevation_gain += diff
        else:
            elevation_loss += abs(diff)

    distance_km = total_dist_m / 1000
    avg_pace = (duration_sec / distance_km) if distance_km > 0 else None
    avg_hr = int(sum(hr_series) / len(hr_series)) if hr_series else None
    max_hr = max(hr_series) if hr_series else None

    # Laps from TCX Lap elements — also pull per-lap elevation gain/loss/avg
    # and avg HR from the Trackpoints nested inside each Lap.
    laps = []
    for i, lap_el in enumerate(_findall(activity, 'Lap'), 1):
        dist_el = _find(lap_el, 'DistanceMeters')
        time_el = _find(lap_el, 'TotalTimeSeconds')
        if dist_el is None or time_el is None:
            continue
        try:
            lap_dist = float(dist_el.text)
            lap_time = float(time_el.text)
            if lap_dist <= 0 or lap_time <= 0:
                continue
        except (ValueError, TypeError):
            continue

        # Walk this lap's trackpoints to collect altitude + HR series
        lap_alts: list[float] = []
        lap_hrs: list[int] = []
        for tp in lap_el.findall(f'.//{{{NS}}}Trackpoint'):
            alt_el = _find(tp, 'AltitudeMeters')
            if alt_el is not None and alt_el.text:
                try:
                    lap_alts.append(float(alt_el.text))
                except (ValueError, TypeError):
                    pass
            hr_val = tp.find(f'.//{{{NS}}}HeartRateBpm/{{{NS}}}Value')
            if hr_val is not None and hr_val.text:
                try:
                    lap_hrs.append(int(hr_val.text))
                except (ValueError, TypeError):
                    pass

        lap_gain = lap_loss = 0.0
        for j in range(1, len(lap_alts)):
            diff = lap_alts[j] - lap_alts[j - 1]
            if diff > 0:
                lap_gain += diff
            else:
                lap_loss += abs(diff)
        lap_avg_alt = (sum(lap_alts) / len(lap_alts)) if lap_alts else None
        lap_avg_hr = (sum(lap_hrs) / len(lap_hrs)) if lap_hrs else None

        laps.append({
            'lap': i,
            'distance_km': round(lap_dist / 1000, 3),
            'duration_sec': int(lap_time),
            'avg_pace_sec_per_km': round(lap_time / (lap_dist / 1000), 1),
            'avg_hr': int(lap_avg_hr) if lap_avg_hr is not None else None,
            'elevation_gain_m': round(lap_gain, 1) if lap_alts else None,
            'elevation_loss_m': round(lap_loss, 1) if lap_alts else None,
            'avg_elevation_m': round(lap_avg_alt, 1) if lap_avg_alt is not None else None,
        })

    if avg_pace and not (120 <= avg_pace <= 900):
        return None

    return {
        'start_time': start_time,
        'distance_km': round(distance_km, 3),
        'duration_sec': duration_sec,
        'avg_pace_sec_per_km': round(avg_pace, 2) if avg_pace else None,
        'avg_hr': avg_hr,
        'max_hr': max_hr,
        'elevation_gain_m': round(elevation_gain, 1),
        'elevation_loss_m': round(elevation_loss, 1),
        'avg_cadence': None,
        'calories': None,
        'laps': laps,
        'hr_zones_sec': detect_hr_zones(hr_series, max_hr or 190),
        'polyline': encode_polyline(gps_points),
        'source': 'tcx',
    }
