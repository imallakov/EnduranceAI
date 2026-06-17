from datetime import date, datetime, time, timedelta, timezone as tz
from django.db.models import Avg, Sum, Count, Max
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import DailyMetrics
from apps.activities.models import Activity
from ml.src.formulas import vdot_to_paces, format_pace


def _iso_week_key(dt) -> str:
    iso = dt.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def _date_to_dt(d):
    """Convert a date to a UTC midnight datetime so we can filter Activity
    .start_time (timestamptz) without forcing a per-row ::date cast that kills
    the index. All three usages below pass a `date` from `date.today() -
    timedelta(weeks=N)`; we want "anything from midnight of that day onward"."""
    return datetime.combine(d, time.min, tzinfo=tz.utc)


class CurrentMetricsView(APIView):
    """GET /api/metrics/current/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        last = DailyMetrics.objects.filter(user=user).order_by('-date').first()
        paces = vdot_to_paces(float(user.current_vdot or 45)) if user.current_vdot else {}
        formatted_paces = {z: format_pace(p) for z, p in paces.items()}
        return Response({
            'vdot': float(user.current_vdot) if user.current_vdot else None,
            'ctl': float(last.ctl) if last else None,
            'atl': float(last.atl) if last else None,
            'tsb': float(last.tsb) if last else None,
            'hr_efficiency': float(last.hr_efficiency) if last and last.hr_efficiency else None,
            'training_weeks': user.training_weeks,
            'training_paces': formatted_paces,
        })


class DailyMetricsView(APIView):
    """GET /api/metrics/daily/?date_from=&date_to="""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = DailyMetrics.objects.filter(user=request.user).order_by('date')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        data = list(qs.values('date', 'ctl', 'atl', 'tsb', 'vdot_rolling'))
        return Response(data)


class VdotHistoryView(APIView):
    """GET /api/metrics/vdot-history/ — last 26 weeks"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cutoff = date.today() - timedelta(weeks=26)
        activities = (Activity.objects
                      .filter(user=request.user, is_valid=True,
                              start_time__gte=_date_to_dt(cutoff),
                              vdot_estimate__isnull=False)
                      .order_by('start_time'))
        # Group by ISO week
        weeks: dict = {}
        for act in activities:
            iso = act.start_time.isocalendar()
            key = f"{iso[0]}-W{iso[1]:02d}"
            v = float(act.vdot_estimate)
            if key not in weeks or v > weeks[key]['vdot']:
                weeks[key] = {'week': key, 'vdot': round(v, 2)}
        return Response(sorted(weeks.values(), key=lambda x: x['week']))


class HREfficiencyView(APIView):
    """GET /api/metrics/hr-efficiency/ — weekly rolling avg"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cutoff = date.today() - timedelta(weeks=26)
        activities = (Activity.objects
                      .filter(user=request.user, is_valid=True,
                              start_time__gte=_date_to_dt(cutoff),
                              avg_hr__isnull=False,
                              avg_pace_sec_per_km__isnull=False)
                      .order_by('start_time'))
        weeks: dict = {}
        for act in activities:
            iso = act.start_time.isocalendar()
            key = f"{iso[0]}-W{iso[1]:02d}"
            eff = float(act.avg_pace_sec_per_km) / float(act.avg_hr)
            if key not in weeks:
                weeks[key] = []
            weeks[key].append(eff)
        result = [
            {'week': k, 'efficiency': round(sum(v) / len(v), 4)}
            for k, v in sorted(weeks.items())
        ]
        return Response(result)


class ZonesDistributionView(APIView):
    """GET /api/metrics/zones-dist/?weeks=8"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        weeks = int(request.query_params.get('weeks', 8))
        cutoff = date.today() - timedelta(weeks=weeks)
        activities = Activity.objects.filter(
            user=request.user, is_valid=True, start_time__gte=_date_to_dt(cutoff)
        )
        totals = {'E': 0, 'M': 0, 'T': 0, 'I': 0, 'R': 0}
        for act in activities:
            for zone, secs in (act.hr_zones_sec or {}).items():
                if zone in totals:
                    totals[zone] += secs
        grand_total = sum(totals.values()) or 1
        return Response({z: round(s / grand_total * 100, 1) for z, s in totals.items()})


def _goal_course_coeff(plan):
    """Course difficulty coefficient for the plan's target marathon (1.0 if none).
    Mirrors TrainingPlanSerializer.get_goal_feasibility so the trend matches the
    point-in-time banner."""
    if plan.prediction_id:
        try:
            pred = plan.prediction
            if pred and pred.marathon and pred.marathon.difficulty_coefficient:
                return float(pred.marathon.difficulty_coefficient)
        except Exception:
            pass
    else:
        tm = getattr(plan.user, 'target_marathon', None)
        if tm and tm.difficulty_coefficient:
            return float(tm.difficulty_coefficient)
    return 1.0


