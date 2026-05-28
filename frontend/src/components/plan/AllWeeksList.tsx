import React from 'react';
import type { TrainingPlan, PlanPhase } from '../../types/api';
import { IconCheck, IconFilter } from '../icons';
import { useT } from '../../i18n/context';

interface AllWeeksListProps {
  plan: TrainingPlan;
  displayedWeekNumber: number;
  onWeekSelect: (n: number) => void;
}

const PHASE_CONFIG: Record<PlanPhase, { label: string; color: string }> = {
  base:          { label: 'Base',          color: '#4F46E5' },
  early_quality: { label: 'Early Quality', color: '#818CF8' },
  late_quality:  { label: 'Late Quality',  color: '#F59E0B' },
  taper:         { label: 'Taper',         color: '#10B981' },
};

const AllWeeksList: React.FC<AllWeeksListProps> = ({ plan, displayedWeekNumber, onWeekSelect }) => {
  const t = useT();
  const { weeks, current_week_number } = plan;
  const maxKm = Math.max(...weeks.map(w => Number(w.total_km)), 1);

  const isWeekCompleted = (weekNum: number): boolean => {
    const week = weeks.find(w => w.week_number === weekNum);
    if (!week) return false;
    const nonRest = week.workouts.filter(wo => wo.workout_type !== 'rest');
    return nonRest.length > 0 && nonRest.every(wo => wo.completed);
  };

  const weekDelta = (i: number): string | null => {
    if (i === 0) return null;
    const cur  = Number(weeks[i].total_km);
    const prev = Number(weeks[i - 1].total_km);
    if (prev === 0) return null;
    const pct = Math.round(((cur - prev) / prev) * 100);
    if (pct === 0) return '0%';
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label-sm">{t.plan.allWeeks} · {weeks.length}</span>
        <button className="btn btn-ghost" style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}>
          <IconFilter size={11} /> {t.plan.filter}
        </button>
      </div>
      <div style={{ height: 1, background: 'var(--border)' }} />
      <div className="nice-scroll">
        {weeks.map((wk, i) => {
          const ph = PHASE_CONFIG[wk.phase] ?? { label: wk.phase, color: '#94A3B8' };
          const isSelected  = wk.week_number === displayedWeekNumber;
          const isCurrent   = wk.week_number === current_week_number;
          const completed    = isWeekCompleted(wk.week_number);
          const kmNum        = Number(wk.total_km);
          const delta        = weekDelta(i);

          // Determine note
          let note: string | null = null;
          if (i > 0 && kmNum < Number(weeks[i - 1].total_km) * 0.9) note = t.plan.cutback;
          if (isCurrent) note = t.plan.thisWeek;
          if (wk.week_number === weeks.length) note = t.plan.raceWeek;

          return (
            <React.Fragment key={wk.id}>
              {i > 0 && <div style={{ height: 1, background: 'var(--border-soft)', marginLeft: 18 }} />}
              <div
                className="act-row"
                onClick={() => onWeekSelect(wk.week_number)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '4px 36px 1fr auto auto auto',
                  alignItems: 'center',
                  columnGap: 12,
                  padding: '11px 18px 11px 0',
                  background: isSelected ? 'rgba(79,70,229,0.04)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {/* Phase color bar */}
                <div style={{
                  width: 4, height: 36, background: ph.color,
                  opacity: completed ? 1 : (isCurrent ? 1 : 0.45),
                  borderRadius: '0 2px 2px 0',
                }} />

                {/* Week number */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--muted-2)' }}>W</span>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: isCurrent ? 'var(--primary-2)' : 'var(--text)' }}>
                    {String(wk.week_number).padStart(2, '0')}
                  </span>
                </div>

                {/* Phase label + note */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: isCurrent ? 600 : 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {ph.label}
                    {note && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
                        color: note === t.plan.cutback ? 'var(--warning)' : note === t.plan.raceWeek ? 'var(--accent)' : 'var(--muted)',
                      }}>
                        · {note}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini volume bar */}
                <div className="hide-mob" style={{ width: 60, height: 6, background: 'var(--border-soft)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min((kmNum / maxKm) * 100, 100)}%`,
                    height: '100%', background: ph.color,
                    opacity: completed ? 1 : 0.5,
                  }} />
                </div>

                {/* km */}
                <div style={{ minWidth: 56, textAlign: 'right' }}>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{kmNum.toFixed(0)}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 2 }}>km</span>
                </div>

                {/* Status or delta */}
                <div style={{ minWidth: 64, textAlign: 'right' }}>
                  {completed ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--success)' }}>
                      <IconCheck size={11} stroke={2.5} /> {t.plan.done}
                    </span>
                  ) : isCurrent ? (
                    <span className="pill pill-indigo">{t.plan.active}</span>
                  ) : (
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{delta ?? ''}</span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default AllWeeksList;
