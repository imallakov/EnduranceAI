// Chart primitives — pure SVG, no deps.

// ── Realistic 84-day CTL/ATL/TSB time series ────────────────────────
function genFitnessSeries() {
  const days = 84;
  // Daily TSS — varies, weekly long run, occasional rest
  const rnd = (seed => () => {
    seed = (seed * 9301 + 49297) % 233280; return seed / 233280;
  })(7);
  const tss = [];
  for (let i = 0; i < days; i++) {
    const dow = i % 7;
    let v;
    if (dow === 0) v = 95 + rnd() * 35;          // Sunday long run
    else if (dow === 6) v = 0;                    // Saturday rest
    else if (dow === 3) v = 80 + rnd() * 20;     // Wed quality
    else if (dow === 1) v = 0 + (rnd() < 0.3 ? 30 : 0);
    else v = 40 + rnd() * 30;
    // Slow progressive overload
    v *= 0.85 + (i / days) * 0.45;
    // Cutback week every 4th
    if (Math.floor(i / 7) % 4 === 3) v *= 0.65;
    tss.push(v);
  }
  // CTL: 42-day EMA, ATL: 7-day EMA, TSB = CTL - ATL
  const ctl = [], atl = [];
  let cPrev = 35, aPrev = 30;
  const kC = 2 / (42 + 1), kA = 2 / (7 + 1);
  for (const t of tss) {
    cPrev = (t - cPrev) * kC + cPrev;
    aPrev = (t - aPrev) * kA + aPrev;
    ctl.push(cPrev);
    atl.push(aPrev);
  }
  return ctl.map((c, i) => ({
    day: i, ctl: c, atl: atl[i], tsb: c - atl[i],
  }));
}

const SERIES = genFitnessSeries();

