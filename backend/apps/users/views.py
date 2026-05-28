import logging

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

from .serializers import (
    RegisterSerializer, UserProfileSerializer,
    ChangePasswordSerializer, CustomTokenObtainPairSerializer
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ → {access, refresh, user}"""
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserProfileSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ → {access, refresh, user}"""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class LogoutView(APIView):
    """POST /api/auth/logout/ → 204"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT/PATCH /api/auth/profile/ → User

    Side effect: when target_marathon changes, auto-generate a prediction
    for the new race so the Dashboard hero card has something to show
    immediately. Without this the user sets a target and still sees the
    old prediction for the previous race — feels broken.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        old_target_id = self.request.user.target_marathon_id
        user = serializer.save()
        new_target_id = user.target_marathon_id
        if new_target_id and new_target_id != old_target_id:
            self._auto_create_prediction(user)

    @staticmethod
    def _auto_create_prediction(user):
        from apps.races.services import auto_create_prediction_for_target
        auto_create_prediction_for_target(user)


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password changed successfully.'})


class DeleteAccountView(APIView):
    """DELETE /api/auth/profile/ → 204 (cascade delete all data)"""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.delete()  # CASCADE deletes all related data
        return Response(status=status.HTTP_204_NO_CONTENT)


class OnboardingCompleteView(APIView):
    """POST /api/auth/onboarding/complete/ — mark onboarding done, optionally trigger prediction."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.onboarding_completed = True
        user.save(update_fields=['onboarding_completed'])

        if user.activities.exists() and user.target_marathon_id:
            from apps.races.services import auto_create_prediction_for_target
            auto_create_prediction_for_target(user)

        return Response({'ok': True})


class DataExportView(APIView):
    """GET /api/users/me/data-export/ → ZIP of all user data (GDPR Art. 20)"""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'data_export'

    def get(self, request):
        from .data_export import build_export_archive
        from django.http import HttpResponse
        from datetime import datetime

        archive_bytes = build_export_archive(request.user)
        ts = datetime.now().strftime('%Y-%m-%d')
        filename = f'enduranceai_export_{request.user.id}_{ts}.zip'

        response = HttpResponse(archive_bytes, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(archive_bytes)
        return response
