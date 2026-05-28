import React from 'react';
import type { TrainingPlan, WorkoutType, PlanPhase } from '../../types/api';
import { WORKOUT_COLORS } from './WorkoutIcon';
import { useT } from '../../i18n/context';

const PHASE_LABELS: Record<PlanPhase, string> = {
  base:          'Base',
  early_quality: 'Early Quality',
  late_quality:  'Late Quality',
  taper:         'Taper',
};

const TYPE_LABELS: Partial<Record<WorkoutType, string>> = {
  easy:          'Easy',
  long:          'Long',
  tempo:         'Tempo',
  interval:      'Interval',
  repetition:    'Repetition',
  marathon_pace: 'Marathon Pace',
};

interface DistributionDonutProps {
  plan: TrainingPlan;
}

const DistributionDonut: React.FC<DistributionDonutProps> = ({ plan }) => {
  const t = useT();
  const { weeks, current_week_number } = plan;

  const currentWeekData = weeks.find(w => w.week_number === current_week_number);
  const currentPhase = currentWeekData?.phase ?? 'base';

  const phaseWeeks = weeks.filter(w => w.phase === currentPhase);
  const counts: Partial<Record<WorkoutType, number>> = {};
  phaseWeeks.forEach(wk => {
    wk.workouts.forEach(wo => {
      if (wo.workout_type !== 'rest') {
        counts[wo.workout_type] = (counts[wo.workout_type] ?? 0) + 1;
      }
    });
  });

  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  if (total === 0) return null;

  const dist = (Object.entries(counts) as [WorkoutType, number][])
    .map(([type, count]) => ({ type, pct: Math.round((count / total) * 100), color: WORKOUT_COLORS[type] ?? '#94A3B8' }))
    .sort((a, b) => b.pct - a.pct);

  const size = 116, stroke = 14;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let cursor = 0;

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="label-sm">{t.plan.workoutDistribution}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
        {t.plan.thisPhase} · {PHASE_LABELS[currentPhase]}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 12 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
             style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1EFEC" strokeWidth={stroke} />
          {dist.map((d, i) => {
            const length = (d.pct / 100) * C;
            const dash   = `${length} ${C - length}`;
            const off    = -cursor;
            cursor += length;
            return (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                      stroke={d.color} strokeWidth={stroke}
                      strokeDasharray={dash} strokeDashoffset={off} strokeLinecap="butt" />
            );
          })}
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {dist.map(d => (
            <div key={d.type} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto', alignItems: 'center', columnGap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{TYPE_LABELS[d.type] ?? d.type}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DistributionDonut;
