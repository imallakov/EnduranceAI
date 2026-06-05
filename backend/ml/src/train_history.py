"""
Experiment #2 — does a richer RACE HISTORY (not just the single prior
marathon) predict the next one better?

Hypothesis from the user: a year between marathons can mean "trained hard" or
"sat on the couch", and prev_finish alone can't tell them apart. If a runner's
broader history — how many marathons they've done, their PB, their trend, how
recently they last raced — carries that signal, a model using it should beat
the trivial "next = prev".

For each runner with >=2 marathons we take every marathon after their first as
a target and build features from ALL their earlier marathons:
  prev_finish, best_prior, mean_prior, n_prior, years_since_prev,
  trend_sec_per_year, + age, sex, course coeffs.

Temporal holdout: target year >=2018. Baselines: next=prev, next=best_prior.

Run from backend/:
    python -m ml.src.train_history
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from xgboost import XGBRegressor

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / 'ml' / 'data' / 'kaggle'

COURSE_COEFFS = {
    'NYC Marathon': 1.048, 'Chicago Marathon': 1.001, 'Marine Corps Marathon': 1.020,
    'Philadelphia Marathon': 1.010, 'Twin Cities Marathon': 1.015,
    'St. George Marathon': 0.985, 'Steamtown Marathon': 0.985,
}
DEFAULT_COEFF = 1.012


def mae_min(a, b):
    return float(np.abs(np.asarray(a, float) - np.asarray(b, float)).mean()) / 60


def main():
    print("=" * 64)
    print("Experiment #2 — race-history features vs next=prev")
    print("=" * 64)

    df = pd.read_csv(
        DATA_DIR / '2010-2019-fall-marathons' / 'Results.csv',
        usecols=['Race', 'Year', 'Name', 'Gender', 'Age', 'Finish'],
    ).rename(columns={'Race': 'race', 'Year': 'year', 'Name': 'name',
                      'Gender': 'sex_raw', 'Age': 'age', 'Finish': 'finish'})
    df = df.dropna(subset=['name', 'sex_raw', 'age', 'finish', 'year'])
    df = df[df['finish'].between(5400, 36000)]
    df = df[df['age'].between(16, 85)]
    df['sex'] = df['sex_raw'].astype(str).str.upper().map(
        lambda s: 1 if s.startswith('M') else (0 if s.startswith(('F', 'W')) else np.nan))
    df = df.dropna(subset=['sex'])
    df['key'] = df['name'].str.strip().str.upper() + '|' + df['sex'].astype(int).astype(str)
    df['coeff'] = df['race'].map(COURSE_COEFFS).fillna(DEFAULT_COEFF)

    # One marathon per runner-year (keep the fastest) to reduce same-year noise,
    # then keep only runners with >=2 distinct years.
    df = df.sort_values(['key', 'year', 'finish']).drop_duplicates(['key', 'year'], keep='first')
    counts = df.groupby('key')['year'].transform('count')
    df = df[counts >= 2].copy()
    df = df.sort_values(['key', 'year'])
    print(f"Runners with >=2 marathon-years: {df['key'].nunique():,}  rows: {len(df):,}")

    g = df.groupby('key')
    # Priors-only aggregates (shift within group to exclude the current row).
    df['prev_finish'] = g['finish'].shift(1)
    df['prev_year']   = g['year'].shift(1)
    df['prev_coeff']  = g['coeff'].shift(1)
    df['n_prior']     = g.cumcount()                              # number of earlier marathons
    df['best_prior']  = g['finish'].cummin().groupby(df['key']).shift(1)
    csum = g['finish'].cumsum() - df['finish']                   # sum of priors
    df['mean_prior']  = np.where(df['n_prior'] > 0, csum / df['n_prior'].replace(0, np.nan), np.nan)
    df['first_finish'] = g['finish'].transform('first')
    df['first_year']   = g['year'].transform('first')

    df = df[df['n_prior'] >= 1].copy()
    df['years_since_prev'] = (df['year'] - df['prev_year']).clip(lower=0)
    span = (df['prev_year'] - df['first_year'])
    df['trend_sec_per_year'] = np.where(
        span > 0, (df['prev_finish'] - df['first_finish']) / span, 0.0)

    feats = ['prev_finish', 'best_prior', 'mean_prior', 'n_prior',
             'years_since_prev', 'trend_sec_per_year', 'prev_coeff', 'coeff',
             'age', 'sex']
    df = df.dropna(subset=feats + ['finish'])

    train = df[df['year'] <= 2017]
    test = df[df['year'] >= 2018]
    print(f"History pairs — train: {len(train):,}  test: {len(test):,}")

    model = XGBRegressor(
        n_estimators=600, max_depth=5, learning_rate=0.03,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=20,
        reg_lambda=2.0, random_state=42, verbosity=0,
    )
    model.fit(train[feats].values, train['finish'].values)

    yte = test['finish'].values
    print("\n── MAE (min) on 2018-19 holdout ──")
    print(f"  next = prev                : {mae_min(yte, test['prev_finish']):.2f}")
    print(f"  next = best_prior          : {mae_min(yte, test['best_prior']):.2f}")
    print(f"  XGB (history features)     : {mae_min(yte, model.predict(test[feats].values)):.2f}")

    print("\nFeature importances:")
    for f, imp in sorted(zip(feats, model.feature_importances_), key=lambda x: -x[1]):
        print(f"  {f:<20} {'#'*int(imp*40)} {imp:.3f}")

    # Save as the production Tier-A model (supersedes single-prev xgb_repeat_v1).
    import joblib, json
    MODELS_DIR = BASE_DIR / 'ml' / 'models'
    RESULTS_DIR = BASE_DIR / 'ml' / 'validation_results'
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODELS_DIR / 'xgb_history_v1.joblib')
    with open(RESULTS_DIR / 'history_v1.json', 'w') as fh:
        json.dump({
            'features': feats,
            'n_train': int(len(train)), 'n_test': int(len(test)),
            'feature_importances': dict(zip(feats, [round(float(x), 4) for x in model.feature_importances_])),
        }, fh, indent=2)
    print('Saved model:', MODELS_DIR / 'xgb_history_v1.joblib')

    # Does the richer history help MORE when the prior is stale (the couch-vs-
    # breakthrough case the user cares about)?
    print("\n── by years_since_prev (XGB vs next=prev) ──")
    pred = model.predict(test[feats].values)
    for lo, hi, label in [(1, 1, '1y'), (2, 3, '2-3y'), (4, 99, '4y+')]:
        m = test['years_since_prev'].between(lo, hi).values
        if m.sum() < 200:
            continue
        print(f"  {label:>5} (n={m.sum():>6,}): XGB {mae_min(yte[m], pred[m]):.2f}  "
              f"vs prev {mae_min(yte[m], test['prev_finish'].values[m]):.2f}")


if __name__ == '__main__':
    main()
