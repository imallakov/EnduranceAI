from rest_framework import serializers
from django.db.models import Sum
from .models import TrainingPlan, PlanWeek, PlanWorkout


class PlanWorkoutSerializer(serializers.ModelSerializer):
    pace_min_formatted = serializers.SerializerMethodField()
    pace_max_formatted = serializers.SerializerMethodField()

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
