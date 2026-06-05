"""
Train the marathon->marathon predictor on linked (prior -> next) pairs.

This is the transferable Tier-A model: given a runner's previous marathon,
their age/sex, the time gap, and the two course coefficients, predict the
next marathon. In production the app feeds the user's most recent real
marathon (manual entry / Strava / MarathonAttempt).

Validation is a TEMPORAL holdout: train on target races up to 2017, test on
2018-2019 — so we measure generalisation to future races, and report
accuracy split by how stale the prior result is (year_gap).

Run from backend/ (after build_repeat_pairs):
    python -m ml.src.train_repeat
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
from xgboost import XGBRegressor

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PAIRS = BASE_DIR / 'ml' / 'data' / 'kaggle' / '_derived' / 'repeat_pairs.csv'
MODELS_DIR = BASE_DIR / 'ml' / 'models'
RESULTS_DIR = BASE_DIR / 'ml' / 'validation_results'
MODELS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

FEATURES = ['prev_finish_sec', 'prev_coeff', 'coeff', 'age', 'sex', 'year_gap']


def mae_min(a, b):
    return float(np.abs(np.asarray(a, float) - np.asarray(b, float)).mean()) / 60


def report(name, y_true, y_pred):
    err = np.abs(np.asarray(y_true, float) - np.asarray(y_pred, float))
    return {
        'model': name,
        'mae_min': round(float(err.mean()) / 60, 2),
        'median_min': round(float(np.median(err)) / 60, 2),
        'within_10min_pct': round(float((err <= 600).mean()) * 100, 1),
        'within_15min_pct': round(float((err <= 900).mean()) * 100, 1),
        'bias_min': round(float((np.asarray(y_pred) - np.asarray(y_true)).mean()) / 60, 2),
    }


def main():
    print("=" * 64)
    print("Marathon -> marathon predictor (linked repeat runners)")
    print("=" * 64)

    df = pd.read_csv(PAIRS)
    print(f"Pairs: {len(df):,}")

    train = df[df['year'] <= 2017]
    test = df[df['year'] >= 2018]
    print(f"Train (target year <=2017): {len(train):,}")
    print(f"Test  (target year 2018-19): {len(test):,}")

    Xtr, ytr = train[FEATURES].values, train['finish_sec'].values
    Xte, yte = test[FEATURES].values, test['finish_sec'].values

    model = XGBRegressor(
        n_estimators=600, max_depth=5, learning_rate=0.03,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=20,
        reg_lambda=2.0, random_state=42, verbosity=0,
    )
    model.fit(Xtr, ytr)

    # Baselines on test
    prev = test['prev_finish_sec'].values
    course_ratio = test['coeff'].values / test['prev_coeff'].values
    rows = [
        report('next = prev', yte, prev),
        report('next = prev*course_ratio', yte, prev * course_ratio),
        report('XGB marathon->marathon', yte, model.predict(Xte)),
    ]
    print(f"\n  {'model':<28}{'MAE':>7}{'median':>8}{'<10m':>7}{'<15m':>7}{'bias':>8}")
    for r in rows:
        print(f"  {r['model']:<28}{r['mae_min']:>6.2f}m{r['median_min']:>7.2f}m"
              f"{r['within_10min_pct']:>6.1f}%{r['within_15min_pct']:>6.1f}%{r['bias_min']:>+7.1f}m")

    # Accuracy by staleness of the prior result
    print("\n── XGB accuracy by year_gap (recent prior = better) ──")
    pred_te = model.predict(Xte)
    by_gap = {}
    for gap in sorted(test['year_gap'].unique()):
        m = test['year_gap'].values == gap
        if m.sum() < 200:
            continue
        gap_mae = mae_min(yte[m], pred_te[m])
        gap_prev = mae_min(yte[m], prev[m])
        by_gap[int(gap)] = {'n': int(m.sum()), 'xgb_mae': round(gap_mae, 2),
                            'prev_mae': round(gap_prev, 2)}
        print(f"  gap {int(gap)}y (n={m.sum():>6,}): XGB {gap_mae:5.2f}m  vs  prev {gap_prev:5.2f}m")

    print("\nFeature importances:")
    for f, imp in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
        print(f"  {f:<18} {'#'*int(imp*40)} {imp:.3f}")

    model_path = MODELS_DIR / 'xgb_repeat_v1.joblib'
    joblib.dump(model, model_path)
    meta = {
        'features': FEATURES,
        'target': 'next_marathon_finish_sec',
        'train': 'fall marathons, target year <=2017',
        'n_train': int(len(train)), 'n_test': int(len(test)),
        'test_metrics': rows,
        'by_year_gap': by_gap,
        'feature_importances': dict(zip(FEATURES, [round(float(x), 4) for x in model.feature_importances_])),
    }
    with open(RESULTS_DIR / 'repeat_v1.json', 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"\nSaved model:   {model_path}")
    print(f"Saved metrics: {RESULTS_DIR / 'repeat_v1.json'}")


if __name__ == '__main__':
    main()
