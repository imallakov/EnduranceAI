import uuid
from django.db import models


class Marathon(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=2, blank=True)
    distance_km = models.DecimalField(max_digits=6, decimal_places=3, default=42.195)
    elevation_gain_m = models.DecimalField(max_digits=8, decimal_places=1, null=True, blank=True)
    elevation_loss_m = models.DecimalField(max_digits=8, decimal_places=1, null=True, blank=True)
    difficulty_coefficient = models.DecimalField(max_digits=6, decimal_places=4, default=1.0)
    gpx_file_path = models.CharField(max_length=500, blank=True)
    start_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    start_lon = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    avg_temp_by_month = models.JSONField(default=dict, blank=True)
    # Per-km elevation profile: [{km: 0, elevation_m: 12}, {km: 1, elevation_m: 14}, ...]
    # Used to render the real course profile chart on the marathon detail page,
    # instead of a synthetic sine wave derived from gain/loss alone.
    elevation_profile = models.JSONField(default=list, blank=True)
    official_url = models.CharField(max_length=500, blank=True)
    last_updated = models.DateField(null=True, blank=True)
    polyline = models.TextField(blank=True)
    major = models.BooleanField(default=False)
    is_custom = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        'users.User', null=True, blank=True,
        on_delete=models.CASCADE, related_name='custom_marathons',
    )

    class Meta:
        db_table = 'marathons'
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_avg_temp(self, month: int) -> float:
        return self.avg_temp_by_month.get(str(month), 15.0)


class MarathonResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    marathon = models.ForeignKey(Marathon, on_delete=models.CASCADE, related_name='results')
    year = models.SmallIntegerField()
    age_group = models.CharField(max_length=10, blank=True)
    sex = models.CharField(max_length=1, blank=True)
    finish_time_sec = models.IntegerField()
    position_overall = models.IntegerField(null=True, blank=True)
    position_age_group = models.IntegerField(null=True, blank=True)
    country = models.CharField(max_length=2, blank=True)

    class Meta:
        db_table = 'marathon_results'
        indexes = [
            models.Index(fields=['marathon', 'year', 'finish_time_sec'])
        ]

    def __str__(self):
        return f"{self.marathon.name} {self.year} — {self.finish_time_sec}s"


class MarathonAttempt(models.Model):
    """
    A user's actual race attempt at a specific marathon.

    Recording an attempt is the bridge between the per-user predictive
    service we provide today and the ML retraining pipeline that becomes
    possible once we have many (features → outcome) pairs.

    Snapshots are frozen at the time the attempt is recorded so the
    retraining dataset stays stable even when underlying entities move:
      - User.current_vdot drifts after every recalc → vdot_snapshot fixes it
      - Marathon.difficulty_coefficient changes if we re-import GPX → captured
      - DailyMetrics rebuilds on every recalc → CTL/ATL/TSB snapshotted
      - Climate norms in Marathon.avg_temp_by_month evolve as we add years
        → race-day weather is fetched and stored once

    All snapshots are nullable to tolerate edge cases (e.g. attempt recorded
    before user had any DailyMetrics computed).
    """

    STATUS_CHOICES = [
        ('pending', 'Pending — target race in the future'),
        ('completed', 'Completed — finished the race'),
        ('dnf', 'Did Not Finish'),
        ('cancelled', 'Cancelled — did not start'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='marathon_attempts',
    )
    marathon = models.ForeignKey(
        Marathon, on_delete=models.CASCADE, related_name='attempts',
    )
    # The activity that recorded the race performance. Nullable while the
    # attempt is pending (target race is in the future), populated once the
    # webhook delivers the matching activity.
    activity = models.ForeignKey(
        'activities.Activity', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='race_attempts',
    )
    # The prediction that was active at the time of the race — captures
    # "what we told the user to expect" so we can compute prediction error
    # post-hoc and compare model versions over time.
    prediction = models.ForeignKey(
        'races.Prediction', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='race_attempts',
    )

    # Outcome
    race_date = models.DateField()
    actual_time_sec = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # ── Pre-race fitness snapshots (frozen) ─────────────────────────────────
    vdot_snapshot = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ctl_snapshot = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    atl_snapshot = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    tsb_snapshot = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    # ── Race context snapshots (frozen) ─────────────────────────────────────
    # Course difficulty captured at attempt time — if we later re-import the
    # GPX for this marathon and the coefficient shifts, retraining still sees
    # the value the runner actually faced.
    course_coefficient_used = models.DecimalField(
        max_digits=6, decimal_places=4, null=True, blank=True,
    )
    # Real day-of weather (temp °C, humidity %, wind m/s, ...). Fetched
    # async after attempt creation via Open-Meteo historical API. Differs
    # from Marathon.avg_temp_by_month, which is a multi-year climate norm.
    weather_snapshot = models.JSONField(default=dict, blank=True)

    # ── Plan compliance ─────────────────────────────────────────────────────
    # Percentage of planned workouts in the 12 weeks leading up to race that
    # were actually completed (linked to an activity). Computed once on
    # attempt registration. Null when user had no plan.
    plan_compliance_pct = models.SmallIntegerField(null=True, blank=True)
    # Free-text notes the user can add (subjective effort, conditions,
    # injuries, etc.). Optional.
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'marathon_attempts'
        ordering = ['-race_date']
        indexes = [
            models.Index(fields=['user', '-race_date']),
            models.Index(fields=['marathon', '-race_date']),
            models.Index(fields=['status']),
        ]
        constraints = [
            # One attempt per (user, marathon, race_date) — re-running webhooks
            # shouldn't duplicate.
            models.UniqueConstraint(
                fields=['user', 'marathon', 'race_date'],
                name='unique_user_marathon_race_date',
            ),
        ]

    def __str__(self):
        outcome = f"{self.actual_time_sec}s" if self.actual_time_sec else self.status
        return f"{self.user.email} → {self.marathon.name} ({self.race_date}) — {outcome}"


class Prediction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='predictions')
    marathon = models.ForeignKey(Marathon, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    target_distance_km = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    race_date = models.DateField(null=True, blank=True)
    base_time_sec = models.IntegerField(null=True, blank=True)
    course_difficulty_coefficient = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    weather_index = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    predicted_time_sec = models.IntegerField()
    confidence_interval_sec = models.IntegerField(null=True, blank=True)
    race_readiness_score = models.SmallIntegerField(null=True, blank=True)
    features_snapshot = models.JSONField(default=dict, blank=True)
    feature_importance = models.JSONField(default=list, blank=True)
    model_version = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'predictions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} → {self.predicted_time_sec}s"
