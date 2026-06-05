import logging
from datetime import date, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

from apps.activities.models import Activity
from apps.activities.serializers import ActivityListSerializer
from apps.metrics.models import DailyMetrics
from apps.races.models import Prediction
from apps.races.serializers import PredictionSerializer


class DashboardView(APIView):
    """GET /api/dashboard/ — single aggregating endpoint for the main page."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Current metrics
        last_metrics = DailyMetrics.objects.filter(user=user).order_by('-date').first()
        metrics = {
            'vdot': float(user.current_vdot) if user.current_vdot else None,
            'ctl': float(last_metrics.ctl) if last_metrics else None,
            'atl': float(last_metrics.atl) if last_metrics else None,
            'tsb': float(last_metrics.tsb) if last_metrics else None,
        }

        # CTL/ATL/TSB chart — last 84 days
        eighty_four_ago = date.today() - timedelta(days=84)
        chart_qs = (DailyMetrics.objects
                    .filter(user=user, date__gte=eighty_four_ago)
                    .order_by('date')
                    .values('date', 'ctl', 'atl', 'tsb'))
        ctl_atl_tsb_chart = [
            {
                'date': str(row['date']),
                'ctl': float(row['ctl']),
                'atl': float(row['atl']),
                'tsb': float(row['tsb']),
            }
            for row in chart_qs
        ]

        # Race readiness
        race_readiness = None
        if (user.current_tsb is not None and (user.training_weeks or 0) >= 4):
            from ml.src.formulas import race_readiness_score
            from apps.races.views import compute_readiness_inputs
            ninety_ago = date.today() - timedelta(days=90)
            recent = Activity.objects.filter(user=user, is_valid=True, start_time__gte=ninety_ago)
            weeks_with_runs = len(set(a.start_time.isocalendar()[:2] for a in recent))
            avg_weekly_km, vdot_delta_6w, long_runs_pct = compute_readiness_inputs(user)
            race_readiness = race_readiness_score(
                tsb=float(user.current_tsb),
                pct_weeks_with_runs_10w=min(1, weeks_with_runs / 10),
                long_runs_completed_pct=long_runs_pct,
                vdot_delta_6w=vdot_delta_6w,
                avg_weekly_km=avg_weekly_km,
                recommended_weekly_km=60,
            )

        # Latest prediction — prefer one for the CURRENT target marathon.
        # If user has a target but no prediction yet for it → return null +
        # prediction_for_target=false so the frontend can show a "Generate" CTA
        # instead of stale data from a previous race.
        latest_pred = None
        prediction_for_target = False
        if user.target_marathon_id:
            latest_pred = (Prediction.objects
                           .filter(user=user, marathon_id=user.target_marathon_id)
                           .first())
            prediction_for_target = latest_pred is not None
        if latest_pred is None:
            # Fallback: any prediction (e.g., quick-predict without target set)
            latest_pred = Prediction.objects.filter(user=user).first()

        # If the user has a target but no prediction yet, ENQUEUE generation
        # instead of doing it inline. A GET must stay read-only and must not
        # block on Open-Meteo — the old inline call did both. The cache.add
        # lock dedupes the enqueue so dashboard refetches don't pile up tasks;
        # the prediction shows up on the next load once the worker finishes.
        if (not prediction_for_target) and user.target_marathon_id and user.current_vdot:
            try:
                from django.core.cache import cache
                from apps.races.tasks import generate_target_prediction
                lock_key = f"gen_pred_inflight:{user.id}:{user.target_marathon_id}"
                if cache.add(lock_key, True, 120):
                    generate_target_prediction.delay(str(user.id))
            except Exception:
                # A broker/cache hiccup must not break the dashboard READ.
                logger.warning("could not enqueue target prediction for user %s",
                               user.id, exc_info=True)

        latest_prediction = PredictionSerializer(latest_pred).data if latest_pred else None

        # Days to race
        days_to_race = None
        if user.target_race_date:
            days_to_race = (user.target_race_date - date.today()).days

        # Recent activities
        recent_activities = Activity.objects.filter(user=user, is_valid=True).order_by('-start_time')[:5]

        # Weekly km
        week_start = date.today() - timedelta(days=date.today().weekday())
        eight_weeks_ago = date.today() - timedelta(weeks=8)
        from django.db.models import Sum, Avg
        weekly_km_current = (Activity.objects
                             .filter(user=user, is_valid=True, start_time__gte=week_start)
                             .aggregate(s=Sum('distance_km'))['s'] or 0)
        weekly_km_avg_8w = (Activity.objects
                            .filter(user=user, is_valid=True, start_time__gte=eight_weeks_ago)
                            .aggregate(s=Sum('distance_km'))['s'] or 0)
        weekly_km_avg_8w = round(float(weekly_km_avg_8w) / 8, 1)

        return Response({
            'metrics': metrics,
            'race_readiness': race_readiness,
            'latest_prediction': latest_prediction,
            'prediction_for_target': prediction_for_target,
            'days_to_race': days_to_race,
            'recent_activities': ActivityListSerializer(recent_activities, many=True).data,
            'weekly_km_current': round(float(weekly_km_current), 1),
            'weekly_km_avg_8w': weekly_km_avg_8w,
            'ctl_atl_tsb_chart': ctl_atl_tsb_chart,
        })
