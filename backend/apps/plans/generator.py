"""
Training plan generator following Jack Daniels 4-phase structure.
"""
from datetime import date, timedelta
from ml.src.formulas import vdot_to_paces, format_pace

PHASE_RATIOS = [
    ('base', 0.20),
    ('early_quality', 0.25),
    ('late_quality', 0.30),
    ('taper', 0.25),
]

WORKOUT_TEMPLATES = {
    'base': [
        ('rest', None),
        ('easy', 10),
        ('easy', 8),
        ('easy', 10),
        ('rest', None),
        ('easy', 8),
        ('long', 18),
    ],
    'early_quality': [
        ('rest', None),
        ('easy', 10),
        ('tempo', 12),
        ('easy', 8),
        ('rest', None),
        ('easy', 8),
        ('long', 25),
    ],
    'late_quality': [
        ('rest', None),
        ('easy', 10),
        ('interval', 12),
        ('easy', 8),
        ('tempo', 10),
        ('easy', 6),
        ('long', 28),
    ],
    'taper': [
        ('rest', None),
        ('easy', 8),
        ('marathon_pace', 10),
        ('easy', 6),
        ('rest', None),
        ('easy', 5),
        ('easy', 3),
    ],
}


def _scale_distances(workouts: list, scale: float) -> list:
    result = []
    for wtype, dist in workouts:
        result.append((wtype, round(dist * scale, 1) if dist else None))
    return result


def generate_plan(user, race_date: date, days_per_week: int = 4,
                  target_time_sec: int | None = None, cutback_enabled: bool = True,
                  start_date: date | None = None) -> list[dict]:
    """
    Returns list of week dicts with workouts.
    Each week: {week_number, phase, total_km, workouts: [{day_of_week, ...}]}

    start_date should be the Monday of the calendar week when the plan begins —
    that way day_of_week=0 (MON) lines up with a real Monday on the user's
    calendar. Validation still uses today's date for "race must be 2+ weeks away".
    """
    import math
    today = date.today()
    if (race_date - today).days < 14:
        raise ValueError("Race date must be at least 2 weeks away")

    start_date = start_date or today
    # Use ceil so the race week is always included in the plan
    days_inclusive = (race_date - start_date).days + 1
    total_weeks = max(4, math.ceil(days_inclusive / 7))
    vdot = float(user.current_vdot or 40)
    paces = vdot_to_paces(vdot)

    # Scale weekly volume based on days_per_week (baseline = 4 days)
    volume_scale = days_per_week / 4.0

    weeks = []
    week_num = 1

    for phase_name, ratio in PHASE_RATIOS:
        phase_weeks = max(1, round(total_weeks * ratio))
        template = WORKOUT_TEMPLATES[phase_name]

        # Select days for this many runs per week
        active_days = _select_days(days_per_week)

        for pw in range(phase_weeks):
            if cutback_enabled:
                # 3:1 pattern — ramp 3 weeks, recover 1 week
                ramp_factor = 1.0 + (pw % 4) * 0.08 if pw % 4 != 3 else 0.85
            else:
                # Linear progression without cutbacks
                ramp_factor = 1.0 + pw * 0.05
            workouts_raw = _scale_distances(template, volume_scale * ramp_factor)

            week_workouts = []
            total_km = 0.0
            for day_idx, (wtype, dist) in enumerate(workouts_raw):
                if wtype == 'rest':
                    if day_idx not in active_days:
                        week_workouts.append({
                            'day_of_week': day_idx,
                            'workout_type': 'rest',
                            'distance_km': None,
                            'pace_min_sec': None,
                            'pace_max_sec': None,
                            'structure': {},
                        })
                    continue

                if day_idx not in active_days:
                    week_workouts.append({
                        'day_of_week': day_idx,
                        'workout_type': 'rest',
                        'distance_km': None,
                        'pace_min_sec': None,
                        'pace_max_sec': None,
                        'structure': {},
                    })
                    continue

                pace_min, pace_max, structure = _workout_paces(wtype, paces, dist)
                week_workouts.append({
                    'day_of_week': day_idx,
                    'workout_type': wtype,
                    'distance_km': dist,
                    'pace_min_sec': pace_min,
                    'pace_max_sec': pace_max,
                    'structure': structure,
                })
                if dist:
                    total_km += dist

            weeks.append({
                'week_number': week_num,
                'phase': phase_name,
                'total_km': round(total_km, 1),
                'workouts': week_workouts,
            })
            week_num += 1
            if week_num > total_weeks:
                break
        if week_num > total_weeks:
            break

    return weeks


