import uuid
from django.db import models


class TrainingPlan(models.Model):
    STATUS_CHOICES = [('active', 'Active'), ('completed', 'Completed'), ('archived', 'Archived')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='training_plans')
    prediction = models.ForeignKey(
        'races.Prediction', on_delete=models.SET_NULL, null=True, blank=True
    )
    start_date = models.DateField()
    race_date = models.DateField()
    target_time_sec = models.IntegerField(null=True, blank=True)
    vdot_at_creation = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    # VDOT that the current paces in this plan were computed against. Diverges
    # from vdot_at_creation each time refresh_plan_paces() runs because the
    # user's fitness changed enough (≥2 VDOT pts) to make stale paces.
    vdot_at_last_refresh = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    last_paces_refresh_at = models.DateTimeField(null=True, blank=True)
    days_per_week = models.SmallIntegerField(default=4)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'training_plans'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} plan → {self.race_date}"


class PlanWeek(models.Model):
    PHASE_CHOICES = [
        ('base', 'Base'), ('early_quality', 'Early Quality'),
        ('late_quality', 'Late Quality'), ('taper', 'Taper'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(TrainingPlan, on_delete=models.CASCADE, related_name='weeks')
    week_number = models.SmallIntegerField()
    phase = models.CharField(max_length=20, choices=PHASE_CHOICES, blank=True)
    total_km = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'plan_weeks'
        unique_together = [('plan', 'week_number')]
        ordering = ['week_number']

    def __str__(self):
        return f"Week {self.week_number} ({self.phase})"


class PlanWorkout(models.Model):
    WORKOUT_TYPES = [
        ('easy', 'Easy'), ('tempo', 'Tempo'), ('interval', 'Interval'),
        ('repetition', 'Repetition'), ('long', 'Long Run'),
        ('marathon_pace', 'Marathon Pace'), ('rest', 'Rest'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan_week = models.ForeignKey(PlanWeek, on_delete=models.CASCADE, related_name='workouts')
    day_of_week = models.SmallIntegerField(null=True, blank=True)  # 0=Mon, 6=Sun
    workout_type = models.CharField(max_length=20, choices=WORKOUT_TYPES, default='easy')
    distance_km = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    structure = models.JSONField(default=dict, blank=True)
    pace_min_sec = models.IntegerField(null=True, blank=True)
    pace_max_sec = models.IntegerField(null=True, blank=True)
    hr_min = models.SmallIntegerField(null=True, blank=True)
    hr_max = models.SmallIntegerField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    activity = models.ForeignKey(
        'activities.Activity', on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        db_table = 'plan_workouts'
        ordering = ['day_of_week']

    def __str__(self):
        return f"{self.workout_type} {self.distance_km}km day={self.day_of_week}"
