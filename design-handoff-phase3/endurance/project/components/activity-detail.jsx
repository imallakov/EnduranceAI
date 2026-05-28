// Activity Detail page — cinematic hero + scientific dissection below.

// ── Map base (light/grayscale Berlin abstraction) ───────────────────
function MapBase() {
  // Streets — pre-computed positions for a quiet grid
  const hStreets = [40, 90, 140, 220, 300, 380, 450, 510];
  const vStreets = [80, 170, 260, 330, 420, 530, 640, 750, 860, 970, 1080, 1180];

  // A few abstract building blocks (light fill rects)
  const blocks = [
    // Below the park (south side, where streets would be denser)
    [80, 430, 140, 50], [240, 430, 110, 50], [370, 430, 130, 50],
    [520, 440, 100, 40], [640, 430, 130, 50], [790, 430, 90, 50],
    [900, 430, 140, 50], [1060, 430, 100, 50],
    // Above the park (north)
    [120, 30, 100, 40], [240, 30, 140, 40], [400, 30, 90, 40],
    [510, 30, 120, 40], [650, 30, 100, 40], [770, 30, 130, 40],
    [920, 30, 110, 40], [1050, 30, 120, 40],
  ];

  return (
    <svg
      viewBox="0 0 1280 560"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
        </filter>
        <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#312E81" />
        </linearGradient>
        <radialGradient id="heroVignette" cx="50%" cy="60%" r="80%">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </radialGradient>
      </defs>

      {/* Paper / base */}
      <rect width="1280" height="560" fill="#ECEAE4" />

      {/* Tiergarten — big park rectangle, slightly green-grey */}
      <rect x="120" y="100" width="940" height="320" rx="3" fill="#DCDED1" />
      {/* Inner park footpath polygons (very subtle) */}
      <path d="M 200 280 C 350 240, 500 320, 700 260 C 900 200, 1000 280, 1040 300" stroke="#D2D4C7" strokeWidth="1.6" fill="none" />
      <path d="M 180 200 C 320 230, 480 180, 660 220 C 820 256, 970 200, 1050 230" stroke="#D2D4C7" strokeWidth="1.6" fill="none" />

      {/* Spree river — flowing line above the page */}
      <path
        d="M -40 60 C 200 30, 420 90, 660 60 C 880 32, 1080 96, 1320 70"
        stroke="#D6DCE2"
        strokeWidth="26"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M -40 60 C 200 30, 420 90, 660 60 C 880 32, 1080 96, 1320 70"
        stroke="#CFD6DD"
        strokeWidth="1"
        fill="none"
      />

      {/* Lake in the south of the park — small */}
      <ellipse cx="780" cy="350" rx="60" ry="22" fill="#D6DCE2" />

      {/* Streets — horizontal */}
      <g stroke="#D8D5CE" strokeWidth="1.1">
        {hStreets.map((y) => <line key={`h${y}`} x1="0" y1={y} x2="1280" y2={y} />)}
      </g>
      <g stroke="#D8D5CE" strokeWidth="1.1">
        {vStreets.map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="560" />)}
      </g>

      {/* A couple of brighter primary roads */}
      <line x1="0" y1="430" x2="1280" y2="430" stroke="#CAC6BD" strokeWidth="2" />
      <line x1="660" y1="0" x2="660" y2="560" stroke="#CAC6BD" strokeWidth="2" />

      {/* Abstract building blocks */}
      <g fill="#E5E2DA">
        {blocks.map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="1" />
        ))}
      </g>

      {/* Brandenburger Tor marker — tiny landmark dot to anchor the map */}
      <g transform="translate(640 410)">
        <rect x="-10" y="-6" width="20" height="12" fill="#C9C5BB" rx="1" />
        <rect x="-7" y="-2" width="2" height="8" fill="#B9B5AB" />
        <rect x="-2" y="-2" width="2" height="8" fill="#B9B5AB" />
        <rect x="3" y="-2" width="2" height="8" fill="#B9B5AB" />
      </g>

      {/* Vignette */}
      <rect width="1280" height="560" fill="url(#heroVignette)" />

      {/* Route glow halo */}
      <path d={ROUTE_PATH} stroke="#4F46E5" strokeWidth="16" fill="none" opacity="0.30" filter="url(#routeGlow)" />
      <path d={ROUTE_PATH} stroke="#4F46E5" strokeWidth="10" fill="none" opacity="0.25" filter="url(#routeGlow)" />

      {/* Route line — gradient indigo */}
      <path d={ROUTE_PATH} stroke="url(#routeGrad)" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Start point */}
      <g>
        <circle cx={ROUTE_START.x} cy={ROUTE_START.y} r="9" fill="#fff" stroke="#4F46E5" strokeWidth="2" />
        <text x={ROUTE_START.x} y={ROUTE_START.y + 3.5} textAnchor="middle"
              style={{ fontSize: 9.5, fill: '#4F46E5', fontWeight: 700, fontFamily: 'Inter' }}>S</text>
      </g>
      {/* Finish point — slight indigo glow */}
      <g>
        <circle cx={ROUTE_FINISH.x + 20} cy={ROUTE_FINISH.y - 14} r="14" fill="#4F46E5" opacity="0.18" />
        <circle cx={ROUTE_FINISH.x + 20} cy={ROUTE_FINISH.y - 14} r="8" fill="#4F46E5" />
        <text x={ROUTE_FINISH.x + 20} y={ROUTE_FINISH.y - 10.5} textAnchor="middle"
              style={{ fontSize: 9.5, fill: '#fff', fontWeight: 700, fontFamily: 'Inter' }}>F</text>
      </g>
    </svg>
  );
}