def _goal_status(delta_sec: int) -> str:
    if delta_sec < -180:
        return 'ahead'
    if delta_sec <= 180:
        return 'on_track'
    if delta_sec <= 600:
        return 'slightly_behind'
    return 'behind'


class GoalProgressView(APIView):
    """GET /api/metrics/goal-progress/ — projected marathon finish per week vs
    the active plan's target. Module 2 of the Analytics MVP."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.plans.models import TrainingPlan
        from ml.src.formulas import daniels_equivalent_time

        plan = (TrainingPlan.objects
                .filter(user=request.user, status='active')
                .first())
        if not plan or not plan.target_time_sec:
            return Response({'available': False})

        course_coeff = _goal_course_coeff(plan)
        cutoff = date.today() - timedelta(weeks=26)
        activities = (Activity.objects
                      .filter(user=request.user, is_valid=True,
                              start_time__gte=_date_to_dt(cutoff),
                              vdot_estimate__isnull=False)
                      .order_by('start_time'))
        # Weekly BEST vdot (same grouping as VdotHistoryView), then project.
        weeks: dict = {}
        for act in activities:
            key = _iso_week_key(act.start_time)
            v = float(act.vdot_estimate)
            if key not in weeks or v > weeks[key]:
                weeks[key] = v

        series = []
        for key in sorted(weeks):
            base = daniels_equivalent_time(weeks[key], 42195)
            if base and base > 0:
                series.append({'week': key,
                               'projected_sec': int(round(base * course_coeff))})

        status = None
        if series:
            status = _goal_status(series[-1]['projected_sec'] - plan.target_time_sec)

        return Response({
            'available': True,
            'target_sec': plan.target_time_sec,
            'course_coeff': round(course_coeff, 4),
            'status': status,
            'series': series,
        })


class WeeklyVolumeView(APIView):
    """GET /api/metrics/weekly-volume/?weeks=12 — weekly distance + run count.
    Module 3 (volume) of the Analytics MVP."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        weeks = max(1, min(int(request.query_params.get('weeks', 12)), 52))
        cutoff = date.today() - timedelta(weeks=weeks)
        activities = (Activity.objects
                      .filter(user=request.user, is_valid=True,
                              start_time__gte=_date_to_dt(cutoff))
                      .order_by('start_time'))
        buckets: dict = {}
        for act in activities:
            key = _iso_week_key(act.start_time)
            b = buckets.setdefault(key, {'week': key, 'km': 0.0, 'runs': 0})
            b['km'] += float(act.distance_km or 0)
            b['runs'] += 1
        result = [{'week': b['week'], 'km': round(b['km'], 1), 'runs': b['runs']}
                  for b in sorted(buckets.values(), key=lambda x: x['week'])]
        return Response(result)


class ConsistencyView(APIView):
    """GET /api/metrics/consistency/ — weekly streak, runs/week, plan adherence.
    Module 4 (consistency) of the Analytics MVP."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()

        # ISO-week keys that have at least one run, last 26 weeks
        cutoff = today - timedelta(weeks=26)
        run_weeks = set(
            _iso_week_key(a.start_time)
            for a in Activity.objects.filter(
                user=user, is_valid=True, start_time__gte=_date_to_dt(cutoff))
        )

        # Current weekly streak: consecutive ISO weeks with a run, counting back
        # from this week.
        streak = 0
        cursor = today
        while _iso_week_key(cursor) in run_weeks:
            streak += 1
            cursor -= timedelta(weeks=1)

        # Runs per week over the last 8 weeks
        eight_ago = today - timedelta(weeks=8)
        recent_runs = Activity.objects.filter(
            user=user, is_valid=True, start_time__gte=_date_to_dt(eight_ago)).count()
        runs_per_week = round(recent_runs / 8, 1)

        # Plan adherence: completed vs past-due non-rest workouts in active plan
        adherence_pct = None
        from apps.plans.models import TrainingPlan, PlanWorkout
        plan = TrainingPlan.objects.filter(user=user, status='active').first()
        if plan:
            past_due = total = 0
            workouts = (PlanWorkout.objects
                        .filter(plan_week__plan=plan)
                        .exclude(workout_type='rest')
                        .select_related('plan_week'))
            for w in workouts:
                target = plan.start_date + timedelta(
                    days=(w.plan_week.week_number - 1) * 7 + (w.day_of_week or 0))
                if target < today:
                    total += 1
                    if w.completed:
                        past_due += 1
            if total:
                adherence_pct = round(100 * past_due / total)

        return Response({
            'current_week_streak': streak,
            'runs_per_week': runs_per_week,
            'adherence_pct': adherence_pct,
        })


class RecordsView(APIView):
    """GET /api/metrics/records/ — all-time personal bests & milestones.
    Tier 2 of the Analytics MVP. Summary-level only (no per-split PBs)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Activity.objects.filter(user=request.user, is_valid=True)
        agg = qs.aggregate(
            total_km=Sum('distance_km'),
            total_runs=Count('id'),
            longest=Max('distance_km'),
        )
        # Fastest average pace on a run of at least 5 km (short sprints would
        # skew this), null until the runner has one.
        fastest = (qs.filter(distance_km__gte=5, avg_pace_sec_per_km__isnull=False)
                   .order_by('avg_pace_sec_per_km').first())
        return Response({
            'total_distance_km': round(float(agg['total_km'] or 0), 1),
            'total_runs': agg['total_runs'] or 0,
            'longest_run_km': round(float(agg['longest'] or 0), 1),
            'fastest_pace_sec': int(round(float(fastest.avg_pace_sec_per_km))) if fastest else None,
            'fastest_pace_distance_km': round(float(fastest.distance_km), 1) if fastest else None,
        })


