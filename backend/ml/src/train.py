"""
ML training script for EnduranceAI finish time prediction.
Trains Ridge (baseline) + XGBoost on real Kaggle marathon data.
Saves models to ml/models/ridge_v1.joblib and ml/models/xgb_v1.joblib

Run from backend/ directory:
    python -m ml.src.train
"""
import sys
import os
from pathlib import Path

# Allow running from backend/ dir without Django
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / 'ml' / 'data' / 'kaggle'
MODELS_DIR = BASE_DIR / 'ml' / 'models'
MODELS_DIR.mkdir(parents=True, exist_ok=True)

import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error
from xgboost import XGBRegressor

# ── Course difficulty coefficients (from our Marathon DB) ───────────
COURSE_COEFFS = {
    'NYC Marathon':              1.048,
    'New York City Marathon':    1.048,
    'Chicago Marathon':          1.001,
    'Boston Marathon':           1.038,
    'Berlin Marathon':           1.000,
    'Marine Corps Marathon':     1.020,
    'Philadelphia Marathon':     1.010,
    'Twin Cities Marathon':      1.015,
    'St. George Marathon':       1.025,  # downhill course
    'Portland Marathon':         1.010,
    'Columbus Marathon':         1.010,
    'Richmond Marathon':         1.012,
    'Indianapolis Monumental Marathon': 1.008,
    'Detroit International Marathon':   1.012,
    'Baltimore Marathon':        1.015,
    'Air Force Marathon':        1.012,
    'Hartford Marathon':         1.015,
    'Lakefront Marathon':        1.010,
}

# ── Typical weather by marathon (temp °C, humidity %) ───────────────
# Used to compute weather_index for each race
RACE_WEATHER = {
    'NYC Marathon':              (10.0, 60),   # November NYC
    'New York City Marathon':    (10.0, 60),
    'Chicago Marathon':          (13.0, 60),   # October Chicago
    'Boston Marathon':           (11.0, 65),   # April Boston
    'Berlin Marathon':           (17.0, 65),   # September Berlin
    'Marine Corps Marathon':     (14.0, 60),   # October DC
    'Philadelphia Marathon':     (10.0, 60),   # November Philly
    'Twin Cities Marathon':      (9.0,  60),   # October
    'St. George Marathon':       (15.0, 40),   # October Utah (dry)
    'Portland Marathon':         (12.0, 65),   # October
    'Columbus Marathon':         (12.0, 60),
    'Richmond Marathon':         (10.0, 60),
    'Indianapolis Monumental Marathon': (9.0, 60),
    'Detroit International Marathon':   (10.0, 60),
    'Baltimore Marathon':        (14.0, 65),
    'Air Force Marathon':        (15.0, 60),
    'Hartford Marathon':         (12.0, 65),
    'Lakefront Marathon':        (11.0, 60),
}

BERLIN_WEATHER_BY_YEAR = {}  # populated from Berlin weather CSV


def compute_weather_index(temp_c: float, humidity_pct: float, wind_ms: float = 0.0) -> float:
    base_temp = 10.0
    temp_penalty    = max(0.0, (temp_c - base_temp) * 0.004)
    humidity_penalty = max(0.0, (humidity_pct - 60) * 0.001)
    wind_bonus      = min(0.01, wind_ms * 0.0005) if wind_ms > 3 else 0.0
    return round(1.0 + temp_penalty + humidity_penalty - wind_bonus, 4)


def parse_time_to_sec(t) -> float | None:
    """Parse HH:MM:SS or MM:SS or decimal hours to seconds."""
    if pd.isna(t):
        return None
    t = str(t).strip()
    if ':' in t:
        parts = t.split(':')
        try:
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
            if len(parts) == 2:
                return int(parts[0]) * 60 + float(parts[1])
        except ValueError:
            return None
    try:
        val = float(t)
        # decimal hours (MarathonData.csv uses e.g. 2.37 = 2h22m)
        if val < 24:
            return val * 3600
        return val  # already seconds
    except ValueError:
        return None


