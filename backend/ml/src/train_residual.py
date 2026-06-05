"""
Fitness-aware residual model (v2) — the honest replacement for the
demographics-only XGB.

Idea
----
The analytic core already knows physics:
    base     = Daniels(VDOT)
    adjusted = base * course_coeff * weather_index
What it does NOT know is the *individual marathon durability* — how much
slower than the VDOT-equivalent a runner actually finishes 42.195 km
("hitting the wall"). For amateurs this gap is large and systematic; for
elites it's small. We learn exactly that gap and nothing else:

    residual  = actual_finish - adjusted
    predicted = adjusted + model(vdot, age, sex)

Training signal
---------------
Boston 2015-2017 carry per-runner Half splits + Official Time. From the
Half split we derive a VDOT exactly the way the app derives current_vdot
from a runner's effort, compute the Daniels marathon-equivalent, scale by
Boston's course+weather, and regress the leftover residual on fitness.

Validation is a TEMPORAL holdout (train 2015+2016, test 2017) — this mimics
deploying on a future race far better than a random split, which leaks
same-race pacing structure across train/test.

Run from backend/:
    python -m ml.src.train_residual
"""
import json
import math
import sys
from pathlib import Path

# Windows consoles default to cp1250/cp1252 and choke on box-drawing glyphs.
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import mean_absolute_error
from xgboost import XGBRegressor

from ml.src.formulas import calc_vdot, daniels_equivalent_time

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / 'ml' / 'data' / 'kaggle'
MODELS_DIR = BASE_DIR / 'ml' / 'models'
RESULTS_DIR = BASE_DIR / 'ml' / 'validation_results'
MODELS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

HALF_M = 21097.5
MARATHON_M = 42195.0
RIEGEL_MULT = math.pow(MARATHON_M / HALF_M, 1.06)  # ~2.0855
BOSTON_COURSE_COEFF = 1.038

# Boston race-day conditions (race hours ~10-14 local), approximate from
# historical reports. Boston is a single course so course_coeff is constant;
# weather is the only analytic varying term across years.
BOSTON_WEATHER = {
    2015: (7.0, 80),    # cold, headwind, rain
    2016: (17.0, 55),   # warm, sunny
    2017: (22.0, 50),   # hot — notoriously
    2024: (15.0, 65),   # mild
}


def weather_index(temp_c, humidity_pct, wind_ms=0.0):
    # Same formula the app currently ships (ml/src/weather.py). pt.4 will
    # replace it with WBGT; kept identical here for pipeline consistency.
    temp_penalty = max(0.0, (temp_c - 10.0) * 0.004)
    humidity_penalty = max(0.0, (humidity_pct - 60) * 0.001)
    return round(1.0 + temp_penalty + humidity_penalty, 4)


def parse_hhmmss(t):
    if pd.isna(t):
        return None
    s = str(t).strip()
    parts = s.split(':')
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
    except ValueError:
        return None
    return None


def sex_to_int(s):
    s = str(s).strip().upper()
    if s in ('M', 'MALE', '1'):
        return 1
    if s in ('F', 'W', 'FEMALE', '0'):
        return 0
    return None


def load_boston_year(year):
    """Boston classic-format file (2015-2017): Half + Official Time."""
    path = DATA_DIR / 'Boston-marathon' / f'marathon_results_{year}.csv'
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path, usecols=['Age', 'M/F', 'Half', 'Official Time'],
                     low_memory=False)
    df = df.rename(columns={'Age': 'age', 'M/F': 'sex_raw',
                            'Half': 'half_str', 'Official Time': 'fin_str'})
    df['half_sec'] = df['half_str'].map(parse_hhmmss)
    df['finish_sec'] = df['fin_str'].map(parse_hhmmss)
    df['sex'] = df['sex_raw'].map(sex_to_int)
    df['year'] = year
    return df


def load_boston_2024():
    """Boston 2024 file: First Half + Finish (different schema)."""
    path = DATA_DIR / 'Boston-2024-weather-splits' / 'Athletes.csv'
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path, usecols=['Age', 'Gender', 'First Half', 'Finish'])
    df = df.rename(columns={'Age': 'age', 'Gender': 'sex_raw',
                            'First Half': 'half_str', 'Finish': 'fin_str'})
    df['half_sec'] = df['half_str'].map(parse_hhmmss)
    df['finish_sec'] = df['fin_str'].map(parse_hhmmss)
    df['sex'] = df['sex_raw'].map(sex_to_int)
    df['year'] = 2024
    return df


def prepare(df):
    """Clean, derive VDOT-from-half, analytic expectation, and residual."""
    if df.empty:
        return df
    df = df.dropna(subset=['half_sec', 'finish_sec', 'sex', 'age']).copy()
    df = df[(df['half_sec'] > 0) & (df['finish_sec'] > 0)]
    # Keep only plausible full/half ratios — removes walkers, injuries
    # mid-race, and timing-mat errors that aren't a "ran the marathon" signal.
    df['ratio'] = df['finish_sec'] / df['half_sec']
    df = df[df['ratio'].between(1.85, 2.6)]
    df = df[df['age'].between(18, 80)]

    df['vdot'] = df['half_sec'].map(lambda s: calc_vdot(HALF_M, s))
    df = df[df['vdot'].between(25, 85)]

    df['daniels_equiv'] = df['vdot'].map(lambda v: daniels_equivalent_time(v, MARATHON_M))

    def wx(y):
        t, h = BOSTON_WEATHER.get(int(y), (15.0, 65))
        return weather_index(t, h)
    df['weather_index'] = df['year'].map(wx)
    df['adjusted'] = df['daniels_equiv'] * BOSTON_COURSE_COEFF * df['weather_index']
    df['residual'] = df['finish_sec'] - df['adjusted']
    return df


