"""Celery tasks for activity parsing and metric recalculation."""
import os
import zipfile
import io
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def process_activity_file(self, user_id: str, file_bytes_hex: str,
                           filename: str, file_hash: str):
    """Parse an uploaded activity file and save to DB."""
    from apps.activities.models import Activity
    from apps.activities.parsers.base import validate_activity_data
    from apps.activities.parsers.fit_parser import parse_fit
    from apps.activities.parsers.gpx_parser import parse_gpx, parse_tcx

    file_bytes = bytes.fromhex(file_bytes_hex)
    ext = os.path.splitext(filename)[1].lower()

    try:
        if ext == '.fit':
            data = parse_fit(file_bytes)
        elif ext == '.gpx':
            data = parse_gpx(file_bytes)
        elif ext == '.tcx':
            data = parse_tcx(file_bytes)
        else:
            return {'status': 'error', 'message': f'Unsupported format: {ext}'}

        if data is None:
            return {'status': 'skipped', 'message': 'Not a running activity'}

        is_valid, errors = validate_activity_data(data)
        activity = Activity(
            user_id=user_id,
            file_hash=file_hash,
            is_valid=is_valid,
            **{k: v for k, v in data.items() if k != 'source'},
            source=data.get('source', ext.lstrip('.')),
        )
        activity.save()

        if is_valid:
            recalculate_user_metrics.delay(user_id)
            # Detect/record marathon race attempt for manual uploads too —
            # not just Strava. A runner might upload their FIT after a race
            # if their watch didn't sync.
            try:
                from apps.races.services import record_marathon_attempt
                record_marathon_attempt(activity)
            except Exception:
                logger.exception(
                    "record_marathon_attempt failed for activity %s", activity.id,
                )

        return {
            'status': 'ok',
            'activity_id': str(activity.id),
            'distance_km': float(data.get('distance_km', 0)),
            'is_valid': is_valid,
            'errors': errors,
        }

    except Exception as exc:
        logger.exception("Failed to parse activity %s", filename)
        return {'status': 'error', 'message': str(exc)}


@shared_task(bind=True)
def process_zip_file(self, user_id: str, zip_bytes_hex: str):
    """Unpack ZIP and dispatch individual file tasks."""
    zip_bytes = bytes.fromhex(zip_bytes_hex)
    results = []
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            for name in zf.namelist():
                ext = os.path.splitext(name)[1].lower()
                if ext not in ('.fit', '.gpx', '.tcx'):
                    continue
                file_bytes = zf.read(name)
                import hashlib
                file_hash = hashlib.sha256(file_bytes).hexdigest()

                from apps.activities.models import Activity
                if Activity.objects.filter(user_id=user_id, file_hash=file_hash).exists():
                    results.append({'file': name, 'status': 'duplicate'})
                    continue

                result = process_activity_file.delay(
                    user_id, file_bytes.hex(), name, file_hash
                )
                results.append({'file': name, 'task_id': result.id})
    except zipfile.BadZipFile:
        return {'status': 'error', 'message': 'Invalid ZIP file'}

    return {'status': 'ok', 'files': results}


