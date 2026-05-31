from rest_framework import serializers
from django.db.models import Sum
from .models import TrainingPlan, PlanWeek, PlanWorkout


class PlanWorkoutSerializer(serializers.ModelSerializer):
    pace_min_formatted = serializers.SerializerMethodField()
    pace_max_formatted = serializers.SerializerMethodField()
    actual_pace_formatted = serializers.SerializerMethodField()

    class Meta:
        model = PlanWorkout
        exclude = ['plan_week']

    def get_pace_min_formatted(self, obj):
        if obj.pace_min_sec:
            m, s = divmod(obj.pace_min_sec, 60)
            return f"{m}:{s:02d}/km"
        return None

    def get_pace_max_formatted(self, obj):
        if obj.pace_max_sec:
            m, s = divmod(obj.pace_max_sec, 60)
            return f"{m}:{s:02d}/km"
        return None

    def get_actual_pace_formatted(self, obj):
        if obj.actual_pace_sec:
            m, s = divmod(obj.actual_pace_sec, 60)
            return f"{m}:{s:02d}/km"
        return None


class PlanWeekSerializer(serializers.ModelSerializer):
    workouts = PlanWorkoutSerializer(many=True, read_only=True)

    class Meta:
        model = PlanWeek
        exclude = ['plan']