def metrics(y_true, y_pred):
    y_true = np.asarray(y_true, float)
    y_pred = np.asarray(y_pred, float)
    err = np.abs(y_true - y_pred)
    return {
        'mae_min': round(float(err.mean()) / 60, 2),
        'median_min': round(float(np.median(err)) / 60, 2),
        'within_5min_pct': round(float((err <= 300).mean()) * 100, 1),
        'within_10min_pct': round(float((err <= 600).mean()) * 100, 1),
        'bias_min': round(float((y_pred - y_true).mean()) / 60, 2),  # +=over-predict
    }


def main():
    print("=" * 64)
    print("Residual durability model — Boston half->full")
    print("=" * 64)

    train_df = pd.concat([prepare(load_boston_year(y)) for y in (2015, 2016)],
                         ignore_index=True)
    test17 = prepare(load_boston_year(2017))
    test24 = prepare(load_boston_2024())

    print(f"\nTrain (2015+2016): {len(train_df):,} runners")
    print(f"Test  (2017):      {len(test17):,} runners")
    print(f"Test  (2024):      {len(test24):,} runners")
    print(f"\nResidual stats on TRAIN (sec): mean={train_df['residual'].mean():.0f} "
          f"median={train_df['residual'].median():.0f} std={train_df['residual'].std():.0f}")
    print("  (positive = ran SLOWER than Daniels-equiv adjusted for course+weather)")

    feats = ['vdot', 'age', 'sex']
    Xtr = train_df[feats].values
    ytr = train_df['residual'].values

    model = XGBRegressor(
        n_estimators=300, max_depth=3, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.9, min_child_weight=20,
        reg_lambda=2.0, random_state=42, verbosity=0,
    )
    model.fit(Xtr, ytr)

    def evaluate(name, df):
        if df.empty:
            print(f"\n[{name}] empty — skipped")
            return None
        y_true = df['finish_sec'].values
        riegel = df['half_sec'].values * RIEGEL_MULT
        daniels = df['daniels_equiv'].values
        analytic = df['adjusted'].values                       # +course+weather, no ML
        hybrid = analytic + model.predict(df[feats].values)    # +ML durability

        m_rie = metrics(y_true, riegel)
        m_dan = metrics(y_true, daniels)
        m_ana = metrics(y_true, analytic)
        m_hyb = metrics(y_true, hybrid)
        print(f"\n── {name} (n={len(df):,}) ─────────────────────────────")
        print(f"  {'model':<26}{'MAE':>7}{'median':>8}{'<5min':>8}{'<10min':>9}{'bias':>8}")
        for label, mm in [('Riegel (half x2.085)', m_rie),
                          ('Daniels equiv', m_dan),
                          ('Analytic (+course+wx)', m_ana),
                          ('Hybrid (+ML residual)', m_hyb)]:
            print(f"  {label:<26}{mm['mae_min']:>6.2f}m{mm['median_min']:>7.2f}m"
                  f"{mm['within_5min_pct']:>7.1f}%{mm['within_10min_pct']:>8.1f}%"
                  f"{mm['bias_min']:>+7.1f}m")
        return {'riegel': m_rie, 'daniels': m_dan, 'analytic': m_ana, 'hybrid': m_hyb}

    res17 = evaluate("TEST 2017 (temporal holdout)", test17)
    res24 = evaluate("TEST 2024 (out-of-distribution)", test24)

    # Interpretability: what did the model learn across the fitness range?
    print("\n── learned durability fade by VDOT (sex=M, age=40) ──")
    for v in (35, 40, 45, 50, 55, 60, 65):
        pred = float(model.predict(np.array([[v, 40, 1]]))[0])
        equiv = daniels_equivalent_time(v, MARATHON_M)
        print(f"  VDOT {v:>2}: Daniels equiv {equiv//60:>3.0f}:{equiv%60:02.0f}  "
              f"-> +{pred/60:>4.1f} min durability fade")

    # Save model + metadata
    model_path = MODELS_DIR / 'xgb_residual_v2.joblib'
    joblib.dump(model, model_path)
    meta = {
        'features': feats,
        'target': 'residual = finish - daniels_equiv*course*weather',
        'train': 'Boston 2015+2016',
        'n_train': int(len(train_df)),
        'test_2017': res17,
        'test_2024': res24,
        'feature_importances': dict(zip(feats, [round(float(x), 4) for x in model.feature_importances_])),
        'note': 'VDOT here is derived from the same-day Half split; in production '
                'it comes from a training effort weeks before the race, so real '
                'CIs should be wider than this holdout suggests.',
    }
    with open(RESULTS_DIR / 'residual_v2.json', 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"\nSaved model:   {model_path}")
    print(f"Saved metrics: {RESULTS_DIR / 'residual_v2.json'}")
    print("Feature importances:", meta['feature_importances'])


if __name__ == '__main__':
    main()
