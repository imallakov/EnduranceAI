from django.urls import path
from .views import (
    CurrentMetricsView, DailyMetricsView,
    VdotHistoryView, HREfficiencyView, ZonesDistributionView,
    GoalProgressView, WeeklyVolumeView, ConsistencyView, RecordsView,
    BestEffortsView, BlockCompareView, PredictionAccuracyView,
)

urlpatterns = [
    path('current/', CurrentMetricsView.as_view(), name='metrics-current'),
    path('daily/', DailyMetricsView.as_view(), name='metrics-daily'),
    path('vdot-history/', VdotHistoryView.as_view(), name='metrics-vdot-history'),
    path('hr-efficiency/', HREfficiencyView.as_view(), name='metrics-hr-efficiency'),
    path('zones-dist/', ZonesDistributionView.as_view(), name='metrics-zones-dist'),
    path('goal-progress/', GoalProgressView.as_view(), name='metrics-goal-progress'),
    path('weekly-volume/', WeeklyVolumeView.as_view(), name='metrics-weekly-volume'),
    path('consistency/', ConsistencyView.as_view(), name='metrics-consistency'),
    path('records/', RecordsView.as_view(), name='metrics-records'),
    path('best-efforts/', BestEffortsView.as_view(), name='metrics-best-efforts'),
    path('block-compare/', BlockCompareView.as_view(), name='metrics-block-compare'),
    path('prediction-accuracy/', PredictionAccuracyView.as_view(), name='metrics-prediction-accuracy'),
]
