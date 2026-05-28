from django.urls import path
from .views import (
    MarathonListView, MarathonDetailView,
    MarathonResultsView, MarathonWeatherView,
    MarathonPreviewView, MarathonCustomCreateView,
)

urlpatterns = [
    path('', MarathonListView.as_view(), name='marathon-list'),
    path('preview/', MarathonPreviewView.as_view(), name='marathon-preview'),
    path('custom/', MarathonCustomCreateView.as_view(), name='marathon-custom-create'),
    path('<uuid:pk>/', MarathonDetailView.as_view(), name='marathon-detail'),
    path('<uuid:pk>/results/', MarathonResultsView.as_view(), name='marathon-results'),
    path('<uuid:pk>/weather/', MarathonWeatherView.as_view(), name='marathon-weather'),
]
