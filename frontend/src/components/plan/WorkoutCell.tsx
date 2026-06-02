import React from 'react';
import type { PlanWorkout } from '../../types/api';
import { IconCheck } from '../icons';
import WorkoutIcon, { WORKOUT_COLORS } from './WorkoutIcon';
import StructureBar, { parseStructure } from './StructureBar';
import { useT, useLang } from '../../i18n/context';

// Display km without trailing zeros: 13 → "13", 5.8 → "5.8", 5.0 → "5"
function fmtKm(n: number | string | undefined): string {
  const v = Math.round(Number(n ?? 0) * 10) / 10;
  return v % 1 === 0 ? String(Math.round(v)) : String(v);
}

const TYPE_LABELS: Record<string, string> = {
  rest:          'Rest',
  easy:          'Easy',
  long:          'Long',
  tempo:         'Tempo',
  interval:      'Interval',
  repetition:    'Repetition',
  marathon_pace: 'Marathon Pace',
};

interface WorkoutCellProps {
  workout: PlanWorkout;
  weekStartDate: Date;
  isCurrentWeek?: boolean;
  isMob?: boolean;
  onClick?: () => void;
  /**
   * Plan creation timestamp. Workouts whose date falls BEFORE this moment
   * never existed for the runner (we generated the plan mid-week); rendering
   * them as `missed` reads as "you screwed up on day 1" and tanks first
   * impression. We treat such cells as `pre_creation` — neutral styling, no
   * opacity dimming, small badge.
   */
  planCreatedAt?: Date;
}

function workoutDate(weekStartDate: Date, dayOfWeek: number): Date {
  const d = new Date(weekStartDate);
  d.setDate(d.getDate() + dayOfWeek);
  return d;
}

