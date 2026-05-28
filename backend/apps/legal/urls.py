from django.urls import path
from .views import ActivePolicyView, AcceptPolicyView, UserAcceptancesView

urlpatterns = [
    path('policies/<str:policy_type>/active/', ActivePolicyView.as_view(), name='active-policy'),
    path('accept/', AcceptPolicyView.as_view(), name='accept-policy'),
    path('user-acceptances/', UserAcceptancesView.as_view(), name='user-acceptances'),
]
