"""Celery tasks for Strava sync + webhook event processing."""
import logging
from datetime import timedelta
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def process_strava_webhook(payload: dict):
    """
    Handle a single push event from Strava.

    Payload shape (from Strava docs):
      {
        "aspect_type": "create" | "update" | "delete",
        "event_time": <unix>,
        "object_id":  <activity_id_or_athlete_id>,
        "object_type": "activity" | "athlete",
        "owner_id":   <strava_athlete_id>,
        "subscription_id": <our_sub_id>,
        "updates":    { ... }   # only present on athlete deauthorize and a few cases
      }

    Why we route through Celery: Strava's webhook spec gives us 2 seconds to
    respond to the POST. Real work (token refresh, single-activity fetch,
    DB write) easily takes longer than that, so the view just enqueues this
    task and responds 200 immediately. If Celery is down the view falls
    back to sync execution.
    """
    from apps.integrations.models import StravaConnection
    from apps.integrations.strava_client import fetch_single_activity, convert_activity
    from apps.activities.models import Activity

    object_type = payload.get('object_type')
    aspect_type = payload.get('aspect_type')
    object_id = payload.get('object_id')
    owner_id = payload.get('owner_id')

    if not object_type or not aspect_type or owner_id is None:
        logger.warning("Strava webhook: malformed payload %s", payload)
        return {'status': 'error', 'reason': 'malformed'}

    try:
        conn = StravaConnection.objects.select_related('user').get(athlete_id=owner_id)
    except StravaConnection.DoesNotExist:
        # Webhook for an athlete who isn't in our system (could be a stale
        # subscription, or a user who disconnected). Acknowledge and drop.
        logger.info("Strava webhook for unknown athlete %s — dropping", owner_id)
        return {'status': 'ignored', 'reason': 'unknown_athlete'}

    # ── Athlete events: typically deauthorize notifications ──────────
    if object_type == 'athlete':
        updates = payload.get('updates') or {}
        # When the user disconnects from Strava's side (revokes access),
        # Strava sends an athlete update with authorized=false.
        if updates.get('authorized') == 'false' or updates.get('authorized') is False:
            conn.is_broken = True
            conn.save(update_fields=['is_broken'])
            logger.info("Strava athlete %s deauthorized — marked broken", owner_id)
            return {'status': 'ok', 'action': 'deauthorized'}
        return {'status': 'ignored', 'reason': 'athlete_event_not_actionable'}

    # ── Activity events ─────────────────────────────────────────────
    if object_type != 'activity':
        return {'status': 'ignored', 'reason': f'unknown_object_type:{object_type}'}

    if aspect_type == 'delete':
        deleted = Activity.objects.filter(
            user=conn.user, external_strava_id=object_id,
        ).delete()
        return {'status': 'ok', 'action': 'deleted', 'count': deleted[0]}

    # create / update — fetch fresh from Strava
    try:
        raw = fetch_single_activity(conn, object_id)
    except PermissionError:
        return {'status': 'error', 'reason': 'access_revoked'}
    except Exception as exc:
        logger.exception("Strava webhook fetch failed for activity %s", object_id)
        return {'status': 'error', 'reason': f'fetch_failed:{exc}'}

    if raw is None:
        # Activity already gone (race with delete event, or non-Run type)
        return {'status': 'ignored', 'reason': 'not_found_or_filtered'}

    kwargs = convert_activity(raw)
    if kwargs is None:
        # Not a running activity, or too short — skip silently
        return {'status': 'ignored', 'reason': 'not_a_qualifying_run'}

    strava_id = kwargs['external_strava_id']
    existing = Activity.objects.filter(external_strava_id=strava_id).first()

    if aspect_type == 'create':
        if existing:
            # Already imported (maybe through manual sync) — idempotent.
            return {'status': 'ignored', 'reason': 'already_exists'}
        Activity.objects.create(user=conn.user, **kwargs)
        action = 'created'
    elif aspect_type == 'update':
        if existing:
            for k, v in kwargs.items():
                if k != 'external_strava_id':
                    setattr(existing, k, v)
            existing.save()
            action = 'updated'
        else:
            Activity.objects.create(user=conn.user, **kwargs)
            action = 'created_via_update'
    else:
        return {'status': 'ignored', 'reason': f'unknown_aspect:{aspect_type}'}

    # Trigger metrics recalc (which in turn runs L1 + L1.5 plan adaptation)
    from apps.activities.tasks import recalculate_user_metrics
    recalculate_user_metrics.delay(str(conn.user_id))

    return {'status': 'ok', 'action': action, 'activity_id': strava_id}


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
