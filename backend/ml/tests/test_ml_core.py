"""
Unit tests for the pure prediction / fitness math (critique pt.11).

These functions are the numeric core of the product — a silent regression in
any of them ships wrong race predictions and wrong training paces. They're
pure and cheap to test, so we lock in their invariants here.

Run from backend/:
    DJANGO_SETTINGS_MODULE=config.settings.development \\
        python -m unittest ml.tests.test_ml_core -v
"""
import unittest
from types import SimpleNamespace as NS

from ml.src.formulas import (
    calc_vdot, daniels_equivalent_time, vdot_to_paces,
    update_ctl_atl, robust_vdot, calc_tss, tanda_marathon_pace_sec,
)
from ml.src.minetti import minetti_energy_cost, compute_course_difficulty_from_points
from ml.src.weather import compute_weather_index
from ml.src.predict import predict_finish_time

MARATHON_M = 42195.0


class RobustVdotTests(unittest.TestCase):
    def test_empty_and_single(self):
        self.assertIsNone(robust_vdot([]))
        self.assertEqual(robust_vdot([50]), 50.0)

    def test_ignores_single_high_fluke_small_n(self):
        # one 60 among 50s (e.g. GPS-short course) must not dominate
        self.assertEqual(robust_vdot([60, 50, 50]), 50.0)

    def test_drops_top_outlier_large_n(self):
        # a 70 GPS error with 4 honest reads → outlier dropped
        self.assertEqual(robust_vdot([70, 50, 50, 50, 49]), 50.0)

    def test_never_exceeds_naive_max(self):
        vals = [55, 54, 53, 52, 51]
        self.assertLess(robust_vdot(vals), max(vals))

    def test_filters_nonpositive(self):
        self.assertEqual(robust_vdot([0, -5, 48]), 48.0)


class VdotEquivalenceTests(unittest.TestCase):
    def test_roundtrip(self):
        # daniels_equivalent_time then calc_vdot should recover the VDOT
        for vdot in (40, 50, 60):
            t = daniels_equivalent_time(vdot, MARATHON_M)
            self.assertGreater(t, 0)
            recovered = calc_vdot(MARATHON_M, t)
            self.assertAlmostEqual(recovered, vdot, delta=1.0)

    def test_higher_vdot_is_faster(self):
        self.assertLess(
            daniels_equivalent_time(55, MARATHON_M),
            daniels_equivalent_time(45, MARATHON_M),
        )

    def test_degenerate_inputs(self):
        self.assertEqual(daniels_equivalent_time(0, MARATHON_M), 0)
        self.assertEqual(calc_vdot(0, 100), 0.0)
        self.assertEqual(calc_vdot(10000, 0), 0.0)


class PaceTests(unittest.TestCase):
    def test_zone_ordering(self):
        # sec/km: Easy slowest (largest) ... Repetition fastest (smallest)
        p = vdot_to_paces(50)
        self.assertGreater(p['E'], p['M'])
        self.assertGreater(p['M'], p['T'])
        self.assertGreater(p['T'], p['I'])
        self.assertGreater(p['I'], p['R'])

    def test_interpolation_between_table_rows(self):
        e45 = vdot_to_paces(45)['E']
        e50 = vdot_to_paces(50)['E']
        e47 = vdot_to_paces(47)['E']
        self.assertTrue(e50 < e47 < e45)  # fitter → faster easy pace

    def test_clamps_out_of_range(self):
        # below/above the table shouldn't throw
        self.assertEqual(vdot_to_paces(10), vdot_to_paces(30))
        self.assertEqual(vdot_to_paces(99), vdot_to_paces(70))


class CtlAtlTests(unittest.TestCase):
    def test_single_big_day_atl_above_ctl(self):
        ctl, atl = update_ctl_atl(0.0, 0.0, 100.0)
        self.assertGreater(atl, ctl)        # acute responds faster than chronic
        self.assertAlmostEqual(atl, 13.3, delta=0.5)
        self.assertAlmostEqual(ctl, 2.35, delta=0.3)

    def test_rest_day_decays(self):
        ctl, atl = update_ctl_atl(50.0, 50.0, 0.0)
        self.assertLess(ctl, 50.0)
        self.assertLess(atl, 50.0)
        self.assertLess(atl, ctl)           # acute decays faster


