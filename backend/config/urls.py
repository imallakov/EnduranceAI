from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.users.views import DataExportView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/users/me/data-export/', DataExportView.as_view(), name='user-data-export'),
    path('api/activities/', include('apps.activities.urls')),
    path('api/metrics/', include('apps.metrics.urls')),
    path('api/marathons/', include('apps.races.urls')),
    path('api/predictions/', include('apps.races.prediction_urls')),
    path('api/plans/', include('apps.plans.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/integrations/', include('apps.integrations.urls')),
    path('api/legal/', include('apps.legal.urls')),
    # OpenAPI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
