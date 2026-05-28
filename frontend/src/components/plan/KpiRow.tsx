import React from 'react';
import type { TrainingPlan } from '../../types/api';
import { PHASES } from './PhaseStrip';
import { useT, useLang } from '../../i18n/context';

interface KpiRowProps {
  plan: TrainingPlan;
}

const KpiRow: React.FC<KpiRowProps> = ({ plan }) => {
  const t = useT();
  const { lang } = useLang();
  const { current_week_number, total_weeks, days_to_race, plan_total_km, completed_workouts, total_workouts } = plan;

  const currentPhaseInfo = (() => {
    const currentWeek = plan.weeks.find(w => w.week_number === current_week_number);
    if (!currentWeek) return { label: 'Base', number: 1, accent: '#4F46E5' };
    const phaseConfig = PHASES.find(p => p.id === currentWeek.phase);
    const phaseNumber = PHASES.findIndex(p => p.id === currentWeek.phase) + 1;
    return {
      label: phaseConfig?.label ?? 'Base',
      number: phaseNumber,
      accent: phaseConfig?.color ?? '#4F46E5',
    };
  })();

  const raceDate = new Date(plan.race_date);
  const raceDateStr = raceDate.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' });

  const items = [
    { label: t.plan.phase,         value: String(currentPhaseInfo.number), suffix: t.plan.of4,         caption: currentPhaseInfo.label,           accent: currentPhaseInfo.accent },
    { label: t.plan.kpiWeek,       value: String(current_week_number),     suffix: `/ ${total_weeks}`, caption: current_week_number === Math.ceil(total_weeks / 2) ? t.plan.halfwayPoint : t.plan.currentWeek, accent: '#4F46E5' },
    { label: t.plan.kpiDaysToRace, value: String(Math.max(0, days_to_race)), suffix: 'd',              caption: raceDateStr,                       accent: '#F97066' },
    { label: t.plan.kpiPlanTotal,  value: String(Math.round(plan_total_km)), suffix: 'km',             caption: t.plan.sessionsOf(completed_workouts, total_workouts), accent: '#1E1B4B' },
  ];

  return (
    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
      {items.map((m, i) => (
        <div key={i} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, borderRadius: 2, background: m.accent }} />
          <div style={{ paddingLeft: 8 }}>
            <span className="label-sm">{m.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: 8 }}>
            <span className="mono" style={{ fontSize: 32, fontWeight: 600, color: 'var(--text)', letterSpacing: -1, lineHeight: 1 }}>
              {m.value}
            </span>
            <span className="mono" style={{ fontSize: 14, color: 'var(--muted)' }}>{m.suffix}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', paddingLeft: 8 }}>{m.caption}</div>
        </div>
      ))}
    </div>
  );
};

export default KpiRow;