// ── Manual-entry fallback hero background (no map) ──────────────────
function HeroNoGpsBg() {
  return (
    <svg viewBox="0 0 1280 560" preserveAspectRatio="xMidYMid slice"
         style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="noGpsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E1B4B" />
          <stop offset="1" stopColor="#2A2566" />
        </linearGradient>
        <pattern id="dotgrid" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#fff" opacity="0.05" />
        </pattern>
      </defs>
      <rect width="1280" height="560" fill="url(#noGpsGrad)" />
      <rect width="1280" height="560" fill="url(#dotgrid)" />
    </svg>
  );
}

// ── Cinematic hero ──────────────────────────────────────────────────
function CinematicHero({ noGps = false, onShare }) {
  const isLight = !noGps;
  const chipBg = isLight ? 'rgba(15, 23, 42, 0.78)' : 'rgba(15, 23, 42, 0.55)';
  const stackTextColor = isLight ? 'var(--text)' : '#fff';
  const stackTextMuted = isLight ? 'var(--muted)' : 'rgba(255,255,255,0.7)';
  const numberColor = isLight ? 'var(--primary)' : '#fff';

  // Soft white "card" plate under the bottom-left emotional stack so it stays legible on map
  const emoPlateBg = isLight
    ? 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 35%, #fff 100%)'
    : 'linear-gradient(180deg, rgba(30,27,75,0) 0%, rgba(30,27,75,0.7) 100%)';

  return (
    <div style={{
      position: 'relative', height: 560, borderRadius: 16, overflow: 'hidden',
      border: '1px solid var(--border)', background: '#ECEAE4',
    }}>
      {noGps ? <HeroNoGpsBg /> : <MapBase />}

      {/* Top-left chip */}
      <div style={{
        position: 'absolute', top: 22, left: 22,
        display: 'inline-flex', flexDirection: 'column', gap: 4,
        padding: '10px 14px', background: chipBg, color: '#fff', borderRadius: 10,
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{ACTIVITY_META.city}</span>
        <span className="mono" style={{ fontSize: 10.5, opacity: 0.78, letterSpacing: 0.2 }}>{ACTIVITY_META.dateLabel}</span>
      </div>

      {/* Top-right weather chip */}
      <div style={{
        position: 'absolute', top: 22, right: 22,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', background: chipBg, color: '#fff', borderRadius: 10,
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}>
        <IconCloud size={14} />
        <span className="mono" style={{ fontSize: 11.5, letterSpacing: 0.2 }}>{ACTIVITY_META.weather}</span>
      </div>

      {/* Bottom plate gradient for legibility */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 280,
        background: emoPlateBg, pointerEvents: 'none',
      }} />

      {/* Bottom-left emotional stack */}
      <div style={{ position: 'absolute', left: 32, bottom: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          color: 'var(--accent)',
        }}>Long run</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span className="mono" style={{
            fontSize: 96, fontWeight: 600, color: numberColor, letterSpacing: -3, lineHeight: 0.92,
          }}>
            {ACTIVITY_META.distanceKm}
          </span>
          <span className="mono" style={{
            fontSize: 22, fontWeight: 500, color: stackTextColor, letterSpacing: 0.5,
          }}>KM</span>
        </div>
        <div className="mono" style={{
          fontSize: 15, color: stackTextColor, marginTop: 4, letterSpacing: 0.2,
        }}>
          {ACTIVITY_META.totalTime}
          <span style={{ color: stackTextMuted, margin: '0 8px' }}>·</span>
          {ACTIVITY_META.pace} /km
          <span style={{ color: stackTextMuted, margin: '0 8px' }}>·</span>
          {ACTIVITY_META.hrAvg} bpm avg
        </div>
      </div>

      {/* Bottom-right share */}
      <div style={{
        position: 'absolute', right: 32, bottom: 28,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}>
        {noGps ? (
          <button className="btn btn-ghost" style={{ height: 44, padding: '0 18px', fontSize: 13.5, background: 'rgba(255,255,255,0.92)' }}>
            <IconRunner size={14} /> Add GPS later
          </button>
        ) : (
          <button className="btn btn-coral" onClick={onShare}
                  style={{ height: 44, padding: '0 20px', fontSize: 13.5, fontWeight: 600, boxShadow: '0 12px 28px -10px rgba(249,112,102,0.55)' }}>
            <IconExternal size={15} /> Share to story
          </button>
        )}
        <div className="mono" style={{
          fontSize: 11, color: isLight ? 'var(--muted)' : 'rgba(255,255,255,0.7)',
          letterSpacing: 0.3, textAlign: 'right',
        }}>
          VDOT {ACTIVITY_META.vdot} · TSS {ACTIVITY_META.tss} · best 21k in 60 days
        </div>
      </div>
    </div>
  );
}

// ── Stat strip (8 cells) ────────────────────────────────────────────
function StatStrip() {
  const cells = [
    { label: 'PACE',          value: '5:18',        suffix: '/km',  delta: null },
    { label: 'HR AVG / MAX',  value: '148 / 167',   suffix: 'bpm',  delta: null },
    { label: 'ELEV ↑ / ↓',    value: '+84 / −78',   suffix: 'm',    delta: null },
    { label: 'CADENCE',       value: '178',         suffix: 'spm',  delta: null },
    { label: 'VDOT (RUN)',    value: '47.1',        suffix: '',     delta: { text: 'best 30d', tone: 'success' } },
    { label: 'TSS',           value: '132',         suffix: '',     delta: null },
    { label: 'HR EFFICIENCY', value: '21.5',        suffix: 's/bpm',delta: { text: 'best 30d', tone: 'success' } },
    { label: 'SOURCE',        value: 'Garmin',      suffix: 'FIT',  delta: null },
  ];
  return (
    <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', minHeight: 96 }}>
      {cells.map((c, i) => (
        <div key={i} style={{
          padding: '16px 16px 14px',
          borderRight: i < cells.length - 1 ? '1px solid var(--border-soft)' : 'none',
          display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center',
        }}>
          <span className="label-sm" style={{ fontSize: 10.5 }}>{c.label}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span className="mono" style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.3, lineHeight: 1 }}>
              {c.value}
            </span>
            {c.suffix && <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.suffix}</span>}
          </div>
          {c.delta && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconArrowUp size={10} style={{ color: 'var(--success)' }} />
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--success)', fontWeight: 600 }}>{c.delta.text}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { CinematicHero, StatStrip, MapBase });
