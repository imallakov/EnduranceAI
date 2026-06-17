"""
Tests for the training-plan generator methodology (critique pt.12): fixed
short taper, capped long runs, continuous build ramp, individualised intervals.
Pure logic — generate_plan only reads user.current_vdot, so no DB is needed.
"""
import uuid
from datetime import date, datetime, time, timedelta, timezone
from types import SimpleNamespace as NS

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase

from apps.activities.models import Activity
from apps.plans.generator import (
    generate_plan, _phase_schedule, _workout_paces, LONG_RUN_ABS_CAP_KM,
    auto_link_recent_activities, MATCH_WINDOW_DAYS,
    detect_week_collision, reschedule_current_week, HARD_TYPES,
)
from apps.plans.models import TrainingPlan, PlanWeek, PlanWorkout
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


class AutoLinkShiftTests(TestCase):
    """
    Adaptive-plan Phase 1: a run logged a few days off its planned day must
    still link (within ±MATCH_WINDOW_DAYS) and record the signed shift, instead
    of being orphaned and the workout falsely marked missed.
    """

    def _make_plan_with_workout(self, *, day_offset, dist=8.0, wtype='tempo'):
        """One active plan, week 1, single non-rest workout at start_date+day_offset."""
        user = get_user_model().objects.create_user(
            email=f'runner-{uuid.uuid4().hex[:8]}@test.dev', password='x',
        )
        user.current_vdot = 50
        user.save(update_fields=['current_vdot'])
        start = date.today() - timedelta(days=6)
        plan = TrainingPlan.objects.create(
            user=user, start_date=start,
            race_date=start + timedelta(days=7 * 16), status='active',
        )
        week = PlanWeek.objects.create(plan=plan, week_number=1, phase='base')
        workout = PlanWorkout.objects.create(
            plan_week=week, day_of_week=day_offset, workout_type=wtype,
            distance_km=dist, pace_min_sec=300, pace_max_sec=320,
        )
        return user, plan, workout, start

    def _add_run(self, user, run_date, dist=8.0):
        return Activity.objects.create(
            user=user,
            start_time=datetime.combine(run_date, time(7, 0), tzinfo=timezone.utc),
            distance_km=dist, duration_sec=int(dist * 300),
            avg_pace_sec_per_km=300, source='strava', is_valid=True,
        )

    def test_run_two_days_late_links_and_records_positive_shift(self):
        user, _, workout, start = self._make_plan_with_workout(day_offset=1)
        target = start + timedelta(days=1)            # week 1, day_offset 1
        self._add_run(user, target + timedelta(days=2))

        result = auto_link_recent_activities(user)

        workout.refresh_from_db()
        self.assertEqual(result['linked'], 1)
        self.assertTrue(workout.completed)
        self.assertEqual(workout.shift_days, 2)
        self.assertIsNotNone(workout.activity_id)

    def test_run_one_day_early_records_negative_shift(self):
        user, _, workout, start = self._make_plan_with_workout(day_offset=2)
        target = start + timedelta(days=2)
        self._add_run(user, target - timedelta(days=1))

        auto_link_recent_activities(user)

        workout.refresh_from_db()
        self.assertTrue(workout.completed)
        self.assertEqual(workout.shift_days, -1)

    def test_same_day_run_links_with_zero_shift(self):
        user, _, workout, start = self._make_plan_with_workout(day_offset=2)
        target = start + timedelta(days=2)
        self._add_run(user, target)

        auto_link_recent_activities(user)

        workout.refresh_from_db()
        self.assertTrue(workout.completed)
        self.assertEqual(workout.shift_days, 0)

    def test_run_beyond_window_does_not_link_and_workout_stays_missed(self):
        # day_offset 1 → target = today-5; run today-1 → 4 days off (> window)
        user, _, workout, start = self._make_plan_with_workout(day_offset=1)
        self.assertGreater(4, MATCH_WINDOW_DAYS)       # guard: 4 is outside ±3
        self._add_run(user, date.today() - timedelta(days=1))

        result = auto_link_recent_activities(user)

        workout.refresh_from_db()
        self.assertEqual(result['linked'], 0)
        self.assertFalse(workout.completed)
        self.assertIsNone(workout.shift_days)

    def test_no_run_leaves_workout_incomplete(self):
        user, _, workout, _ = self._make_plan_with_workout(day_offset=1)

        result = auto_link_recent_activities(user)

        workout.refresh_from_db()
        self.assertEqual(result['linked'], 0)
        self.assertFalse(workout.completed)
        self.assertIsNone(workout.shift_days)


