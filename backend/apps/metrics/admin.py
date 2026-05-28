from django.contrib import admin
from .models import DailyMetrics

@admin.register(DailyMetrics)
class DailyMetricsAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'ctl', 'atl', 'tsb']
    list_filter = ['date']
    raw_id_fields = ['user']
