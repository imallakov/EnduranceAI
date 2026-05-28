from django.urls import path
from .views import (
    GeneratePlanView, ActivePlanView, PlanDetailView,
    PlanWeeksView, ExportPlanPDFView, ExportPlanCSVView,
    WorkoutCompleteView, WorkoutPatchView,
)

urlpatterns = [
    path('generate/', GeneratePlanView.as_view(), name='plan-generate'),
    path('active/', ActivePlanView.as_view(), name='plan-active'),
    path('<uuid:pk>/', PlanDetailView.as_view(), name='plan-detail'),
    path('<uuid:pk>/weeks/', PlanWeeksView.as_view(), name='plan-weeks'),
    path('<uuid:pk>/export/pdf/', ExportPlanPDFView.as_view(), name='plan-export-pdf'),
    path('<uuid:pk>/export/csv/', ExportPlanCSVView.as_view(), name='plan-export-csv'),
    path('<uuid:pk>/workouts/<uuid:wid>/complete/', WorkoutCompleteView.as_view(), name='workout-complete'),
    path('<uuid:pk>/workouts/<uuid:wid>/', WorkoutPatchView.as_view(), name='workout-patch'),
]
