"""
DB-backed tests for recalculate_user_metrics (critique pt.8 — verifies the
bulk_update rewrite still computes correct VDOT/TSS/CTL and the zero-out path).
"""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.activities.models import Activity
from apps.metrics.models import DailyMetrics
from apps.activities.tasks import recalculate_user_metrics

User = get_user_model()


class RecalculateMetricsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='runner@test.io', password='x', max_hr=185)

    def _add(self, days_ago, km, dur_sec, hr=150):
        Activity.objects.create(
            user=self.user,
            start_time=timezone.now() - timedelta(days=days_ago),
            distance_km=km, duration_sec=dur_sec, avg_hr=hr, is_valid=True,
        )

    def test_recalc_writes_vdot_tss_metrics_and_rollups(self):
        self._add(10, 10, 50 * 60)         # 10 km in 50:00
        self._add(5, 21.0975, 105 * 60)    # half in 1:45:00
        self._add(2, 6, 30 * 60)

        recalculate_user_metrics(str(self.user.id))

        # Per-activity vdot/tss persisted (the bulk_update path).
        for a in Activity.objects.filter(user=self.user):
            self.assertIsNotNone(a.vdot_estimate)
            self.assertGreater(float(a.vdot_estimate), 0)
            self.assertIsNotNone(a.tss)
            self.assertGreater(float(a.tss), 0)

        # DailyMetrics rebuilt across the date span (>= ~10 days of history).
        self.assertGreaterEqual(DailyMetrics.objects.filter(user=self.user).count(), 10)

        # User rollups set; current_ctl matches the latest DailyMetrics row
        # (proves we used the loop's final value, not a stale/None).
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.current_vdot)
        self.assertIsNotNone(self.user.current_ctl)
        self.assertGreater(self.user.training_weeks, 0)
        last = DailyMetrics.objects.filter(user=self.user).order_by('-date').first()
        self.assertAlmostEqual(float(self.user.current_ctl), float(last.ctl), places=2)

    def test_no_activities_zeroes_out(self):
        DailyMetrics.objects.create(
            user=self.user, date=timezone.now().date(), ctl=10, atl=5, tsb=5,
        )
        User.objects.filter(id=self.user.id).update(current_vdot=50, training_weeks=5)

        recalculate_user_metrics(str(self.user.id))

        self.user.refresh_from_db()
        self.assertIsNone(self.user.current_vdot)
        self.assertEqual(self.user.training_weeks, 0)
        self.assertEqual(DailyMetrics.objects.filter(user=self.user).count(), 0)