@shared_task
def recalculate_user_metrics(user_id: str):
    """Recalculate VDOT, CTL/ATL/TSB for all user activities."""
    from django.contrib.auth import get_user_model
    from apps.activities.models import Activity
    from apps.metrics.models import DailyMetrics
    from ml.src.formulas import calc_vdot, calc_tss, update_ctl_atl, vdot_to_paces
    from datetime import date, timedelta
    import math

    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    activities = (Activity.objects
                  .filter(user_id=user_id, is_valid=True)
                  .order_by('start_time'))

    if not activities.exists():
        # User deleted everything (or disconnected and then we got here via
        # cascade). Zero out all cached metrics so the dashboard reflects
        # reality instead of stale VDOT/CTL. Also reset plan-adaptation
        # baselines so the next imported activity re-anchors L1 cleanly.
        DailyMetrics.objects.filter(user_id=user_id).delete()
        User.objects.filter(id=user_id).update(
            current_vdot=None,
            current_ctl=None,
            current_atl=None,
            current_tsb=None,
            training_weeks=0,
        )
        try:
            from apps.plans.models import TrainingPlan
            TrainingPlan.objects.filter(user_id=user_id).update(
                vdot_at_last_refresh=None,
                last_paces_refresh_at=None,
                last_recovery_week_number=None,
                last_recovery_applied_at=None,
            )
        except Exception:
            pass
        return

    threshold_hr = user.threshold_hr
    threshold_pace = vdot_to_paces(float(user.current_vdot or 45)).get('T', 253)

    # Recalculate vdot_estimate and tss per activity; build daily TSS map in same pass
    daily_tss: dict = {}
    for act in activities:
        vdot = calc_vdot(float(act.distance_km) * 1000, act.duration_sec)
        tss = calc_tss(
            act.duration_sec,
            act.avg_hr,
            threshold_hr,
            float(act.avg_pace_sec_per_km) if act.avg_pace_sec_per_km else None,
            threshold_pace,
        )
        Activity.objects.filter(id=act.id).update(vdot_estimate=vdot, tss=tss)
        day = act.start_time.date()
        daily_tss[day] = daily_tss.get(day, 0) + tss  # use computed tss, not stale act.tss

    # Recalculate CTL/ATL/TSB from start to today
    start_date = min(daily_tss.keys())
    end_date = date.today()
    ctl, atl = 0.0, 0.0
    current_date = start_date

    DailyMetrics.objects.filter(user_id=user_id).delete()
    bulk = []
    while current_date <= end_date:
        tss = daily_tss.get(current_date, 0.0)
        ctl, atl = update_ctl_atl(ctl, atl, tss)
        tsb = round(ctl - atl, 2)
        bulk.append(DailyMetrics(
            user_id=user_id,
            date=current_date,
            ctl=ctl,
            atl=atl,
            tsb=tsb,
        ))
        current_date += timedelta(days=1)

    DailyMetrics.objects.bulk_create(bulk)

    # Update rolling vdot (best in last 90 days)
    from datetime import timedelta
    ninety_ago = date.today() - timedelta(days=90)
    recent = activities.filter(
        start_time__gte=ninety_ago,
        distance_km__gte=5,
    ).order_by('-vdot_estimate').first()

    best_vdot = float(recent.vdot_estimate) if recent and recent.vdot_estimate else None
    last_metrics = DailyMetrics.objects.filter(user_id=user_id).order_by('-date').first()

    # Count distinct weeks with activity in last 52 weeks (meaningful training recency)
    from datetime import timedelta as _td
    one_year_ago = date.today() - _td(weeks=52)
    training_weeks = len(set(
        a.start_time.isocalendar()[:2]
        for a in activities
        if a.start_time.date() >= one_year_ago
    ))
    User.objects.filter(id=user_id).update(
        current_vdot=best_vdot,
        current_ctl=float(last_metrics.ctl) if last_metrics else None,
        current_atl=float(last_metrics.atl) if last_metrics else None,
        current_tsb=float(last_metrics.tsb) if last_metrics else None,
        training_weeks=training_weeks,
    )

    # L1 + L1.5 + L2 + L3 plan adaptation chain. Order matters:
    #   1. L1: refresh paces if VDOT moved (so subsequent steps see fresh paces)
    #   2. L1.5: link new activities to planned workouts + L2 scores at the
    #            same step (scoring uses current paces, which are now fresh)
    #   3. L3: detect missed-week pattern and apply recovery rewrite
    # All run as silent side-effects; failures must not break metrics recalc.
    try:
        from apps.plans.models import TrainingPlan
        from apps.plans.generator import (
            refresh_plan_paces, auto_link_recent_activities,
            detect_and_apply_missed_week_recovery,
        )
        active_plan = TrainingPlan.objects.filter(
            user_id=user_id, status='active',
        ).first()
        if active_plan:
            user.refresh_from_db(fields=['current_vdot'])
            active_plan.user = user

            # L1: refresh paces if VDOT moved ≥2 pts
            refresh_result = refresh_plan_paces(active_plan)
            if refresh_result.get('refreshed'):
                import logging
                logging.getLogger(__name__).info(
                    "Auto-refreshed plan %s paces: VDOT %s → %s (%+s), %d workouts updated",
                    active_plan.id, refresh_result['old_vdot'], refresh_result['new_vdot'],
                    refresh_result['delta'], refresh_result['workouts_updated'],
                )

            # L1.5 + L2: link activities and score them
            link_result = auto_link_recent_activities(user)
            if link_result.get('linked', 0) > 0:
                import logging
                logging.getLogger(__name__).info(
                    "Auto-linked %d activities to plan %s workouts",
                    link_result['linked'], active_plan.id,
                )

            # L3: missed-week recovery — re-fetch plan since L2 just modified
            # workouts (we need the latest completion state for the prev-week
            # ratio calculation)
            active_plan.refresh_from_db()
            active_plan.user = user
            recovery_result = detect_and_apply_missed_week_recovery(active_plan)
            if recovery_result.get('applied'):
                import logging
                logging.getLogger(__name__).info(
                    "Applied recovery week %s to plan %s: %d workouts rewritten "
                    "(prev week %d/%d missed, ratio %s)",
                    recovery_result['week_number'], active_plan.id,
                    recovery_result['rewritten_workouts'],
                    recovery_result['prev_week_missed'], recovery_result['prev_week_total'],
                    recovery_result['miss_ratio'],
                )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Plan auto-adaptation failed: %s", e)
