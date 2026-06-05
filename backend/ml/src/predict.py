"""
Tiered finish-time prediction.

The accuracy of a marathon prediction is dominated by the quality of the
INPUT, not the cleverness of the model (validated empirically — see
ml/validation_results/). So we pick the best signal available for each
runner and fall back gracefully:

  Tier A  prior_marathon present  → learned marathon→marathon model
          (xgb_repeat_v1). ~21 min MAE on a temporal holdout, and it
          transfers to production because the input (a real past marathon)
          matches what the model was trained on. Best tier.

  Tier B  VDOT present            → Daniels analytic: equiv × course × weather.
          Transparent physiology. Used when the runner has training fitness
          but no prior marathon on record.

  Tier C  neither                 → cannot predict (caller guards on VDOT).

Course difficulty (Minetti) and weather are applied as explicit physical
multipliers in every tier — they are physics we can model directly and
shouldn't be left to a model trained on mild-weather fall marathons.
"""
import joblib
import numpy as np
from pathlib import Path

from ml.src.formulas import (
    daniels_equivalent_time, format_time, format_pace, tanda_marathon_pace_sec,
)
from ml.src.weather import compute_weather_index

MODELS_DIR = Path(__file__).resolve().parent.parent / 'models'

# Marathon distance window. Outside it, the repeat model (trained on 42.195 km
# only) and the durability assumptions don't apply — use pure Daniels.
MARATHON_MIN_KM, MARATHON_MAX_KM = 40.0, 45.0

# ── Tier-A model (marathon history → next marathon) ─────────────────────────
_history_model = None  # None = not tried; False = tried & absent


def _get_history_model():
    global _history_model
    if _history_model is None:
        path = MODELS_DIR / 'xgb_history_v1.joblib'
        _history_model = joblib.load(path) if path.exists() else False
    return _history_model or None


# History model feature order — MUST match ml/src/train_history.py FEATURES.
_HISTORY_COLS = ['prev_finish', 'best_prior', 'mean_prior', 'n_prior',
                 'years_since_prev', 'trend_sec_per_year', 'prev_coeff', 'coeff',
                 'age', 'sex']


def _predict_from_prior(prior: dict, user, target_coeff: float,
                        weather_idx: float) -> tuple | None:
    """
    Tier A. Uses the runner's whole marathon HISTORY (mean / best / trend /
    count), not just the single last race — so a stale single result is
    cushioned by the broader picture. `prior` comes from
    services.get_prior_marathon_features. Returns (predicted_sec, confidence)
    or None if the model is missing.
    """
    model = _get_history_model()
    if model is None:
        return None
    prev = float(prior['prev_finish'])
    year_gap = float(prior.get('years_since_prev') or 1.0)
    feats = {
        'prev_finish': prev,
        'best_prior': float(prior.get('best_prior') or prev),
        'mean_prior': float(prior.get('mean_prior') or prev),
        'n_prior': float(prior.get('n_prior') or 1),
        'years_since_prev': year_gap,
        'trend_sec_per_year': float(prior.get('trend_sec_per_year') or 0.0),
        'prev_coeff': float(prior.get('prev_coeff') or 1.0),
        'coeff': float(target_coeff),
        'age': float(user.age or 40),
        'sex': 1.0 if user.sex == 'M' else 0.0,
    }
    X = np.array([[feats[c] for c in _HISTORY_COLS]])
    try:
        pred = float(model.predict(X)[0])
    except Exception:
        return None
    # Model trained on mild fall marathons; apply race-day weather on top.
    pred *= weather_idx
    # Confidence widens with how stale the anchoring prior is.
    confidence = int(min(2400, 1200 + 180 * max(0.0, year_gap)))
    # Same-course prior removes course-transfer error → a bit more certain.
    if prior.get('same_marathon'):
        confidence = int(confidence * 0.85)
    return int(pred), confidence


def _predict_from_tanda(tl: dict, course_coeff: float, weather_idx: float) -> tuple | None:
    """
    Tier A.5. Predict the marathon from 8-week training load (Tanda formula).
    tl = {weekly_km, train_pace_sec, weeks_with_data}.
    Returns (predicted_sec, confidence_sec) or None if outside the formula's
    validated regime (a lower tier then handles it).
    """
    K = float(tl.get('weekly_km') or 0)
    P = float(tl.get('train_pace_sec') or 0)
    weeks = int(tl.get('weeks_with_data') or 0)
    # Validity: consistent training (>=6 of 8 weeks), sane volume and pace.
    if weeks < 6 or K < 30.0 or not (200.0 <= P <= 480.0):
        return None
    pm = tanda_marathon_pace_sec(K, P)
    if pm is None:
        return None
    base = pm * 42.195                          # normal-conditions marathon seconds
    predicted = int(base * course_coeff * weather_idx)
    # Paper RMSE ~5-8 min in range; Tanda over-predicts below 2:47 -> widen there.
    confidence = 1020 if base < 10020 else 660  # 2:47 = 10020 s
    return predicted, confidence


