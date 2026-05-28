from django.contrib import admin
from .models import TrainingPlan, PlanWeek, PlanWorkout


class PlanWeekInline(admin.TabularInline):
    model = PlanWeek
    extra = 0


@admin.register(TrainingPlan)
class TrainingPlanAdmin(admin.ModelAdmin):
    list_display = ['user', 'race_date', 'status', 'days_per_week', 'created_at']
    inlines = [PlanWeekInline]
    raw_id_fields = ['user']


@admin.register(PlanWorkout)
class PlanWorkoutAdmin(admin.ModelAdmin):
    list_display = ['plan_week', 'day_of_week', 'workout_type', 'distance_km', 'completed']
