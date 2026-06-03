from django.contrib import admin
from .models import Marathon, MarathonResult, Prediction, MarathonAttempt


@admin.register(Marathon)
class MarathonAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'country', 'distance_km', 'difficulty_coefficient']
    search_fields = ['name', 'city', 'country']


@admin.register(MarathonResult)
class MarathonResultAdmin(admin.ModelAdmin):
    list_display = ['marathon', 'year', 'sex', 'age_group', 'finish_time_sec']
    list_filter = ['year', 'sex']
    raw_id_fields = ['marathon']


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ['user', 'marathon', 'predicted_time_sec', 'created_at']
    raw_id_fields = ['user', 'marathon']


@admin.register(MarathonAttempt)
class MarathonAttemptAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'marathon', 'race_date', 'status',
        'actual_time_sec', 'vdot_snapshot',
        'has_weather', 'created_at',
    ]
    list_filter = ['status', 'marathon', 'race_date']
    search_fields = ['user__email', 'marathon__name']
    raw_id_fields = ['user', 'marathon', 'activity', 'prediction']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Identity', {
            'fields': ('user', 'marathon', 'race_date', 'status'),
        }),
        ('Outcome', {
            'fields': ('activity', 'actual_time_sec', 'prediction', 'notes'),
        }),
        ('Pre-race fitness snapshot', {
            'fields': ('vdot_snapshot', 'ctl_snapshot', 'atl_snapshot', 'tsb_snapshot',
                       'plan_compliance_pct'),
        }),
        ('Race context snapshot', {
            'fields': ('course_coefficient_used', 'weather_snapshot'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )

    @admin.display(boolean=True, description='Weather?')
    def has_weather(self, obj):
        return bool(obj.weather_snapshot)
