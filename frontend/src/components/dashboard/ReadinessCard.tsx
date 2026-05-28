import React from 'react';
import RadialGauge from '../charts/RadialGauge';
import ComponentBar from '../charts/ComponentBar';
import type { RaceReadiness } from '../../types/api';
import { useT } from '../../i18n/context';

interface ReadinessCardProps {
  readiness: RaceReadiness | null;
}

const ReadinessCard: React.FC<ReadinessCardProps> = ({ readiness }) => {
  const t = useT();
  const score = readiness?.score ?? 0;
  const badge =
    score >= 80 ? { label: t.dashboard.readinessGood, cls: 'pill-soft-success' } :
    score >= 60 ? { label: t.dashboard.readinessModerate, cls: 'pill-soft-warn' } :
    { label: t.dashboard.readinessLow, cls: 'pill-soft-muted' };

  return (
    <div className="card" style={{ padding: 20, height: 340, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="label-sm">{t.dashboard.raceReadiness}</div>
        {readiness ? (
          <span className={`pill ${badge.cls}`} style={{ flexShrink: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '50%' }}>{badge.label}</span>
        ) : (
          <span className="pill pill-soft-muted" style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '50%' }}>{t.dashboard.readinessNoData}</span>
        )}
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: 6, overflow: 'hidden' }}>
        <RadialGauge value={score} size={220} stroke={14} />
        <div style={{ position: 'absolute', top: 56, left: 0, right: 0, textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 50, fontWeight: 600, color: 'var(--primary)', letterSpacing: -1.5, lineHeight: 1 }}>
            {readiness ? score : '—'}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 4 }}>
            {readiness ? 'out of 100' : 'upload activities'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 4 }}>
        <ComponentBar label={t.dashboard.tsbScore}   score={readiness?.components.tsb_score ?? 0} />
        <ComponentBar label={t.dashboard.consistency} score={readiness?.components.consistency ?? 0} />
        <ComponentBar label={t.dashboard.longRuns}   score={readiness?.components.long_runs ?? 0} />
        <ComponentBar label={t.dashboard.vdotTrend}  score={readiness?.components.vdot_trend ?? 0} />
        <ComponentBar label={t.dashboard.volume}     score={readiness?.components.volume ?? 0} />
      </div>
    </div>
  );
};

export default ReadinessCard;
