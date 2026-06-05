"""
Tests for marathon-attempt detection (critique pt.9): tighter asymmetric
completion tolerance and timezone-tolerant race-date matching.
"""
from datetime import datetime, time, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.races.models import Marathon, MarathonAttempt
from apps.races.services import _classify_race_outcome, record_marathon_attempt

User = get_user_model()
M = 42.195


class ClassifyOutcomeTests(TestCase):
    def test_exact_and_long_are_completed(self):
        self.assertEqual(_classify_race_outcome(M, M), 'completed')
        self.assertEqual(_classify_race_outcome(44.0, M), 'completed')      # +1.8 km weaving
        self.assertEqual(_classify_race_outcome(M + 3.0, M), 'completed')   # long edge

    def test_slightly_short_still_completed(self):
        self.assertEqual(_classify_race_outcome(41.0, M), 'completed')      # -1.2 km

    def test_three_km_short_is_NOT_completed(self):
        # the regression: old symmetric ±3 km called 39.2 km a finished marathon
        self.assertEqual(_classify_race_outcome(39.2, M), 'dnf')

    def test_short_boundary(self):
        self.assertEqual(_classify_race_outcome(M - 1.5, M), 'completed')   # exactly -1.5
        self.assertEqual(_classify_race_outcome(M - 1.6, M), 'dnf')         # just past

    def test_ultra_and_tiny_are_skipped(self):
        self.assertIsNone(_classify_race_outcome(50.0, M))                  # ultra
        self.assertIsNone(_classify_race_outcome(8.0, M))                   # shakeout

    def test_dnf_band(self):
        self.assertEqual(_classify_race_outcome(25.0, M), 'dnf')


class RecordAttemptTests(TestCase):
    def setUp(self):
        # Don't touch the Celery broker in tests — the best-effort race-weather
        # fetch is enqueued from record_marathon_attempt; mock it to a no-op.
        p = patch('apps.races.tasks.fetch_race_weather.delay')
        self.addCleanup(p.stop)
        p.start()

        self.marathon = Marathon.objects.create(
            name='Test Marathon', distance_km=Decimal('42.195'),
            difficulty_coefficient=Decimal('1.0'),
        )
        self.race_date = timezone.now().date() - timedelta(days=3)
        self.user = User.objects.create_user(
            email='race@test.io', password='x',
            target_marathon=self.marathon, target_race_date=self.race_date,
        )

    def _activity(self, km, day, hour=9):
        start = timezone.make_aware(datetime.combine(day, time(hour, 0)))
        from apps.activities.models import Activity
        return Activity.objects.create(
            user=self.user, start_time=start, distance_km=Decimal(str(km)),
            duration_sec=4 * 3600, is_valid=True,
        )

    def test_completed_on_exact_date(self):
        att = record_marathon_attempt(self._activity(42.3, self.race_date))
        self.assertIsNotNone(att)
        self.assertEqual(att.status, 'completed')
        self.assertEqual(att.actual_time_sec, 4 * 3600)
        self.assertEqual(att.race_date, self.race_date)

    def test_timezone_off_by_one_day_still_detected(self):
        # UTC date one day before the local race date must still match (±1 day)
        att = record_marathon_attempt(self._activity(42.3, self.race_date - timedelta(days=1), hour=23))
        self.assertIsNotNone(att)
        self.assertEqual(att.status, 'completed')

    def test_two_days_off_is_not_a_race(self):
        self.assertIsNone(record_marathon_attempt(self._activity(42.3, self.race_date - timedelta(days=2))))

    def test_short_marathon_is_dnf(self):
        att = record_marathon_attempt(self._activity(39.0, self.race_date))
        self.assertIsNotNone(att)
        self.assertEqual(att.status, 'dnf')

    def test_short_run_is_not_a_race(self):
        self.assertIsNone(record_marathon_attempt(self._activity(8.0, self.race_date)))