const WorkoutCell: React.FC<WorkoutCellProps> = ({ workout, weekStartDate, isCurrentWeek = false, isMob = false, onClick, planCreatedAt }) => {
  const t = useT();
  const { lang } = useLang();

  const wtype = workout.workout_type;
  const color  = WORKOUT_COLORS[wtype] ?? '#94A3B8';
  const isRest = wtype === 'rest';
  const dow    = workout.day_of_week ?? 0;
  const wDate  = workoutDate(weekStartDate, dow);
  const today  = new Date();
  const isToday = isCurrentWeek
    && wDate.toDateString() === today.toDateString();
  // Compare on day boundary (not exact ms) so a workout scheduled for the
  // same calendar day the plan was generated still counts as "in plan".
  // new Date(d) copies — never mutates the caller's wDate / planCreatedAt.
  const dayStartMs = (d: Date) => new Date(d).setHours(0, 0, 0, 0);
  const isPreCreation = Boolean(
    planCreatedAt && !workout.completed && dayStartMs(wDate) < dayStartMs(planCreatedAt)
  );
  const isMissed = !workout.completed && !isToday && wDate < today && !isPreCreation;

  const dowLabel  = wDate.toLocaleDateString(lang, { weekday: 'short' }).toUpperCase();
  const dateLabel = wDate.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
  const km        = Number(workout.distance_km ?? 0);
  const segments  = parseStructure(workout);

  let bg     = '#fff';
  let border = '1px solid var(--border)';
  if (workout.completed) {
    bg     = 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.02) 100%)';
    border = '1px solid rgba(16,185,129,0.30)';
  }
  if (isToday) { border = '2px solid #4F46E5'; bg = '#fff'; }
  if (isMissed) { bg = 'var(--bg)'; border = '1px solid var(--border-soft)'; }

  if (isMob) {
    return (
      <div onClick={onClick} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: 14, background: bg, border,
        opacity: isMissed ? 0.7 : 1, position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 120ms ease',
      }}>
        {/* Left: DOW & Date */}
        <div style={{ width: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? '#4F46E5' : 'var(--muted)' }}>{dowLabel}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 2 }}>{dateLabel}</div>
        </div>

        {/* Middle: Type & km */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 12 }}>
          {isRest ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WorkoutIcon type="rest" size={18} />
              <span style={{ fontSize: 13, color: 'var(--muted-2)' }}>Rest</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
                <WorkoutIcon type={wtype} size={18} />
                <span style={{ fontSize: 13, fontWeight: 600, color }}>{TYPE_LABELS[wtype] ?? wtype}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span className="mono" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{km > 0 ? km : '—'}</span>
                {km > 0 && <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>km</span>}
              </div>
            </>
          )}
        </div>

        {/* Right: Checkbox */}
        {!isRest && (
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            border: workout.completed ? 'none' : '1.5px solid var(--border)',
            background: workout.completed ? '#F97066' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {workout.completed && <IconCheck size={13} stroke={2.5} style={{ color: '#fff' }} />}
          </div>
        )}
        
        {isToday && (
          <div style={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', background: '#4F46E5', borderRadius: '0 14px 14px 0' }} />
        )}
        {isPreCreation && (
          <div style={{
            position: 'absolute', top: 6, right: 8,
            fontSize: 9, fontWeight: 600, letterSpacing: 0.4,
            color: 'var(--muted-2)', textTransform: 'uppercase',
          }}>
            {t.plan.prePlanLabel}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: '100%', height: 208, padding: 14, borderRadius: 14,
        background: bg, border, position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column',
        opacity: isMissed ? 0.7 : 1,
        transition: 'border-color 120ms ease',
      }}
    >
      {/* Top row: DOW + date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: isToday ? '#4F46E5' : 'var(--muted)' }}>
          {dowLabel}
        </span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{dateLabel}</span>
      </div>

      {isRest ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <WorkoutIcon type="rest" size={28} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Rest</span>
          <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>{t.plan.recoveryDay}</span>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <WorkoutIcon type={wtype} size={22} />
            <span style={{ fontSize: 13, fontWeight: 600, color }}>{TYPE_LABELS[wtype] ?? wtype}</span>
          </div>

          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.6, lineHeight: 1 }}>
              {km > 0 ? km : '—'}
            </span>
            {km > 0 && <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>km</span>}
          </div>

          <div className="mono" style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
            {workout.pace_min_formatted ?? ''}
          </div>

          {segments && (
            <div style={{ marginTop: 'auto', paddingTop: 8 }}>
              <StructureBar workout={workout} segments={segments} height={8} totalKm={km} />
              <div style={{ marginTop: 4, fontSize: 10, color: 'var(--muted-2)', display: 'flex', justifyContent: 'space-between' }}>
                {wtype === 'interval' && 'reps' in segments[1] ? (
                  <>
                    <span className="mono">{fmtKm(segments[0].km)}k</span>
                    <span className="mono" style={{ color: WORKOUT_COLORS.interval, fontWeight: 600 }}>
                      {segments[1].reps}×{segments[1].rep_m >= 1000 ? `${segments[1].rep_m / 1000}k` : `${segments[1].rep_m}m`}
                    </span>
                    <span className="mono">{fmtKm(segments[2]?.km ?? 2)}k</span>
                  </>
                ) : wtype === 'tempo' ? (
                  <>
                    <span className="mono">{fmtKm(segments[0].km)} W/U</span>
                    <span className="mono" style={{ color, fontWeight: 600 }}>{fmtKm(segments[1].km)} T</span>
                    <span className="mono">{fmtKm(segments[2]?.km ?? 2)} C/D</span>
                  </>
                ) : wtype === 'long' && segments.length === 2 ? (
                  <>
                    <span className="mono">{fmtKm(segments[0].km)} km E</span>
                    <span className="mono" style={{ color: WORKOUT_COLORS.marathon_pace, fontWeight: 600 }}>{fmtKm(segments[1].km)} km M</span>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {/* Completion checkbox */}
      {!isRest && (
        <div style={{
          position: 'absolute', right: 10, bottom: 10,
          width: 22, height: 22, borderRadius: 6,
          border: workout.completed ? 'none' : '1.5px solid var(--border)',
          background: workout.completed ? '#F97066' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {workout.completed && <IconCheck size={13} stroke={2.5} style={{ color: '#fff' }} />}
        </div>
      )}

      {/* Today badge */}
      {isToday && (
        <div style={{
          position: 'absolute', top: -1, right: -1,
          padding: '2px 8px 3px',
          background: '#4F46E5', color: '#fff',
          fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
          borderRadius: '0 13px 0 6px',
        }}>
          {t.plan.today}
        </div>
      )}

      {/* Pre-plan label — workout falls before the plan was generated; we
          show it for context but don't dim/judge it. */}
      {isPreCreation && !isToday && (
        <div style={{
          position: 'absolute', top: -1, right: -1,
          padding: '2px 8px 3px',
          background: 'var(--bg)', color: 'var(--muted-2)',
          fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
          borderRadius: '0 13px 0 6px',
          border: '1px solid var(--border-soft)',
        }}>
          {t.plan.prePlanLabel}
        </div>
      )}
    </div>
  );
};

export default WorkoutCell;
