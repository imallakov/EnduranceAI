import React from 'react';
import type { ActivityDetail, Lap } from '../../types/api';
import { formatPace, formatTime, lapZone, ZONE_DOT_COLOR } from './utils';
import { IconArrowUp, IconArrowDown, IconArrowFlat } from '../icons';

interface ProcessedLap {
  km: number;
  paceSec: number;
  pace: string;
  cumTimeSec: number;
  hr: number | null;
  deltaToAvg: number;
  deltaToPrev: number;
  zone: string | null;
}

function processLaps(laps: Lap[], maxHr: number | null): ProcessedLap[] {
  if (!laps.length) return [];
  const paceVals = laps
    .map(l => l.avg_pace_sec_per_km != null ? Number(l.avg_pace_sec_per_km) : null)
    .filter((v): v is number => v != null);
  const avgPace = paceVals.length ? paceVals.reduce((a, b) => a + b, 0) / paceVals.length : 0;

  let cum = 0;
  return laps.map((lap, i) => {
    const paceSec = lap.avg_pace_sec_per_km != null ? Number(lap.avg_pace_sec_per_km) : 0;
    cum += lap.duration_sec;
    const prevPace = i > 0 && laps[i - 1].avg_pace_sec_per_km != null
      ? Number(laps[i - 1].avg_pace_sec_per_km)
      : paceSec;
    const hr = lap.avg_hr != null ? Number(lap.avg_hr) : null;
    return {
      km: lap.lap,
      paceSec,
      pace: formatPace(paceSec || null),
      cumTimeSec: cum,
      hr,
      deltaToAvg: paceSec - avgPace,
      deltaToPrev: i === 0 ? 0 : paceSec - prevPace,
      zone: lapZone(hr, maxHr),
    };
  });
}

interface SplitsTableProps {
  activity: ActivityDetail;
}

const MAX_DELTA = 20;
const BAR_HALF = 32;

const SplitsTable: React.FC<SplitsTableProps> = ({ activity }) => {
  const { laps, max_hr } = activity;

  if (!laps || laps.length === 0) {
    return (
      <div className="card" style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 6 }}>
            Splits unavailable
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            Per-kilometer splits require a GPS or treadmill recording. This activity has only the totals you entered.
          </div>
        </div>
      </div>
    );
  }

  const data = processLaps(laps, max_hr);
  const hasHr = data.some(d => d.hr != null);

  const paceNonZero = data.filter(d => d.paceSec > 0);
  const bestIdx = paceNonZero.length > 1
    ? data.indexOf(paceNonZero.slice(1).reduce((best, cur) => cur.paceSec < best.paceSec ? cur : best, paceNonZero[1]))
    : -1;
  const worstIdx = paceNonZero.length > 1
    ? data.indexOf(paceNonZero.slice(1).reduce((worst, cur) => cur.paceSec > worst.paceSec ? cur : worst, paceNonZero[1]))
    : -1;

  const gridCols = hasHr
    ? '28px 56px 68px 1fr 56px 56px'
    : '28px 56px 68px 1fr 56px';

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label-sm">Splits · {data.length} km</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          <span className="mono" style={{ color: 'var(--success)', marginRight: 8 }}>● fastest</span>
          <span className="mono" style={{ color: 'var(--accent)' }}>● slowest</span>
        </span>
      </div>
      <div style={{ height: 1, background: 'var(--border)' }} />

      <div style={{ overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        padding: '8px 18px',
        alignItems: 'center',
        columnGap: 12,
        background: '#FAFAF9',
        borderBottom: '1px solid var(--border)',
      }}>
        <span className="label-sm" style={{ fontSize: 10 }}>KM</span>
        <span className="label-sm" style={{ fontSize: 10 }}>TIME</span>
        <span className="label-sm" style={{ fontSize: 10 }}>PACE</span>
        <span className="label-sm" style={{ fontSize: 10 }}>vs AVG</span>
        {hasHr && <span className="label-sm" style={{ fontSize: 10, textAlign: 'right' }}>HR</span>}
        <span className="label-sm" style={{ fontSize: 10, textAlign: 'right' }}>Δ KM</span>
      </div>

      <div className="nice-scroll" style={{ maxHeight: 560, overflow: 'auto' }}>
        {data.map((s, i) => {
          const isBest = i === bestIdx;
          const isWorst = i === worstIdx;
          const ribbon = isBest ? 'var(--success)' : isWorst ? 'var(--accent)' : null;

          const clamped = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, s.deltaToAvg));
          const barLen = (Math.abs(clamped) / MAX_DELTA) * BAR_HALF;
          // Negative deltaToAvg = faster than avg → bar to right (indigo)
          const barRight = clamped < 0;

          const dToPrev = s.deltaToPrev;
          const DArrow = i === 0 ? null : dToPrev < 0 ? IconArrowDown : dToPrev > 0 ? IconArrowUp : IconArrowFlat;
          const dColor = i === 0
            ? 'var(--muted)'
            : dToPrev < 0 ? 'var(--success)' : dToPrev > 0 ? 'var(--accent)' : 'var(--muted)';

          return (
            <div
              key={i}
              className="act-row"
              style={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                padding: '0 18px',
                height: 40,
                alignItems: 'center',
                columnGap: 12,
                borderBottom: i < data.length - 1 ? '1px solid var(--border-soft)' : 'none',
                position: 'relative',
              }}
            >
              {ribbon && (
                <span style={{
                  position: 'absolute', left: 0, top: 6, bottom: 6, width: 3,
                  background: ribbon, borderRadius: 2,
                }} />
              )}
              <span className="mono" style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{s.km}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{formatTime(s.cumTimeSec)}</span>
              <span className="mono" style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600 }}>{s.pace}</span>

              {/* Pace delta bar */}
              <div style={{ display: 'flex', alignItems: 'center', height: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />
                <div style={{
                  position: 'absolute',
                  left: barRight ? '50%' : `calc(50% - ${barLen}px)`,
                  width: barLen,
                  height: 6,
                  top: 5,
                  background: barRight ? 'var(--primary-2)' : 'var(--accent)',
                  borderRadius: 3,
                  opacity: 0.85,
                }} />
                <span className="mono" style={{
                  position: 'absolute',
                  left: barRight ? `calc(50% + ${barLen}px + 5px)` : `calc(50% - ${barLen}px - 5px)`,
                  transform: barRight ? 'none' : 'translateX(-100%)',
                  fontSize: 10.5,
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                }}>
                  {clamped > 0 ? '+' : ''}{Math.round(clamped)}s
                </span>
              </div>

              {hasHr && (
                <span className="mono" style={{
                  fontSize: 12, color: 'var(--text)', textAlign: 'right',
                  display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5,
                }}>
                  {s.zone && (
                    <span style={{
                      width: 5, height: 5, borderRadius: 3,
                      background: ZONE_DOT_COLOR[s.zone] ?? '#94A3B8',
                      flexShrink: 0,
                    }} />
                  )}
                  {s.hr != null ? s.hr : '—'}
                </span>
              )}

              <span className="mono" style={{
                fontSize: 11.5, color: dColor, textAlign: 'right',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
              }}>
                {DArrow && <DArrow size={10} />}
                {i === 0 ? '—' : `${Math.abs(Math.round(dToPrev))}s`}
              </span>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default SplitsTable;
