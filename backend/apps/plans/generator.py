"""
Training plan generator following Jack Daniels 4-phase structure.
"""
from datetime import date, timedelta
from ml.src.formulas import vdot_to_paces, format_pace

# Relative weights of the three BUILD phases (renormalised from Daniels' classic
# split). The taper is handled separately as a FIXED 2-3 weeks — see
# _phase_schedule(). The old code made taper a fixed 25% of the plan, which on a
# 24-week plan is 6 weeks of taper — far too long, the runner detrains.
_BUILD_WEIGHTS = [('base', 0.27), ('early_quality', 0.33), ('late_quality', 0.40)]

# Hard cap on any single long run. Past ~32 km the marginal aerobic gain drops
# while injury/recovery cost climbs sharply for recreational runners, so a
# volume ramp must never push the long run beyond this.
LONG_RUN_ABS_CAP_KM = 32.0

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
        if not dist:
            result.append((wtype, None))
            continue
        scaled = round(dist * scale, 1)
        if wtype == 'long':
            scaled = min(scaled, LONG_RUN_ABS_CAP_KM)   # never overshoot the cap
        result.append((wtype, scaled))
    return result


def _phase_schedule(total_weeks: int) -> list:
    """
    Return a list of phase names, one per week, length == total_weeks.

    Taper is a FIXED 2-3 weeks (3 for plans >= 14 weeks, else 2), capped so at
    least one build week remains. The remaining build weeks are split across
    base/early/late by _BUILD_WEIGHTS, with the all-important late-quality phase
    absorbing any rounding remainder.
    """
    taper_weeks = min(3 if total_weeks >= 14 else 2, max(1, total_weeks - 1))
    build_weeks = total_weeks - taper_weeks

    base_w = max(1, round(build_weeks * _BUILD_WEIGHTS[0][1]))
    early_w = max(1, round(build_weeks * _BUILD_WEIGHTS[1][1]))
    late_w = build_weeks - base_w - early_w

    if late_w < 1:
        # Too few build weeks for all three phases — keep them in order.
        names = ['base', 'early_quality', 'late_quality'][:build_weeks]
        while len(names) < build_weeks:
            names.append('late_quality')
        return names + ['taper'] * taper_weeks

    return (['base'] * base_w + ['early_quality'] * early_w
            + ['late_quality'] * late_w + ['taper'] * taper_weeks)


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

    schedule = _phase_schedule(total_weeks)
    active_days = _select_days(days_per_week)

    weeks = []
    build_idx = 0   # 0-based index across build weeks → continuous ramp
    taper_idx = 0   # 0-based index across taper weeks → declining volume

    for week_num, phase_name in enumerate(schedule, start=1):
        template = WORKOUT_TEMPLATES[phase_name]

        if phase_name == 'taper':
            # Volume comes DOWN through the taper; the race week is lightest.
            ramp_factor = max(0.40, 0.70 - 0.13 * taper_idx)
            taper_idx += 1
        else:
            # Continuous progressive ramp across the WHOLE build (not reset at
            # each phase boundary, which used to make volume sawtooth DOWN when
            # entering a new phase). +2.5%/week, capped at +40%, with a 3:1
            # cutback week for recovery.
            progression = 1.0 + min(0.40, 0.025 * build_idx)
            if cutback_enabled and build_idx % 4 == 3:
                ramp_factor = progression * 0.80
            else:
                ramp_factor = progression
            build_idx += 1

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


