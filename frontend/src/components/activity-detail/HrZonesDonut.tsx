import React from 'react';
import type { ActivityDetail } from '../../types/api';
import { formatTime } from './utils';

interface ZoneRow {
  zone: string;
  label: string;
  sec: number;
  color: string;
}

function buildZoneData(hr_zones_sec: Record<string, number>): ZoneRow[] {
  const rows: ZoneRow[] = [
    { zone: 'Z2', label: 'Aerobic',   sec: hr_zones_sec['E'] ?? 0, color: '#10B981' },
    { zone: 'Z3', label: 'Tempo',     sec: hr_zones_sec['M'] ?? 0, color: '#F59E0B' },
    { zone: 'Z4', label: 'Threshold', sec: hr_zones_sec['T'] ?? 0, color: '#F97066' },
    { zone: 'Z5', label: 'VO2 max',   sec: (hr_zones_sec['I'] ?? 0) + (hr_zones_sec['R'] ?? 0), color: '#DC2626' },
    { zone: 'Z1', label: 'Easy',      sec: 0, color: '#64748B' },
  ];
  // Check if there's any Z1-equivalent (below E zone) — we don't track it in backend but include the row if needed
  // Filter out zero-second zones
  return rows.filter(r => r.sec > 0);
}

interface HrZonesDonutProps {
  activity: ActivityDetail;
}

const HrZonesDonut: React.FC<HrZonesDonutProps> = ({ activity }) => {
  const { hr_zones_sec, duration_sec, avg_hr } = activity;
  const data = buildZoneData(hr_zones_sec ?? {});
  const total = data.reduce((a, b) => a + b.sec, 0);

  if (total === 0) {
    return (
      <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="label-sm">Time in zone</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 4 }}>
              No HR data
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
              {activity.source === 'manual'
                ? 'Manual entry — no HR zones recorded'
                : 'HR monitor not detected in file'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const size = 180;
  const strokeW = 22;
  const r = (size - strokeW) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div className="label-sm">Time in zone</div>

      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginTop: 4 }}>
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1EFEC" strokeWidth={strokeW} />
          {data.map((d, i) => {
            const frac = d.sec / total;
            const dash = circ * frac - 2;
            const el = (
              <circle
                key={i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={strokeW}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                strokeLinecap="butt"
              />
            );
            offset += circ * frac;
            return el;
          })}
        </svg>

        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span className="mono" style={{
            fontSize: 22, fontWeight: 600, color: 'var(--primary)',
            letterSpacing: -0.5, lineHeight: 1,
          }}>
            {formatTime(duration_sec)}
          </span>
          {avg_hr != null && (
            <span style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4, letterSpacing: 0.3 }}>
              avg HR{' '}
              <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{avg_hr}</span>
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
        {data.map((d, i) => {
          const pct = Math.round((d.sec / total) * 100);
          return (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '10px 80px 1fr 44px 36px',
              alignItems: 'center',
              columnGap: 8,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: d.color, display: 'inline-block' }} />
              <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 500 }}>
                <span className="mono" style={{ color: 'var(--muted)', marginRight: 5 }}>{d.zone}</span>
                {d.label}
              </span>
              <div style={{ height: 5, background: '#F1EFEC', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: 3 }} />
              </div>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600, textAlign: 'right' }}>
                {formatTime(d.sec)}
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HrZonesDonut;