class TssTests(unittest.TestCase):
    def test_hr_based_threshold_effort(self):
        # 1 hour at threshold HR ≈ 100 TSS
        tss = calc_tss(3600, avg_hr=160, threshold_hr=160)
        self.assertAlmostEqual(tss, 100.0, delta=1.0)

    def test_fallback_default_when_no_hr_no_pace(self):
        tss = calc_tss(3600, avg_hr=None, threshold_hr=160)
        self.assertGreater(tss, 0)


class TandaTests(unittest.TestCase):
    def test_more_volume_means_faster(self):
        # higher weekly km -> faster predicted marathon pace (lower sec/km)
        p_low = tanda_marathon_pace_sec(40, 300)
        p_high = tanda_marathon_pace_sec(110, 300)
        self.assertLess(p_high, p_low)

    def test_faster_training_pace_means_faster(self):
        self.assertLess(tanda_marathon_pace_sec(80, 270), tanda_marathon_pace_sec(80, 330))

    def test_known_point_in_range(self):
        # K=70 km/wk, P=300 s/km -> ~4:39/km -> ~3:16 marathon (paper range)
        pm = tanda_marathon_pace_sec(70, 300)
        self.assertTrue(270 <= pm <= 285)
        marathon_sec = pm * 42.195
        self.assertTrue(11400 <= marathon_sec <= 12100)   # ~3:10-3:22

    def test_degenerate(self):
        self.assertIsNone(tanda_marathon_pace_sec(0, 300))
        self.assertIsNone(tanda_marathon_pace_sec(70, 0))


class MinettiTests(unittest.TestCase):
    def test_flat_baseline(self):
        self.assertAlmostEqual(minetti_energy_cost(0.0), 2.5, places=3)

    def test_uphill_costs_more_downhill_less(self):
        self.assertGreater(minetti_energy_cost(0.10), minetti_energy_cost(0.0))
        self.assertLess(minetti_energy_cost(-0.10), minetti_energy_cost(0.0))

    def test_flat_course_coeff_is_one(self):
        # constant elevation along a straight line → coefficient 1.0
        pts = [(0.0, i * 0.001, 100.0) for i in range(20)]
        self.assertAlmostEqual(compute_course_difficulty_from_points(pts), 1.0, delta=0.01)

    def test_uphill_course_harder_than_flat(self):
        flat = [(0.0, i * 0.001, 100.0) for i in range(20)]
        uphill = [(0.0, i * 0.001, 100.0 + i * 5) for i in range(20)]   # climbing
        self.assertGreater(
            compute_course_difficulty_from_points(uphill),
            compute_course_difficulty_from_points(flat),
        )

    def test_gps_jitter_does_not_inflate_flat_course(self):
        # flat course (~6.6 km) with +/-5 m elevation noise every ~33 m. Raw
        # point-to-point slopes would be +/-15% and blow the coefficient up to
        # ~1.5; resampling + smoothing must keep it ~flat.
        pts = [(0.0, i * 0.0003, 100.0 + (5.0 if i % 2 else -5.0)) for i in range(200)]
        self.assertLessEqual(compute_course_difficulty_from_points(pts), 1.08)

    def test_downhill_easier_but_penalised(self):
        # sustained ~-5% descent: easier than flat (<1) but the eccentric-damage
        # penalty keeps it from being rated trivially easy.
        pts = [(0.0, i * 0.0003, 100.0 - i * 1.65) for i in range(200)]
        coeff = compute_course_difficulty_from_points(pts)
        self.assertLess(coeff, 0.98)
        self.assertGreater(coeff, 0.6)


