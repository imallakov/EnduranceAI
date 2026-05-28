import React from 'react';
import type { ActivityDetail } from '../../types/api';
import { IconArrowUp } from '../icons';

interface AnalysisCardProps {
  activity: ActivityDetail;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ activity }) => {
  const pace = activity.avg_pace_sec_per_km != null ? Number(activity.avg_pace_sec_per_km) : null;
  const hr = activity.avg_hr;
  const hrEff = pace != null && hr != null && hr > 0
    ? (pace / hr).toFixed(1)
    : null;

  const cards = [
    {
      label: 'HR efficiency',
      value: hrEff ?? '—',
      suffix: hrEff ? 's/bpm' : '',
      sub: hrEff
        ? <span><IconArrowUp size={11} style={{ color: 'var(--success)' }} /> <span className="mono" style={{ color: 'var(--success)', fontWeight: 600 }}>pace / avg HR</span></span>
        : <span style={{ color: 'var(--muted)' }}>No HR data</span>,
      explanation: 'Pace held per heartbeat. Higher = more aerobic economy.',
    },
    {
      label: 'Pace decoupling',
      value: '—',
      suffix: '',
      sub: <span style={{ color: 'var(--muted)' }}>requires lap-level HR</span>,
      explanation: 'Pace:HR ratio drift between first and second half of the run.',
    },
    {
      label: 'Aerobic threshold',
      value: '—',
      suffix: '',
      sub: <span style={{ color: 'var(--muted)' }}>7d rolling · coming soon</span>,
      explanation: 'Highest HR at which lactate production stays stable.',
    },
  ];

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{
        padding: '14px 22px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="label-sm">Analysis</div>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Daniels + EnduranceAI</span>
      </div>
      <div className="analysis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            padding: '18px 22px 20px',
            borderRight: i < cards.length - 1 ? '1px solid var(--border-soft)' : 'none',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <span className="label-sm" style={{ fontSize: 10.5 }}>{c.label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span className="mono" style={{
                fontSize: 28, fontWeight: 600, color: 'var(--text)',
                letterSpacing: -0.8, lineHeight: 1,
              }}>
                {c.value}
              </span>
              {c.suffix && (
                <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.suffix}</span>
              )}
            </div>
            <div style={{ fontSize: 11.5, marginTop: 2 }}>{c.sub}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 4, lineHeight: 1.4 }}>
              {c.explanation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisCard;
