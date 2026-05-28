"""Celery tasks for Strava sync."""
import logging
from datetime import timedelta
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def sync_strava_activities(self, user_id: str, initial: bool = False):
    """Import Strava running activities for a user."""
    from django.utils import timezone
    from apps.integrations.models import StravaConnection
    from apps.integrations.strava_client import list_activities, convert_activity, ensure_fresh_token
    from apps.activities.models import Activity

    try:
        conn = StravaConnection.objects.select_related('user').get(user_id=user_id)
    except StravaConnection.DoesNotExist:
        return {'status': 'error', 'message': 'Not connected to Strava'}

    try:
        ensure_fresh_token(conn)
    except Exception as exc:
        return {'status': 'error', 'message': f'Token refresh failed: {exc}'}

    if initial:
        # Initial connect — pull a full year so users with infrequent or
        # seasonal training still see history populated. Strava rate
        # limit (100/15min) easily accommodates this; even 500 activities
        # = ~3 page fetches.
        after_dt = timezone.now() - timedelta(days=365)
    else:
        after_dt = conn.last_sync_at or conn.connected_at
    after_unix = int(after_dt.timestamp())

    try:
        raw_activities = list_activities(conn, after=after_unix)
    except PermissionError as exc:
        return {'status': 'error', 'message': str(exc)}
    except Exception as exc:
        logger.exception("Strava fetch error for user %s", user_id)
        return {'status': 'error', 'message': f'Fetch failed: {exc}'}

    imported = 0
    skipped = 0

    for raw in raw_activities:
        kwargs = convert_activity(raw)
        if kwargs is None:
            skipped += 1
            continue

        strava_id = kwargs['external_strava_id']
        if Activity.objects.filter(external_strava_id=strava_id).exists():
            skipped += 1
            continue

        try:
            Activity.objects.create(user_id=user_id, **kwargs)
            imported += 1
        except Exception as exc:
            logger.warning("Failed to save Strava activity %s: %s", strava_id, exc)

    conn.last_sync_at = timezone.now()
    conn.total_imported = conn.total_imported + imported
    conn.save(update_fields=['last_sync_at', 'total_imported'])

    if imported > 0:
        from apps.activities.tasks import recalculate_user_metrics
        recalculate_user_metrics.delay(user_id)

    return {
        'status': 'ok',
        'imported': imported,
        'skipped': skipped,
    }
