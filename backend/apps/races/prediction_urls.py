from django.urls import path
from .views import (
    PredictionCreateView, PredictionListView,
    PredictionLatestView, PredictionDetailView,
)

urlpatterns = [
    path('', PredictionCreateView.as_view(), name='prediction-create'),
    path('list/', PredictionListView.as_view(), name='prediction-list'),
    path('latest/', PredictionLatestView.as_view(), name='prediction-latest'),
    path('<uuid:pk>/', PredictionDetailView.as_view(), name='prediction-detail'),
]
