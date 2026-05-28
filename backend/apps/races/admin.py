from django.contrib import admin
from .models import Marathon, MarathonResult, Prediction


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
