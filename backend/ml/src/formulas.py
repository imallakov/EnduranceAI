"""
Sports science formulas: VDOT (Daniels), TSS, CTL/ATL/TSB, Daniels paces.
"""
import math

DANIELS_TABLE = {
    30: {"E": 435, "M": 394, "T": 366, "I": 330, "R": 300},
    35: {"E": 396, "M": 357, "T": 328, "I": 297, "R": 270},
    40: {"E": 363, "M": 326, "T": 299, "I": 270, "R": 245},
    45: {"E": 336, "M": 301, "T": 274, "I": 247, "R": 224},
    50: {"E": 313, "M": 279, "T": 253, "I": 228, "R": 206},
    55: {"E": 293, "M": 261, "T": 235, "I": 211, "R": 191},
    60: {"E": 275, "M": 245, "T": 220, "I": 197, "R": 178},
    65: {"E": 259, "M": 230, "T": 207, "I": 185, "R": 167},
    70: {"E": 245, "M": 217, "T": 195, "I": 174, "R": 157},
}


def calc_vdot(distance_m: float, duration_sec: float) -> float:
    """Jack Daniels VDOT formula."""
    if duration_sec <= 0 or distance_m <= 0:
        return 0.0
    t = duration_sec / 60
    v = distance_m / t
    pct_vo2max = (0.8 + 0.1894393 * math.exp(-0.012778 * t)
                      + 0.2989558 * math.exp(-0.1932605 * t))
    vo2 = -4.60 + 0.182258 * v + 0.000104 * v ** 2
    if pct_vo2max <= 0:
        return 0.0
    return round(vo2 / pct_vo2max, 2)


def daniels_equivalent_time(vdot: float, distance_m: float) -> int:
    """Inverse VDOT: given VDOT and distance, return predicted time in seconds."""
    if vdot <= 0 or distance_m <= 0:
        return 0
    lo, hi = 60.0, 86400.0
    for _ in range(100):
        mid = (lo + hi) / 2
        if calc_vdot(distance_m, mid) > vdot:
            lo = mid
        else:
            hi = mid
    return int((lo + hi) / 2)


def vdot_to_paces(vdot: float) -> dict:
    """Return Daniels training paces (sec/km) for all zones via table interpolation."""
    keys = sorted(DANIELS_TABLE.keys())
    vdot = max(keys[0], min(keys[-1], vdot))
    lower = max(k for k in keys if k <= vdot)
    upper = min(k for k in keys if k >= vdot)
    if lower == upper:
        return dict(DANIELS_TABLE[lower])
    frac = (vdot - lower) / (upper - lower)
    return {
        zone: int(DANIELS_TABLE[lower][zone] + frac * (
            DANIELS_TABLE[upper][zone] - DANIELS_TABLE[lower][zone]
        ))
        for zone in ["E", "M", "T", "I", "R"]
    }


def calc_tss(duration_sec: float, avg_hr: int | None,
             threshold_hr: int, avg_pace_sec_per_km: float | None = None,
             threshold_pace: float | None = None) -> float:
    """Heart-rate-based TSS (hrTSS). Falls back to pace-based IF when HR unavailable."""
    duration_hours = duration_sec / 3600
    if avg_hr and threshold_hr:
        intensity_factor = avg_hr / threshold_hr
    elif avg_pace_sec_per_km and threshold_pace:
        intensity_factor = threshold_pace / avg_pace_sec_per_km
    else:
        intensity_factor = 0.75  # conservative default
    return round(duration_hours * intensity_factor ** 2 * 100, 2)


def update_ctl_atl(ctl_prev: float, atl_prev: float, tss: float) -> tuple[float, float]:
    """One day EMA step for CTL (42-day) and ATL (7-day)."""
    import math
    ctl = ctl_prev * math.exp(-1 / 42) + tss * (1 - math.exp(-1 / 42))
    atl = atl_prev * math.exp(-1 / 7) + tss * (1 - math.exp(-1 / 7))
    return round(ctl, 2), round(atl, 2)


def vdot_level(vdot: float) -> str:
    if vdot < 30:
        return "beginner"
    if vdot < 40:
        return "amateur"
    if vdot < 50:
        return "advanced_amateur"
    if vdot < 60:
        return "serious"
    return "elite"


def race_readiness_score(tsb: float, pct_weeks_with_runs_10w: float,
                          long_runs_completed_pct: float, vdot_delta_6w: float,
                          avg_weekly_km: float, recommended_weekly_km: float) -> dict:
    if 5 <= tsb <= 25:
        tsb_score = 100.0
    elif tsb > 25:
        tsb_score = max(0.0, 100 - (tsb - 25) * 3)
    else:
        tsb_score = max(0.0, 100 + (tsb - 5) * 4)

    consistency = min(1.0, max(0.0, pct_weeks_with_runs_10w))
    long_run_completion = min(1.0, max(0.0, long_runs_completed_pct))
    vdot_trend = min(1.0, max(0.0, vdot_delta_6w / 3))
    volume_ok = min(1.0, avg_weekly_km / max(1, recommended_weekly_km))

    score = (tsb_score * 0.30
             + consistency * 100 * 0.25
             + long_run_completion * 100 * 0.20
             + vdot_trend * 100 * 0.15
             + volume_ok * 100 * 0.10)

    return {
        "score": round(score),
        "components": {
            "tsb_score": round(tsb_score),
            "consistency": round(consistency * 100),
            "long_runs": round(long_run_completion * 100),
            "vdot_trend": round(vdot_trend * 100),
            "volume": round(volume_ok * 100),
        }
    }


def format_time(total_sec: int) -> str:
    """Format seconds as H:MM:SS."""
    h = total_sec // 3600
    m = (total_sec % 3600) // 60
    s = total_sec % 60
    return f"{h}:{m:02d}:{s:02d}"


def format_pace(sec_per_km: float) -> str:
    """Format seconds/km as M:SS/km."""
    m = int(sec_per_km) // 60
    s = int(sec_per_km) % 60
    return f"{m}:{s:02d}/km"
