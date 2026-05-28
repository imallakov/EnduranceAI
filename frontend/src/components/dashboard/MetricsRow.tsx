import React from 'react';
import { Link } from 'react-router-dom';
import MetricCard from './MetricCard';
import { IconArrowUp, IconArrowFlat, IconArrowRight } from '../icons';
import type { DashboardMetrics, DailyMetric } from '../../types/api';
import { useT } from '../../i18n/context';

interface MetricsRowProps {
  metrics: DashboardMetrics;
  chart: DailyMetric[];
}

const MetricsRow: React.FC<MetricsRowProps> = ({ metrics, chart }) => {
  const t = useT();
  const noData = metrics.vdot === null && metrics.ctl === null;

  if (noData) {
    return (
      <div className="kpi-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20,
      }}>
        <div className="card" style={{ gridColumn: '1 / -1', padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="label-sm" style={{ marginBottom: 6 }}>{t.empty.noFitnessData}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {t.empty.noFitnessDataHint}
            </div>
          </div>
          <Link to="/activities" className="btn btn-ghost" style={{ textDecoration: 'none', flexShrink: 0 }}>
            {t.empty.uploadFirstActivity} <IconArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  const ctlSpark = chart.slice(-28).map((d) => d.ctl);
  const atlSpark = chart.slice(-28).map((d) => d.atl);
  const tsbSpark = chart.slice(-28).map((d) => d.tsb);

  // 28-day delta helpers
  const sparkDelta = (spark: number[]): string => {
    if (spark.length < 2) return '—';
    const diff = spark[spark.length - 1] - spark[0];
    return diff >= 0 ? `+${Math.round(diff)}` : String(Math.round(diff));
  };
  const sparkTone = (spark: number[]): 'success' | 'warning' | 'muted' =>
    spark.length < 2 ? 'muted' : spark[spark.length - 1] >= spark[0] ? 'success' : 'warning';

  // TSB interpretation per training stress literature (CTL/ATL/TSB by Coggan):
  //  > 25:    detraining / loss of fitness
  //  +5..+25: race-ready / peak form
  //  -10..+5: in zone (productive training)
  //  -30..-10: heavy load / accumulating fatigue
  //  < -30:   overtraining risk
  const tsbInterpretation = (tsb: number | null): { caption: string; tone: 'success' | 'warning' | 'muted' | 'danger' } => {
    if (tsb === null) return { caption: '—', tone: 'muted' };
    if (tsb > 25) return { caption: 'detraining', tone: 'warning' };
    if (tsb >= 5) return { caption: 'race ready', tone: 'success' };
    if (tsb >= -10) return { caption: 'in zone', tone: 'muted' };
    if (tsb >= -30) return { caption: 'heavy load', tone: 'warning' };
    return { caption: 'overtraining', tone: 'danger' };
  };
  const tsbInfo = tsbInterpretation(metrics.tsb !== null ? Number(metrics.tsb) : null);

  return (
    // Backend serializes DecimalField as string — coerce to number everywhere
    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
      <MetricCard
        label="VDOT"
        value={metrics.vdot !== null ? Number(metrics.vdot).toFixed(1) : '—'}
        delta="—" caption="current"
        deltaTone="muted" DeltaIcon={IconArrowFlat}
      />
      <MetricCard
        label="CTL · Fitness"
        value={metrics.ctl !== null ? String(Math.round(Number(metrics.ctl))) : '—'}
        delta={sparkDelta(ctlSpark)} caption="28d change"
        deltaTone={sparkTone(ctlSpark)} DeltaIcon={IconArrowUp}
        sparkData={ctlSpark.length ? ctlSpark : undefined} sparkColor="#4F46E5"
      />
      <MetricCard
        label="ATL · Fatigue"
        value={metrics.atl !== null ? String(Math.round(Number(metrics.atl))) : '—'}
        delta={sparkDelta(atlSpark)} caption="28d change"
        deltaTone={sparkTone(atlSpark)} DeltaIcon={IconArrowUp}
        sparkData={atlSpark.length ? atlSpark : undefined} sparkColor="#F97066"
      />
      <MetricCard
        label="TSB · Form"
        value={(() => {
          if (metrics.tsb === null) return '—';
          const v = Math.round(Number(metrics.tsb));
          return v >= 0 ? `+${v}` : String(v);
        })()}
        delta={tsbInfo.caption}
        caption=""
        deltaTone={tsbInfo.tone}
        DeltaIcon={IconArrowFlat}
        sparkData={tsbSpark.length ? tsbSpark : undefined} sparkColor="#64748B"
      />
    </div>
  );
};

export default MetricsRow;
