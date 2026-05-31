from django.urls import path
from .views import (
    StravaConnectView,
    StravaCallbackView,
    StravaStatusView,
    StravaSyncView,
    StravaDisconnectView,
    StravaWebhookView,
)

urlpatterns = [
    path('strava/connect/', StravaConnectView.as_view()),
    path('strava/callback/', StravaCallbackView.as_view()),
    path('strava/status/', StravaStatusView.as_view()),
    path('strava/sync/', StravaSyncView.as_view()),
    path('strava/disconnect/', StravaDisconnectView.as_view()),
    path('strava/webhook/', StravaWebhookView.as_view()),
]
