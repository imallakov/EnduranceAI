import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { PlanWorkout, PlanWeek, TrainingPlan } from '../../types/api';
import { IconChevRight, IconClose, IconCheck, IconRefresh, IconChevDown } from '../icons';
import WorkoutIcon, { WORKOUT_COLORS } from './WorkoutIcon';
import StructureBar, { parseStructure } from './StructureBar';
import { useMarkWorkoutComplete, useSwapWorkoutType } from '../../hooks/usePlan';
import { weekStartDate } from './CurrentWeekGrid';
import { useT, useLang } from '../../i18n/context';

const TYPE_LABELS: Record<string, string> = {
  rest:          'Rest',
  easy:          'Easy',
  long:          'Long',
  tempo:         'Tempo',
  interval:      'Interval',
  repetition:    'Repetition',
  marathon_pace: 'Marathon Pace',
};

const SWAP_TYPES = ['easy', 'long', 'tempo', 'interval', 'repetition', 'marathon_pace', 'rest'] as const;

interface WorkoutDrawerProps {
  open: boolean;
  onClose: () => void;
  workout: PlanWorkout | null;
  week: PlanWeek | null;
  plan: TrainingPlan;
  onNavigate: (direction: 'prev' | 'next') => void;
  prevLabel?: string;
  nextLabel?: string;
}

