"""Tests for the Analytics MVP metrics endpoints (Tier 1 gaps):
weekly-volume, consistency, goal-progress."""
import uuid
from datetime import date, datetime, time, timedelta, timezone

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.activities.models import Activity
from apps.plans.models import TrainingPlan, PlanWeek, PlanWorkout


def _dt(d):
    """date → tz-aware datetime at 07:00 UTC."""
    return datetime.combine(d, time(7, 0), tzinfo=timezone.utc)


class MetricsAnalyticsTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email=f'm-{uuid.uuid4().hex[:8]}@test.dev', password='x',
        )
        self.client.force_authenticate(self.user)
        self.today = date.today()

    def _run(self, when, dist=10.0, vdot=None):
        return Activity.objects.create(
            user=self.user, start_time=_dt(when),
            distance_km=dist, duration_sec=int(dist * 330),
            avg_pace_sec_per_km=330, vdot_estimate=vdot,
            source='strava', is_valid=True,
        )

    # ── weekly-volume ────────────────────────────────────────────────────
    def test_weekly_volume_groups_by_iso_week(self):
        self._run(self.today, dist=10)
        self._run(self.today - timedelta(days=1), dist=5)     # same week
        self._run(self.today - timedelta(days=8), dist=8)     # previous week

        resp = self.client.get(reverse('metrics-weekly-volume'))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 2)
        this_week = data[-1]
        self.assertEqual(this_week['runs'], 2)
        self.assertAlmostEqual(this_week['km'], 15.0)

    # ── consistency ──────────────────────────────────────────────────────
    def test_consistency_streak_and_runs_per_week(self):
        self._run(self.today)
        self._run(self.today - timedelta(weeks=1))
        self._run(self.today - timedelta(weeks=2))

        resp = self.client.get(reverse('metrics-consistency'))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data['current_week_streak'], 3)
        self.assertGreater(data['runs_per_week'], 0)
        self.assertIsNone(data['adherence_pct'])   # no active plan

    def test_consistency_adherence_with_plan(self):
        start = self.today - timedelta(days=6)
        plan = TrainingPlan.objects.create(
            user=self.user, start_date=start,
            race_date=start + timedelta(days=7 * 16), status='active',
        )
        week = PlanWeek.objects.create(plan=plan, week_number=1, phase='base')
        # two past-due non-rest workouts (day 0 and 1), one completed
        PlanWorkout.objects.create(plan_week=week, day_of_week=0,
                                   workout_type='easy', distance_km=8, completed=True)
        PlanWorkout.objects.create(plan_week=week, day_of_week=1,
                                   workout_type='tempo', distance_km=10, completed=False)

        resp = self.client.get(reverse('metrics-consistency'))
        self.assertEqual(resp.json()['adherence_pct'], 50)

    # ── goal-progress ────────────────────────────────────────────────────
    # ── records ──────────────────────────────────────────────────────────
    def test_records_aggregates_bests_and_totals(self):
        self._run(self.today, dist=10)                       # avg_pace 330
        self._run(self.today - timedelta(days=3), dist=21.1)  # longest
        # a fast 6 km run → should be the fastest pace
        Activity.objects.create(
            user=self.user, start_time=_dt(self.today - timedelta(days=5)),
            distance_km=6, duration_sec=6 * 300, avg_pace_sec_per_km=300,
            source='strava', is_valid=True,
        )
        # a sub-5km sprint must NOT count toward fastest pace
        Activity.objects.create(
            user=self.user, start_time=_dt(self.today - timedelta(days=6)),
            distance_km=2, duration_sec=2 * 240, avg_pace_sec_per_km=240,
            source='strava', is_valid=True,
        )

        resp = self.client.get(reverse('metrics-records'))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['total_runs'], 4)
        self.assertAlmostEqual(data['longest_run_km'], 21.1)
        self.assertEqual(data['fastest_pace_sec'], 300)          # the 6 km, not the 2 km
        self.assertAlmostEqual(data['fastest_pace_distance_km'], 6.0)

    def test_records_empty_for_new_user(self):
        resp = self.client.get(reverse('metrics-records'))
        data = resp.json()
        self.assertEqual(data['total_runs'], 0)
        self.assertIsNone(data['fastest_pace_sec'])

    # ── best efforts (Tier 3) ────────────────────────────────────────────
    def test_best_efforts_from_laps(self):
        Activity.objects.create(
            user=self.user, start_time=_dt(self.today),
            distance_km=6, duration_sec=1800, source='strava', is_valid=True,
            laps=[{'distance_km': 1.0, 'duration_sec': 300} for _ in range(6)],
        )
        resp = self.client.get(reverse('metrics-best-efforts'))
        data = resp.json()
        self.assertIsNotNone(data['5k'])
        self.assertEqual(data['5k']['time_sec'], 1500)   # 5 × 300, scaled to 5 km
        self.assertIsNone(data['10k'])                   # run shorter than 10 km
        self.assertIsNone(data['half'])

    # ── block compare (Tier 3) ───────────────────────────────────────────
    def test_block_compare_current_vs_previous(self):
        self._run(self.today, dist=10)
        self._run(self.today - timedelta(weeks=5), dist=8)
        resp = self.client.get(reverse('metrics-block-compare'))   # default 4 wk
        data = resp.json()
        self.assertEqual(data['weeks'], 4)
        self.assertAlmostEqual(data['current']['km'], 10.0)
        self.assertEqual(data['current']['runs'], 1)
        self.assertAlmostEqual(data['previous']['km'], 8.0)

    # ── prediction accuracy (Tier 3) ─────────────────────────────────────
    def test_prediction_accuracy_empty(self):
        resp = self.client.get(reverse('metrics-prediction-accuracy'))
        self.assertEqual(resp.json(), [])

    def test_prediction_accuracy_completed_attempt(self):
        from apps.races.models import Marathon, Prediction, MarathonAttempt
        m = Marathon.objects.create(name='Test Marathon')
        pred = Prediction.objects.create(user=self.user, marathon=m, predicted_time_sec=14400)
        MarathonAttempt.objects.create(
            user=self.user, marathon=m, prediction=pred, race_date=self.today,
            status='completed', actual_time_sec=14700,
        )
        resp = self.client.get(reverse('metrics-prediction-accuracy'))
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['predicted_sec'], 14400)
        self.assertEqual(data[0]['actual_sec'], 14700)
        self.assertEqual(data[0]['delta_sec'], 300)
        self.assertEqual(data[0]['marathon_name'], 'Test Marathon')

    def test_goal_progress_unavailable_without_plan(self):
        resp = self.client.get(reverse('metrics-goal-progress'))
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()['available'])

    def test_goal_progress_series_against_target(self):
        start = self.today - timedelta(days=6)
        TrainingPlan.objects.create(
            user=self.user, start_date=start,
            race_date=start + timedelta(days=7 * 16),
            target_time_sec=14400, status='active',
        )
        self._run(self.today, vdot=50)

        resp = self.client.get(reverse('metrics-goal-progress'))
        data = resp.json()
        self.assertTrue(data['available'])
        self.assertEqual(data['target_sec'], 14400)
        self.assertEqual(len(data['series']), 1)
        self.assertIn('projected_sec', data['series'][0])
        self.assertIn(data['status'],
                      ['ahead', 'on_track', 'slightly_behind', 'behind'])