def predict_finish_time(user, marathon, race_date, temp_c: float, humidity_pct: float,
                        wind_ms: float = 0.0, prior_marathon: dict | None = None,
                        training_load: dict | None = None) -> dict:
    vdot = float(user.current_vdot or 0)
    distance_km = float(marathon.distance_km)
    distance_m = distance_km * 1000
    course_coeff = float(marathon.difficulty_coefficient)
    weather_idx = compute_weather_index(temp_c, humidity_pct, wind_ms)

    is_marathon_distance = MARATHON_MIN_KM <= distance_km <= MARATHON_MAX_KM

    # Analytic base (Daniels) — always computed for the breakdown display and
    # as the Tier-B prediction.
    base_time = daniels_equivalent_time(vdot, distance_m) if vdot > 0 else 0
    analytic = int(base_time * course_coeff * weather_idx)

    predicted_sec = None
    confidence = None
    tier = None

    # ── Tier A: prior marathon → marathon model ──
    if prior_marathon and is_marathon_distance:
        ta = _predict_from_prior(prior_marathon, user, course_coeff, weather_idx)
        if ta is not None:
            predicted_sec, confidence = ta
            tier = 'prior_marathon'

    # ── Tier A.5: Tanda — predict from 8-week training volume + pace ──
    if predicted_sec is None and is_marathon_distance and training_load:
        tt = _predict_from_tanda(training_load, course_coeff, weather_idx)
        if tt is not None:
            predicted_sec, confidence = tt
            tier = 'tanda'

    # ── Tier B: Daniels analytic ──
    if predicted_sec is None and vdot > 0:
        predicted_sec = analytic
        # Marathon from sub-marathon fitness carries real durability
        # uncertainty; shorter distances are well-modelled by Daniels.
        confidence = 1500 if is_marathon_distance else 600
        tier = 'analytic'

    # ── Tier C: insufficient data (caller should have guarded on VDOT) ──
    if predicted_sec is None:
        return {
            'predicted_time_sec': 0,
            'predicted_time_formatted': '—',
            'confidence_interval_sec': None,
            'base_time_sec': 0,
            'base_time_formatted': '—',
            'course_difficulty_coefficient': course_coeff,
            'weather_index': weather_idx,
            'ml_correction_sec': 0,
            'mode': 'insufficient_data',
            'tier': 'insufficient_data',
            'is_marathon_distance': is_marathon_distance,
            'recommended_pace': None,
            'feature_importance': [],
        }

    # Deviation of the final prediction from the pure analytic path — what the
    # learned tier contributed (0 for Tier B). Shown in the breakdown.
    ml_correction = predicted_sec - analytic

    # Recommended pace from the REAL predicted finish (not the ideal VDOT
    # table) so the runner doesn't chase a pace that blows up mid-race.
    real_avg_pace = predicted_sec / distance_km  # sec per km
    recommended_pace = {
        'start_10km':  format_pace(real_avg_pace * 1.015),   # +1.5% conservative
        'middle_22km': format_pace(real_avg_pace),            # target average
        'finish_10km': format_pace(real_avg_pace * 0.985),   # -1.5% if energy
    }

    feature_importance = [
        {
            'feature': 'vdot',
            'impact_sec': int(base_time - daniels_equivalent_time(vdot - 1, distance_m)) if vdot > 1 else 0,
            'description': f'Your VDOT {vdot:.1f}',
        },
        {
            'feature': 'course_difficulty',
            'impact_sec': int(base_time * course_coeff - base_time),
            'description': f'Course difficulty (coeff. {course_coeff:.3f})',
        },
        {
            'feature': 'weather_index',
            'impact_sec': int(base_time * course_coeff * weather_idx - base_time * course_coeff),
            'description': f'Weather {temp_c}°C / {humidity_pct}% humidity',
        },
    ]
    if tier == 'prior_marathon':
        feature_importance.insert(0, {
            'feature': 'prior_marathon',
            'impact_sec': int(ml_correction),
            'description': f'Your past marathon ({format_time(int(prior_marathon["finish_sec"]))})',
        })
    elif tier == 'tanda':
        feature_importance.insert(0, {
            'feature': 'training_volume',
            'impact_sec': int(ml_correction),
            'description': f'{training_load.get("weekly_km")} km/wk over 8 weeks',
        })

    return {
        'predicted_time_sec': predicted_sec,
        'predicted_time_formatted': format_time(predicted_sec),
        'confidence_interval_sec': confidence,
        'base_time_sec': base_time,
        'base_time_formatted': format_time(base_time),
        'course_difficulty_coefficient': course_coeff,
        'weather_index': weather_idx,
        'ml_correction_sec': int(ml_correction),
        'mode': tier,                 # 'prior_marathon' | 'analytic'
        'tier': tier,
        'is_marathon_distance': is_marathon_distance,
        'recommended_pace': recommended_pace,
        'feature_importance': feature_importance,
    }
