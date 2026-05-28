"""
Validation 3: Weather correction impact (Boston 2024).

Method:
  1. Train a demographics model (identical architecture to validate_demographic.py)
     on Boston 2015 data with weather_index = 1.0 (weather-neutral baseline).
  2. Predict Boston 2024 finish times with weather_index = 1.0 (no correction).
  3. Apply ACSM correction: multiply those predictions by the actual race day
     weather_index (Boston 2024 was ~15.8°C, warm for April → index > 1.0).
  4. Compare MAE of both vs. actual finish times.

Boston 2024 Athletes.csv columns (verified from CSV):
['Bib', 'Zip', 'Age', 'Age Group', 'Gender', 'First Half', 'Second Half',
 'Finish', 'Positive Split', 'Percent Change']
- Finish: already in seconds (integer)
- Gender: 'M' / 'F'
- Age: integer

Race day: April 15, 2024
Weather source: Weather.csv zip-code averages on 4/15/24 → ~60.4°F ≈ 15.8°C mean temp.
Humidity and wind: April Boston estimate (62%, 2 m/s) — not in the CSV.

Run from backend/ directory:
    python -m ml.src.validate_weather
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / 'ml' / 'data' / 'kaggle'
RESULTS_DIR = BASE_DIR / 'ml' / 'validation_results'
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

BOSTON_DIFFICULTY = 1.038
TRAIN_TEMP_C      = 11.0
TRAIN_HUMIDITY    = 65

# Race 2024 conditions (temp from Weather.csv, humidity/wind estimated)
RACE_2024_HUMIDITY = 62
RACE_2024_WIND_MS  = 2.0

FEATURE_COLS = ['age', 'sex', 'course_difficulty_coefficient', 'weather_index', 'target_distance_km']


def compute_weather_index(temp_c: float, humidity_pct: float, wind_ms: float = 0.0) -> float:
    base_temp = 10.0
    temp_penalty     = max(0.0, (temp_c - base_temp) * 0.004)
    humidity_penalty = max(0.0, (humidity_pct - 60) * 0.001)
    wind_bonus       = min(0.01, wind_ms * 0.0005) if wind_ms > 3 else 0.0
    return round(1.0 + temp_penalty + humidity_penalty - wind_bonus, 4)


def within_n_min(y_true, y_pred, n_min: int) -> float:
    diff_sec = np.abs(np.array(y_true, dtype=float) - np.array(y_pred, dtype=float))
    return float((diff_sec <= n_min * 60).mean() * 100)


def parse_hhmmss(t) -> float | None:
    if pd.isna(t):
        return None
    t = str(t).strip()
    parts = t.split(':')
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    except ValueError:
        pass
    return None


def load_boston_2015(train_weather_idx: float) -> tuple[np.ndarray, np.ndarray]:
    path = DATA_DIR / 'Boston-marathon' / 'marathon_results_2015.csv'
    df = pd.read_csv(path)
    df['finish_sec'] = df['Official Time'].apply(parse_hhmmss)
    df['sex'] = df['M/F'].apply(
        lambda s: 1 if str(s).strip().upper() == 'M' else 0 if str(s).strip().upper() == 'F' else None
    )
    df['age'] = pd.to_numeric(df['Age'], errors='coerce')
    df['course_difficulty_coefficient'] = BOSTON_DIFFICULTY
    df['weather_index']     = train_weather_idx
    df['target_distance_km'] = 42.195
    df = df.dropna(subset=['finish_sec', 'sex', 'age'])
    df = df[df['finish_sec'].between(7200, 23400)]
    df = df[df['age'].between(14, 90)]
    df = df[df['sex'].isin([0, 1])]
    print(f"  Boston 2015 train: {len(df):,} rows (weather_index={train_weather_idx:.4f})")
    return df[FEATURE_COLS].values, df['finish_sec'].values


def main():
    print("=" * 60)
    print("Validation 3: Weather correction (Boston 2024)")
    print("=" * 60)

    # ── Exploratory: Athletes.csv ────────────────────────────────────
    ath_path = DATA_DIR / 'Boston-2024-weather-splits' / 'Athletes.csv'
    df = pd.read_csv(ath_path)
    print("\n--- Athletes.csv exploratory ---")
    print("Columns:", df.columns.tolist())
    print("Head (3):")
    print(df.head(3).to_string())
    print("dtypes:", {c: str(t) for c, t in df.dtypes.items()})
    print("NA:", df.isna().sum().to_dict())
    print("Total rows:", len(df))

    # ── Race day weather from Weather.csv ────────────────────────────
    wth_path = DATA_DIR / 'Boston-2024-weather-splits' / 'Weather.csv'
    wth = pd.read_csv(wth_path)
    race_day = wth[wth['Date'] == '4/15/24']
    if len(race_day) > 0:
        mean_temp_f = race_day['Mean Temp'].mean()
        race_temp_c = (mean_temp_f - 32) * 5 / 9
        print(f"\nWeather.csv race day (4/15/24): {mean_temp_f:.1f}°F = {race_temp_c:.1f}°C "
              f"(mean across {len(race_day)} zip codes)")
    else:
        race_temp_c = 15.8
        print(f"\nWeather.csv: 4/15/24 not found — using fallback {race_temp_c}°C")

    print(f"Race conditions used: temp={race_temp_c:.1f}°C, "
          f"humidity={RACE_2024_HUMIDITY}%, wind={RACE_2024_WIND_MS} m/s")

    # ── Clean test data ──────────────────────────────────────────────
    df['sex'] = df['Gender'].apply(
        lambda s: 1 if str(s).strip().upper() == 'M' else 0 if str(s).strip().upper() == 'F' else None
    )
    df['age']        = pd.to_numeric(df['Age'], errors='coerce')
    df['finish_sec'] = pd.to_numeric(df['Finish'], errors='coerce')  # already in seconds

    df = df.dropna(subset=['finish_sec', 'sex', 'age'])
    df = df[df['finish_sec'].between(7200, 23400)]
    df = df[df['age'].between(14, 90)]
    df = df[df['sex'].isin([0, 1])]
    print(f"\nBoston 2024 test set after filtering: {len(df):,} runners")

    y_test = df['finish_sec'].values

    # ── Weather indices ──────────────────────────────────────────────
    wx_idx_correction = compute_weather_index(race_temp_c, RACE_2024_HUMIDITY, RACE_2024_WIND_MS)
    print(f"\nWeather index WITHOUT correction: 1.0000 (ideal 10°C conditions)")
    print(f"Weather index WITH correction:    {wx_idx_correction:.4f} (race day conditions)")

    # ── Train on Boston 2015 (neutral weather = 1.0) ─────────────────
    print("\nTraining demographics model on Boston 2015 (weather_index=1.0)...")
    X_train, y_train = load_boston_2015(train_weather_idx=1.0)

    ridge = Pipeline([('scaler', StandardScaler()), ('model', Ridge(alpha=10.0))])
    ridge.fit(X_train, y_train)

    xgb = XGBRegressor(
        n_estimators=500, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=5,
        reg_lambda=1.0, random_state=42, verbosity=0,
    )
    xgb.fit(X_train, y_train)

    # ── Predict WITHOUT weather correction ───────────────────────────
    df_test = df.copy()
    df_test['course_difficulty_coefficient'] = BOSTON_DIFFICULTY
    df_test['weather_index']      = 1.0
    df_test['target_distance_km'] = 42.195

    X_test = df_test[FEATURE_COLS].values
    ridge_pred = ridge.predict(X_test)
    xgb_pred   = xgb.predict(X_test)
    ens_no_wx  = 0.3 * ridge_pred + 0.7 * xgb_pred

    # ── Predict WITH weather correction ─────────────────────────────
    # Apply ACSM multiplier on top of the baseline predictions.
    # This tests whether the correction closes the gap caused by warmer conditions.
    ens_with_wx = ens_no_wx * wx_idx_correction

    # ── Metrics ─────────────────────────────────────────────────────
    mae_no   = mean_absolute_error(y_test, ens_no_wx)   / 60
    mae_with = mean_absolute_error(y_test, ens_with_wx) / 60
    rmse_no  = np.sqrt(mean_squared_error(y_test, ens_no_wx))  / 60
    rmse_with= np.sqrt(mean_squared_error(y_test, ens_with_wx))/ 60
    r2_no    = float(r2_score(y_test, ens_no_wx))
    r2_with  = float(r2_score(y_test, ens_with_wx))

    delta_mae       = mae_no - mae_with        # positive = weather helps
    improvement_pct = delta_mae / mae_no * 100

    print(f"\n{'=' * 60}")
    print("RESULTS:")
    print(f"  n test:                       {len(y_test):,}")
    print(f"  Race conditions:              {race_temp_c:.1f}°C / {RACE_2024_HUMIDITY}% / {RACE_2024_WIND_MS} m/s")
    print(f"  Weather index:                {wx_idx_correction:.4f}")
    print()
    print(f"  WITHOUT weather correction:   MAE={mae_no:.1f} min  RMSE={rmse_no:.1f} min  R²={r2_no:.3f}")
    print(f"  WITH weather correction:      MAE={mae_with:.1f} min  RMSE={rmse_with:.1f} min  R²={r2_with:.3f}")
    print(f"  Δ MAE: {delta_mae:+.2f} min  ({improvement_pct:+.1f}% "
          f"{'improvement' if delta_mae > 0 else 'degradation'})")

    results = {
        "dataset": "Boston 2024 (trained on Boston 2015)",
        "n": int(len(y_test)),
        "race_conditions": {
            "temp_c":       round(race_temp_c, 1),
            "temp_source":  "Weather.csv zip-code mean on 4/15/24",
            "humidity_pct": RACE_2024_HUMIDITY,
            "humidity_source": "April Boston estimate",
            "wind_ms":      RACE_2024_WIND_MS,
        },
        "weather_index_applied": wx_idx_correction,
        "without_weather": {
            "mae_min":          round(mae_no, 2),
            "rmse_min":         round(rmse_no, 2),
            "r2":               round(r2_no, 4),
            "within_10min_pct": round(within_n_min(y_test, ens_no_wx, 10), 1),
        },
        "with_weather": {
            "mae_min":          round(mae_with, 2),
            "rmse_min":         round(rmse_with, 2),
            "r2":               round(r2_with, 4),
            "within_10min_pct": round(within_n_min(y_test, ens_with_wx, 10), 1),
        },
        "improvement_min": round(delta_mae, 2),
        "improvement_pct": round(improvement_pct, 1),
    }

    out_path = RESULTS_DIR / 'weather.json'
    with open(out_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved: {out_path}")

    return results


if __name__ == '__main__':
    main()