class WeatherTests(unittest.TestCase):
    def test_baseline_is_one(self):
        self.assertEqual(compute_weather_index(10.0, 60.0, 0.0), 1.0)

    def test_heat_slows(self):
        self.assertGreater(compute_weather_index(25.0, 60.0), compute_weather_index(10.0, 60.0))

    def test_humidity_matters_when_warm_not_when_cool(self):
        # warm: humid is worse than dry
        self.assertGreater(compute_weather_index(28.0, 85.0), compute_weather_index(28.0, 40.0))
        # cool: humidity is ~irrelevant
        self.assertAlmostEqual(compute_weather_index(10.0, 90.0),
                               compute_weather_index(10.0, 40.0), places=3)

    def test_heat_penalty_accelerates(self):
        # the jump 20->30 C should hurt more than 10->20 C (non-linear)
        i10, i20, i30 = (compute_weather_index(t, 60.0) for t in (10.0, 20.0, 30.0))
        self.assertGreater(i30 - i20, i20 - i10)

    def test_wind_is_a_penalty_not_a_bonus(self):
        # regression for the old "tailwind bonus" bug — wind must SLOW you down
        self.assertGreater(compute_weather_index(10.0, 60.0, 8.0),
                           compute_weather_index(10.0, 60.0, 0.0))

    def test_cool_dry_not_penalised(self):
        self.assertLessEqual(compute_weather_index(5.0, 40.0), 1.0)


def _prior(finish=13200, gap=1.0, same=False, mean=None, best=None, n=1, trend=0.0):
    """Build a Tier-A history feature dict (shape from get_prior_marathon_features)."""
    return {
        'finish_sec': finish, 'prev_finish': finish, 'prev_coeff': 1.0,
        'years_since_prev': gap, 'best_prior': best if best is not None else finish,
        'mean_prior': mean if mean is not None else finish, 'n_prior': n,
        'trend_sec_per_year': trend, 'same_marathon': same,
    }


class TieredPredictTests(unittest.TestCase):
    def setUp(self):
        self.user = NS(current_vdot=50, age=40, sex='M')
        self.mar = NS(distance_km=42.195, difficulty_coefficient=1.000)

    def test_tier_b_analytic_when_no_prior(self):
        r = predict_finish_time(self.user, self.mar, None, 15.0, 60.0, 0.0, prior_marathon=None)
        self.assertEqual(r['tier'], 'analytic')
        self.assertGreater(r['predicted_time_sec'], 0)

    def test_tier_a_used_when_prior_present(self):
        r = predict_finish_time(self.user, self.mar, None, 15.0, 60.0, 0.0, prior_marathon=_prior())
        self.assertEqual(r['tier'], 'prior_marathon')

    def test_same_marathon_tightens_ci(self):
        diff = predict_finish_time(self.user, self.mar, None, 15.0, 60.0, 0.0,
                                   prior_marathon=_prior(same=False))
        same = predict_finish_time(self.user, self.mar, None, 15.0, 60.0, 0.0,
                                   prior_marathon=_prior(same=True))
        self.assertLess(same['confidence_interval_sec'], diff['confidence_interval_sec'])

    def test_non_marathon_distance_falls_back_to_analytic(self):
        half = NS(distance_km=21.0975, difficulty_coefficient=1.0)
        r = predict_finish_time(self.user, half, None, 15.0, 60.0, 0.0, prior_marathon=_prior())
        self.assertEqual(r['tier'], 'analytic')

    def test_heat_slows_prediction(self):
        mild = predict_finish_time(self.user, self.mar, None, 12.0, 55.0, 0.0, prior_marathon=_prior())
        hot = predict_finish_time(self.user, self.mar, None, 28.0, 75.0, 0.0, prior_marathon=_prior())
        self.assertGreater(hot['predicted_time_sec'], mild['predicted_time_sec'])

    def test_tanda_used_when_training_load_and_no_prior(self):
        tl = {'weekly_km': 70, 'train_pace_sec': 300, 'weeks_with_data': 8}
        r = predict_finish_time(self.user, self.mar, None, 15.0, 60.0, 0.0,
                                prior_marathon=None, training_load=tl)
        self.assertEqual(r['tier'], 'tanda')

    def test_prior_beats_tanda(self):
        tl = {'weekly_km': 70, 'train_pace_sec': 300, 'weeks_with_data': 8}
        r = predict_finish_time(self.user, self.mar, None, 15.0, 60.0, 0.0,
                                prior_marathon=_prior(), training_load=tl)
        self.assertEqual(r['tier'], 'prior_marathon')


if __name__ == '__main__':
    unittest.main()
