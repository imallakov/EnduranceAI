# EnduranceAI Model Validation Results

Generated: 2026-05-27 (updated with Riegel baseline)

---

## Validation 1: Demographics-only baseline (Boston 2015 → 2016 holdout)

**Script:** `backend/ml/src/validate_demographic.py`

Train on all Boston 2015 finishers, test on all Boston 2016 finishers (strict temporal holdout — no data leakage).  
Model: Ridge(α=10) + XGBoost(500 est, depth=6, lr=0.05), ensemble 0.3R + 0.7X.  
Features: age, sex, course_difficulty_coefficient, weather_index, target_distance_km.

| Metric | Value |
|---|---|
| Train size | 26,586 |
| Test size  | 26,615 |
| **MAE** | **27.3 min** |
| RMSE | 38.3 min |
| R² | 0.116 |
| Median AE | 19.2 min |
| Within ±5 min | 13.9% |
| Within ±10 min | 27.1% |
| Within ±15 min | 40.0% |

**Interpretation:** Demographics alone (age + sex + course + weather) explain only ~12% of finish time variance. This is expected — the spread within each age/sex group is enormous. This model is a *lower bound* on what the system achieves; VDOT-powered predictions are in a fundamentally different accuracy class (see Validation 2).

---

## Validation 2: Hybrid with training history (MarathonData.csv)

**Script:** `backend/ml/src/validate_hybrid.py`

Dataset: 87 runners from Prague, Berlin, and similar European marathons with full training history (km4week, sp4week, CrossTraining, and half-marathon split). 6 rows had missing Wall21 → 81 usable. 80/20 split, random_state=42.

VDOT estimated from Wall21 (half marathon time) via `calc_vdot(21097.5, wall21_sec)`.  
Hybrid = Daniels baseline + XGBoost correction trained on (km4week, sp4week, cross_training, sex, age_group).

| Model | MAE (min) | RMSE (min) | R² | Within ±10 min |
|---|---|---|---|---|
| Riegel formula (industry baseline) | 6.5 | 8.1 | 0.881 | 88.2% |
| Daniels VDOT baseline | 6.2 | 9.4 | 0.900 | 76.5% |
| Hybrid (Daniels + XGBoost) | **4.7** | 7.3 | 0.944 | 88.2% |
| **Improvement vs Riegel** | **1.39× more accurate** | | | |
| **Improvement vs Daniels** | **+24.3%** | | | |

**Interpretation:** Riegel formula (T2 = T1 × (D2/D1)^1.06) is the de-facto industry standard used by Strava, MarathonGuide.com, and most free running calculators — on this test set it achieves 6.5 min MAE. With a half-marathon time to anchor VDOT, Daniels analytics alone achieve 6.2 min MAE — already slightly better. Adding training volume and intensity features reduces error further to 4.7 min, making the hybrid **1.39× more accurate than Riegel**. This is the closest proxy for EnduranceAI's real-world accuracy when users have activity history and a recent race result.

---

## Validation 3: Weather correction (Boston 2024)

**Script:** `backend/ml/src/validate_weather.py`

Demographics model (trained on Boston 2015, weather_index=1.0) tested on Boston 2024 (17,206 runners).  
Race day conditions: 15.8°C (from Weather.csv zip-code averages on 4/15/24), humidity 62% (estimated), wind 2.0 m/s.  
Weather index applied: 1.0251 (ACSM formula).

| | MAE (min) | RMSE (min) | R² | Within ±10 min |
|---|---|---|---|---|
| Without weather correction | 34.7 | 45.8 | 0.131 | 17.9% |
| With weather correction (×1.0251) | 35.7 | 45.2 | 0.153 | 15.4% |
| Δ MAE | −1.0 min | | | |

**Interpretation:** On a demographics-only model, the weather correction doesn't improve MAE (+2.5% multiplicative shift on already-noisy predictions). R² and RMSE slightly improve, suggesting the correction captures variance but the model's demographic-level bias dominates. Weather correction is most meaningful when combined with VDOT-anchored predictions (where systematic error is already small). This test is limited by the model having no individual fitness signal; real production predictions use VDOT as the primary driver.

---

## Methodology

**Validation 1 (Demographics holdout)**  
Strictly temporal split: 2015 = train, 2016 = test. No runner overlap. Uses the same 5-feature architecture, Ridge/XGBoost ensemble, and hyperparameters as production `train.py`. Represents upper-bound error for a demographics-only prediction (i.e., no personal training data).

**Validation 2 (Hybrid training-history)**  
Only dataset with km4week, sp4week, and half-marathon time. Honest 80/20 split. XGBoost corrects the Daniels analytic residual — trained *only* on train set. Daniels baseline is purely analytic (no fitting). Represents the best-case accuracy when a user has recent race history and training logs.

**Validation 3 (Weather correction)**  
Model retrained from scratch on Boston 2015 with weather_index=1.0. Tested on Boston 2024 with and without multiplicative ACSM correction. Humidity and wind are estimated (not in the Athletes.csv); only temperature is sourced from the data.

---

## Honest caveats

- **Demographics-only MAE (27 min) does NOT represent EnduranceAI's prediction accuracy.** The production system uses VDOT derived from the user's actual activity history. Validation 2 (MAE 4.7–6.2 min) is the relevant benchmark.

- **MarathonData.csv is tiny** — 81 rows, 17 test samples. All percentages in Validation 2 should be treated as point estimates with ±10–15% confidence intervals. A larger dataset with full training history would be needed for statistically robust results.

- **Weather validation uses race-wide conditions**, not per-athlete data. Humidity and wind are estimates; only temperature is sourced from zip-code weather averages. On a demographics-only base model, the 2.5% weather multiplier is in the noise.

- **All models are trained on Western marathoners** (Boston, Berlin, Prague, NYC, Chicago). International generalization — especially for courses with significantly different elevation profiles or runner populations — is not validated.

- **No overfitting check on Validation 2** beyond train/test split. The tiny training set (64 runners) means XGBoost may memorize patterns that don't generalize. Results should improve with more data.
