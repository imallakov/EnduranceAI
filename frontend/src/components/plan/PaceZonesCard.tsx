import React from 'react';
import type { TrainingPlan } from '../../types/api';
import { useT } from '../../i18n/context';

interface PaceZonesCardProps {
  plan: TrainingPlan;
}

const PaceZonesCard: React.FC<PaceZonesCardProps> = ({ plan }) => {
  const t = useT();
  const { pace_zones, vdot_at_creation } = plan;
  if (!pace_zones?.length) return null;

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="label-sm">{t.plan.paceZones}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            {t.plan.fromVdot(vdot_at_creation ? Number(vdot_at_creation).toFixed(1) : '—')}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
        {pace_zones.map((z, i) => (
          <React.Fragment key={z.key}>
            {i > 0 && <div style={{ height: 1, background: 'var(--border-soft)' }} />}
            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto auto', alignItems: 'center', columnGap: 10, padding: '10px 0' }}>
              <span style={{
                width: 22, height: 22, borderRadius: 5, background: z.color, color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, fontFamily: 'Geist Mono, monospace',
              }}>
                {z.key}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>{z.name}</span>
                <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>{z.sub}</span>
              </div>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{z.pace}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>/km</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default PaceZonesCard;
