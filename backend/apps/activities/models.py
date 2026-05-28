import uuid
from django.db import models


class Activity(models.Model):
    SOURCE_CHOICES = [
        ('fit', 'FIT'), ('gpx', 'GPX'), ('tcx', 'TCX'), ('manual', 'Manual'), ('strava', 'Strava'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='activities')
    file_hash = models.CharField(max_length=64, null=True, blank=True)
    start_time = models.DateTimeField()
    distance_km = models.DecimalField(max_digits=8, decimal_places=3)
    duration_sec = models.IntegerField()
    avg_pace_sec_per_km = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    avg_hr = models.SmallIntegerField(null=True, blank=True)
    max_hr = models.SmallIntegerField(null=True, blank=True)
    elevation_gain_m = models.DecimalField(max_digits=8, decimal_places=1, null=True, blank=True)
    elevation_loss_m = models.DecimalField(max_digits=8, decimal_places=1, null=True, blank=True)
    avg_cadence = models.SmallIntegerField(null=True, blank=True)
    calories = models.IntegerField(null=True, blank=True)
    vdot_estimate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    tss = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    laps = models.JSONField(default=list, blank=True)
    hr_zones_sec = models.JSONField(default=dict, blank=True)
    polyline = models.TextField(blank=True)
    raw_file_path = models.CharField(max_length=500, blank=True)
    external_strava_id = models.BigIntegerField(null=True, blank=True, unique=True)
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='fit')
    is_valid = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activities'
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['user', '-start_time'])
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'file_hash'],
                condition=models.Q(file_hash__isnull=False),
                name='unique_user_file_hash',
            )
        ]

    def __str__(self):
        return f"{self.user.email} — {self.start_time.date()} {self.distance_km}km"
