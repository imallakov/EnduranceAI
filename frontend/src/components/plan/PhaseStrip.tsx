import React, { useId } from 'react';
import type { TrainingPlan, PlanPhase } from '../../types/api';
import { useT } from '../../i18n/context';

const PHASES: Array<{
  id: PlanPhase;
  label: string;
  color: string;
  weeks: [number, number];
  ratio: number;
  desc: string;
}> = [
  { id: 'base',          label: 'Base',          color: '#4F46E5', weeks: [1, 3],   ratio: 0.20, desc: 'Aerobic foundation' },
  { id: 'early_quality', label: 'Early Quality', color: '#818CF8', weeks: [4, 7],   ratio: 0.25, desc: 'Introduce Tempo + Long' },
  { id: 'late_quality',  label: 'Late Quality',  color: '#F59E0B', weeks: [8, 12],  ratio: 0.30, desc: 'Add VO2max intervals' },
  { id: 'taper',         label: 'Taper',         color: '#10B981', weeks: [13, 16], ratio: 0.25, desc: 'Sharpen, reduce volume' },
];

function phaseRangesFromWeeks(_totalWeeks: number, weeks: TrainingPlan['weeks']) {
  const phaseWeekMap: Record<PlanPhase, [number, number]> = {
    base: [0, 0], early_quality: [0, 0], late_quality: [0, 0], taper: [0, 0],
  };
  weeks.forEach(w => {
    const p = w.phase;
    if (!phaseWeekMap[p][0] || w.week_number < phaseWeekMap[p][0]) phaseWeekMap[p][0] = w.week_number;
    if (w.week_number > phaseWeekMap[p][1]) phaseWeekMap[p][1] = w.week_number;
  });
  return phaseWeekMap;
}

interface PhaseStripProps {
  plan: TrainingPlan;
}

