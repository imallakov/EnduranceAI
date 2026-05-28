from django.urls import path
from .views import (
    ActivityListView, ActivityStatsView, ActivityUploadView,
    ActivityUploadZipView, UploadStatusView, ManualActivityView,
    ActivityDetailView, ActivityMapView,
)

urlpatterns = [
    path('', ActivityListView.as_view(), name='activity-list'),
    path('stats/', ActivityStatsView.as_view(), name='activity-stats'),
    path('upload/', ActivityUploadView.as_view(), name='activity-upload'),
    path('upload-zip/', ActivityUploadZipView.as_view(), name='activity-upload-zip'),
    path('upload-status/<str:task_id>/', UploadStatusView.as_view(), name='upload-status'),
    path('manual/', ManualActivityView.as_view(), name='activity-manual'),
    path('<uuid:pk>/', ActivityDetailView.as_view(), name='activity-detail'),
    path('<uuid:pk>/map/', ActivityMapView.as_view(), name='activity-map'),
]
