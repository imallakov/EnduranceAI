from django.urls import path
from .views import (
    CurrentMetricsView, DailyMetricsView,
    VdotHistoryView, HREfficiencyView, ZonesDistributionView,
)

urlpatterns = [
    path('current/', CurrentMetricsView.as_view(), name='metrics-current'),
    path('daily/', DailyMetricsView.as_view(), name='metrics-daily'),
    path('vdot-history/', VdotHistoryView.as_view(), name='metrics-vdot-history'),
    path('hr-efficiency/', HREfficiencyView.as_view(), name='metrics-hr-efficiency'),
    path('zones-dist/', ZonesDistributionView.as_view(), name='metrics-zones-dist'),
]
