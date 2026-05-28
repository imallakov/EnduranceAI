from django.contrib import admin
from .models import StravaConnection


@admin.register(StravaConnection)
class StravaConnectionAdmin(admin.ModelAdmin):
    list_display = ['user', 'athlete_username', 'connected_at', 'last_sync_at', 'total_imported', 'is_broken']
    raw_id_fields = ['user']
