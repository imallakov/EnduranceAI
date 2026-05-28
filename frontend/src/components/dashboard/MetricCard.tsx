import React from 'react';
import Sparkline from '../charts/Sparkline';
import { IconArrowUp } from '../icons';

type DeltaTone = 'success' | 'muted' | 'warning' | 'danger';

interface MetricCardProps {
  label: string;
  value: string;
  suffix?: string;
  delta: string;
  deltaTone?: DeltaTone;
  DeltaIcon?: React.FC<{ size?: number; style?: React.CSSProperties }>;
  caption: string;
  sparkData?: number[];
  sparkColor?: string;
}

const DELTA_COLOR: Record<DeltaTone, string> = {
  success: 'var(--success)',
  muted: 'var(--muted)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

const MetricCard: React.FC<MetricCardProps> = ({
  label, value, suffix, delta, deltaTone = 'success',
  DeltaIcon = IconArrowUp, caption, sparkData, sparkColor = '#4F46E5',
}) => {
  const deltaColor = DELTA_COLOR[deltaTone];
  return (
    <div className="card hoverable" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 124 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label-sm">{label}</span>
        {sparkData && <Sparkline values={sparkData} width={56} height={20} color={sparkColor} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="mono" style={{ fontSize: 30, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.8, lineHeight: 1 }}>
          {value}
        </span>
        {suffix && <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>{suffix}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
        <DeltaIcon size={12} style={{ color: deltaColor }} />
        <span className="mono" style={{ color: deltaColor, fontWeight: 600 }}>{delta}</span>
        <span style={{ color: 'var(--muted)' }}>{caption}</span>
      </div>
    </div>
  );
};

export default MetricCard;
