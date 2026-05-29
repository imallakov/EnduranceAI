import secrets
import logging

from django.core.cache import cache
from django.http import HttpResponseRedirect
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import StravaConnection
from . import strava_client

from django.conf import settings

logger = logging.getLogger(__name__)

FRONTEND_BASE = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

_ALLOWED_REDIRECT_PATHS = {'/settings', '/onboarding'}


class StravaConnectView(APIView):
    """POST /api/integrations/strava/connect/ — returns OAuth authorize URL."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        state = secrets.token_urlsafe(32)
        redirect_path = request.data.get('redirect_path', '/settings')
        if redirect_path not in _ALLOWED_REDIRECT_PATHS:
            redirect_path = '/settings'
        cache.set(
            f'strava_oauth:{state}',
            {'user_id': str(request.user.id), 'redirect_path': redirect_path},
            timeout=600,
        )
        url = strava_client.get_authorize_url(state)
        return Response({'authorize_url': url})


class StravaCallbackView(APIView):
    """GET /api/integrations/strava/callback/ — Strava OAuth redirect target."""
    permission_classes = [AllowAny]

    def get(self, request):
        from datetime import datetime, timezone

        if request.query_params.get('error'):
            return HttpResponseRedirect(f'{FRONTEND_BASE}/settings?strava=error&message=access_denied')

        code = request.query_params.get('code', '')
        state = request.query_params.get('state', '')

        cached = cache.get(f'strava_oauth:{state}')
        if not cached:
            return HttpResponseRedirect(f'{FRONTEND_BASE}/settings?strava=error&message=invalid_state')
        cache.delete(f'strava_oauth:{state}')

        if isinstance(cached, dict):
            user_id = cached['user_id']
            redirect_path = cached.get('redirect_path', '/settings')
        else:
            user_id = cached
            redirect_path = '/settings'

        try:
            token_data = strava_client.exchange_code(code)
        except Exception as exc:
            logger.error("Strava code exchange failed: %s", exc)
            return HttpResponseRedirect(f'{FRONTEND_BASE}{redirect_path}?strava=error&message=exchange_failed')

        athlete = token_data.get('athlete') or {}
        expires_at = datetime.fromtimestamp(token_data['expires_at'], tz=timezone.utc)
        username = athlete.get('username') or athlete.get('firstname') or str(athlete.get('id', ''))

        StravaConnection.objects.update_or_create(
            user_id=user_id,
            defaults={
                'athlete_id': athlete.get('id', 0),
                'athlete_username': username,
                'access_token': token_data['access_token'],
                'refresh_token': token_data['refresh_token'],
                'expires_at': expires_at,
                'scope': token_data.get('scope', ''),
                'is_broken': False,
            },
        )

        from .tasks import sync_strava_activities
        try:
            sync_strava_activities.delay(user_id, initial=True)
        except Exception:
            logger.warning("Celery unavailable — initial Strava sync skipped")

        return HttpResponseRedirect(f'{FRONTEND_BASE}{redirect_path}?strava=connected')


class StravaStatusView(APIView):
    """GET /api/integrations/strava/status/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            conn = StravaConnection.objects.get(user=request.user)
        except StravaConnection.DoesNotExist:
            return Response({
                'connected': False,
                'is_broken': False,
                'athlete_username': None,
                'last_sync_at': None,
                'total_imported': 0,
                'expires_at': None,
            })
        return Response({
            'connected': True,
            'is_broken': conn.is_broken,
            'athlete_username': conn.athlete_username,
            'last_sync_at': conn.last_sync_at,
            'total_imported': conn.total_imported,
            'expires_at': conn.expires_at,
        })


class StravaSyncView(APIView):
    """POST /api/integrations/strava/sync/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not StravaConnection.objects.filter(user=request.user).exists():
            return Response({'error': 'Not connected to Strava'}, status=status.HTTP_400_BAD_REQUEST)

        from .tasks import sync_strava_activities
        try:
            task = sync_strava_activities.delay(str(request.user.id), initial=False)
        except Exception:
            return Response(
                {'error': 'Background processing unavailable'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({'task_id': task.id})


class StravaDisconnectView(APIView):
    """POST /api/integrations/strava/disconnect/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            conn = StravaConnection.objects.get(user=request.user)
        except StravaConnection.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        strava_client.deauthorize(conn.access_token)
        conn.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
