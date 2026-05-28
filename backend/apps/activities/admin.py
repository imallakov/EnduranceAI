from django.contrib import admin
from .models import Activity

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'start_time', 'distance_km', 'duration_sec', 'source', 'is_valid']
    list_filter = ['source', 'is_valid']
    search_fields = ['user__email']
    raw_id_fields = ['user']