def _select_days(days_per_week: int) -> set:
    """Map number of days per week to day indices (0=Mon, 6=Sun)."""
    presets = {
        3: {1, 3, 6},
        4: {1, 3, 5, 6},
        5: {1, 2, 3, 5, 6},
        6: {0, 1, 2, 3, 5, 6},
    }
    return presets.get(days_per_week, {1, 3, 5, 6})


def refresh_plan_paces(plan, force: bool = False, threshold: float = 2.0) -> dict:
    """
    Recompute pace_min_sec / pace_max_sec / structure for every NOT-completed
    workout in an active plan, using the user's current VDOT.

    Why: the original plan was generated from vdot_at_creation. As the user
    trains and their fitness improves, those paces grow stale — "easy 5:30/km"
    in the plan stays at 5:30 even when the runner can comfortably hold 5:10.
    L1 adaptation: silently refresh paces (NOT distances or structure phases)
    when current_vdot diverges from vdot_at_last_refresh by ≥ threshold pts.

    Distances, days, phases are intentionally NOT touched — that would risk
    breaking the user's mental model of "my plan said 25k long run tomorrow".

    Completed workouts are frozen — their paces reflect the fitness state at
    the time and form a useful historical record.

    Returns a small status dict for logging/observability.
    """
    from django.utils import timezone
    from .models import PlanWorkout

    user = plan.user
    current_vdot = float(user.current_vdot or 0)
    baseline = float(plan.vdot_at_last_refresh or plan.vdot_at_creation or 0)

    if current_vdot <= 0 or baseline <= 0:
        return {'refreshed': False, 'reason': 'missing_vdot'}

    delta = current_vdot - baseline
    if not force and abs(delta) < threshold:
        return {'refreshed': False, 'reason': 'delta_below_threshold', 'delta': round(delta, 2)}

    paces = vdot_to_paces(current_vdot)
    updated_count = 0

    # Only non-completed workouts. We bulk-filter then iterate so per-row save
    # signals fire only for rows that actually changed (idempotent if same VDOT).
    workouts = (PlanWorkout.objects
                .filter(plan_week__plan=plan, completed=False)
                .exclude(workout_type='rest')
                .select_related('plan_week'))

    for wo in workouts:
        dist = float(wo.distance_km) if wo.distance_km else None
        new_min, new_max, new_structure = _workout_paces(wo.workout_type, paces, dist)
        if new_min is None:
            continue
        # Skip write if nothing changed (e.g. forced refresh with identical VDOT)
        if (wo.pace_min_sec == new_min and wo.pace_max_sec == new_max
                and wo.structure == new_structure):
            continue
        wo.pace_min_sec = new_min
        wo.pace_max_sec = new_max
        wo.structure = new_structure
        wo.save(update_fields=['pace_min_sec', 'pace_max_sec', 'structure'])
        updated_count += 1

    plan.vdot_at_last_refresh = current_vdot
    plan.last_paces_refresh_at = timezone.now()
    plan.save(update_fields=['vdot_at_last_refresh', 'last_paces_refresh_at'])

    return {
        'refreshed': True,
        'workouts_updated': updated_count,
        'old_vdot': round(baseline, 2),
        'new_vdot': round(current_vdot, 2),
        'delta': round(delta, 2),
    }


