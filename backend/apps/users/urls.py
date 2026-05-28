from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView,
    ProfileView, ChangePasswordView, DeleteAccountView,
    OnboardingCompleteView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('profile/', ProfileView.as_view(), name='auth-profile'),
    path('profile/delete/', DeleteAccountView.as_view(), name='auth-delete-account'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('onboarding/complete/', OnboardingCompleteView.as_view(), name='auth-onboarding-complete'),
    # NOTE: /me/data-export/ is mounted directly in config/urls.py under /api/users/
    # to keep the GDPR endpoint outside the /api/auth/ namespace.
]
