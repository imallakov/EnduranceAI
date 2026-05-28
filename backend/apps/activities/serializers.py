from rest_framework import serializers
from .models import Activity


class ActivityListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = [
            'id', 'start_time', 'distance_km', 'duration_sec',
            'avg_pace_sec_per_km', 'avg_hr', 'vdot_estimate', 'tss',
            'elevation_gain_m', 'source', 'is_valid',
        ]


class ActivityDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        exclude = ['user', 'raw_file_path', 'file_hash']


class ManualActivitySerializer(serializers.Serializer):
    date = serializers.DateField()
    distance_km = serializers.FloatField(min_value=0.1)
    duration_sec = serializers.IntegerField(min_value=61)
    avg_hr = serializers.IntegerField(min_value=40, max_value=220, required=False, allow_null=True)
    elevation_gain_m = serializers.FloatField(min_value=0, required=False, allow_null=True)
