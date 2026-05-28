// Linked charts + splits table + zones donut + insights.

// ── Linked stacked charts ───────────────────────────────────────────
function LinkedCharts({ data = SPLITS, height = 340, padL = 44, padR = 24 }) {
  // Layout: three sub-charts stacked. Each takes ~90px.
  const subH = 88;
  const gap = 16;
  const w = 1200;
  const totalH = subH * 3 + gap * 2 + 36; // 36 for top header row
  const iw = w - padL - padR;

  const [hover, setHover] = React.useState(null);
  const containerRef = React.useRef(null);
  const n = data.length;

  // Pace range (faster = smaller paceSec). Inverted Y: smaller paceSec → top
  const paceVals = data.map(d => d.paceSec);
  const paceMin = Math.min(...paceVals) - 4;
  const paceMax = Math.max(...paceVals) + 4;
  const avgPace = paceVals.reduce((a, b) => a + b, 0) / n;

  // HR range
  const hrVals = data.map(d => d.hr);
  const hrMin = Math.min(...hrVals) - 4;
  const hrMax = Math.max(...hrVals) + 4;

  // Elevation: cumulative altitude
  const elevVals = data.map(d => d.cumElev);
  const elevMin = Math.min(...elevVals) - 4;
  const elevMax = Math.max(...elevVals) + 4;

  const xAt = (i) => padL + (i / (n - 1)) * iw;

  const subYTop = (idx) => 36 + idx * (subH + gap);

  // Y mappers — inverted: smaller paceSec at top
  const paceYAt = (v, idx = 0) => {
    const top = subYTop(idx) + 8;
    const bot = subYTop(idx) + subH - 6;
    return top + ((v - paceMin) / (paceMax - paceMin)) * (bot - top);
  };
  const hrYAt = (v, idx = 1) => {
    const top = subYTop(idx) + 8;
    const bot = subYTop(idx) + subH - 6;
    return bot - ((v - hrMin) / (hrMax - hrMin)) * (bot - top);
  };
  const elevYAt = (v, idx = 2) => {
    const top = subYTop(idx) + 8;
    const bot = subYTop(idx) + subH - 6;
    return bot - ((v - elevMin) / (elevMax - elevMin)) * (bot - top);
  };

  const pacePath = data.map((d, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${paceYAt(d.paceSec).toFixed(1)}`).join(' ');
  const hrPath = data.map((d, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${hrYAt(d.hr).toFixed(1)}`).join(' ');
  const elevPath = data.map((d, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${elevYAt(d.cumElev).toFixed(1)}`).join(' ');
  const elevArea = `${elevPath} L ${xAt(n - 1)},${subYTop(2) + subH - 6} L ${xAt(0)},${subYTop(2) + subH - 6} Z`;

  // HR zone bands — backgrounds for HR chart
  const hrZoneBands = [
    { lo: 140, hi: 152, color: '#10B981' },  // Z2
    { lo: 152, hi: 162, color: '#F59E0B' },  // Z3
    { lo: 162, hi: 170, color: '#F97066' },  // Z4
  ];

  const onMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const scale = rect.width / w;
    const x = (e.clientX - rect.left) / scale;
    const i = Math.max(0, Math.min(n - 1, Math.round(((x - padL) / iw) * (n - 1))));
    setHover({ i, x: xAt(i) });
  };

  // X ticks
  const xTicks = [0, 5, 10, 15, 20];

  return (
    <div className="card" style={{ padding: 20, height }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="label-sm">Detail · pace, heart rate, elevation</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          Hover anywhere to scrub
        </div>
      </div>
      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <svg
          width="100%" viewBox={`0 0 ${w} ${totalH}`} style={{ display: 'block' }}
          onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        >
          {/* Inline sub-titles */}
          <text x={padL} y={20} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, fill: '#64748B', textTransform: 'uppercase', fontFamily: 'Inter' }}>PACE</text>
          <text x={padL + 50} y={20} style={{ fontSize: 9.5, fill: '#94A3B8', fontFamily: 'Inter', letterSpacing: 0.4 }}>faster ↑</text>
          <text x={padL} y={20 + (subH + gap)} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, fill: '#64748B', textTransform: 'uppercase', fontFamily: 'Inter' }}>HR</text>
          <text x={padL} y={20 + 2 * (subH + gap)} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, fill: '#64748B', textTransform: 'uppercase', fontFamily: 'Inter' }}>ELEVATION</text>

          {/* === PACE chart === */}
          {/* Dotted avg line */}
          <line x1={padL} x2={w - padR} y1={paceYAt(avgPace)} y2={paceYAt(avgPace)}
                stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
          <text x={w - padR - 4} y={paceYAt(avgPace) - 4} textAnchor="end"
                style={{ fontSize: 9.5, fill: '#64748B', fontFamily: 'Geist Mono' }}>
            avg 5:18
          </text>
          <path d={pacePath} fill="none" stroke="#4F46E5" strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />

          {/* === HR chart with zone bands === */}
          {hrZoneBands.map((b, i) => {
            if (b.lo > hrMax || b.hi < hrMin) return null;
            const top = hrYAt(Math.min(b.hi, hrMax), 1);
            const bot = hrYAt(Math.max(b.lo, hrMin), 1);
            return <rect key={i} x={padL} y={top} width={iw} height={Math.max(0, bot - top)} fill={b.color} opacity="0.06" />;
          })}
          <path d={hrPath} fill="none" stroke="#F97066" strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />

          {/* === Elevation === */}
          <path d={elevArea} fill="#64748B" opacity="0.10" />
          <path d={elevPath} fill="none" stroke="#64748B" strokeWidth="1.5"
                strokeLinejoin="round" strokeLinecap="round" />

          {/* Y baselines (subtle) */}
          {[0, 1, 2].map(idx => (
            <line key={idx} x1={padL} x2={w - padR}
                  y1={subYTop(idx) + subH - 6} y2={subYTop(idx) + subH - 6}
                  stroke="#E7E5E4" strokeWidth="1" />
          ))}

          {/* X-axis ticks */}
          {xTicks.map(k => {
            const i = Math.min(n - 1, k);
            return (
              <text key={k} x={xAt(i)} y={totalH - 4} textAnchor="middle"
                    style={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Geist Mono' }}>
                {k} km
              </text>
            );
          })}

          {/* Crosshair */}
          {hover && (
            <g pointerEvents="none">
              <line x1={hover.x} x2={hover.x} y1={36} y2={subYTop(2) + subH - 6}
                    stroke="#1E1B4B" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
              <circle cx={hover.x} cy={paceYAt(data[hover.i].paceSec)} r="3.5" fill="#fff" stroke="#4F46E5" strokeWidth="2" />
              <circle cx={hover.x} cy={hrYAt(data[hover.i].hr)} r="3.5" fill="#fff" stroke="#F97066" strokeWidth="2" />
              <circle cx={hover.x} cy={elevYAt(data[hover.i].cumElev)} r="3" fill="#fff" stroke="#64748B" strokeWidth="2" />
            </g>
          )}
        </svg>

        {hover && (
          <div className="chart-tooltip mono" style={{
            left: `${(hover.x / w) * 100}%`,
            top: 4,
          }}>
            <span>KM {data[hover.i].km}.0</span>
            <span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>
            <span>{data[hover.i].pace} /km</span>
            <span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>
            <span>{data[hover.i].hr} bpm</span>
            <span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>
            <span>{data[hover.i].cumElev}m</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Splits table ────────────────────────────────────────────────────
function SplitsTable({ data = SPLITS }) {
  const maxDelta = 15; // ±15 sec range
  const barHalf = 56;  // px each side of center

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

      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '28px 50px 64px 1fr 64px 56px 56px',
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
        <span className="label-sm" style={{ fontSize: 10, textAlign: 'right' }}>HR</span>
        <span className="label-sm" style={{ fontSize: 10, textAlign: 'right' }}>ELEV</span>
        <span className="label-sm" style={{ fontSize: 10, textAlign: 'right' }}>Δ KM</span>
      </div>

      <div className="nice-scroll" style={{ maxHeight: 660, overflow: 'auto' }}>
        {data.map((s, i) => {
          const isBest = i === bestIdx;
          const isWorst = i === worstIdx;
          const ribbon = isBest ? 'var(--success)' : isWorst ? 'var(--accent)' : null;

          const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, s.deltaToAvg));
          const barLen = (Math.abs(clampedDelta) / maxDelta) * barHalf;
          const barRight = clampedDelta < 0;  // faster than avg = bar to right (indigo)

          const dToPrev = s.deltaToPrev;
          const dArrow = i === 0 ? null : dToPrev < 0 ? IconArrowDown : dToPrev > 0 ? IconArrowUp : IconArrowFlat;
          const dColor = i === 0 ? 'var(--muted)' : dToPrev < 0 ? 'var(--success)' : dToPrev > 0 ? 'var(--accent)' : 'var(--muted)';

          return (
            <div key={i} className="act-row" style={{
              display: 'grid',
              gridTemplateColumns: '28px 50px 64px 1fr 64px 56px 56px',
              padding: '0 18px',
              height: 40,
              alignItems: 'center',
              columnGap: 12,
              borderBottom: i < data.length - 1 ? '1px solid var(--border-soft)' : 'none',
              position: 'relative',
            }}>
              {ribbon && (
                <span style={{
                  position: 'absolute', left: 0, top: 6, bottom: 6, width: 3,
                  background: ribbon, borderRadius: 2,
                }} />
              )}
              <span className="mono" style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{s.km}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{s.cumTime}</span>
              <span className="mono" style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600 }}>{s.pace}</span>

              {/* Pace delta bar */}
              <div style={{ display: 'flex', alignItems: 'center', height: 16, position: 'relative' }}>
                {/* Center line */}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />
                {/* Bar */}
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
                {/* Numeric */}
                <span className="mono" style={{
                  position: 'absolute',
                  left: barRight ? `calc(50% + ${barLen}px + 6px)` : `calc(50% - ${barLen}px - 6px)`,
                  transform: barRight ? 'translateX(0)' : 'translateX(-100%)',
                  fontSize: 10.5,
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                }}>
                  {clampedDelta > 0 ? '+' : ''}{Math.round(clampedDelta)}s
                </span>
              </div>

              <span className="mono" style={{ fontSize: 12, color: 'var(--text)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: 3, background: ZONE_COLOR[s.zone] }} />
                {s.hr}
              </span>
              <span className="mono" style={{ fontSize: 12, color: s.elev > 0 ? 'var(--text)' : 'var(--muted)', textAlign: 'right' }}>
                {s.elev > 0 ? '+' : ''}{s.elev}m
              </span>
              <span className="mono" style={{ fontSize: 11.5, color: dColor, textAlign: 'right', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                {dArrow && React.createElement(dArrow, { size: 10 })}
                {i === 0 ? '—' : `${Math.abs(dToPrev)}s`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Zones donut ─────────────────────────────────────────────────────
function ZonesDonut() {
  const data = ZONE_TIME;
  const total = data.reduce((a, b) => a + b.sec, 0);
  const size = 180, stroke = 22;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div className="label-sm">Time in zone</div>

      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginTop: 4 }}>
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1EFEC" strokeWidth={stroke} />
          {data.map((d, i) => {
            const frac = d.sec / total;
            const dash = circ * frac - 2; // 2px gap between segments
            const el = (
              <circle
                key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={d.color} strokeWidth={stroke}
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
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <span className="mono" style={{ fontSize: 24, fontWeight: 600, color: 'var(--primary)', letterSpacing: -0.5, lineHeight: 1 }}>
            {ACTIVITY_META.totalTime}
          </span>
          <span style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4, letterSpacing: 0.3 }}>
            avg HR <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{ACTIVITY_META.hrAvg}</span>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
        {data.map((d, i) => {
          const pct = Math.round((d.sec / total) * 100);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '10px 84px 1fr 44px 36px', alignItems: 'center', columnGap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: d.color }} />
              <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 500 }}>
                <span className="mono" style={{ color: 'var(--muted)', marginRight: 5 }}>{d.zone}</span>
                {d.label}
              </span>
              <div style={{ height: 5, background: '#F1EFEC', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: 3 }} />
              </div>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600, textAlign: 'right' }}>
                {fmtTime(d.sec)}
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Coach insights ──────────────────────────────────────────────────
function CoachInsights() {
  const cards = [
    {
      label: 'HR efficiency',
      value: '21.5',
      suffix: 's/bpm',
      sub: <span><IconArrowUp size={11} style={{ color: 'var(--success)' }} /> <span className="mono" style={{ color: 'var(--success)', fontWeight: 600 }}>best in 30 days</span></span>,
      explanation: 'Pace held per bpm. Higher = more aerobic economy.',
    },
    {
      label: 'Pace decoupling',
      value: '+2.3',
      suffix: '%',
      sub: <span style={{ color: 'var(--muted)' }}>slight cardiac drift · within target</span>,
      explanation: 'Pace:HR ratio drift, first half vs second half.',
    },
    {
      label: 'Aerobic threshold',
      value: '152',
      suffix: 'bpm',
      sub: <span style={{ color: 'var(--muted)' }}>Z2 / Z3 boundary · 7d rolling</span>,
      explanation: 'Highest HR sustaining stable lactate.',
    },
  ];
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '14px 22px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="label-sm">Analysis</div>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>3 signals · Daniels + EnduranceAI</span>
      </div>
      <div style={{ height: 1, background: 'var(--border)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            padding: '18px 22px 20px',
            borderRight: i < cards.length - 1 ? '1px solid var(--border-soft)' : 'none',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <span className="label-sm" style={{ fontSize: 10.5 }}>{c.label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span className="mono" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.8, lineHeight: 1 }}>
                {c.value}
              </span>
              <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.suffix}</span>
            </div>
            <div style={{ fontSize: 11.5, marginTop: 2 }}>{c.sub}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 4, lineHeight: 1.4 }}>{c.explanation}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { LinkedCharts, SplitsTable, ZonesDonut, CoachInsights });
