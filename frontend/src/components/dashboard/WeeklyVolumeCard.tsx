import React from 'react';
import Sparkline from '../charts/Sparkline';
import type { DailyMetric } from '../../types/api';
import { useT } from '../../i18n/context';

interface WeeklyVolumeCardProps {
  weeklyKmCurrent: number;
  weeklyKmAvg8w: number;
  chart: DailyMetric[];
}

const WeeklyVolumeCard: React.FC<WeeklyVolumeCardProps> = ({ weeklyKmCurrent, weeklyKmAvg8w, chart }) => {
  const t = useT();

  // Derive weekly volumes from daily CTL trend as a rough spark proxy
  // Backend doesn't return weekly volume history — use last 8 CTL values as visual placeholder
  const spark = chart.length >= 8
    ? chart.slice(-8).map((d) => d.ctl)
    : [weeklyKmAvg8w, weeklyKmCurrent];

  const pctChange = weeklyKmAvg8w > 0
    ? ((weeklyKmCurrent - weeklyKmAvg8w) / weeklyKmAvg8w) * 100
    : 0;
  const pctStr = pctChange >= 0 ? `+${pctChange.toFixed(1)}%` : `${pctChange.toFixed(1)}%`;
  const pctColor = pctChange >= 0 ? 'var(--success)' : 'var(--danger)';

  return (
    <div className="card" style={{ padding: 18, height: 124 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label-sm">{t.dashboard.thisWeekVol}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t.dashboard.monToSun}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="mono" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.6, lineHeight: 1 }}>
              {weeklyKmCurrent.toFixed(1)}
            </span>
            <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>km</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
            {t.dashboard.avgWeeks(8)} <span className="mono" style={{ color: 'var(--text)' }}>{weeklyKmAvg8w.toFixed(1)} km</span>
            {weeklyKmAvg8w > 0 && (
              <span style={{ color: pctColor, marginLeft: 8 }} className="mono">{pctStr}</span>
            )}
          </div>
        </div>
        <Sparkline values={spark} width={108} height={36} color="#4F46E5" fill />
      </div>
    </div>
  );
};

export default WeeklyVolumeCard;
