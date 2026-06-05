"""
Tests for the training-plan generator methodology (critique pt.12): fixed
short taper, capped long runs, continuous build ramp, individualised intervals.
Pure logic — generate_plan only reads user.current_vdot, so no DB is needed.
"""
from datetime import date, timedelta
from types import SimpleNamespace as NS

from django.test import SimpleTestCase

from apps.plans.generator import (
    generate_plan, _phase_schedule, _workout_paces, LONG_RUN_ABS_CAP_KM,
)
from ml.src.formulas import vdot_to_paces


class PhaseScheduleTests(SimpleTestCase):
    def test_taper_is_fixed_2_to_3_weeks_not_proportional(self):
        for tw in (6, 8, 12, 16, 24, 30):
            sched = _phase_schedule(tw)
            self.assertEqual(len(sched), tw)
            self.assertIn(sched.count('taper'), (2, 3))   # never 25% of the plan
        # the regression: a 24-week plan used to taper for 6 weeks
        self.assertLessEqual(_phase_schedule(24).count('taper'), 3)

    def test_taper_weeks_are_contiguous_at_the_end(self):
        sched = _phase_schedule(16)
        n_taper = sched.count('taper')
        self.assertTrue(all(p == 'taper' for p in sched[-n_taper:]))
        self.assertNotIn('taper', sched[:-n_taper])


class GeneratePlanTests(SimpleTestCase):
    def _plan(self, weeks=16, days=5, vdot=52, cutback=True):
        user = NS(current_vdot=vdot)
        start = date.today()
        race = start + timedelta(days=weeks * 7 - 1)   # → exactly `weeks` weeks
        return generate_plan(user, race, days_per_week=days,
                             cutback_enabled=cutback, start_date=start)

    def test_week_count_and_phase_order(self):
        plan = self._plan(weeks=16)
        self.assertEqual(len(plan), 16)
        self.assertEqual(plan[0]['phase'], 'base')
        self.assertEqual(plan[-1]['phase'], 'taper')

    def test_long_run_never_exceeds_cap(self):
        # big volume (6 days, fit) → an uncapped ramp would push past 35 km
        plan = self._plan(weeks=20, days=6, vdot=62)
        longs = [wo['distance_km'] for w in plan for wo in w['workouts']
                 if wo['workout_type'] == 'long']
        self.assertTrue(longs)
        self.assertLessEqual(max(longs), LONG_RUN_ABS_CAP_KM)

    def test_taper_volume_declines_to_race(self):
        plan = self._plan(weeks=16)
        taper_vols = [w['total_km'] for w in plan if w['phase'] == 'taper']
        self.assertEqual(taper_vols, sorted(taper_vols, reverse=True))

    def test_peak_volume_is_in_late_quality(self):
        # continuous ramp builds to a peak in the last build phase, instead of
        # resetting to base volume at each phase boundary (the old sawtooth bug)
        plan = self._plan(weeks=18)
        peak = max(plan, key=lambda w: w['total_km'])
        self.assertEqual(peak['phase'], 'late_quality')

    def test_interval_reps_scale_and_cap_at_eight(self):
        paces = vdot_to_paces(52)
        _, _, small = _workout_paces('interval', paces, 8)
        _, _, big = _workout_paces('interval', paces, 40)
        small_reps = small['intervals'][0]['reps']
        big_reps = big['intervals'][0]['reps']
        self.assertGreaterEqual(small_reps, 3)
        self.assertLessEqual(big_reps, 8)      # Daniels I-volume cap
        self.assertGreater(big_reps, small_reps)
