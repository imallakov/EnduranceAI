// Activity Detail page — cinematic hero + scientific dissection below.

// ── Map base — DARK cinematic, route is the only luminous element ──
function MapBase() {
  // Sparse, near-invisible city streets (just 5% lighter than bg)
  const hStreets = [60, 130, 220, 300, 460];
  const vStreets = [220, 360, 520, 700, 880, 1040];

  return (
    <svg
      viewBox="0 0 1280 560"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id="heroDarkBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E1B4B" />
          <stop offset="1" stopColor="#2A2566" />
        </linearGradient>
        <radialGradient id="routeDepthGlow" cx="50%" cy="55%" r="55%">
          <stop offset="0" stopColor="#4F46E5" stopOpacity="0.20" />
          <stop offset="0.55" stopColor="#4F46E5" stopOpacity="0.06" />
          <stop offset="1" stopColor="#4F46E5" stopOpacity="0" />
        </radialGradient>
        <filter id="glowBig" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <filter id="glowMid" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="glowTight" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* Dark gradient base */}
      <rect width="1280" height="560" fill="url(#heroDarkBg)" />

      {/* Tiergarten park area — just barely visible */}
      <rect x="120" y="100" width="940" height="340" rx="2" fill="#252257" />

      {/* River Spree — very faint */}
      <path
        d="M -40 60 C 200 30, 420 90, 660 60 C 880 32, 1080 96, 1320 70"
        stroke="#2A2D5A"
        strokeWidth="24"
        fill="none"
        strokeLinecap="round"
      />

      {/* Pond inside park */}
      <ellipse cx="780" cy="354" rx="58" ry="22" fill="#2A2D5A" />

      {/* Near-invisible street grid */}
      <g stroke="#2D2A5C" strokeWidth="1">
        {hStreets.map((y) => <line key={`h${y}`} x1="0" y1={y} x2="1280" y2={y} />)}
        {vStreets.map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="560" />)}
      </g>

      {/* Brandenburger Tor — tiny landmark, very faint */}
      <g transform="translate(640 408)" opacity="0.65">
        <rect x="-9" y="-5" width="18" height="10" fill="#34306E" rx="1" />
      </g>

      {/* Radial depth glow behind the route */}
      <rect width="1280" height="560" fill="url(#routeDepthGlow)" />

      {/* ── ROUTE — four-layer luminescent bloom ───────────────── */}
      {/* Layer 1: outermost halo */}
      <polyline
        points={ROUTE_POINTS}
        fill="none" stroke="#4F46E5" strokeWidth="44" opacity="0.40"
        strokeLinejoin="round" strokeLinecap="round" filter="url(#glowBig)"
      />
      {/* Layer 2 */}
      <polyline
        points={ROUTE_POINTS}
        fill="none" stroke="#818CF8" strokeWidth="28" opacity="0.50"
        strokeLinejoin="round" strokeLinecap="round" filter="url(#glowMid)"
      />
      {/* Layer 3 */}
      <polyline
        points={ROUTE_POINTS}
        fill="none" stroke="#A5B4FC" strokeWidth="14" opacity="0.65"
        strokeLinejoin="round" strokeLinecap="round" filter="url(#glowTight)"
      />
      {/* Layer 4: crisp top */}
      <polyline
        points={ROUTE_POINTS}
        fill="none" stroke="#FFFFFF" strokeWidth="4" opacity="1"
        strokeLinejoin="round" strokeLinecap="round"
      />

      {/* Start point — small white dot with indigo ring */}
      <circle cx={ROUTE_START.x} cy={ROUTE_START.y} r="11" fill="#1E1B4B" stroke="#fff" strokeWidth="2" />
      <text x={ROUTE_START.x} y={ROUTE_START.y + 3.5} textAnchor="middle"
            style={{ fontSize: 9.5, fill: '#fff', fontWeight: 700, fontFamily: 'Inter' }}>S</text>

      {/* Finish point — luminous coral so it pops against indigo */}
      <circle cx={ROUTE_FINISH.x} cy={ROUTE_FINISH.y} r="18" fill="#F97066" opacity="0.30" filter="url(#glowTight)" />
      <circle cx={ROUTE_FINISH.x} cy={ROUTE_FINISH.y} r="9" fill="#F97066" stroke="#fff" strokeWidth="1.5" />
      <text x={ROUTE_FINISH.x} y={ROUTE_FINISH.y + 3.5} textAnchor="middle"
            style={{ fontSize: 9.5, fill: '#fff', fontWeight: 700, fontFamily: 'Inter' }}>F</text>
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
  return (
    <div style={{
      position: 'relative', height: 560, borderRadius: 16, overflow: 'hidden',
      border: '1px solid var(--primary)',
      background: '#1E1B4B',
      boxShadow: '0 24px 60px -20px rgba(30, 27, 75, 0.35)',
    }}>
      {noGps ? <HeroNoGpsBg /> : <MapBase />}

      {/* Top-left wordmark — the only top chrome */}
      <div style={{
        position: 'absolute', top: 24, left: 28,
        display: 'inline-flex', alignItems: 'center', gap: 9,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 18 C 7 6, 13 6, 17 14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="19.5" cy="16" r="2.2" fill="#F97066" />
        </svg>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', letterSpacing: -0.1 }}>EnduranceAI</span>
      </div>

      {/* Bottom-left emotional stack */}
      <div style={{
        position: 'absolute', left: 48, bottom: 56,
        display: 'flex', flexDirection: 'column',
      }}>
        <span style={{
          fontSize: 14, fontWeight: 700, color: '#F97066',
          letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16,
        }}>Long run</span>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span className="mono" style={{
            fontSize: 140, fontWeight: 700, color: '#FFFFFF',
            letterSpacing: -5, lineHeight: 0.88,
            textShadow: '0 12px 48px rgba(0,0,0,0.45)',
          }}>
            {noGps ? ACTIVITY_META.distanceKm : ACTIVITY_META.distanceKm}
          </span>
          <span className="mono" style={{
            fontSize: 32, fontWeight: 500, color: '#A5B4FC', letterSpacing: 0.5,
          }}>KM</span>
        </div>

        <div className="mono" style={{
          fontSize: 12, color: '#A5B4FC', marginTop: 14, letterSpacing: 0.3, opacity: 0.85,
        }}>
          {ACTIVITY_META.totalTime}
          <span style={{ opacity: 0.55, margin: '0 10px' }}>·</span>
          {ACTIVITY_META.pace} /km
          <span style={{ opacity: 0.55, margin: '0 10px' }}>·</span>
          {ACTIVITY_META.hrAvg} bpm
          <span style={{ opacity: 0.55, margin: '0 10px' }}>·</span>
          14°C
        </div>
      </div>

      {/* Bottom-right share button — premium CTA */}
      <div style={{ position: 'absolute', right: 48, bottom: 56 }}>
        {noGps ? (
          <button className="btn btn-ghost"
                  style={{
                    height: 52, padding: '0 24px', fontSize: 13.5, fontWeight: 600,
                    background: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#fff',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  }}>
            <IconRunner size={15} /> Add GPS later
          </button>
        ) : (
          <button onClick={onShare}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    height: 52, padding: '0 28px', borderRadius: 10,
                    border: 'none', cursor: 'pointer',
                    background: '#F97066', color: '#fff',
                    fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                    boxShadow: '0 16px 40px -8px rgba(249,112,102,0.65), 0 2px 0 rgba(255,255,255,0.18) inset',
                    transition: 'background 120ms ease, transform 120ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#E0544A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#F97066')}
          >
            <IconExternal size={16} />
            <span>Share to story</span>
            <IconChevRight size={15} style={{ opacity: 0.9 }} />
          </button>
        )}
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