class ReflowTests(TestCase):
    """Phase 2: detect two-hard-days-adjacent collisions and reorder the week."""

    def _make_week(self, layout, *, start_offset_weeks=0):
        """
        layout: list of (day_of_week, workout_type, dist). Builds one active plan
        with a single PlanWeek (week 1). Returns (plan, monday) where `monday` is
        the plan start (a Monday) — pass it as `today` for deterministic tests.
        """
        user = get_user_model().objects.create_user(
            email=f'reflow-{uuid.uuid4().hex[:8]}@test.dev', password='x',
        )
        monday = date.today() - timedelta(days=date.today().weekday())
        plan = TrainingPlan.objects.create(
            user=user, start_date=monday,
            race_date=monday + timedelta(days=7 * 16), status='active',
        )
        week = PlanWeek.objects.create(plan=plan, week_number=1, phase='early_quality')
        for dow, wtype, dist in layout:
            PlanWorkout.objects.create(
                plan_week=week, day_of_week=dow, workout_type=wtype,
                distance_km=dist, pace_min_sec=300, pace_max_sec=320,
            )
        return plan, monday

    def test_detects_adjacent_hard_days(self):
        plan, monday = self._make_week([
            (0, 'rest', None), (1, 'tempo', 10), (2, 'interval', 12),
            (3, 'easy', 8), (4, 'easy', 8), (5, 'rest', None), (6, 'long', 20),
        ])
        c = detect_week_collision(plan, today=monday)
        self.assertIsNotNone(c)
        self.assertEqual(c['gap_days'], 1)

    def test_no_collision_when_hard_days_spaced(self):
        plan, monday = self._make_week([
            (0, 'rest', None), (1, 'tempo', 10), (2, 'easy', 8),
            (3, 'interval', 12), (4, 'easy', 8), (5, 'rest', None), (6, 'long', 20),
        ])
        self.assertIsNone(detect_week_collision(plan, today=monday))

    def test_reschedule_resolves_collision_and_preserves_workouts(self):
        plan, monday = self._make_week([
            (0, 'rest', None), (1, 'tempo', 10), (2, 'interval', 12),
            (3, 'easy', 8), (4, 'easy', 8), (5, 'rest', None), (6, 'long', 20),
        ])
        week = plan.weeks.first()
        before_types = sorted(w.workout_type for w in week.workouts.all())
        before_km = sum(float(w.distance_km or 0) for w in week.workouts.all())

        result = reschedule_current_week(plan, today=monday)
        self.assertTrue(result['rescheduled'])

        # collision gone
        self.assertIsNone(detect_week_collision(plan, today=monday))
        # same workouts and same volume — only days were permuted
        after = list(week.workouts.all())
        self.assertEqual(sorted(w.workout_type for w in after), before_types)
        self.assertAlmostEqual(sum(float(w.distance_km or 0) for w in after), before_km)
        # long run stays anchored on day 6
        long_wo = next(w for w in after if w.workout_type == 'long')
        self.assertEqual(long_wo.day_of_week, 6)

    def test_completed_workouts_are_not_moved(self):
        plan, monday = self._make_week([
            (0, 'rest', None), (1, 'tempo', 10), (2, 'interval', 12),
            (3, 'easy', 8), (4, 'easy', 8), (5, 'rest', None), (6, 'long', 20),
        ])
        week = plan.weeks.first()
        done = week.workouts.get(day_of_week=1)
        done.completed = True
        done.save(update_fields=['completed'])

        reschedule_current_week(plan, today=monday)

        done.refresh_from_db()
        self.assertEqual(done.day_of_week, 1)   # completed → pinned