class TrainingPlanSerializer(serializers.ModelSerializer):
    weeks = PlanWeekSerializer(many=True, read_only=True)
    days_to_race = serializers.SerializerMethodField()
    current_week_number = serializers.SerializerMethodField()
    total_weeks = serializers.SerializerMethodField()
    plan_total_km = serializers.SerializerMethodField()
    total_distance_km_completed = serializers.SerializerMethodField()
    total_workouts = serializers.SerializerMethodField()
    completed_workouts = serializers.SerializerMethodField()
    pace_zones = serializers.SerializerMethodField()
    # L1 plan adaptation: signal to the UI that paces were auto-refreshed
    # so it can render a "your plan was updated" banner.
    paces_refreshed = serializers.SerializerMethodField()
    # L2 aggregate: rolling performance signal across recently completed
    # workouts. Lets the UI render "your last N intervals were 5 sec/km
    # faster than planned on average" without the frontend doing math.
    performance_summary = serializers.SerializerMethodField()
    # L3 recovery banner: signals that this week was auto-rewritten to
    # recovery due to a missed-workouts pattern in the previous week.
    recovery_week = serializers.SerializerMethodField()
    # L4 goal feasibility: projected marathon time using current VDOT, compared
    # to the target_time the user originally aimed for. UI uses this to render
    # an "on track / ahead / behind" banner.
    goal_feasibility = serializers.SerializerMethodField()

    class Meta:
        model = TrainingPlan
        exclude = ['user']

    def get_days_to_race(self, obj):
        from datetime import date
        return (obj.race_date - date.today()).days

    def get_current_week_number(self, obj):
        from datetime import date
        days_since_start = (date.today() - obj.start_date).days
        week_num = max(1, days_since_start // 7 + 1)
        total = obj.weeks.count()
        return min(week_num, total or 16)

    def get_total_weeks(self, obj):
        return obj.weeks.count()

    def get_plan_total_km(self, obj):
        result = PlanWeek.objects.filter(plan=obj).aggregate(total=Sum('total_km'))
        return float(result['total'] or 0)

    def get_total_distance_km_completed(self, obj):
        result = PlanWorkout.objects.filter(
            plan_week__plan=obj, completed=True
        ).aggregate(total=Sum('distance_km'))
        return float(result['total'] or 0)

    def get_total_workouts(self, obj):
        return PlanWorkout.objects.filter(
            plan_week__plan=obj
        ).exclude(workout_type='rest').count()

    def get_completed_workouts(self, obj):
        return PlanWorkout.objects.filter(
            plan_week__plan=obj, completed=True
        ).exclude(workout_type='rest').count()

    def get_paces_refreshed(self, obj):
        """
        Returns refresh metadata only if paces were refreshed AFTER plan
        creation AND within the last 7 days (so the banner appears for a
        meaningful window then auto-fades). Null otherwise.
        """
        if not obj.last_paces_refresh_at or not obj.vdot_at_last_refresh:
            return None
        if not obj.vdot_at_creation:
            return None
        baseline = float(obj.vdot_at_creation)
        latest = float(obj.vdot_at_last_refresh)
        # Only signal when paces actually moved from the original baseline
        if abs(latest - baseline) < 0.5:
            return None
        # Auto-fade banner after 7 days so it doesn't linger forever
        from django.utils import timezone
        from datetime import timedelta
        if (timezone.now() - obj.last_paces_refresh_at) > timedelta(days=7):
            return None
        return {
            'old_vdot': round(baseline, 1),
            'new_vdot': round(latest, 1),
            'delta': round(latest - baseline, 1),
            'refreshed_at': obj.last_paces_refresh_at.isoformat(),
        }

    def get_performance_summary(self, obj):
        """
        Compute aggregate L2 stats across recently completed workouts:
          - total_scored: how many of last 8 completed workouts have scores
          - avg_score: arithmetic mean of those scores (-2 to +2)
          - consistency: % of "in-zone or favourable" workouts (score >= 0)

        Returns null if not enough data (fewer than 3 scored workouts) so the
        UI can show "no data yet" instead of a misleading single-data-point chart.
        """
        recent = (PlanWorkout.objects
                  .filter(plan_week__plan=obj, completed=True,
                          performance_score__isnull=False)
                  .order_by('-plan_week__week_number', '-day_of_week')[:8])
        recent = list(recent)
        if len(recent) < 3:
            return None
        scores = [w.performance_score for w in recent]
        in_zone_or_better = sum(1 for s in scores if s >= 0)
        return {
            'total_scored': len(scores),
            'avg_score': round(sum(scores) / len(scores), 2),
            'consistency_pct': round(100 * in_zone_or_better / len(scores)),
        }

    def get_goal_feasibility(self, obj):
        """
        L4: project marathon time using current VDOT + the target marathon's
        course difficulty, compare to target_time_sec. Null if either is
        missing (we can't judge feasibility without both inputs).

        Status thresholds (delta = projected - target):
          delta < -3 min  → 'ahead' (likely beating target by 3+ min)
          delta in ±3 min → 'on_track'
          delta in +3..+10 min → 'slightly_behind'
          delta > +10 min → 'behind' (banner suggests adjustment)

        Weather is intentionally NOT included here — we don't know race-day
        conditions weeks out. The point is a fitness-vs-target signal, not
        the precise race-day prediction (which the Predictions page does).
        """
        if not obj.target_time_sec:
            return None
        user = obj.user
        vdot = float(user.current_vdot or 0)
        if vdot <= 0:
            return None
        try:
            from ml.src.formulas import daniels_equivalent_time
            base_sec = daniels_equivalent_time(vdot, 42195)
        except Exception:
            return None
        if base_sec <= 0:
            return None

        # Apply course coefficient if the user has a target marathon set
        course_coeff = 1.0
        if obj.prediction_id:
            # Plan was created from a prediction → the prediction knew the marathon
            try:
                pred = obj.prediction
                if pred and pred.marathon and pred.marathon.difficulty_coefficient:
                    course_coeff = float(pred.marathon.difficulty_coefficient)
            except Exception:
                pass
        else:
            # Fallback: pick up user's currently-targeted marathon
            target_marathon = getattr(user, 'target_marathon', None)
            if target_marathon and target_marathon.difficulty_coefficient:
                course_coeff = float(target_marathon.difficulty_coefficient)

        projected_sec = int(round(base_sec * course_coeff))
        target_sec = obj.target_time_sec
        delta_sec = projected_sec - target_sec

        if delta_sec < -180:
            status_label = 'ahead'
        elif delta_sec <= 180:
            status_label = 'on_track'
        elif delta_sec <= 600:
            status_label = 'slightly_behind'
        else:
            status_label = 'behind'

        return {
            'projected_time_sec': projected_sec,
            'target_time_sec': target_sec,
            'delta_sec': delta_sec,
            'status': status_label,
            'vdot_used': round(vdot, 1),
            'course_coeff_used': round(course_coeff, 4),
        }

    def get_recovery_week(self, obj):
        """L3 banner data: present when current week is a recovery rewrite."""
        from datetime import date
        if not obj.last_recovery_week_number or not obj.last_recovery_applied_at:
            return None
        # Compute current week number same way as get_current_week_number
        days_since_start = (date.today() - obj.start_date).days
        if days_since_start < 0:
            return None
        current_week = days_since_start // 7 + 1
        if current_week != obj.last_recovery_week_number:
            return None   # banner only relevant on the recovered week itself
        return {
            'week_number': obj.last_recovery_week_number,
            'applied_at': obj.last_recovery_applied_at.isoformat(),
        }

    def get_pace_zones(self, obj):
        # Prefer the refreshed VDOT so pace zones match the current workouts.
        # Falls back to vdot_at_creation for plans that haven't been refreshed yet.
        base_vdot = obj.vdot_at_last_refresh or obj.vdot_at_creation
        if not base_vdot:
            return []
        try:
            from ml.src.formulas import vdot_to_paces, format_pace
            vdot = float(base_vdot)
            paces = vdot_to_paces(vdot)
            e_min = format_pace(paces['E'])
            e_max = format_pace(int(paces['E'] * 1.10))
            return [
                {'key': 'E', 'name': 'Easy',       'pace': f"{e_min}–{e_max}", 'sub': 'Aerobic',    'color': '#10B981'},
                {'key': 'M', 'name': 'Marathon',   'pace': format_pace(paces['M']), 'sub': 'Race',   'color': '#1E1B4B'},
                {'key': 'T', 'name': 'Threshold',  'pace': format_pace(paces['T']), 'sub': 'Tempo',  'color': '#F59E0B'},
                {'key': 'I', 'name': 'VO2max',     'pace': format_pace(paces['I']), 'sub': '200m',   'color': '#DC2626'},
                {'key': 'R', 'name': 'Repetition', 'pace': format_pace(paces['R']), 'sub': '400m',   'color': '#F97066'},
            ]
        except Exception:
            return []


class GeneratePlanSerializer(serializers.Serializer):
    race_date = serializers.DateField()
    target_time_sec = serializers.IntegerField(required=False, allow_null=True)
    days_per_week = serializers.IntegerField(min_value=3, max_value=6, default=4)
    cutback_enabled = serializers.BooleanField(default=True)


class WorkoutCompleteSerializer(serializers.Serializer):
    activity_id = serializers.UUIDField(required=False, allow_null=True)