// ── Line chart ───────────────────────────────────────────────────────
function LineChart({ width = 720, height = 240, data = SERIES, padding = { t: 12, r: 16, b: 28, l: 36 } }) {
  const [hover, setHover] = React.useState(null);
  const w = width, h = height;
  const iw = w - padding.l - padding.r;
  const ih = h - padding.t - padding.b;

  // Domains
  const yMin = -30, yMax = 80;
  const n = data.length;

  const xAt = (i) => padding.l + (i / (n - 1)) * iw;
  const yAt = (v) => padding.t + (1 - (v - yMin) / (yMax - yMin)) * ih;
  const yZero = yAt(0);

  const pathFor = (key) => data.map((d, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(2)},${yAt(d[key]).toFixed(2)}`).join(' ');

  // Gridlines
  const yTicks = [-25, 0, 25, 50, 75];
  const xTickIdx = [0, 14, 28, 42, 56, 70, 83];
  const today = new Date('2026-05-20');
  const dateAt = (i) => {
    const d = new Date(today); d.setDate(today.getDate() - (n - 1 - i)); return d;
  };
  const dateLabel = (d) => `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const i = Math.max(0, Math.min(n - 1, Math.round(((x - padding.l) / iw) * (n - 1))));
    setHover({ i, x: xAt(i), y: yAt(data[i].ctl) });
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
           onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {/* Y gridlines */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={padding.l} x2={w - padding.r} y1={yAt(t)} y2={yAt(t)}
                  stroke={t === 0 ? '#D6D3D1' : '#F1EFEC'} strokeWidth="1"
                  strokeDasharray={t === 0 ? '' : ''} />
            <text x={padding.l - 8} y={yAt(t) + 3} textAnchor="end"
                  style={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Geist Mono, monospace' }}>{t}</text>
          </g>
        ))}
        {/* X labels */}
        {xTickIdx.map(i => (
          <text key={i} x={xAt(i)} y={h - 8} textAnchor="middle"
                style={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
            {dateLabel(dateAt(i))}
          </text>
        ))}

        {/* TSB baseline fill — soft */}
        <path d={`${pathFor('tsb')} L ${xAt(n - 1)},${yZero} L ${xAt(0)},${yZero} Z`}
              fill="#10B981" opacity="0.06" />

        {/* CTL — solid Indigo Mid */}
        <path d={pathFor('ctl')} fill="none" stroke="#4F46E5" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" />
        {/* ATL — dashed Coral */}
        <path d={pathFor('atl')} fill="none" stroke="#F97066" strokeWidth="2"
              strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
        {/* TSB — emerald, thinner */}
        <path d={pathFor('tsb')} fill="none" stroke="#10B981" strokeWidth="1.5"
              strokeLinejoin="round" strokeLinecap="round" />

        {/* Endpoint dots */}
        <circle cx={xAt(n - 1)} cy={yAt(data[n - 1].ctl)} r="3.5" fill="#4F46E5" />
        <circle cx={xAt(n - 1)} cy={yAt(data[n - 1].atl)} r="3.5" fill="#F97066" />
        <circle cx={xAt(n - 1)} cy={yAt(data[n - 1].tsb)} r="3" fill="#10B981" />

        {/* Hover crosshair */}
        {hover && (
          <g>
            <line x1={hover.x} x2={hover.x} y1={padding.t} y2={h - padding.b}
                  stroke="#1E1B4B" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <circle cx={hover.x} cy={yAt(data[hover.i].ctl)} r="3.5" fill="#fff" stroke="#4F46E5" strokeWidth="2" />
            <circle cx={hover.x} cy={yAt(data[hover.i].atl)} r="3.5" fill="#fff" stroke="#F97066" strokeWidth="2" />
            <circle cx={hover.x} cy={yAt(data[hover.i].tsb)} r="3" fill="#fff" stroke="#10B981" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover && (
        <div className="chart-tooltip mono" style={{
          left: `${(hover.x / w) * 100}%`,
          top: `${(yAt(data[hover.i].ctl) / h) * 100}%`,
        }}>
          <div style={{ fontFamily: 'Inter', fontSize: 10, opacity: 0.7, marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {dateLabel(dateAt(hover.i))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 12, rowGap: 2 }}>
            <span style={{ color: '#A5B4FC' }}>CTL</span><span>{data[hover.i].ctl.toFixed(1)}</span>
            <span style={{ color: '#FCA5A5' }}>ATL</span><span>{data[hover.i].atl.toFixed(1)}</span>
            <span style={{ color: '#6EE7B7' }}>TSB</span><span>{data[hover.i].tsb >= 0 ? '+' : ''}{data[hover.i].tsb.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Radial semicircle gauge ──────────────────────────────────────────
function RadialGauge({ value = 72, size = 220, stroke = 16, label }) {
  // Semicircle from -180° to 0° (left to right)
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = Math.PI * r;        // half circumference
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const dash = circ * pct;
  const gap = circ - dash;

  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
      {/* Track */}
      <path d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
            fill="none" stroke="#F1EFEC" strokeWidth={stroke} strokeLinecap="round" />
      {/* Fill — gradient indigo */}
      <defs>
        <linearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#1E1B4B" />
        </linearGradient>
      </defs>
      <path d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
            fill="none" stroke="url(#gaugeFill)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`} />
      {/* Tick marks every 10 */}
      {Array.from({ length: 11 }).map((_, i) => {
        const a = Math.PI + (i / 10) * Math.PI;
        const r1 = r - stroke / 2 - 4, r2 = r1 - 5;
        const x1 = cx + r1 * Math.cos(a), y1 = cy + r1 * Math.sin(a);
        const x2 = cx + r2 * Math.cos(a), y2 = cy + r2 * Math.sin(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                     stroke="#D6D3D1" strokeWidth="1" />;
      })}
    </svg>
  );
}

// ── Sparkline (small) ────────────────────────────────────────────────
function Sparkline({ values, width = 100, height = 28, color = '#4F46E5', fill = false }) {
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const n = values.length;
  const xAt = (i) => (i / (n - 1)) * width;
  const yAt = (v) => height - 2 - ((v - min) / range) * (height - 4);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`).join(' ');
  const fillD = `${d} L ${width},${height} L 0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fill && <path d={fillD} fill={color} opacity="0.08" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xAt(n - 1)} cy={yAt(values[n - 1])} r="2" fill={color} />
    </svg>
  );
}

// ── Bar mini (component score bars) ──────────────────────────────────
function ComponentBar({ label, score, color = '#4F46E5' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '108px 1fr 28px', alignItems: 'center', columnGap: 12, padding: '5px 0' }}>
      <div style={{ fontSize: 12.5, color: '#475569', fontWeight: 500 }}>{label}</div>
      <div style={{ height: 6, background: '#F1EFEC', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', textAlign: 'right' }}>{score}</div>
    </div>
  );
}

// ── Elevation profile for alt direction ─────────────────────────────
function ElevationProfile({ width = 480, height = 70 }) {
  // Synthetic Berlin profile — flat with mild undulations
  const pts = [];
  let h = 35;
  for (let i = 0; i <= 60; i++) {
    h += (Math.sin(i * 0.4) + Math.cos(i * 0.27)) * 1.2;
    pts.push({ x: (i / 60) * width, y: 50 - (h - 30) * 0.6 });
  }
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={`${d} L ${width},${height} L 0,${height} Z`} fill="#4F46E5" opacity="0.08" />
      <path d={d} fill="none" stroke="#4F46E5" strokeWidth="1.5" />
    </svg>
  );
}

Object.assign(window, { LineChart, RadialGauge, Sparkline, ComponentBar, ElevationProfile, SERIES });
