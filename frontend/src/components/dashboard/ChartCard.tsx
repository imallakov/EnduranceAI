import React, { useState } from 'react';
import LineChart from '../charts/LineChart';
import type { DailyMetric } from '../../types/api';

const RANGES = ['28d', '84d', '6mo', '1y'] as const;
type Range = typeof RANGES[number];

interface ChartCardProps {
  chart: DailyMetric[];
}

const RANGE_DAYS: Record<Range, number> = {
  '28d': 28,
  '84d': 84,
  '6mo': 180,
  '1y': 365,
};

const ChartCard: React.FC<ChartCardProps> = ({ chart }) => {
  const [range, setRange] = useState<Range>('84d');

  // Slice the daily-metric array to the selected window. Backend already returns
  // entries sorted by date ascending; we keep the most recent N points so the
  // chart actually reflects the period the user clicked.
  const windowSize = RANGE_DAYS[range];
  const visibleChart = chart.length > windowSize ? chart.slice(-windowSize) : chart;

  // Convert backend DailyMetric[] → DataPoint[] for LineChart
  const chartData = visibleChart.map((pt, i) => ({ day: i, ctl: pt.ctl, atl: pt.atl, tsb: pt.tsb }));

  const latestCtl = visibleChart.length ? visibleChart[visibleChart.length - 1].ctl : null;
  const latestAtl = visibleChart.length ? visibleChart[visibleChart.length - 1].atl : null;
  const latestTsb = visibleChart.length ? visibleChart[visibleChart.length - 1].tsb : null;

  return (
    <div className="card chart-card" style={{ padding: 20, height: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div className="label-sm">Fitness / Fatigue / Form</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
            {([
              ['CTL · fitness', '#4F46E5', latestCtl !== null ? String(Math.round(latestCtl)) : '—', 'solid'],
              ['ATL · fatigue', '#F97066', latestAtl !== null ? String(Math.round(latestAtl)) : '—', 'dashed'],
              ['TSB · form', '#10B981', latestTsb !== null ? (latestTsb >= 0 ? `+${Math.round(latestTsb)}` : String(Math.round(latestTsb))) : '—', 'solid'],
            ] as const).map(([n, c, v, kind]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block', width: 14, height: 2,
                  background: kind === 'solid' ? c : 'transparent',
                  borderTop: kind === 'dashed' ? `2px dashed ${c}` : 'none',
                }} />
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{n}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Range selector */}
        <div className="chart-period-buttons" style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="mono"
              style={{
                background: range === r ? '#fff' : 'transparent',
                border: range === r ? '1px solid var(--border)' : '1px solid transparent',
                color: range === r ? 'var(--text)' : 'var(--muted)',
                borderRadius: 5, padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >{r}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {chartData.length > 1 ? (
          <LineChart height={232} data={chartData} />
        ) : (
          <div style={{ height: 232, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>No fitness history yet — upload activities to see trends.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartCard;
