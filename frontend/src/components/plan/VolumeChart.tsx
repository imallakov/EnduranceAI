import React from 'react';
import type { TrainingPlan, PlanPhase } from '../../types/api';
import { useT } from '../../i18n/context';

const PHASE_COLORS: Record<PlanPhase, string> = {
  base:          '#4F46E5',
  early_quality: '#818CF8',
  late_quality:  '#F59E0B',
  taper:         '#10B981',
};

const PHASE_LABELS: Record<PlanPhase, string> = {
  base:          'Base',
  early_quality: 'Early Quality',
  late_quality:  'Late Quality',
  taper:         'Taper',
};

interface VolumeChartProps {
  plan: TrainingPlan;
}

const VolumeChart: React.FC<VolumeChartProps> = ({ plan }) => {
  const t = useT();
  const { weeks, current_week_number } = plan;
  if (!weeks.length) return null;

  const maxKm   = Math.max(...weeks.map(w => Number(w.total_km)), 1);
  const avgKm   = weeks.reduce((s, w) => s + Number(w.total_km), 0) / weeks.length;
  const peakWeek = weeks.reduce((p, w) => Number(w.total_km) > Number(p.total_km) ? w : p, weeks[0]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(396);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setW(Math.max(280, entries[0].contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const H = 168, padX = 4, padTop = 12, padBot = 28;
  const innerW  = W - padX * 2;
  const n       = weeks.length;

  const phaseDividers: number[] = [];
  for (let i = 0; i < weeks.length - 1; i++) {
    if (weeks[i].phase !== weeks[i + 1].phase) {
      phaseDividers.push(i + 1);
    }
  }

  const seenPhases = new Set<PlanPhase>();
  const uniquePhases: PlanPhase[] = [];
  weeks.forEach(w => {
    if (!seenPhases.has(w.phase)) { seenPhases.add(w.phase); uniquePhases.push(w.phase); }
  });

  return (
    <div ref={containerRef} className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div className="label-sm">{t.plan.weeklyVolume}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
            {t.plan.peakLabel} <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{maxKm.toFixed(0)} km</span>
            <span style={{ margin: '0 6px' }}>·</span>
            {t.plan.avg} <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{avgKm.toFixed(0)} km</span>
          </div>
        </div>
        <span className="pill pill-soft-indigo">{t.plan.peakLabel} · W{peakWeek.week_number}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', marginTop: 6 }}>
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1].map((tv, i) => (
          <line key={i} x1={padX} x2={W - padX}
                y1={padTop + (H - padTop - padBot) * (1 - tv)}
                y2={padTop + (H - padTop - padBot) * (1 - tv)}
                stroke="#F1EFEC" strokeWidth="1" />
        ))}

        {/* Bars */}
        {weeks.map((wk, i) => {
          const color      = PHASE_COLORS[wk.phase] ?? '#94A3B8';
          const kmNum      = Number(wk.total_km);
          const isCurrent  = wk.week_number === current_week_number;
          const completed  = wk.week_number < current_week_number;
          const bw         = (innerW / n) - 4;
          const x          = padX + i * (innerW / n);
          const barH       = (kmNum / maxKm) * (H - padTop - padBot);
          const y          = H - padBot - barH;
          const showLabel  = i === 0 || (i + 1) % 4 === 0 || i === n - 1;

          return (
            <g key={wk.id}>
              <rect x={x + 2} y={y} width={bw} height={barH} rx="2"
                    fill={color}
                    opacity={isCurrent ? 1 : (completed ? 0.85 : 0.40)}
                    stroke={isCurrent ? '#fff' : 'none'}
                    strokeWidth={isCurrent ? 2 : 0} />
              {isCurrent && (
                <>
                  <rect x={x + 2 - 2} y={y - 4} width={bw + 4} height={barH + 8} rx="3"
                        fill="none" stroke={color} strokeWidth="1.5" />
                  <circle cx={x + 2 + bw / 2} cy={y - 8} r="2.5" fill={color} />
                </>
              )}
              {showLabel && (
                <text x={x + 2 + bw / 2} y={H - 10} textAnchor="middle"
                      fontFamily="Geist Mono, monospace" fontSize="9.5" fill="var(--muted)">
                  W{wk.week_number}
                </text>
              )}
            </g>
          );
        })}

        {/* Phase divider lines */}
        {phaseDividers.map(divIdx => {
          const x = padX + (divIdx / n) * innerW;
          return (
            <line key={divIdx} x1={x} x2={x} y1={padTop} y2={H - padBot}
                  stroke="#E7E5E4" strokeDasharray="2 3" />
          );
        })}
      </svg>

      {/* Phase legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {uniquePhases.map(phase => (
          <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: PHASE_COLORS[phase] }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{PHASE_LABELS[phase]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VolumeChart;
