import React from 'react';
import type { TrainingPlan, PlanWeek, PlanWorkout } from '../../types/api';
import { IconChevRight } from '../icons';
import WorkoutCell from './WorkoutCell';
import { PHASES } from './PhaseStrip';
import { useT, useLang } from '../../i18n/context';

interface CurrentWeekGridProps {
  plan: TrainingPlan;
  displayedWeekNumber: number;
  onWeekChange: (n: number) => void;
  onCellClick: (workout: PlanWorkout, week: PlanWeek) => void;
}

function weekStartDate(planStartDate: string, weekNumber: number): Date {
  const d = new Date(planStartDate);
  d.setDate(d.getDate() + (weekNumber - 1) * 7);
  return d;
}

const CurrentWeekGrid: React.FC<CurrentWeekGridProps> = ({ plan, displayedWeekNumber, onWeekChange, onCellClick }) => {
  const t = useT();
  const { lang } = useLang();
  const { total_weeks, current_week_number } = plan;
  const week = plan.weeks.find(w => w.week_number === displayedWeekNumber);

  const [isMob, setIsMob] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMob(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!week) return null;

  const phaseConfig = PHASES.find(p => p.id === week.phase);
  const startDate   = weekStartDate(plan.start_date, displayedWeekNumber);
  const weekKm      = Number(week.total_km);

  // Locale-aware week range
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
  const weekRange = `${fmt(startDate)} – ${fmt(endDate)}`;

  // Ensure all 7 days are present (backend might omit some days)
  const allDays: Array<PlanWorkout | null> = Array.from({ length: 7 }, (_, i) => {
    return week.workouts.find(w => w.day_of_week === i) ?? null;
  });

  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="mob-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div className="label-sm">{t.plan.currentWeek}</div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>
              {t.plan.kpiWeek} {displayedWeekNumber}
              <span style={{ color: 'var(--muted-2)', fontWeight: 400 }}> {t.plan.of} {total_weeks}</span>
            </h2>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {weekRange} · {phaseConfig?.label ?? week.phase}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t.plan.weekTotal}</span>
          <span className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{weekKm.toFixed(0)}</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>km</span>
          <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} />
          <button
            className="btn btn-ghost"
            style={{ width: 32, padding: 0, justifyContent: 'center' }}
            onClick={() => onWeekChange(Math.max(1, displayedWeekNumber - 1))}
            disabled={displayedWeekNumber <= 1}
          >
            <IconChevRight size={14} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: 32, padding: 0, justifyContent: 'center' }}
            onClick={() => onWeekChange(Math.min(total_weeks, displayedWeekNumber + 1))}
            disabled={displayedWeekNumber >= total_weeks}
          >
            <IconChevRight size={14} />
          </button>
        </div>
      </div>

      <div className="week-scroll-wrap">
      <div className="current-week-grid">
        {allDays.map((workout, i) => {
          if (!workout) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dow = d.toLocaleDateString(lang, { weekday: 'short' }).toUpperCase();
            const dateLabel = d.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
            
            if (isMob) {
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border-soft)',
                  opacity: 0.6,
                }}>
                  <div style={{ width: 48 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{dow}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 2 }}>{dateLabel}</div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Rest / No Data</span>
                  </div>
                </div>
              );
            }
            
            return (
              <div key={i} style={{
                width: '100%', height: 208, padding: 14, borderRadius: 14,
                background: 'var(--bg)', border: '1px solid var(--border-soft)',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--muted)' }}>{dow}</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{dateLabel}</span>
                </div>
              </div>
            );
          }
          return (
            <WorkoutCell
              key={workout.id}
              workout={workout}
              weekStartDate={startDate}
              isCurrentWeek={displayedWeekNumber === current_week_number}
              isMob={isMob}
              onClick={() => onCellClick(workout, week)}
              planCreatedAt={plan.created_at ? new Date(plan.created_at) : undefined}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
};

export { weekStartDate };
export default CurrentWeekGrid;