def _best_effort(laps, target_km: float):
    """Fastest contiguous segment covering >= target_km, scaled to the exact
    target. Returns seconds (int) or None. laps = per-km dicts with
    distance_km + duration_sec."""
    segs = [(float(l.get('distance_km') or 0), float(l.get('duration_sec') or 0))
            for l in (laps or [])]
    segs = [(d, t) for d, t in segs if d > 0 and t > 0]
    best = None
    n = len(segs)
    for i in range(n):
        cum_d = cum_t = 0.0
        for j in range(i, n):
            cum_d += segs[j][0]
            cum_t += segs[j][1]
            if cum_d >= target_km:
                est = cum_t * (target_km / cum_d)
                if best is None or est < best:
                    best = est
                break
    return int(round(best)) if best else None


class BestEffortsView(APIView):
    """GET /api/metrics/best-efforts/ — fastest 5k / 10k / half over all runs'
    per-km splits. Tier 3 of the Analytics MVP."""
    permission_classes = [IsAuthenticated]

    DISTANCES = [('5k', 5.0), ('10k', 10.0), ('half', 21.1)]

    def get(self, request):
        acts = Activity.objects.filter(user=request.user, is_valid=True)
        results = {k: None for k, _ in self.DISTANCES}
        for act in acts:
            if not act.laps:
                continue
            total = float(act.distance_km or 0)
            for key, dist in self.DISTANCES:
                if total < dist:
                    continue
                t = _best_effort(act.laps, dist)
                if t and (results[key] is None or t < results[key]['time_sec']):
                    results[key] = {
                        'time_sec': t,
                        'date': act.start_time.date().isoformat(),
                        'activity_id': str(act.id),
                    }
        return Response(results)


class BlockCompareView(APIView):
    """GET /api/metrics/block-compare/?weeks=4 — current training block vs the
    immediately-preceding one. Tier 3 of the Analytics MVP."""
    permission_classes = [IsAuthenticated]

    def _block(self, user, start, end):
        qs = Activity.objects.filter(
            user=user, is_valid=True,
            start_time__gte=_date_to_dt(start), start_time__lt=_date_to_dt(end))
        agg = qs.aggregate(km=Sum('distance_km'), runs=Count('id'),
                           longest=Max('distance_km'), avg_vdot=Avg('vdot_estimate'))
        return {
            'km': round(float(agg['km'] or 0), 1),
            'runs': agg['runs'] or 0,
            'longest_km': round(float(agg['longest'] or 0), 1),
            'avg_vdot': round(float(agg['avg_vdot']), 1) if agg['avg_vdot'] else None,
        }

    def get(self, request):
        weeks = max(1, min(int(request.query_params.get('weeks', 4)), 12))
        today = date.today()
        current = self._block(request.user, today - timedelta(weeks=weeks), today + timedelta(days=1))
        previous = self._block(request.user, today - timedelta(weeks=2 * weeks), today - timedelta(weeks=weeks))
        return Response({'weeks': weeks, 'current': current, 'previous': previous})


class PredictionAccuracyView(APIView):
    """GET /api/metrics/prediction-accuracy/ — completed race attempts with the
    prediction we made vs the actual result. The data-flywheel view. Tier 3."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.races.models import MarathonAttempt
        attempts = (MarathonAttempt.objects
                    .filter(user=request.user, status='completed',
                            actual_time_sec__isnull=False)
                    .select_related('marathon', 'prediction')
                    .order_by('-race_date'))
        rows = []
        for a in attempts:
            predicted = a.prediction.predicted_time_sec if a.prediction else None
            delta = (a.actual_time_sec - predicted) if predicted else None
            rows.append({
                'race_date': a.race_date.isoformat(),
                'marathon_name': a.marathon.name if a.marathon else None,
                'predicted_sec': predicted,
                'actual_sec': a.actual_time_sec,
                'delta_sec': delta,
                'error_pct': round(100 * delta / predicted, 1) if predicted else None,
            })
        return Response(rows)