const PhaseStrip: React.FC<PhaseStripProps> = ({ plan }) => {
  const uid = useId();
  const t = useT();
  const { current_week_number, total_weeks, plan_total_km, total_distance_km_completed, days_to_race, weeks } = plan;

  const totalWeeks = total_weeks || 16;
  const currentWeek = current_week_number || 1;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(1000);

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

  const isMob = W < 600;
  const padX = isMob ? 16 : 36;
  const stripY = 88;
  const stripH = 14;
  const innerW = W - padX * 2;

  const phaseWeekMap = phaseRangesFromWeeks(totalWeeks, weeks);

  let cursor = padX;
  const phaseRanges = PHASES.map(p => {
    const actualW0 = phaseWeekMap[p.id][0] || p.weeks[0];
    const actualW1 = phaseWeekMap[p.id][1] || p.weeks[1];
    const actualRatio = (actualW1 - actualW0 + 1) / totalWeeks;
    const w = innerW * actualRatio;
    const start = cursor;
    cursor += w;
    const volume = weeks
      .filter(wk => wk.phase === p.id)
      .reduce((sum, wk) => sum + Number(wk.total_km), 0);
    return { ...p, x: start, w, mid: start + w / 2, weeks: [actualW0, actualW1] as [number, number], volume: Math.round(volume) };
  });

  const cwX = padX + innerW * ((currentWeek - 0.5) / totalWeeks);
  const cwPhase = phaseRanges.find(p => currentWeek >= p.weeks[0] && currentWeek <= p.weeks[1]) ?? phaseRanges[0];
  const currentWeekKm = weeks.find(w => w.week_number === currentWeek);

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)',
      borderRadius: 16, padding: isMob ? '20px 16px' : '24px 32px', height: 220,
      overflow: 'hidden', color: '#fff',
    }}>
      {/* Radial wash behind current week dot */}
      <div style={{
        position: 'absolute',
        left: `${(cwX / W) * 100}%`, top: '50%',
        width: 480, height: 480, transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(165,180,252,0.10) 0%, rgba(79,70,229,0) 60%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
            {t.plan.phaseProgression}
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.2 }}>{cwPhase.label}</span>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>
              {t.plan.kpiWeek} <span className="mono" style={{ color: '#fff' }}>{currentWeek}</span> {t.plan.of} <span className="mono">{totalWeeks}</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              {cwPhase.desc}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: isMob ? 12 : 22 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: isMob ? 10 : 11, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4, textTransform: 'uppercase' }}>{isMob ? 'Done' : t.plan.distanceRun}</div>
            <div className="mono" style={{ fontSize: isMob ? 14 : 18, fontWeight: 600, marginTop: 4 }}>
              {Math.round(total_distance_km_completed)}{' '}
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMob ? 11 : 13 }}>/ {Math.round(plan_total_km)} km</span>
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: isMob ? 10 : 11, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4, textTransform: 'uppercase' }}>{isMob ? 'Race' : t.plan.toRace}</div>
            <div className="mono" style={{ fontSize: isMob ? 14 : 18, fontWeight: 600, marginTop: 4 }}>
              {days_to_race}{' '}
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMob ? 11 : 13 }}>{t.plan.days}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG strip */}
      <svg viewBox={`0 0 ${W} 170`} width="100%" height={220 - 64} style={{ display: 'block', marginTop: 8, overflow: 'visible' }}>
        <defs>
          <filter id={`${uid}-glowBig`}   x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26" /></filter>
          <filter id={`${uid}-glowMid`}   x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16" /></filter>
          <filter id={`${uid}-glowTight`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"  /></filter>
        </defs>

        {/* Phase labels above strip */}
        {phaseRanges.map(p => {
          const shortLabel = p.label === 'Early Quality' ? 'E. Qual' : p.label === 'Late Quality' ? 'L. Qual' : p.label;
          return (
          <g key={p.id}>
            <circle cx={p.x + (isMob ? 4 : 7)} cy={stripY - 30} r="3.5" fill={p.color} />
            <text x={p.x + (isMob ? 11 : 17)} y={stripY - 26} fontFamily="Inter, sans-serif" fontSize={isMob ? "11" : "12.5"} fontWeight="600" fill="#fff">{isMob ? shortLabel : p.label}</text>
            <text x={p.x + (isMob ? 11 : 17)} y={stripY - 11} fontFamily="Geist Mono, monospace" fontSize={isMob ? "9.5" : "10.5"} fill="rgba(255,255,255,0.5)">
              W{p.weeks[0]}–{p.weeks[1]}{isMob ? '' : ` · ${p.volume} km`}
            </text>
          </g>
          );
        })}

        {/* Background track */}
        <rect x={padX - 2} y={stripY - 1} width={innerW + 4} height={stripH + 2}
              rx={(stripH + 2) / 2} fill="rgba(255,255,255,0.04)" />

        {/* Phase bands */}
        {phaseRanges.map((p, i) => {
          const finished  = currentWeek > p.weeks[1];
          const upcoming  = currentWeek < p.weeks[0];
          const opacity   = finished ? 0.95 : upcoming ? 0.30 : 1;
          const r0 = i === 0 ? stripH / 2 : 0;
          const r1 = i === phaseRanges.length - 1 ? stripH / 2 : 0;
          const x0 = p.x, x1 = p.x + p.w;
          const d = `M ${x0 + r0} ${stripY} L ${x1 - r1} ${stripY} Q ${x1} ${stripY} ${x1} ${stripY + (r1 ? stripH / 2 : 0)} L ${x1} ${stripY + stripH - (r1 ? stripH / 2 : 0)} Q ${x1} ${stripY + stripH} ${x1 - r1} ${stripY + stripH} L ${x0 + r0} ${stripY + stripH} Q ${x0} ${stripY + stripH} ${x0} ${stripY + stripH - (r0 ? stripH / 2 : 0)} L ${x0} ${stripY + (r0 ? stripH / 2 : 0)} Q ${x0} ${stripY} ${x0 + r0} ${stripY} Z`;
          return <path key={p.id} d={d} fill={p.color} opacity={opacity} />;
        })}

        {/* Tick marks */}
        {Array.from({ length: totalWeeks }, (_, i) => {
          const x = padX + innerW * ((i + 0.5) / totalWeeks);
          if (i + 1 === currentWeek) return null;
          const isPast = i + 1 < currentWeek;
          return (
            <line key={i} x1={x} y1={stripY - 4} x2={x} y2={stripY + stripH + 4}
                  stroke={isPast ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'}
                  strokeWidth="1" />
          );
        })}

        {/* Glow stack at current week */}
        <g>
          <circle cx={cwX} cy={stripY + stripH / 2} r="22" fill="#4F46E5" opacity="0.40" filter={`url(#${uid}-glowBig)`}   />
          <circle cx={cwX} cy={stripY + stripH / 2} r="14" fill="#818CF8" opacity="0.55" filter={`url(#${uid}-glowMid)`}   />
          <circle cx={cwX} cy={stripY + stripH / 2} r="8"  fill="#A5B4FC" opacity="0.75" filter={`url(#${uid}-glowTight)`} />
          <circle cx={cwX} cy={stripY + stripH / 2} r="6"  fill="#fff" />
        </g>

        {/* YOU ARE HERE label */}
        <text x={cwX} y={stripY + stripH + 28} textAnchor="middle"
              fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" fill="#fff" letterSpacing="0.5">
          {t.plan.youAreHere}
        </text>
        <text x={cwX} y={stripY + stripH + 44} textAnchor="middle"
              fontFamily="Geist Mono, monospace" fontSize="11" fill="rgba(255,255,255,0.55)">
          W{currentWeek}{currentWeekKm ? ` · ${Number(currentWeekKm.total_km).toFixed(0)} km` : ''}
        </text>

        {/* Race terminus */}
        <circle cx={padX + innerW} cy={stripY + stripH / 2} r="5.5" fill="#F97066" stroke="#fff" strokeWidth="1.5" />
        <text x={padX + innerW + 14} y={stripY + stripH / 2 + 4}
              fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" fill="#F97066">
          {t.plan.race}
        </text>
      </svg>
    </div>
  );
};

export { PHASES };
export default PhaseStrip;