def auto_link_recent_activities(user) -> dict:
    """
    For each recently-uploaded activity that isn't yet attached to a planned
    workout, find the best-matching PlanWorkout in the user's active plan
    and link them, marking the workout completed.

    Why: without this, every activity coming in from Strava (or manual upload)
    leaves the plan's checkbox grid empty — the user has done the work but
    the system shows nothing done. That breaks trust: "your adaptive plan"
    starts looking like a static spreadsheet that ignores what you actually ran.

    Matching strategy:
      - Date proximity (±1 day) — users sometimes shift Tuesday's tempo to
        Wednesday; we still count it. Same-day matches always win over ±1.
      - Distance closeness as tiebreaker when multiple candidates remain.
      - Rest days excluded — they have no distance/pace to match against.

    Idempotency: already-linked activities and already-completed workouts are
    filtered out, so re-running this is safe (and used by signal handlers).
    """
    from datetime import date, timedelta
    from apps.activities.models import Activity
    from .models import TrainingPlan, PlanWorkout

    active_plan = (TrainingPlan.objects
                   .filter(user=user, status='active')
                   .first())
    if not active_plan:
        return {'linked': 0, 'reason': 'no_active_plan'}

    # Activities already attached to a workout (avoid duplicate matches)
    linked_ids = set(
        PlanWorkout.objects
        .filter(plan_week__plan=active_plan, activity_id__isnull=False)
        .values_list('activity_id', flat=True)
    )

    # Look at the last 7 days OR since plan start — whichever is later, so
    # historical activities don't get retroactively matched to ancient plans.
    today = date.today()
    week_ago = today - timedelta(days=7)
    horizon_start = max(active_plan.start_date, week_ago)

    recent = (Activity.objects
              .filter(user=user, is_valid=True,
                      start_time__date__gte=horizon_start,
                      start_time__date__lte=today)
              .exclude(id__in=linked_ids)
              .order_by('start_time'))

    linked_count = 0
    for act in recent:
        act_date = act.start_time.date()

        # Re-query candidates each iteration so previous links in this loop
        # are excluded (completed=True or activity_id set).
        candidates = list(
            PlanWorkout.objects
            .filter(plan_week__plan=active_plan, completed=False,
                    activity__isnull=True)
            .exclude(workout_type='rest')
            .select_related('plan_week')
        )

        best = None
        best_score = float('inf')
        for w in candidates:
            if w.day_of_week is None:
                continue
            target_date = (active_plan.start_date
                           + timedelta(days=(w.plan_week.week_number - 1) * 7
                                            + w.day_of_week))
            day_diff = abs((act_date - target_date).days)
            if day_diff > 1:
                continue

            # Distance closeness: ratio so 5k-on-10k mismatch outranks 10k-on-11k
            act_dist = float(act.distance_km or 0)
            plan_dist = float(w.distance_km or 0)
            if plan_dist > 0:
                dist_diff = abs(act_dist - plan_dist) / plan_dist
            else:
                dist_diff = 1.0

            # Composite score: same-day match (0) trumps ±1 day (1) regardless
            # of distance. Distance only acts as tiebreaker within same day_diff.
            score = day_diff * 2 + dist_diff
            if score < best_score:
                best_score = score
                best = w

        if best is not None:
            best.activity = act
            best.completed = True
            best.save(update_fields=['activity', 'completed'])
            linked_count += 1

    return {'linked': linked_count, 'plan_id': str(active_plan.id)}


def _workout_paces(wtype: str, paces: dict, dist: float | None) -> tuple:
    """Return (pace_min_sec, pace_max_sec, structure_dict)."""
    if wtype == 'easy':
        p = paces['E']
        return p, int(p * 1.10), {}
    if wtype == 'long':
        p_e = paces['E']
        p_m = paces['M']
        return p_m, int(p_e * 1.05), {'zones': ['E', 'M'], 'note': 'last 30% at M pace'}
    if wtype == 'tempo':
        p = paces['T']
        warmup = 2
        cooldown = 2
        tempo_dist = round((dist or 10) - warmup - cooldown, 1)
        return p, int(p * 1.05), {
            'warmup_km': warmup,
            'tempo_km': tempo_dist,
            'cooldown_km': cooldown,
            'tempo_pace': format_pace(p),
        }
    if wtype == 'interval':
        p = paces['I']
        reps = 6
        rep_dist = 1000
        return p, int(p * 1.05), {
            'intervals': [{'reps': reps, 'dist_m': rep_dist, 'pace': format_pace(p)}],
            'recovery': '90s jog',
        }
    if wtype == 'repetition':
        p = paces['R']
        return p, int(p * 1.05), {
            'reps': 8, 'dist_m': 200, 'pace': format_pace(p), 'recovery': 'walk 200m',
        }
    if wtype == 'marathon_pace':
        p = paces['M']
        return p, int(p * 1.02), {}
    return None, None, {}
