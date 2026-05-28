import uuid
from django.db import models


class StravaConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        'users.User', on_delete=models.CASCADE, related_name='strava_connection',
    )
    athlete_id = models.BigIntegerField()
    athlete_username = models.CharField(max_length=255, blank=True)
    access_token = models.CharField(max_length=500)
    refresh_token = models.CharField(max_length=500)
    expires_at = models.DateTimeField()
    scope = models.CharField(max_length=255, blank=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    total_imported = models.IntegerField(default=0)
    is_broken = models.BooleanField(default=False)
    connected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'strava_connections'

    def __str__(self):
        return f"{self.user.email} → Strava @{self.athlete_username}"