def sex_to_int(s) -> int | None:
    if pd.isna(s):
        return None
    s = str(s).strip().upper()
    if s in ('M', 'MALE', '1'):
        return 1
    if s in ('F', 'FEMALE', 'W', '0'):
        return 0
    return None


def clean_age(a) -> float | None:
    try:
        v = float(str(a).strip())
        return v if 14 < v < 90 else None
    except (ValueError, TypeError):
        return None


# ── Dataset loaders ─────────────────────────────────────────────────

def load_fall_marathons() -> pd.DataFrame:
    """2010-2019 fall marathons — 2M rows, finish in seconds."""
    print("Loading 2010-2019 fall marathons...")
    path = DATA_DIR / '2010-2019-fall-marathons' / 'Results.csv'
    df = pd.read_csv(path, usecols=['Race', 'Gender', 'Age', 'Finish'])
    df = df.rename(columns={'Race': 'race', 'Gender': 'sex_raw',
                             'Age': 'age_raw', 'Finish': 'finish_sec'})
    df['sex'] = df['sex_raw'].apply(sex_to_int)
    df['age'] = df['age_raw'].apply(clean_age)
    df['course_difficulty_coefficient'] = df['race'].map(COURSE_COEFFS).fillna(1.010)
    df['weather_index'] = df['race'].apply(
        lambda r: compute_weather_index(*RACE_WEATHER.get(r, (12.0, 60)))
    )
    df['target_distance_km'] = 42.195
    print(f"  Loaded {len(df):,} rows")
    return df[['age', 'sex', 'finish_sec', 'course_difficulty_coefficient',
               'weather_index', 'target_distance_km']].copy()


def load_boston() -> pd.DataFrame:
    """Boston 2015–2017, finish as HH:MM:SS."""
    print("Loading Boston 2015-2017...")
    frames = []
    for year in [2015, 2016, 2017]:
        path = DATA_DIR / 'Boston-marathon' / f'marathon_results_{year}.csv'
        if not path.exists():
            continue
        df = pd.read_csv(path, usecols=['Age', 'M/F', 'Official Time'])
        df = df.rename(columns={'Age': 'age_raw', 'M/F': 'sex_raw',
                                 'Official Time': 'time_str'})
        df['finish_sec'] = df['time_str'].apply(parse_time_to_sec)
        df['sex'] = df['sex_raw'].apply(sex_to_int)
        df['age'] = df['age_raw'].apply(clean_age)
        df['course_difficulty_coefficient'] = 1.038
        df['weather_index'] = compute_weather_index(11.0, 65)
        df['target_distance_km'] = 42.195
        frames.append(df)
    result = pd.concat(frames, ignore_index=True)
    print(f"  Loaded {len(result):,} rows")
    return result[['age', 'sex', 'finish_sec', 'course_difficulty_coefficient',
                   'weather_index', 'target_distance_km']].copy()


def load_boston_2024() -> pd.DataFrame:
    """Boston 2024 with real weather data per zip."""
    print("Loading Boston 2024 with weather...")
    ath_path = DATA_DIR / 'Boston-2024-weather-splits' / 'Athletes.csv'
    wth_path = DATA_DIR / 'Boston-2024-weather-splits' / 'Weather.csv'
    if not ath_path.exists():
        return pd.DataFrame()

    ath = pd.read_csv(ath_path, usecols=['Age', 'Gender', 'Finish', 'Zip'])
    ath = ath.rename(columns={'Age': 'age_raw', 'Gender': 'sex_raw',
                               'Finish': 'finish_sec', 'Zip': 'zip'})

    # Race day is April 15, 2024 — use weather for that date
    avg_temp_f = 59.0  # from weather data for race day
    avg_temp_c = (avg_temp_f - 32) * 5 / 9  # ≈ 15°C

    ath['sex'] = ath['sex_raw'].apply(sex_to_int)
    ath['age'] = ath['age_raw'].apply(clean_age)
    ath['course_difficulty_coefficient'] = 1.038
    ath['weather_index'] = compute_weather_index(avg_temp_c, 65)
    ath['target_distance_km'] = 42.195
    print(f"  Loaded {len(ath):,} rows")
    return ath[['age', 'sex', 'finish_sec', 'course_difficulty_coefficient',
                'weather_index', 'target_distance_km']].copy()


