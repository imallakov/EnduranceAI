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
