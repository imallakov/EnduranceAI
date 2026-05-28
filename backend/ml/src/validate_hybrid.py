"""
Validation 2: Hybrid Daniels + XGBoost on training-history dataset.

MarathonData.csv columns (verified from CSV):
['id', 'Marathon', 'Name', 'Category', 'km4week', 'sp4week', 'CrossTraining', 'Wall21', 'MarathonTime', 'CATEGORY']
- Wall21:       string, decimal hours (e.g. '1.16' = 1h9m36s) — half marathon time; ' -   ' = missing
- MarathonTime: float, decimal hours (e.g. 2.37 = 2h22m12s)
- km4week:      float, km run in the 4 weeks before race
- sp4week:      float, km of speed/interval work in 4 weeks
- CrossTraining: string or NaN; 'K' = yes
- Category:     'MAM' | 'WAM' | 'M40' | 'M45' | 'M50' | 'M55'

Dataset is TINY (87 rows, 6 with invalid Wall21 = 81 usable).
An 80/20 split gives ~64 train / ~16 test — error bars are very wide.

Run from backend/ directory:
    python -m ml.src.validate_hybrid
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

RIEGEL_MULTIPLIER = math.pow(42195.0 / 21097.5, 1.06)  # ≈ 2.0855

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / 'ml' / 'data' / 'kaggle'
RESULTS_DIR = BASE_DIR / 'ml' / 'validation_results'
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(BASE_DIR))
from ml.src.formulas import calc_vdot, daniels_equivalent_time  # noqa: E402

HALF_MARATHON_M = 21097.5
MARATHON_M = 42195.0

# Category → sex (1=male, 0=female)
CATEGORY_SEX = {'MAM': 1, 'M40': 1, 'M45': 1, 'M50': 1, 'M55': 1, 'WAM': 0}

# Category → approximate centre age
CATEGORY_AGE = {'MAM': 30, 'WAM': 30, 'M40': 42, 'M45': 47, 'M50': 52, 'M55': 57}

CORRECTION_FEATURES = ['km4week', 'sp4week', 'cross_training', 'sex', 'age_group']


def within_n_min(y_true, y_pred, n_min: int) -> float:
    diff_sec = np.abs(np.array(y_true, dtype=float) - np.array(y_pred, dtype=float))
    return float((diff_sec <= n_min * 60).mean() * 100)


def compute_metrics(y_true, y_pred) -> dict:
    mae_sec  = mean_absolute_error(y_true, y_pred)
    rmse_sec = np.sqrt(mean_squared_error(y_true, y_pred))
    r2       = r2_score(y_true, y_pred)
    med_ae   = float(np.median(np.abs(np.array(y_true) - np.array(y_pred))))
    return {
        'mae_min':        round(mae_sec / 60, 2),
        'rmse_min':       round(rmse_sec / 60, 2),
        'r2':             round(float(r2), 4),
        'median_ae_min':  round(med_ae / 60, 2),
        'within_5min_pct':  round(within_n_min(y_true, y_pred, 5), 1),
        'within_10min_pct': round(within_n_min(y_true, y_pred, 10), 1),
        'within_15min_pct': round(within_n_min(y_true, y_pred, 15), 1),
    }


def parse_wall21(val) -> float | None:
    s = str(val).strip().replace(' ', '')
    if s in ('', '-', 'nan', '--'):
        return None
    try:
        return float(s) * 3600.0
    except ValueError:
        return None


def main():
    print("=" * 60)
    print("Validation 2: Hybrid Daniels + XGBoost (MarathonData.csv)")
    print("=" * 60)

    df = pd.read_csv(DATA_DIR / 'Marathon-time-prediction' / 'MarathonData.csv')

    print("\n--- Exploratory ---")
    print("Columns:", df.columns.tolist())
    print("Shape:  ", df.shape)
    print("Head (3):")
    print(df.head(3).to_string())
    print("dtypes:")
    for c, t in df.dtypes.items():
        print(f"  {c}: {t}")
    print("NA:", df.isna().sum().to_dict())
    print("Category counts:", df['Category'].value_counts().to_dict())

    df['wall21_sec']     = df['Wall21'].apply(parse_wall21)
    df['marathon_sec']   = df['MarathonTime'].apply(
        lambda x: float(x) * 3600.0 if pd.notna(x) else None
    )
    df['cross_training'] = df['CrossTraining'].apply(
        lambda x: 1 if pd.notna(x) and 'K' in str(x) else 0
    )
    df['sex']        = df['Category'].map(CATEGORY_SEX)
    df['age_group']  = df['Category'].map(CATEGORY_AGE)

    df = df.dropna(subset=['wall21_sec', 'marathon_sec', 'sex', 'age_group'])
    df = df[df['wall21_sec'].between(45 * 60, 180 * 60)]    # half 45–180 min
    df = df[df['marathon_sec'].between(120 * 60, 480 * 60)] # full 2h–8h

    df['vdot'] = df['wall21_sec'].apply(
        lambda w: calc_vdot(HALF_MARATHON_M, w) if w and w > 0 else None
    )
    df = df.dropna(subset=['vdot'])
    df = df[df['vdot'].between(25, 85)]

    n_total = len(df)
    print(f"\nAfter filtering: {n_total} usable rows")
    print(f"VDOT range: {df['vdot'].min():.1f} - {df['vdot'].max():.1f}")
    print(f"WARNING: Only {n_total} rows. Test set ~{int(n_total * 0.2)} runners -- "
          f"results carry very wide error bars.")

    df['daniels_pred_sec'] = df['vdot'].apply(
        lambda v: daniels_equivalent_time(v, MARATHON_M)
    )

    df = df.dropna(subset=CORRECTION_FEATURES)
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

    print(f"\nTrain: {len(train_df)}  Test: {len(test_df)}")

    y_train_true = train_df['marathon_sec'].values
    y_test_true  = test_df['marathon_sec'].values
    daniels_test = test_df['daniels_pred_sec'].values

    riegel_test = test_df['wall21_sec'].values * RIEGEL_MULTIPLIER
    riegel_metrics = compute_metrics(y_test_true, riegel_test)
    print(f"\nRiegel formula (test):        MAE={riegel_metrics['mae_min']:.1f} min  "
          f"R²={riegel_metrics['r2']:.3f}")

    daniels_metrics = compute_metrics(y_test_true, daniels_test)
    print(f"Daniels VDOT baseline (test): MAE={daniels_metrics['mae_min']:.1f} min  "
          f"R²={daniels_metrics['r2']:.3f}")

    train_residual = y_train_true - train_df['daniels_pred_sec'].values
    X_train = train_df[CORRECTION_FEATURES].values
    X_test  = test_df[CORRECTION_FEATURES].values

    xgb = XGBRegressor(
        n_estimators=100, max_depth=2, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        min_child_weight=3, reg_lambda=5.0,
        random_state=42, verbosity=0,
    )
    xgb.fit(X_train, train_residual)

    xgb_correction_test = xgb.predict(X_test)
    hybrid_test_pred    = daniels_test + xgb_correction_test

    hybrid_metrics = compute_metrics(y_test_true, hybrid_test_pred)

    improvement_pct = (
        (daniels_metrics['mae_min'] - hybrid_metrics['mae_min'])
        / daniels_metrics['mae_min'] * 100
    )
    improvement_vs_riegel_pct = (
        (riegel_metrics['mae_min'] - hybrid_metrics['mae_min'])
        / riegel_metrics['mae_min'] * 100
    )
    speedup_vs_riegel = riegel_metrics['mae_min'] / hybrid_metrics['mae_min']
    print(f"Hybrid (Daniels+XGB) (test):  MAE={hybrid_metrics['mae_min']:.1f} min  "
          f"R²={hybrid_metrics['r2']:.3f}")
    print(f"\nImprovement vs Daniels: {improvement_pct:+.1f}%")
    print(f"Hybrid is {speedup_vs_riegel:.2f}x more accurate than Riegel")

    results = {
        "dataset": "MarathonData.csv — 80/20 split, random_state=42",
        "n_total": n_total,
        "n_train": int(len(train_df)),
        "n_test":  int(len(test_df)),
        "warning": (
            f"Only {n_total} total rows. Test set is {len(test_df)} runners — "
            f"all percentage figures have very wide confidence intervals."
        ),
        "riegel_baseline":            riegel_metrics,
        "daniels_baseline":           daniels_metrics,
        "hybrid_with_ml":             hybrid_metrics,
        "improvement_pct_vs_daniels": round(improvement_pct, 1),
        "improvement_pct_vs_riegel":  round(improvement_vs_riegel_pct, 1),
        "speedup_vs_riegel":          round(speedup_vs_riegel, 2),
    }

    out_path = RESULTS_DIR / 'hybrid.json'
    with open(out_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved: {out_path}")

    return results


if __name__ == '__main__':
    main()
