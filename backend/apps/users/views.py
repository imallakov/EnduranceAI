import logging

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from django.conf import settings

logger = logging.getLogger(__name__)

from .serializers import (
    RegisterSerializer, UserProfileSerializer,
    ChangePasswordSerializer, CustomTokenObtainPairSerializer
)

User = get_user_model()


def _set_refresh_cookie(response, refresh_token):
    """Attach the rotating refresh token as an httpOnly, path-scoped cookie."""
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        str(refresh_token),
        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        path=settings.REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response):
    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path=settings.REFRESH_COOKIE_PATH)


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ → {access, refresh, user}"""
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        response = Response({
            'access': str(refresh.access_token),
            'user': UserProfileSerializer(user).data,
        }, status=status.HTTP_201_CREATED)
        _set_refresh_cookie(response, refresh)   # httpOnly cookie, not body
        return response


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ → {access, user} (+ refresh as httpOnly cookie)"""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if (response.status_code == 200 and isinstance(response.data, dict)
                and 'refresh' in response.data):
            _set_refresh_cookie(response, response.data.pop('refresh'))
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """POST /api/auth/token/refresh/ → {access} (refresh comes from the cookie).

    Reads the refresh token from the httpOnly cookie (not the body), rotates it
    (ROTATE_REFRESH_TOKENS=True blacklists the old one), sets the new refresh
    cookie, and returns only the new access token in the body.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not refresh:
            return Response({'detail': 'No refresh token.'},
                            status=status.HTTP_401_UNAUTHORIZED)
        serializer = self.get_serializer(data={'refresh': refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except (InvalidToken, TokenError):
            resp = Response({'detail': 'Invalid or expired refresh token.'},
                            status=status.HTTP_401_UNAUTHORIZED)
            _clear_refresh_cookie(resp)   # stale cookie → drop it
            return resp

        data = serializer.validated_data
        response = Response({'access': data['access']}, status=status.HTTP_200_OK)
        if data.get('refresh'):           # rotation issued a new refresh token
            _set_refresh_cookie(response, data['refresh'])
        return response


class LogoutView(APIView):
    """POST /api/auth/logout/ → 204. Blacklists the cookie's refresh, clears it."""
    permission_classes = [AllowAny]   # must work even if the access token expired

    def post(self, request):
        refresh = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except Exception:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_refresh_cookie(response)
        return response


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
        old_target_date = self.request.user.target_race_date
        user = serializer.save()
        new_target_id = user.target_marathon_id
        new_target_date = user.target_race_date

        marathon_changed = bool(new_target_id) and new_target_id != old_target_id
        date_changed = new_target_date != old_target_date

        # New target marathon → fresh prediction so Dashboard isn't stale.
        if marathon_changed:
            self._auto_create_prediction(user)

        # Either marathon or race date changed → re-scan recent activities
        # for race attempts. Handles the typo-fix case: user originally typed
        # the wrong year/month, ran the race, the activity didn't match, the
        # user now corrects the date — the existing activity should now
        # register as an attempt.
        if marathon_changed or date_changed:
            from apps.races.services import backfill_race_attempts_for_user
            try:
                backfill_race_attempts_for_user(user)
            except Exception:
                import logging
                logging.getLogger(__name__).exception(
                    "backfill_race_attempts failed for user %s", user.id,
                )

    @staticmethod
    def _auto_create_prediction(user):
        # Enqueue (don't block the PATCH on Open-Meteo). The worker creates the
        # prediction; the Dashboard picks it up on its next load.
        from apps.races.tasks import generate_target_prediction
        generate_target_prediction.delay(str(user.id))


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
            from apps.races.services import backfill_race_attempts_for_user
            from apps.races.tasks import generate_target_prediction
            # Prediction generation hits Open-Meteo → enqueue, don't block POST.
            generate_target_prediction.delay(str(user.id))
            # If the user uploaded historical activities before completing
            # onboarding (e.g. their last race), this catches it (DB-only, fast).
            try:
                backfill_race_attempts_for_user(user)
            except Exception:
                import logging
                logging.getLogger(__name__).exception(
                    "onboarding backfill failed for user %s", user.id,
                )

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
