"""
Hybrid prediction pipeline: Daniels analytic + XGBoost correction.
"""
import os
import joblib
import numpy as np
from pathlib import Path

from ml.src.formulas import daniels_equivalent_time, format_time, format_pace, race_readiness_score
from ml.src.weather import compute_weather_index

MODELS_DIR = Path(__file__).resolve().parent.parent / 'models'


def _load_models():
    ridge_path = MODELS_DIR / 'ridge_v1.joblib'
    xgb_path = MODELS_DIR / 'xgb_v1.joblib'
    ridge = joblib.load(ridge_path) if ridge_path.exists() else None
    xgb = joblib.load(xgb_path) if xgb_path.exists() else None
    return ridge, xgb


_ridge, _xgb = None, None


def _get_models():
    global _ridge, _xgb
    if _ridge is None:
        _ridge, _xgb = _load_models()
    return _ridge, _xgb


def _ml_predict(features: dict) -> float | None:
    """
    Run the trained Ridge+XGBoost ensemble.

    IMPORTANT: must use exactly the same feature columns the model was
    trained on. See ml/src/train.py FEATURE_COLS. Training is on 5
    demographic+race features. Passing extra columns (or wrong order)
    throws a shape mismatch and the whole prediction silently falls
    back to basic mode.
    """
    ridge, xgb = _get_models()
    if xgb is None:
        return None
    # Must match ml/src/train.py FEATURE_COLS exactly
    cols = [
        'age',
        'sex',
        'course_difficulty_coefficient',
        'weather_index',
        'target_distance_km',
    ]
    X = np.array([[features.get(c, 0) for c in cols]])
    try:
        if ridge is not None:
            pred = 0.3 * ridge.predict(X)[0] + 0.7 * xgb.predict(X)[0]
        else:
            pred = xgb.predict(X)[0]
        return float(pred)
    except Exception:
        return None


def predict_finish_time(user, marathon, race_date, temp_c: float, humidity_pct: float,
                         wind_ms: float = 0.0) -> dict:
    from ml.src.formulas import vdot_to_paces

    vdot = float(user.current_vdot or 0)
    distance_m = float(marathon.distance_km) * 1000
    course_coeff = float(marathon.difficulty_coefficient)

    base_time = daniels_equivalent_time(vdot, distance_m)
    adjusted = base_time * course_coeff

    weather_idx = compute_weather_index(temp_c, humidity_pct, wind_ms)
    adjusted = adjusted * weather_idx

    ml_correction = 0
    has_full_data = (user.training_weeks or 0) >= 8
    mode = 'basic'

    # XGBoost trained on Berlin/NYC/Boston Kaggle data — all 42.195 km.
    # Extrapolation to non-marathon distances produces nonsense; force basic
    # mode for anything outside [40, 45] km window. Daniels analytics handle
    # all distances correctly on their own.
    MARATHON_MIN, MARATHON_MAX = 40.0, 45.0
    distance_km_f = float(marathon.distance_km)
    is_marathon_distance = MARATHON_MIN <= distance_km_f <= MARATHON_MAX
    if not is_marathon_distance:
        has_full_data = False  # skip ML correction layer

    if has_full_data:
        # Only the 5 features the model was trained on. CTL/ATL/TSB and
        # weekly volume features were declared in the original spec but
        # never made it into training data — including them in inference
        # was throwing a shape mismatch and forcing basic-mode fallback.
        features = {
            'age': user.age or 30,
            'sex': 1 if user.sex == 'M' else 0,
            'course_difficulty_coefficient': course_coeff,
            'weather_index': weather_idx,
            'target_distance_km': float(marathon.distance_km),
            # Kept here for forward compatibility — _ml_predict ignores them
            # but a future retrain could add them. See ml/src/train.py.
            'ctl': float(user.current_ctl or 0),
            'atl': float(user.current_atl or 0),
            'tsb': float(user.current_tsb or 0),
            'avg_weekly_km_8w': 0,
            'training_consistency': 0,
        }
        ml_pred = _ml_predict(features)
        if ml_pred is not None:
            ml_correction = ml_pred - adjusted
            ml_correction = max(-300, min(300, ml_correction))
            adjusted += ml_correction
            mode = 'full'

    predicted_sec = int(adjusted)
    confidence = 900 if mode == 'basic' else 540  # ±15min or ±9min

    # Recommended pace is derived from the REAL predicted finish, not from
    # the ideal Daniels VDOT table — otherwise the runner would chase a pace
    # that's faster than physically reachable under the predicted course +
    # weather conditions, and blow up mid-race.
    real_avg_pace = predicted_sec / (distance_m / 1000)  # sec per km

    recommended_pace = {
        'start_10km':  format_pace(real_avg_pace * 1.015),   # +1.5% — conservative
        'middle_22km': format_pace(real_avg_pace),            # target average
        'finish_10km': format_pace(real_avg_pace * 0.985),   # -1.5% — if energy
    }

    feature_importance = [
        {
            'feature': 'vdot',
            'impact_sec': int(base_time - daniels_equivalent_time(vdot - 1, distance_m)),
            'description': f'Your VDOT {vdot:.1f}',
        },
        {
            'feature': 'course_difficulty',
            'impact_sec': int(base_time * course_coeff - base_time),
            'description': f'Course difficulty (coeff. {course_coeff:.3f})',
        },
        {
            'feature': 'weather_index',
            'impact_sec': int(adjusted - base_time * course_coeff) - ml_correction,
            'description': f'Weather {temp_c}°C / {humidity_pct}% humidity',
        },
    ]

    return {
        'predicted_time_sec': predicted_sec,
        'predicted_time_formatted': format_time(predicted_sec),
        'confidence_interval_sec': confidence,
        'base_time_sec': base_time,
        'base_time_formatted': format_time(base_time),
        'course_difficulty_coefficient': course_coeff,
        'weather_index': weather_idx,
        'ml_correction_sec': int(ml_correction),
        'mode': mode,
        'is_marathon_distance': is_marathon_distance,
        'recommended_pace': recommended_pace,
        'feature_importance': feature_importance,
    }