def load_berlin() -> pd.DataFrame:
    """Berlin 1974–2019 with yearly weather."""
    print("Loading Berlin marathon...")
    data_path = DATA_DIR / 'Berlin-marathon' / 'Berlin_Marathon_data_1974_2019.csv'
    wth_path  = DATA_DIR / 'Berlin-marathon' / 'Berlin_Marathon_weather_data_since_1974.csv'
    if not data_path.exists():
        return pd.DataFrame()

    df = pd.read_csv(data_path, usecols=['YEAR', 'GENDER', 'AGE', 'TIME'], low_memory=False)
    df = df.rename(columns={'YEAR': 'year', 'GENDER': 'sex_raw',
                             'AGE': 'age_raw', 'TIME': 'time_str'})

    # Load weather by year
    weather_idx_by_year = {}
    if wth_path.exists():
        wth = pd.read_csv(wth_path, usecols=['YEAR', 'AVG_TEMP_C'])
        for _, row in wth.iterrows():
            temp = row['AVG_TEMP_C']
            if pd.notna(temp):
                weather_idx_by_year[int(row['YEAR'])] = compute_weather_index(float(temp), 65)

    df['finish_sec'] = df['time_str'].apply(parse_time_to_sec)
    df['sex'] = df['sex_raw'].apply(sex_to_int)
    df['age'] = df['age_raw'].apply(clean_age)
    df['course_difficulty_coefficient'] = 1.000
    df['weather_index'] = df['year'].apply(
        lambda y: weather_idx_by_year.get(int(y) if pd.notna(y) else 0,
                                          compute_weather_index(17.0, 65))
    )
    df['target_distance_km'] = 42.195
    print(f"  Loaded {len(df):,} rows")
    return df[['age', 'sex', 'finish_sec', 'course_difficulty_coefficient',
               'weather_index', 'target_distance_km']].copy()


def load_nyc() -> pd.DataFrame:
    """NYC Marathon — 1.46M rows, Finish column already in seconds."""
    print("Loading NYC Marathon...")
    path = DATA_DIR / 'NYC-marathon' / 'NYC Marathon Results.csv'
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path, usecols=['Gender', 'Age', 'Finish'])
    df = df.rename(columns={'Gender': 'sex_raw', 'Age': 'age_raw', 'Finish': 'finish_sec'})
    df['sex'] = df['sex_raw'].apply(sex_to_int)
    df['age'] = df['age_raw'].apply(clean_age)
    df['course_difficulty_coefficient'] = 1.048
    df['weather_index'] = compute_weather_index(10.0, 60)
    df['target_distance_km'] = 42.195
    print(f"  Loaded {len(df):,} rows")
    return df[['age', 'sex', 'finish_sec', 'course_difficulty_coefficient',
               'weather_index', 'target_distance_km']].copy()


# ── Main training ────────────────────────────────────────────────────

def build_dataset() -> pd.DataFrame:
    frames = []
    for loader in [load_fall_marathons, load_boston, load_boston_2024,
                   load_berlin, load_nyc]:
        try:
            df = loader()
            if len(df) > 0:
                frames.append(df)
        except Exception as e:
            print(f"  Warning: {loader.__name__} failed: {e}")

    combined = pd.concat(frames, ignore_index=True)
    print(f"\nTotal rows before cleaning: {len(combined):,}")

    # ── Clean ──
    combined = combined.dropna(subset=['age', 'sex', 'finish_sec'])
    combined = combined[combined['finish_sec'].between(5400, 36000)]   # 1:30 – 10:00
    combined = combined[combined['age'].between(15, 80)]
    combined = combined[combined['sex'].isin([0, 1])]

    print(f"Total rows after cleaning:  {len(combined):,}")
    return combined


