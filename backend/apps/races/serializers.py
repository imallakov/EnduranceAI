from rest_framework import serializers
from .models import Marathon, MarathonResult, Prediction


class MarathonSerializer(serializers.ModelSerializer):
    results_count = serializers.SerializerMethodField()
    has_historical_data = serializers.SerializerMethodField()

    class Meta:
        model = Marathon
        fields = '__all__'

    def get_results_count(self, obj):
        # Prefer the annotated value (set by MarathonListView/MarathonDetailView)
        # to avoid an extra COUNT(*) per row. Fall back to a query when the
        # serializer is used outside those views (e.g. PredictionSerializer).
        cached = getattr(obj, '_results_count', None)
        return cached if cached is not None else obj.results.count()

    def get_has_historical_data(self, obj):
        cached = getattr(obj, '_results_count', None)
        if cached is not None:
            return cached > 0
        return bool(obj.results.exists())


class MarathonResultSerializer(serializers.ModelSerializer):
    finish_time_formatted = serializers.SerializerMethodField()

    class Meta:
        model = MarathonResult
        fields = '__all__'

    def get_finish_time_formatted(self, obj):
        s = obj.finish_time_sec
        return f"{s // 3600}:{(s % 3600) // 60:02d}:{s % 60:02d}"


class PredictionSerializer(serializers.ModelSerializer):
    marathon_name = serializers.CharField(source='marathon.name', read_only=True)
    # Carry the marathon's encoded polyline so share-story templates can render
    # the route as background art for predictions (previously the prediction
    # share dropped to a flat dark background because Prediction has no native
    # polyline of its own — only ForeignKey to Marathon).
    marathon_polyline = serializers.CharField(source='marathon.polyline', read_only=True, default='')
    predicted_time_formatted = serializers.SerializerMethodField()

    class Meta:
        model = Prediction
        exclude = ['user']

    def get_predicted_time_formatted(self, obj):
        s = obj.predicted_time_sec
        return f"{s // 3600}:{(s % 3600) // 60:02d}:{s % 60:02d}"


class PredictionRequestSerializer(serializers.Serializer):
    marathon_id = serializers.UUIDField(required=False, allow_null=True)
    distance_km = serializers.FloatField(required=False, default=42.195)
    race_date = serializers.DateField(required=False, allow_null=True)
    temp_c = serializers.FloatField(required=False, allow_null=True)
    humidity_pct = serializers.FloatField(required=False, default=60.0)
    wind_ms = serializers.FloatField(required=False, default=0.0)