def score_workout_performance(actual_pace_sec, pace_min_sec, pace_max_sec, workout_type):
    """
    Score how well a runner executed a planned workout, returning -2…+2.

    Different workout types reward different deviations:
      - Easy/Long: running slower is fine, running too FAST is bad (means
        you're undermining recovery / aerobic base-building)
      - Tempo/Marathon-pace: need to hit the pace window precisely; both
        too fast (anaerobic) and too slow (under-stimulus) are off
      - Interval/Repetition: pace_min is a TARGET, beating it is good
        (within limits — way too fast = different system worked, not
        the prescribed VO2max/anaerobic capacity)
      - Rest: no scoring (returns None)

    None inputs return None — caller should handle.
    """
    if (actual_pace_sec is None or pace_min_sec is None or pace_max_sec is None
            or workout_type == 'rest'):
        return None

    actual = float(actual_pace_sec)
    target = float(pace_min_sec)  # the prescribed "ceiling" pace (faster end)
    # Positive delta_pct = ran slower than target; negative = faster
    delta_pct = (actual - target) / target

    if workout_type in ('easy', 'long'):
        # Slower than easy = OK (recovery still happens). Faster = bad.
        if delta_pct < -0.07:   # ≥7% faster than easy-max → running easy too hard
            return -2
        if delta_pct < -0.03:
            return -1
        # Anywhere from spot-on to 15% slower = fine
        if delta_pct <= 0.15:
            return 0
        return -1   # >15% slower = abnormally sluggish

    if workout_type in ('tempo', 'marathon_pace'):
        # Need to hit pace window precisely. Symmetric deviation scoring.
        if abs(delta_pct) <= 0.025:    # ±2.5% = in zone
            return 0
        if abs(delta_pct) <= 0.06:
            return -1 if delta_pct > 0 else +1   # slower = under-stim, faster = OK slightly
        # Big deviation
        if delta_pct > 0.06:
            return -2   # collapsed
        return -1   # too fast (anaerobic territory, not the right system)

    if workout_type in ('interval', 'repetition'):
        # Beating the target is good (within reason)
        if delta_pct < -0.05:           # ≥5% faster than target
            return +2 if delta_pct > -0.12 else +1   # too fast = different system
        if delta_pct < -0.01:
            return +1
        if delta_pct <= 0.03:
            return 0
        if delta_pct <= 0.10:
            return -1
        return -2   # >10% slower = failed to hit prescribed intensity

    return 0   # unknown type → neutral


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
    from datetime import date, datetime, time, timedelta, timezone
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

    # Compare against datetime, not date — preserves PostgreSQL index usage on
    # start_time. Casting (start_time__date__gte) forces a per-row ::date cast
    # that bypasses the timestamptz index → full table scan on big histories.
    horizon_dt = datetime.combine(horizon_start, time.min, tzinfo=timezone.utc)
    tomorrow_dt = datetime.combine(today + timedelta(days=1), time.min, tzinfo=timezone.utc)

    recent = (Activity.objects
              .filter(user=user, is_valid=True,
                      start_time__gte=horizon_dt,
                      start_time__lt=tomorrow_dt)
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
            # L2: capture performance at link time. Using the workout's
            # CURRENT pace_min/pace_max (which reflect the latest VDOT via L1)
            # so the score represents "did you hit the target asked of you".
            best.actual_pace_sec = (
                int(round(float(act.avg_pace_sec_per_km)))
                if act.avg_pace_sec_per_km else None
            )
            best.performance_score = score_workout_performance(
                best.actual_pace_sec,
                best.pace_min_sec, best.pace_max_sec,
                best.workout_type,
            )
            best.save(update_fields=[
                'activity', 'completed', 'actual_pace_sec', 'performance_score',
            ])
            linked_count += 1

    return {'linked': linked_count, 'plan_id': str(active_plan.id)}


def detect_and_apply_missed_week_recovery(plan) -> dict:
    """
    L3: if the user missed ≥50% of quality workouts in the immediately-previous
    week, rewrite the CURRENT week's quality work to easy runs and reduce its
    long-run distance.

    "Missed" = workout's planned date is in the past, type != 'rest', and
    completed = False. We only count non-rest workouts because skipping a
    planned rest day isn't a missed workout.

    Edge cases handled:
      - First week of plan → can't have a "previous week", skip
      - Race week (last week) → never auto-rewrite (taper is delicate)
      - Already recovered this week → don't re-apply
      - Plan has no quality workouts in the previous week → no signal

    Why CURRENT-week rewrite vs NEXT-week: most "I missed a week" detections
    happen mid-week when the user opens the app. Rewriting the current week
    immediately helps; waiting for next Monday is too late to provide the
    intended recovery.
    """
    from datetime import date, timedelta
    from django.utils import timezone
    from .models import PlanWeek, PlanWorkout
    import math

    today = date.today()
    days_since_start = (today - plan.start_date).days
    if days_since_start < 7:
        return {'applied': False, 'reason': 'first_week'}

    current_week_num = days_since_start // 7 + 1
    prev_week_num = current_week_num - 1
    total_weeks = plan.weeks.count()

    if current_week_num >= total_weeks:
        # Race week or beyond — never touch taper
        return {'applied': False, 'reason': 'race_week_or_past'}

    if plan.last_recovery_week_number == current_week_num:
        return {'applied': False, 'reason': 'already_recovered_this_week'}

    try:
        prev_week = PlanWeek.objects.get(plan=plan, week_number=prev_week_num)
    except PlanWeek.DoesNotExist:
        return {'applied': False, 'reason': 'no_prev_week'}

    prev_workouts = list(prev_week.workouts.exclude(workout_type='rest'))
    if not prev_workouts:
        return {'applied': False, 'reason': 'no_quality_in_prev_week'}

    missed = [w for w in prev_workouts if not w.completed]
    miss_ratio = len(missed) / len(prev_workouts)

    if miss_ratio < 0.5:
        return {'applied': False, 'reason': 'enough_completed',
                'miss_ratio': round(miss_ratio, 2)}

    # Trigger recovery on current week.
    current_week = PlanWeek.objects.filter(plan=plan, week_number=current_week_num).first()
    if not current_week:
        return {'applied': False, 'reason': 'current_week_not_found'}

    user = plan.user
    vdot = float(user.current_vdot or 40)
    paces = vdot_to_paces(vdot)
    easy_p_min, easy_p_max, easy_struct = _workout_paces('easy', paces, None)

    # Rewrite logic:
    #   - Already-completed workouts left untouched (history)
    #   - Future quality (tempo/interval/repetition/marathon_pace): → easy, distance halved
    #   - Long run: kept but distance scaled to 0.7
    #   - Easy: kept as-is (already gentle)
    rewritten = 0
    for wo in current_week.workouts.filter(completed=False):
        if wo.workout_type == 'rest':
            continue
        elif wo.workout_type in ('tempo', 'interval', 'repetition', 'marathon_pace'):
            original_dist = float(wo.distance_km) if wo.distance_km else 8.0
            wo.workout_type = 'easy'
            wo.distance_km = round(max(4.0, original_dist * 0.5), 1)
            wo.pace_min_sec = easy_p_min
            wo.pace_max_sec = easy_p_max
            wo.structure = easy_struct
            wo.save(update_fields=['workout_type', 'distance_km', 'pace_min_sec',
                                    'pace_max_sec', 'structure'])
            rewritten += 1
        elif wo.workout_type == 'long':
            if wo.distance_km:
                # Keep paces — long is already at easy/marathon zones
                wo.distance_km = round(float(wo.distance_km) * 0.7, 1)
                wo.save(update_fields=['distance_km'])
                rewritten += 1
        # 'easy' workouts left as-is

    # Update plan's recorded total_km for the rewritten week (approximate)
    new_total = sum(float(w.distance_km or 0) for w in current_week.workouts.all())
    current_week.total_km = round(new_total, 1)
    if not current_week.notes:
        current_week.notes = 'Recovery week (auto-applied due to missed sessions in prior week)'
    current_week.save(update_fields=['total_km', 'notes'])

    plan.last_recovery_week_number = current_week_num
    plan.last_recovery_applied_at = timezone.now()
    plan.save(update_fields=['last_recovery_week_number', 'last_recovery_applied_at'])

    return {
        'applied': True,
        'week_number': current_week_num,
        'rewritten_workouts': rewritten,
        'prev_week_missed': len(missed),
        'prev_week_total': len(prev_workouts),
        'miss_ratio': round(miss_ratio, 2),
    }


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
        # Reps scale with the session size (which already scales with the
        # runner's volume), but I-pace work is capped at ~8 km — Daniels limits
        # VO2max work to the lesser of 8% of weekly volume or 10 km, and a fixed
        # 6×1000 ignores both the beginner who'd be over-cooked and the fit
        # runner who needs more.
        warmup, cooldown = 2.0, 2.0
        work_km = max(3.0, min((dist or 12) - warmup - cooldown, 8.0))
        reps = max(3, int(round(work_km)))     # 1000 m reps
        return p, int(p * 1.05), {
            'intervals': [{'reps': reps, 'dist_m': 1000, 'pace': format_pace(p)}],
            'recovery': '90s jog',
            'warmup_km': warmup,
            'cooldown_km': cooldown,
        }
    if wtype == 'repetition':
        p = paces['R']
        # R-pace volume is small and capped (~3 km of fast 200s).
        work_km = max(1.2, min((dist or 8) * 0.3, 3.0))
        reps = max(6, int(round(work_km / 0.2)))   # 200 m reps
        return p, int(p * 1.05), {
            'reps': reps, 'dist_m': 200, 'pace': format_pace(p), 'recovery': 'walk 200m',
        }
    if wtype == 'marathon_pace':
        p = paces['M']
        return p, int(p * 1.02), {}
    return None, None, {}
