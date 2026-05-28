"""
Validation 1: Demographics-only baseline (Boston 2015 → 2016 holdout).
Train on all of Boston 2015, test on all of Boston 2016.

Boston 2015 columns (verified from CSV):
['Unnamed: 0', 'Bib', 'Name', 'Age', 'M/F', 'City', 'State', 'Country', 'Citizen',
 'Unnamed: 9', '5K', '10K', '15K', '20K', 'Half', '25K', '30K', '35K', '40K',
 'Pace', 'Proj Time', 'Official Time', 'Overall', 'Gender', 'Division']

Boston 2016 columns (verified from CSV):
['Bib', 'Name', 'Age', 'M/F', 'City', 'State', 'Country', 'Citizen', 'Unnamed: 8',
 '5K', '10K', '15K', '20K', 'Half', '25K', '30K', '35K', '40K',
 'Pace', 'Proj Time', 'Official Time', 'Overall', 'Gender', 'Division']

Run from backend/ directory:
    python -m ml.src.validate_demographic
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
BOSTON_TEMP_C = 11.0
BOSTON_HUMIDITY = 65

FEATURE_COLS = ['age', 'sex', 'course_difficulty_coefficient', 'weather_index', 'target_distance_km']


def compute_weather_index(temp_c: float, humidity_pct: float, wind_ms: float = 0.0) -> float:
    base_temp = 10.0
    temp_penalty = max(0.0, (temp_c - base_temp) * 0.004)
    humidity_penalty = max(0.0, (humidity_pct - 60) * 0.001)
    wind_bonus = min(0.01, wind_ms * 0.0005) if wind_ms > 3 else 0.0
    return round(1.0 + temp_penalty + humidity_penalty - wind_bonus, 4)


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


def load_boston(year: int) -> pd.DataFrame:
    path = DATA_DIR / 'Boston-marathon' / f'marathon_results_{year}.csv'
    df = pd.read_csv(path)

    print(f"\n--- Boston {year} exploratory ---")
    print(f"  Columns: {df.columns.tolist()}")
    print(f"  Head (3 rows, key columns):")
    print(df[['Age', 'M/F', 'Official Time']].head(3).to_string(index=False))
    print(f"  Rows: {len(df):,}")
    print(f"  NA — Age: {df['Age'].isna().sum()}, M/F: {df['M/F'].isna().sum()}, Official Time: {df['Official Time'].isna().sum()}")

    df['finish_sec'] = df['Official Time'].apply(parse_hhmmss)
    df['sex'] = df['M/F'].apply(
        lambda s: 1 if str(s).strip().upper() == 'M' else 0 if str(s).strip().upper() == 'F' else None
    )
    df['age'] = pd.to_numeric(df['Age'], errors='coerce')

    weather_idx = compute_weather_index(BOSTON_TEMP_C, BOSTON_HUMIDITY)
    df['course_difficulty_coefficient'] = BOSTON_DIFFICULTY
    df['weather_index'] = weather_idx
    df['target_distance_km'] = 42.195

    df = df.dropna(subset=['finish_sec', 'sex', 'age'])
    df = df[df['finish_sec'].between(7200, 23400)]   # 2:00:00 – 6:30:00
    df = df[df['age'].between(14, 90)]
    df = df[df['sex'].isin([0, 1])]

    print(f"  After filtering: {len(df):,} valid finishers")
    return df


def within_n_min(y_true, y_pred, n_min: int) -> float:
    diff_sec = np.abs(np.array(y_true, dtype=float) - np.array(y_pred, dtype=float))
    return float((diff_sec <= n_min * 60).mean() * 100)


def main():
    print("=" * 60)
    print("Validation 1: Demographics-only baseline (Boston 2015 -> 2016)")
    print("=" * 60)

    train_df = load_boston(2015)
    test_df  = load_boston(2016)

    X_train = train_df[FEATURE_COLS].values
    y_train = train_df['finish_sec'].values
    X_test  = test_df[FEATURE_COLS].values
    y_test  = test_df['finish_sec'].values

    print(f"\nTrain (Boston 2015): {len(X_train):,}")
    print(f"Test  (Boston 2016): {len(X_test):,}")

    print("\nTraining Ridge (alpha=10)...")
    ridge = Pipeline([('scaler', StandardScaler()), ('model', Ridge(alpha=10.0))])
    ridge.fit(X_train, y_train)
    ridge_pred = ridge.predict(X_test)

    print("Training XGBoost (n=500, depth=6, lr=0.05)...")
    xgb = XGBRegressor(
        n_estimators=500, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=5,
        reg_lambda=1.0, random_state=42, verbosity=0,
    )
    xgb.fit(X_train, y_train)
    xgb_pred = xgb.predict(X_test)

    ens_pred = 0.3 * ridge_pred + 0.7 * xgb_pred

    mae_sec      = mean_absolute_error(y_test, ens_pred)
    rmse_sec     = np.sqrt(mean_squared_error(y_test, ens_pred))
    r2           = r2_score(y_test, ens_pred)
    median_ae    = float(np.median(np.abs(y_test - ens_pred)))

    mae_min      = mae_sec / 60
    rmse_min     = rmse_sec / 60
    median_ae_min = median_ae / 60

    w5  = within_n_min(y_test, ens_pred, 5)
    w10 = within_n_min(y_test, ens_pred, 10)
    w15 = within_n_min(y_test, ens_pred, 15)

    print(f"\n{'=' * 60}")
    print("RESULTS (Boston 2016 holdout):")
    print(f"  MAE:            {mae_min:.1f} min")
    print(f"  RMSE:           {rmse_min:.1f} min")
    print(f"  R²:             {r2:.3f}")
    print(f"  Median AE:      {median_ae_min:.1f} min")
    print(f"  Within ±5 min:  {w5:.1f}%")
    print(f"  Within ±10 min: {w10:.1f}%")
    print(f"  Within ±15 min: {w15:.1f}%")

    results = {
        "dataset": "Boston 2016 holdout (trained on Boston 2015)",
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "mae_min": round(mae_min, 2),
        "rmse_min": round(rmse_min, 2),
        "r2": round(float(r2), 4),
        "median_ae_min": round(median_ae_min, 2),
        "within_5min_pct": round(w5, 1),
        "within_10min_pct": round(w10, 1),
        "within_15min_pct": round(w15, 1),
        "features": FEATURE_COLS,
        "model": "Ridge(alpha=10) + XGBoost(500 est, depth=6, lr=0.05), ensemble 0.3R+0.7X",
    }

    out_path = RESULTS_DIR / 'demographic.json'
    with open(out_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved: {out_path}")

    return results


if __name__ == '__main__':
    main()