const WorkoutDrawer: React.FC<WorkoutDrawerProps> = ({
  open, onClose, workout, week, plan, onNavigate, prevLabel, nextLabel,
}) => {
  const [swapOpen, setSwapOpen] = useState(false);
  const markComplete    = useMarkWorkoutComplete();
  const swapType        = useSwapWorkoutType();
  const t = useT();
  const { lang } = useLang();

  if (!workout || !week) return null;

  const wtype    = workout.workout_type;
  const color    = WORKOUT_COLORS[wtype] ?? '#94A3B8';
  const segments = parseStructure(workout);
  const km       = Number(workout.distance_km ?? 0);

  // Locale-aware day/date labels
  const wStartDate = weekStartDate(plan.start_date, week.week_number);
  const wDate      = new Date(wStartDate);
  wDate.setDate(wDate.getDate() + (workout.day_of_week ?? 0));
  const dowFull  = wDate.toLocaleDateString(lang, { weekday: 'long' });
  const dowShort = wDate.toLocaleDateString(lang, { weekday: 'short' });
  const dateLabel = wDate.toLocaleDateString(lang, { month: 'short', day: 'numeric' });

  // Pace display
  const paceSec  = workout.pace_min_sec;
  const paceDisp = workout.pace_min_formatted?.replace('/km', '') ?? '—';
  const paceRange = (() => {
    if (!paceSec) return null;
    const lo = paceSec * 0.97, hi = paceSec * 1.03;
    const fmt = (s: number) => { const m = Math.floor(s / 60); const ss = Math.round(s % 60); return `${m}:${String(ss).padStart(2, '0')}`; };
    return `${fmt(lo)} — ${fmt(hi)}`;
  })();

  const PHASE_LABELS: Record<string, string> = {
    base: 'Base', early_quality: 'Early Quality', late_quality: 'Late Quality', taper: 'Taper',
  };

  const coachNote: Record<string, string> = {
    tempo:         t.plan.coachNoteTempo,
    interval:      t.plan.coachNoteInterval,
    long:          t.plan.coachNoteLong,
    easy:          t.plan.coachNoteEasy,
    marathon_pace: t.plan.coachNoteMarathonPace,
    repetition:    t.plan.coachNoteRepetition,
    rest:          t.plan.coachNoteRest,
  };

  const handleMarkComplete = () => {
    void markComplete.mutate({ planId: plan.id, wid: workout.id });
  };

  const handleSwap = (newType: string) => {
    void swapType.mutate({ planId: plan.id, wid: workout.id, workoutType: newType });
    setSwapOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.18)', backdropFilter: 'blur(1px)',
          zIndex: 40,
        }} />
        <Dialog.Content
          className="workout-drawer"
          style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 420, background: '#fff',
            borderLeft: '1px solid var(--border)',
            boxShadow: '-24px 0 48px -16px rgba(15,23,42,0.10)',
            display: 'flex', flexDirection: 'column', zIndex: 41,
            outline: 'none',
          }}
          onInteractOutside={onClose}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
              <span>{t.plan.kpiWeek} {week.week_number}</span>
              <IconChevRight size={11} />
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{dowShort} · {dateLabel}</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }} onClick={() => onNavigate('prev')}>
                <IconChevRight size={13} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <button className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }} onClick={() => onNavigate('next')}>
                <IconChevRight size={13} />
              </button>
              <Dialog.Close asChild>
                <button className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }}>
                  <IconClose size={13} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Body */}
          <div className="nice-scroll" style={{ flex: 1, overflow: 'auto', padding: '20px 24px 24px' }}>
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <WorkoutIcon type={wtype} size={22} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color }}>
                {TYPE_LABELS[wtype]}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {PHASE_LABELS[week.phase] ?? week.phase} · W{week.week_number} {t.plan.of} {plan.total_weeks}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: 'var(--text)' }}>
              {dowFull} {TYPE_LABELS[wtype]}
            </h2>
            {km > 0 && (
              <div className="mono" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {km} km
              </div>
            )}

            {/* Big pace block */}
            {paceDisp !== '—' && (
              <div style={{ marginTop: 18, padding: 18, borderRadius: 12, background: 'linear-gradient(180deg, #FAFAF9 0%, #fff 100%)', border: '1px solid var(--border)' }}>
                <div className="label-sm" style={{ fontSize: 10 }}>{t.plan.targetPace}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                  <span className="mono" style={{ fontSize: 38, fontWeight: 600, color: 'var(--primary)', letterSpacing: -1, lineHeight: 1 }}>
                    {paceDisp}
                  </span>
                  <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>/km</span>
                </div>
                {paceRange && (
                  <>
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.plan.rangePlusMinus3}</span>
                      <span className="mono" style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>{paceRange}</span>
                    </div>
                    <div style={{ marginTop: 10, position: 'relative', height: 6, background: 'var(--border-soft)', borderRadius: 3 }}>
                      <div style={{ position: 'absolute', left: '35%', right: '20%', height: '100%', background: `${color}30`, borderRadius: 3 }} />
                      <div style={{ position: 'absolute', left: 'calc(50% - 1px)', top: -2, width: 2, height: 10, background: color, borderRadius: 1 }} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Structure breakdown */}
            {segments && (
              <div style={{ marginTop: 22 }}>
                <div className="label-sm" style={{ marginBottom: 10 }}>{t.plan.structure}</div>
                <div style={{ marginBottom: 14 }}>
                  <StructureBar workout={workout} segments={segments} height={10} totalKm={km} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {segments.map((seg, i) => {
                    const segColor  = WORKOUT_COLORS[seg.kind as keyof typeof WORKOUT_COLORS] ?? '#94A3B8';
                    const isEasy    = seg.kind === 'easy';
                    const label     = 'label' in seg && seg.label ? seg.label
                      : seg.kind === 'interval' ? `${(seg as { reps: number; rep_m: number }).reps}×${(seg as { rep_m: number }).rep_m}m`
                      : seg.kind;
                    const paceStr   = 'pace' in seg ? String(seg.pace ?? '') : '';
                    const kmDisp    = 'reps' in seg
                      ? `${((seg as { reps: number; rep_m: number }).reps * (seg as { rep_m: number }).rep_m / 1000).toFixed(1)} km`
                      : `${(() => {
                          const v = Math.round(Number(seg.km) * 10) / 10;
                          return v % 1 === 0 ? Math.round(v) : v;
                        })()} km`;
                    return (
                      <React.Fragment key={i}>
                        {i > 0 && <div style={{ height: 1, background: 'var(--border-soft)' }} />}
                        <div style={{ display: 'grid', gridTemplateColumns: '8px 1fr auto auto', alignItems: 'center', columnGap: 12, padding: '12px 0' }}>
                          <span style={{ width: 6, height: 28, borderRadius: 2, background: segColor, opacity: isEasy ? 0.45 : 1 }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize' }}>{label}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                              {TYPE_LABELS[seg.kind] ?? seg.kind} pace
                            </div>
                          </div>
                          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{kmDisp}</span>
                          {paceStr && <span className="mono" style={{ fontSize: 12, color: 'var(--muted)', minWidth: 42, textAlign: 'right' }}>{paceStr}/km</span>}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Coach note */}
            <div style={{ marginTop: 22, padding: 14, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div className="label-sm" style={{ fontSize: 10, marginBottom: 6 }}>{t.plan.whyThisWorkout}</div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55 }}>
                {coachNote[wtype] ?? ''}
              </p>
            </div>

            {/* Actions */}
            {wtype !== 'rest' && (
              <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-coral"
                  style={{ flex: 1, height: 38 }}
                  onClick={handleMarkComplete}
                  disabled={workout.completed || markComplete.isPending}
                >
                  <IconCheck size={14} stroke={2.5} />
                  {workout.completed ? t.plan.completed : t.plan.markComplete}
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ height: 38 }}
                    onClick={() => setSwapOpen(v => !v)}
                  >
                    <IconRefresh size={13} /> {t.plan.swap} <IconChevDown size={11} />
                  </button>
                  {swapOpen && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 6px)', right: 0,
                      background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 4,
                      boxShadow: '0 8px 24px -8px rgba(15,23,42,0.14)', zIndex: 10, minWidth: 160,
                    }}>
                      {SWAP_TYPES.map(swapT => (
                        <button
                          key={swapT}
                          onClick={() => handleSwap(swapT)}
                          disabled={swapT === wtype || swapType.isPending}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '8px 12px', fontSize: 13, borderRadius: 5, border: 'none', cursor: 'pointer',
                            background: swapT === wtype ? 'var(--bg)' : '#fff', color: 'var(--text)',
                            fontWeight: swapT === wtype ? 600 : 400,
                          }}
                          onMouseEnter={e => { if (swapT !== wtype) (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                          onMouseLeave={e => { if (swapT !== wtype) (e.currentTarget as HTMLElement).style.background = '#fff'; }}
                        >
                          {TYPE_LABELS[swapT]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Prev / next footer */}
            <div style={{ marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => onNavigate('prev')}>
                <IconChevRight size={11} style={{ transform: 'rotate(180deg)' }} />
                {prevLabel && (
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted-2)' }}>{t.plan.previous}</div>
                    <div style={{ color: 'var(--text)', fontWeight: 500, marginTop: 1 }}>{prevLabel}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', textAlign: 'right' }} onClick={() => onNavigate('next')}>
                {nextLabel && (
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted-2)' }}>{t.plan.next}</div>
                    <div style={{ color: 'var(--text)', fontWeight: 500, marginTop: 1 }}>{nextLabel}</div>
                  </div>
                )}
                <IconChevRight size={11} />
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default WorkoutDrawer;
