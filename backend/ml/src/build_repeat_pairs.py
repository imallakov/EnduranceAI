"""
Link the same runner across races/years to build (prior marathon -> next
marathon) pairs — the transferable training signal the single-race datasets
can't provide on their own.

Source: 2010-2019 fall marathons (2.05M finishes, 96 courses, Name+Year+Age).
Linking key: NAME|GENDER, disambiguated by an age-consistency check
(age must grow by the year gap, +/-1) to drop same-name different-person
collisions.

This script only BUILDS + QUALITY-CHECKS the pairs and prints a trivial
baseline. Model training is a separate step once the pairs look clean.

Run from backend/:
    python -m ml.src.build_repeat_pairs
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / 'ml' / 'data' / 'kaggle'
OUT = DATA_DIR / '_derived'
OUT.mkdir(parents=True, exist_ok=True)

# Curated course coefficients (the ones we have a basis for). Unknown -> 1.012.
# St. George is genuinely net-downhill/fast, so <1.0 (the old train.py had it
# wrong at 1.025 — see critique pt.5).
COURSE_COEFFS = {
    'NYC Marathon': 1.048,
    'Chicago Marathon': 1.001,
    'Marine Corps Marathon': 1.020,
    'Philadelphia Marathon': 1.010,
    'Twin Cities Marathon': 1.015,
    'St. George Marathon': 0.985,
    'Portland Marathon': 1.010,
    'Columbus Marathon': 1.010,
    'Richmond Marathon': 1.012,
    'Indianapolis Monumental Marathon': 1.005,
    'Baltimore Marathon': 1.020,
    'Steamtown Marathon': 0.985,   # net downhill
    'Big Cottonwood Marathon': 0.980,
    'REVEL Canyon City Marathon': 0.975,
}
DEFAULT_COEFF = 1.012


def main():
    print("=" * 64)
    print("Building (prior -> next) marathon pairs from fall marathons")
    print("=" * 64)

    df = pd.read_csv(
        DATA_DIR / '2010-2019-fall-marathons' / 'Results.csv',
        usecols=['Race', 'Year', 'Name', 'Gender', 'Age', 'Finish'],
    )
    df = df.rename(columns={'Race': 'race', 'Year': 'year', 'Name': 'name',
                            'Gender': 'sex_raw', 'Age': 'age', 'Finish': 'finish_sec'})

    # Basic cleaning
    df = df.dropna(subset=['name', 'sex_raw', 'age', 'finish_sec', 'year'])
    df = df[df['finish_sec'].between(5400, 36000)]   # 1:30 .. 10:00
    df = df[df['age'].between(16, 85)]
    df['sex'] = df['sex_raw'].astype(str).str.upper().map(
        lambda s: 1 if s.startswith('M') else (0 if s.startswith(('F', 'W')) else np.nan))
    df = df.dropna(subset=['sex'])
    df['key'] = df['name'].str.strip().str.upper() + '|' + df['sex'].astype(int).astype(str)
    df['coeff'] = df['race'].map(COURSE_COEFFS).fillna(DEFAULT_COEFF)
    print(f"Clean finishes: {len(df):,}")

    # Sort each runner's races by year, form CONSECUTIVE (prior -> next) pairs.
    df = df.sort_values(['key', 'year'])
    g = df.groupby('key')
    nxt = df.copy()
    for col in ['race', 'year', 'age', 'finish_sec', 'coeff']:
        nxt[f'prev_{col}'] = g[col].shift(1)
    pairs = nxt.dropna(subset=['prev_finish_sec']).copy()

    # Age-consistency: age must increase by the year gap (+/-1). Kills collisions.
    pairs['year_gap'] = pairs['year'] - pairs['prev_year']
    pairs['age_gap'] = pairs['age'] - pairs['prev_age']
    pairs = pairs[pairs['year_gap'].between(1, 6)]          # 1-6 years apart
    pairs = pairs[(pairs['age_gap'] - pairs['year_gap']).abs() <= 1]

    print(f"Consecutive pairs after age-consistency filter: {len(pairs):,}")
    print(f"Distinct runners with >=1 valid pair:           {pairs['key'].nunique():,}")

    # ── Quality: does prior predict next better than demographics? ──
    prev = pairs['prev_finish_sec'].values
    actual = pairs['finish_sec'].values

    # Baseline 0: population mean (what a demographics model floors at)
    pop_mae = np.abs(actual - actual.mean()).mean()
    # Baseline 1: next == prev
    b1 = np.abs(actual - prev).mean()
    # Baseline 2: next == prev * (target_coeff / prev_coeff)  (course transfer)
    b2_pred = prev * (pairs['coeff'].values / pairs['prev_coeff'].values)
    b2 = np.abs(actual - b2_pred).mean()
    corr = np.corrcoef(prev, actual)[0, 1]

    print("\n── trivial baselines (MAE, minutes) ──")
    print(f"  population mean (demographics floor): {pop_mae/60:6.2f}")
    print(f"  next = prev:                         {b1/60:6.2f}")
    print(f"  next = prev * course_ratio:          {b2/60:6.2f}")
    print(f"  corr(prev, next): {corr:.3f}")
    print(f"  median |next-prev|: {np.median(np.abs(actual-prev))/60:.2f} min")

    # Distribution sanity
    print("\n── pair sanity ──")
    print(f"  prev finish  median {np.median(prev)/3600:.2f} h")
    print(f"  next finish  median {np.median(actual)/3600:.2f} h")
    print(f"  year_gap dist: {pairs['year_gap'].value_counts().sort_index().to_dict()}")

    keep = ['key', 'sex', 'age', 'prev_age', 'year', 'prev_year', 'year_gap',
            'race', 'prev_race', 'coeff', 'prev_coeff',
            'finish_sec', 'prev_finish_sec']
    out_path = OUT / 'repeat_pairs.parquet'
    try:
        pairs[keep].to_parquet(out_path, index=False)
        print(f"\nSaved pairs: {out_path}  ({len(pairs):,} rows)")
    except Exception as e:
        out_path = OUT / 'repeat_pairs.csv'
        pairs[keep].to_csv(out_path, index=False)
        print(f"\n(parquet unavailable: {e}) Saved CSV: {out_path}  ({len(pairs):,} rows)")


if __name__ == '__main__':
    main()