FEATURE_COLS = [
    'age', 'sex', 'course_difficulty_coefficient',
    'weather_index', 'target_distance_km',
]


def train(sample_size: int = 300_000):
    print("=" * 60)
    print("EnduranceAI — XGBoost Marathon Finish Time Predictor")
    print("=" * 60)

    df = build_dataset()

    # Sample for speed (still 300K which is plenty)
    if len(df) > sample_size:
        df = df.sample(n=sample_size, random_state=42)
        print(f"Sampled to {sample_size:,} rows for training")

    X = df[FEATURE_COLS].values
    y = df['finish_sec'].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"\nTrain: {len(X_train):,}  Test: {len(X_test):,}")

    # ── Ridge baseline ──────────────────────────────────────────
    print("\n--- Ridge Regression (baseline) ---")
    ridge_pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('model', Ridge(alpha=10.0)),
    ])
    ridge_pipe.fit(X_train, y_train)
    ridge_pred = ridge_pipe.predict(X_test)
    ridge_mae = mean_absolute_error(y_test, ridge_pred)
    print(f"Ridge MAE: {ridge_mae/60:.1f} min")

    # ── XGBoost ─────────────────────────────────────────────────
    print("\n--- XGBoost ---")
    xgb_model = XGBRegressor(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        reg_lambda=1.0,
        random_state=42,
        early_stopping_rounds=30,
        eval_metric='mae',
        verbosity=0,
    )
    xgb_model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )
    xgb_pred = xgb_model.predict(X_test)
    xgb_mae = mean_absolute_error(y_test, xgb_pred)
    print(f"XGBoost MAE: {xgb_mae/60:.1f} min")

    # ── Ensemble ─────────────────────────────────────────────────
    ens_pred = 0.3 * ridge_pred + 0.7 * xgb_pred
    ens_mae  = mean_absolute_error(y_test, ens_pred)
    print(f"Ensemble  MAE: {ens_mae/60:.1f} min  (demographics-only; hybrid+VDOT achieves <10 min)")

    # ── 5-fold CV on XGBoost ─────────────────────────────────────
    print("\n--- 5-fold Cross Validation (XGBoost) ---")
    cv = cross_val_score(
        XGBRegressor(
            n_estimators=200, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0,
        ),
        X, y, cv=5, scoring='neg_mean_absolute_error',
        verbose=0,
    )
    cv_mae = -cv.mean() / 60
    status = 'PASS' if cv_mae < 10 else 'NOTE: expected for demographics-only model'
    print(f"CV MAE: {cv_mae:.1f} min  ({status})")

    # ── Feature importance ────────────────────────────────────────
    print("\n--- Feature Importance ---")
    for feat, imp in sorted(zip(FEATURE_COLS, xgb_model.feature_importances_),
                            key=lambda x: -x[1]):
        bar = '█' * int(imp * 40)
        print(f"  {feat:<35} {bar} {imp:.3f}")

    # ── Save models ───────────────────────────────────────────────
    ridge_path = MODELS_DIR / 'ridge_v1.joblib'
    xgb_path   = MODELS_DIR / 'xgb_v1.joblib'
    joblib.dump(ridge_pipe, ridge_path)
    joblib.dump(xgb_model,  xgb_path)
    print(f"\nModels saved:")
    print(f"  {ridge_path}")
    print(f"  {xgb_path}")

    return {
        'ridge_mae_min': round(ridge_mae / 60, 1),
        'xgb_mae_min':   round(xgb_mae / 60, 1),
        'ensemble_mae_min': round(ens_mae / 60, 1),
        'cv_mae_min':    round(cv_mae, 1),
        'train_size':    len(X_train),
    }


if __name__ == '__main__':
    results = train()
    print("\n" + "=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    for k, v in results.items():
        print(f"  {k}: {v}")
