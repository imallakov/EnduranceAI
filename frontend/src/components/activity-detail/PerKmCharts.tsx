import React, { useRef, useState } from 'react';
import type { ActivityDetail, Lap } from '../../types/api';
import { formatPace } from './utils';

interface ChartData {
  km: number;
  paceSec: number;
  pace: string;
  hr: number | null;
  elev: number | null;
}

function buildChartData(laps: Lap[]): ChartData[] {
  return laps.map((lap) => {
    const pace = lap.avg_pace_sec_per_km != null ? Number(lap.avg_pace_sec_per_km) : null;
    return {
      km: lap.lap,
      paceSec: pace ?? 0,
      pace: formatPace(pace),
      hr: lap.avg_hr != null ? Number(lap.avg_hr) : null,
      elev: lap.avg_elevation_m != null ? Number(lap.avg_elevation_m) : null,
    };
  });
}

interface PerKmChartsProps {
  activity: ActivityDetail;
}

const PerKmCharts: React.FC<PerKmChartsProps> = ({ activity }) => {
  const { laps } = activity;

  if (!laps || laps.length === 0) {
    return (
      <div className="card" style={{ padding: 20, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 4 }}>
            No per-km data available
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Upload a GPS file to see pace, HR and elevation charts.
          </div>
        </div>
      </div>
    );
  }

  const data = buildChartData(laps);
  const hasHr = data.some(d => d.hr != null);
  const hasElev = data.some(d => d.elev != null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ i: number; x: number } | null>(null);
  const [w, setW] = useState(1000);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setW(Math.max(280, entries[0].contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isMob = w < 600;
  const padL = isMob ? 36 : 44;
  const padR = isMob ? 16 : 24;
  const iw = w - padL - padR;
  const n = data.length;
  const subH = isMob ? 60 : 88;
  const gap = isMob ? 12 : 16;
  const numCharts = 1 + (hasHr ? 1 : 0) + (hasElev ? 1 : 0);
  const totalH = 36 + numCharts * subH + (numCharts - 1) * gap;

  // Sub-chart indices (which row each chart sits in)
  const idxPace = 0;
  const idxHr = hasHr ? 1 : -1;
  const idxElev = hasHr ? (hasElev ? 2 : -1) : (hasElev ? 1 : -1);

  const xAt = (i: number) => padL + (n > 1 ? (i / (n - 1)) * iw : iw / 2);

  const subYTop = (idx: number) => 36 + idx * (subH + gap);

  // Pace — inverted Y (lower pace sec = faster = higher on chart)
  const paceVals = data.map(d => d.paceSec).filter(v => v > 0);
  const paceMin = paceVals.length ? Math.min(...paceVals) - 4 : 280;
  const paceMax = paceVals.length ? Math.max(...paceVals) + 4 : 360;
  const avgPaceSec = paceVals.length ? paceVals.reduce((a, b) => a + b, 0) / paceVals.length : null;

  const paceYAt = (v: number) => {
    const top = subYTop(idxPace) + 8;
    const bot = subYTop(idxPace) + subH - 6;
    return top + ((v - paceMin) / (paceMax - paceMin)) * (bot - top);
  };

  // HR — normal Y (higher = higher on chart)
  const hrVals = data.filter(d => d.hr != null).map(d => d.hr as number);
  const hrMin = hrVals.length ? Math.min(...hrVals) - 4 : 100;
  const hrMax = hrVals.length ? Math.max(...hrVals) + 4 : 200;

  const hrYAt = (v: number) => {
    const top = subYTop(idxHr) + 8;
    const bot = subYTop(idxHr) + subH - 6;
    return bot - ((v - hrMin) / (hrMax - hrMin)) * (bot - top);
  };

  // Elevation — normal Y, area fill from baseline up
  const elevVals = data.filter(d => d.elev != null).map(d => d.elev as number);
  const elevMin = elevVals.length ? Math.min(...elevVals) - 2 : 0;
  const elevMax = elevVals.length ? Math.max(...elevVals) + 2 : 100;

  const elevYAt = (v: number) => {
    const top = subYTop(idxElev) + 8;
    const bot = subYTop(idxElev) + subH - 6;
    return bot - ((v - elevMin) / (elevMax - elevMin)) * (bot - top);
  };

  const pacePath = data
    .filter(d => d.paceSec > 0)
    .map((d, i) => `${i ? 'L' : 'M'}${xAt(data.indexOf(d)).toFixed(1)},${paceYAt(d.paceSec).toFixed(1)}`)
    .join(' ');

  const hrPath = hasHr
    ? data
        .filter(d => d.hr != null)
        .map((d, i) => `${i ? 'L' : 'M'}${xAt(data.indexOf(d)).toFixed(1)},${hrYAt(d.hr as number).toFixed(1)}`)
        .join(' ')
    : '';

  // Elevation: build both stroke path + area-fill path
  let elevStroke = '';
  let elevArea = '';
  if (hasElev) {
    const pts = data.filter(d => d.elev != null);
    elevStroke = pts
      .map((d, i) => `${i ? 'L' : 'M'}${xAt(data.indexOf(d)).toFixed(1)},${elevYAt(d.elev as number).toFixed(1)}`)
      .join(' ');
    // Close polygon down to baseline for area fill
    if (pts.length) {
      const firstX = xAt(data.indexOf(pts[0])).toFixed(1);
      const lastX = xAt(data.indexOf(pts[pts.length - 1])).toFixed(1);
      const baseY = (subYTop(idxElev) + subH - 6).toFixed(1);
      elevArea = `${elevStroke} L${lastX},${baseY} L${firstX},${baseY} Z`;
    }
  }

  // X ticks every 5 km
  const xTicks: number[] = [];
  for (let k = 0; k <= n; k += 5) {
    if (k < n) xTicks.push(k);
  }
  if (!xTicks.includes(n - 1)) xTicks.push(n - 1);

  const onMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = rect.width / w;
    const x = (e.clientX - rect.left) / scale;
    const i = Math.max(0, Math.min(n - 1, Math.round(((x - padL) / iw) * (n - 1))));
    setHover({ i, x: xAt(i) });
  };

  // Build title parts dynamically
  const titleParts = ['pace'];
  if (hasHr) titleParts.push('heart rate');
  if (hasElev) titleParts.push('elevation');

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="label-sm">Per km · {titleParts.join(' & ')}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Hover to scrub</div>
      </div>

      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <svg
          width="100%"
          height={totalH}
          viewBox={`0 0 ${w} ${totalH}`}
          style={{ display: 'block' }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* Sub-titles */}
          <text x={padL} y={subYTop(idxPace) - 6} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, fill: '#64748B', textTransform: 'uppercase', fontFamily: 'Inter' }}>PACE</text>
          <text x={padL + 50} y={subYTop(idxPace) - 6} style={{ fontSize: 9.5, fill: '#94A3B8', fontFamily: 'Inter', letterSpacing: 0.4 }}>faster ↑</text>
          {hasHr && (
            <text x={padL} y={subYTop(idxHr) - 6} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, fill: '#64748B', textTransform: 'uppercase', fontFamily: 'Inter' }}>HR</text>
          )}
          {hasElev && (
            <text x={padL} y={subYTop(idxElev) - 6} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, fill: '#64748B', textTransform: 'uppercase', fontFamily: 'Inter' }}>ELEVATION</text>
          )}

          {/* Avg pace dashed line */}
          {avgPaceSec != null && (
            <>
              <line
                x1={padL} x2={w - padR}
                y1={paceYAt(avgPaceSec)} y2={paceYAt(avgPaceSec)}
                stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" opacity="0.7"
              />
              <text
                x={w - padR - 4} y={paceYAt(avgPaceSec) - 4} textAnchor="end"
                style={{ fontSize: 9.5, fill: '#64748B', fontFamily: 'Geist Mono Variable,monospace' }}
              >
                avg {formatPace(avgPaceSec)}
              </text>
            </>
          )}

          {/* Pace line */}
          <path d={pacePath} fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* HR line */}
          {hasHr && hrPath && (
            <path d={hrPath} fill="none" stroke="#F97066" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          )}

          {/* Elevation: area fill + stroke */}
          {hasElev && elevStroke && (
            <>
              <path d={elevArea} fill="#94A3B8" fillOpacity="0.18" />
              <path d={elevStroke} fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}

          {/* Baselines */}
          {Array.from({ length: numCharts }, (_, idx) => (
            <line
              key={idx}
              x1={padL} x2={w - padR}
              y1={subYTop(idx) + subH - 6} y2={subYTop(idx) + subH - 6}
              stroke="#E7E5E4" strokeWidth="1"
            />
          ))}

          {/* X ticks */}
          {xTicks.map(k => (
            <text
              key={k}
              x={xAt(k)} y={totalH - 4} textAnchor="middle"
              style={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Geist Mono Variable,monospace' }}
            >
              {k + 1} km
            </text>
          ))}

          {/* Crosshair */}
          {hover && (
            <g pointerEvents="none">
              <line
                x1={hover.x} x2={hover.x}
                y1={36} y2={subYTop(numCharts - 1) + subH - 6}
                stroke="#1E1B4B" strokeWidth="1" strokeDasharray="3 3" opacity="0.45"
              />
              {data[hover.i].paceSec > 0 && (
                <circle
                  cx={hover.x} cy={paceYAt(data[hover.i].paceSec)}
                  r="3.5" fill="#fff" stroke="#4F46E5" strokeWidth="2"
                />
              )}
              {hasHr && data[hover.i].hr != null && (
                <circle
                  cx={hover.x} cy={hrYAt(data[hover.i].hr as number)}
                  r="3.5" fill="#fff" stroke="#F97066" strokeWidth="2"
                />
              )}
              {hasElev && data[hover.i].elev != null && (
                <circle
                  cx={hover.x} cy={elevYAt(data[hover.i].elev as number)}
                  r="3.5" fill="#fff" stroke="#64748B" strokeWidth="2"
                />
              )}
            </g>
          )}
        </svg>

        {hover && (
          <div className="chart-tooltip mono" style={{ left: `${(hover.x / w) * 100}%`, top: 4 }}>
            <span>KM {data[hover.i].km}</span>
            <span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>
            <span>{data[hover.i].pace} /km</span>
            {hasHr && data[hover.i].hr != null && (
              <>
                <span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>
                <span>{data[hover.i].hr} bpm</span>
              </>
            )}
            {hasElev && data[hover.i].elev != null && (
              <>
                <span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>
                <span>{Math.round(data[hover.i].elev as number)} m</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerKmCharts;
