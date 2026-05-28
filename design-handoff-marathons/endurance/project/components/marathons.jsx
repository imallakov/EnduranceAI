// Marathons — page composer, hero, filter bar, card grid.

// ── Shared route silhouette (no glow — for cards) ─────────────────
function RouteSilhouette({ points, stroke = '#4F46E5', width = 2.5, startColor = '#10B981', finishColor = '#F97066' }) {
  // points is the polyline string in 0..100 × 0..70 space
  const pairs = points.split(' ').map(p => p.split(',').map(Number));
  const start = pairs[0];
  const finish = pairs[pairs.length - 1];
  return (
    <svg viewBox="0 0 100 70" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }}>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={width}
                strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={start[0]} cy={start[1]} r={1.8} fill={startColor} />
      <circle cx={finish[0]} cy={finish[1]} r={1.8} fill={finishColor} />
    </svg>
  );
}

// ── Glowing route silhouette (for Featured hero + GPX preview) ────
function RouteGlow({ points, vbW = 100, vbH = 70 }) {
  const pairs = points.split(' ').map(p => p.split(',').map(Number));
  const s = pairs[0], f = pairs[pairs.length - 1];
  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <radialGradient id="hero-spot" cx="50%" cy="55%" r="60%">
          <stop offset="0" stopColor="#4F46E5" stopOpacity="0.32" />
          <stop offset="0.6" stopColor="#4F46E5" stopOpacity="0.08" />
          <stop offset="1" stopColor="#4F46E5" stopOpacity="0" />
        </radialGradient>
        <filter id="rg-big" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2" /></filter>
        <filter id="rg-mid" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.8" /></filter>
        <filter id="rg-tight" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.8" /></filter>
      </defs>
      <rect x="0" y="0" width={vbW} height={vbH} fill="url(#hero-spot)" />
      <polyline points={points} fill="none" stroke="#4F46E5" strokeWidth="5.8" opacity="0.42"
                strokeLinejoin="round" strokeLinecap="round" filter="url(#rg-big)" />
      <polyline points={points} fill="none" stroke="#818CF8" strokeWidth="3.4" opacity="0.55"
                strokeLinejoin="round" strokeLinecap="round" filter="url(#rg-mid)" />
      <polyline points={points} fill="none" stroke="#A5B4FC" strokeWidth="1.7" opacity="0.75"
                strokeLinejoin="round" strokeLinecap="round" filter="url(#rg-tight)" />
      <polyline points={points} fill="none" stroke="#FFFFFF" strokeWidth="0.55"
                strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={s[0]} cy={s[1]} r={1.3} fill="#fff" />
      <circle cx={f[0]} cy={f[1]} r={1.8} fill="#F97066" />
      <circle cx={f[0]} cy={f[1]} r={3} fill="#F97066" opacity="0.35" filter="url(#rg-tight)" />
    </svg>
  );
}

// ── Mini elevation profile (area chart) ─────────────────────────
function MiniElevation({ data, height = 50, color = '#94A3B8', fill = 'rgba(148,163,184,0.18)', showAxis = true, maxLabel }) {
  const w = 320, h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY = 8;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = padY + (1 - (v - min) / range) * (h - padY - 4);
    return [x, y];
  });
  const pathLine = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const pathArea = `${pathLine} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <path d={pathArea} fill={fill} />
      <path d={pathLine} stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {showAxis && (
        <>
          <text x="2" y={h - 2} style={{ fontSize: 8, fill: '#94A3B8', fontFamily: 'Geist Mono' }}>0</text>
          <text x={w / 2} y={h - 2} textAnchor="middle" style={{ fontSize: 8, fill: '#94A3B8', fontFamily: 'Geist Mono' }}>21</text>
          <text x={w - 2} y={h - 2} textAnchor="end" style={{ fontSize: 8, fill: '#94A3B8', fontFamily: 'Geist Mono' }}>42</text>
          {maxLabel && (
            <text x={w - 4} y={11} textAnchor="end" style={{ fontSize: 8.5, fill: '#475569', fontFamily: 'Geist Mono', fontWeight: 600 }}>{maxLabel}</text>
          )}
        </>
      )}
    </svg>
  );
}

// ── Difficulty bar (green→amber→red, with indicator dot) ──────────
function DifficultyBar({ coeff }) {
  // 1.000 → 1.05+ mapped to 0..1
  const p = Math.max(0, Math.min(1, (coeff - 1.000) / 0.05));
  return (
    <div style={{ position: 'relative', height: 8, borderRadius: 4, overflow: 'visible',
                  background: 'linear-gradient(90deg, #10B981 0%, #34D399 25%, #F59E0B 55%, #DC2626 95%)' }}>
      <div style={{
        position: 'absolute', top: -2, left: `calc(${(p * 100).toFixed(1)}% - 6px)`,
        width: 12, height: 12, borderRadius: 6, background: '#fff',
        border: '1.5px solid rgba(15,23,42,0.55)',
        boxShadow: '0 1px 3px rgba(15,23,42,0.25)',
      }} />
    </div>
  );
}

// ── Featured Hero ────────────────────────────────────────────────
function FeaturedHero({ race = RACES[0] }) {
  return (
    <div style={{
      position: 'relative', height: 320, borderRadius: 16, overflow: 'hidden',
      border: '1px solid var(--primary)', background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)',
      boxShadow: '0 24px 60px -20px rgba(30,27,75,0.35)', display: 'grid', gridTemplateColumns: '7fr 5fr',
    }}>
      {/* LEFT — visual */}
      <div style={{ position: 'relative', minWidth: 0, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'absolute', inset: 0, padding: '12px 12px 12px 18px' }}>
          <RouteGlow points={ROUTES[race.id]} vbW={100} vbH={70} />
        </div>
        {/* MOST POPULAR badge */}
        <div style={{
          position: 'absolute', top: 18, left: 22, height: 22, padding: '0 9px',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: '#F97066', color: '#fff', borderRadius: 6,
          fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 3, background: '#fff' }} /> Most popular
        </div>
        {/* Flag + cc */}
        <div style={{ position: 'absolute', top: 16, right: 22, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 26, lineHeight: 1, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' }}>{race.flag}</span>
          <span className="mono" style={{ fontSize: 12, color: '#fff', opacity: 0.85, fontWeight: 600, letterSpacing: 0.4 }}>{race.cc}</span>
        </div>
        {/* Weather chip */}
        <div style={{
          position: 'absolute', left: 22, bottom: 18, display: 'inline-flex', alignItems: 'center', gap: 8,
          height: 26, padding: '0 10px', borderRadius: 13,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
          color: '#fff', fontSize: 11.5, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}>
          <IconCloud size={12} style={{ opacity: 0.75 }} />
          <span className="mono" style={{ letterSpacing: 0.2 }}>
            September · {race.avgTemp} avg · {race.humidity} RH
          </span>
        </div>
      </div>

      {/* RIGHT — info */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '26px 30px 24px', color: '#fff', minWidth: 0 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 700, color: '#F97066',
          letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10,
        }}>Featured · World Marathon Major</div>

        <h2 style={{
          margin: 0, fontSize: 38, fontWeight: 700, color: '#fff',
          letterSpacing: -1, lineHeight: 1.04, textWrap: 'balance',
        }}>{race.name.toUpperCase()}</h2>

        <div className="mono" style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 10, letterSpacing: 0.3 }}>
          {race.city} · {race.country} · {race.date}
        </div>

        {/* 4-cell mini stats */}
        <div style={{
          marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
          border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, overflow: 'hidden',
          background: 'rgba(255,255,255,0.03)',
        }}>
          {[
            { l: 'DISTANCE', v: race.distance, s: 'km', sub: 'world record course' },
            { l: 'ELEVATION', v: '+' + race.elev, s: 'm', sub: '↑ / ↓' },
            { l: 'DIFFICULTY', v: race.diff, s: '', sub: 'coeff ' + race.coeff.toFixed(3) },
            { l: 'AVG TIME', v: race.avgTime, s: '', sub: 'median 2024' },
          ].map((c, i) => (
            <div key={i} style={{
              padding: '12px 12px 12px 14px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.7, color: 'rgba(255,255,255,0.55)' }}>{c.l}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span className="mono" style={{ fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: -0.4, lineHeight: 1 }}>{c.v}</span>
                {c.s && <span className="mono" style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)' }}>{c.s}</span>}
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.25 }}>{c.sub}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              height: 44, padding: '0 18px', borderRadius: 10,
              border: 'none', cursor: 'pointer',
              background: '#F97066', color: '#fff', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
              boxShadow: '0 16px 40px -8px rgba(249,112,102,0.55), 0 1px 0 rgba(255,255,255,0.18) inset',
            }}>
            <IconCheck size={14} />
            <span>Set Berlin as my target race</span>
            <IconArrowRight size={14} style={{ marginLeft: 'auto' }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#10B981' }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: '#10B981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCheck size={9} style={{ color: '#fff' }} />
            </span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Already set as your current target race</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────
function FilterBar({ activeDiff = 'all', activeMonths = [], onlyCustom = false }) {
  const months = ['Any', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const diffs = [['all', 'All'], ['flat', 'Flat'], ['hilly', 'Hilly'], ['tough', 'Tough']];

  return (
    <div className="card" style={{
      padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
      background: '#fff', borderRadius: 12, minWidth: 0,
    }}>
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px',
        border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)',
        width: 200, flexShrink: 0, fontSize: 12.5, color: 'var(--muted)',
      }}>
        <IconSearch size={13} />
        <span>Search marathons…</span>
      </div>

      {/* Country dropdown */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 11px',
        border: '1px solid var(--border)', borderRadius: 8, background: '#fff', fontSize: 12.5,
        cursor: 'pointer', flexShrink: 0,
      }}>
        <span style={{ color: 'var(--text)' }}>Country</span>
        <span className="pill pill-soft-indigo" style={{ height: 18, padding: '0 6px', fontSize: 10 }}>2</span>
        <IconChevDown size={12} style={{ color: 'var(--muted)' }} />
      </div>

      <div style={{ width: 1, height: 22, background: 'var(--border-soft)', flexShrink: 0 }} />

      {/* Difficulty radio chips */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {diffs.map(([k, l]) => {
          const isActive = activeDiff === k;
          return (
            <span key={k} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 7,
              border: `1px solid ${isActive ? 'var(--primary-2)' : 'var(--border)'}`,
              background: isActive ? '#EEF2FF' : '#fff',
              color: isActive ? 'var(--primary-2)' : 'var(--text)',
              fontSize: 12, fontWeight: isActive ? 600 : 500, cursor: 'pointer',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: 4,
                border: `1.5px solid ${isActive ? 'var(--primary-2)' : 'var(--muted-2)'}`,
                background: isActive ? 'var(--primary-2)' : 'transparent',
              }} />
              {l}
            </span>
          );
        })}
      </div>

      <div style={{ width: 1, height: 22, background: 'var(--border-soft)', flexShrink: 0 }} />

      {/* Month chips — fills remaining space, clips overflow */}
      <div style={{
        display: 'flex', gap: 4, alignItems: 'center',
        flex: 1, minWidth: 0, overflow: 'hidden',
      }}>
        {months.map((m, i) => {
          const isActive = i === 0 ? activeMonths.length === 0 : activeMonths.includes(i - 1);
          return (
            <span key={m} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 26, padding: '0 8px',
              borderRadius: 6, border: `1px solid ${isActive ? 'var(--primary-2)' : 'var(--border)'}`,
              background: isActive ? 'var(--primary-2)' : '#fff',
              color: isActive ? '#fff' : 'var(--muted)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}>
              {m}
            </span>
          );
        })}
      </div>

      <div style={{ width: 1, height: 22, background: 'var(--border-soft)', flexShrink: 0 }} />

      {/* Toggle */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
        <span style={{
          width: 28, height: 16, borderRadius: 8, background: onlyCustom ? 'var(--primary-2)' : '#E5E7EB',
          position: 'relative', cursor: 'pointer',
        }}>
          <span style={{
            position: 'absolute', top: 2, left: onlyCustom ? 14 : 2,
            width: 12, height: 12, borderRadius: 6, background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)', transition: 'left 100ms',
          }} />
        </span>
        Custom only
      </div>

      {/* Sort */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 10px',
        border: '1px solid var(--border)', borderRadius: 8, background: '#fff', fontSize: 12.5,
        cursor: 'pointer', color: 'var(--text)', flexShrink: 0,
      }}>
        <IconFilter size={12} style={{ color: 'var(--muted)' }} />
        <span>Difficulty</span>
        <IconArrowUp size={11} style={{ color: 'var(--muted)' }} />
      </div>
    </div>
  );
}

// ── Marathon card ────────────────────────────────────────────────
function MarathonCard({ race, isTarget = false, isCustom = false }) {
  return (
    <div className="card hoverable" style={{
      borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', height: 360,
    }}>
      {/* Top strip */}
      <div style={{
        height: 36, padding: '0 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#FAFAF9', borderBottom: '1px solid var(--border-soft)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{race.flag}</span>
          <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', letterSpacing: 0.4 }}>{race.cc}</span>
          {isCustom && (
            <span className="pill pill-soft-indigo" style={{ height: 17, padding: '0 6px', fontSize: 9.5, marginLeft: 4 }}>CUSTOM</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--muted)' }}>
          <IconCalendar size={11} />
          <span className="label-sm" style={{ fontSize: 10.5 }}>{race.month}</span>
        </div>
      </div>

      {/* Route preview */}
      <div style={{
        height: 132, position: 'relative',
        background: 'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 1px) 0 0/12px 12px, #FAFAF9',
        borderBottom: '1px solid var(--border-soft)',
      }}>
        <div style={{ position: 'absolute', inset: 12 }}>
          <RouteSilhouette points={ROUTES[race.id]} />
        </div>
        {race.major && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 18, padding: '0 7px', borderRadius: 5,
            background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
            color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.7,
          }}>
            ★ MAJOR
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {/* Name + location */}
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2, lineHeight: 1.15 }}>
            {race.name}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{race.city}, {race.country}</div>
        </div>

        {/* Elevation profile */}
        <div style={{ marginTop: 2, marginRight: -4, marginLeft: -4 }}>
          <MiniElevation data={ELEVATION[race.id]} height={42} maxLabel={`+${race.elev}m`} color="#94A3B8" fill="rgba(148,163,184,0.18)" />
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: 0, paddingTop: 2 }}>
          {[
            { l: 'DIST', v: race.distance, s: 'km' },
            { l: 'ELEV ↑', v: '+' + race.elev, s: 'm' },
            { l: 'DIFFICULTY', v: race.diff, s: dots(race.diffKey) },
          ].map((c, i) => (
            <div key={i} style={{
              borderLeft: i > 0 ? '1px solid var(--border-soft)' : 'none',
              paddingLeft: i > 0 ? 10 : 0,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, color: 'var(--muted)' }}>{c.l}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>{c.v}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{c.s}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Difficulty bar */}
        <div style={{ paddingTop: 4 }}>
          <DifficultyBar coeff={race.coeff} />
        </div>
      </div>

      {/* Action row */}
      <div style={{ borderTop: '1px solid var(--border-soft)', padding: '10px 14px', marginTop: 10 }}>
        {isTarget ? (
          <button style={{
            width: '100%', height: 32, borderRadius: 7, border: 'none', cursor: 'default',
            background: '#F97066', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset',
          }}>
            <IconCheck size={12} /> Current target race
          </button>
        ) : (
          <button className="btn btn-ghost" style={{
            width: '100%', height: 32, justifyContent: 'center', fontSize: 12, fontWeight: 500,
          }}>
            Set as target <IconArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

// difficulty dots for the stats row
function dots(diffKey) {
  if (diffKey === 'flat') return '●○○';
  if (diffKey === 'mid') return '●●○';
  if (diffKey === 'hilly') return '●●●';
  if (diffKey === 'tough') return '●●●';
  return '●○○';
}

// ── Page header ──────────────────────────────────────────────────
function MarathonsPageHeader({ onUpload }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className="label-sm" style={{ fontSize: 10.5, color: 'var(--muted)' }}>CATALOG</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: 'var(--text)' }}>Marathons</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          <span className="mono">36</span> races worldwide · WMM, European top, Russia, Turkey, Middle East
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost"><IconFilter size={13} /> View as list</button>
        <button className="btn btn-coral" onClick={onUpload} style={{ height: 40, padding: '0 16px' }}>
          <IconCloud size={14} /> Add custom GPX
        </button>
      </div>
    </div>
  );
}

// ── Top bar for Marathons page ──────────────────────────────────
function MarathonsTopBar() {
  return (
    <div style={{
      height: 56, borderBottom: '1px solid var(--border)', background: '#fff',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--muted)' }}>
        <span>Workspace</span>
        <IconChevRight size={12} />
        <span>Berlin Marathon '26</span>
        <IconChevRight size={12} />
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>Marathons</span>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 10px',
        border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg)',
        fontSize: 13, color: 'var(--muted)', width: 240,
      }}>
        <IconSearch size={14} />
        <span>Search activities, splits…</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          <kbd className="mono" style={{ fontSize: 10, padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 4, background: '#fff', color: 'var(--muted)' }}>⌘</kbd>
          <kbd className="mono" style={{ fontSize: 10, padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 4, background: '#fff', color: 'var(--muted)' }}>K</kbd>
        </span>
      </div>

      <button className="btn btn-ghost" aria-label="Notifications" style={{ width: 32, padding: 0, justifyContent: 'center', position: 'relative' }}>
        <IconBell size={15} />
        <span style={{ position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: 3, background: 'var(--accent)' }} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 15, background: 'linear-gradient(135deg, #1E1B4B, #4F46E5)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11.5, fontWeight: 600, letterSpacing: 0.4,
        }}>MS</div>
      </div>
    </div>
  );
}

// ── Full Marathons page ──────────────────────────────────────────
function MarathonsPage({ modalStep = null, emptyState = false }) {
  return (
    <div data-screen-label="Marathons Catalog" style={{
      display: 'flex', width: 1440, minHeight: 1820, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)', position: 'relative',
    }}>
      <Sidebar defaultActive="Marathons" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <MarathonsTopBar />
        <div style={{ padding: '24px 32px 40px' }}>
          <MarathonsPageHeader />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <FeaturedHero race={RACES[0]} />
            <FilterBar activeDiff="all" activeMonths={[]} />

            {/* result count */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -8, marginBottom: -4 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Showing <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{emptyState ? '0' : '9'}</span> of <span className="mono" style={{ color: 'var(--text)' }}>36</span> marathons
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: '#10B981' }} /> Flat
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: '#F59E0B' }} /> Hilly
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: '#DC2626' }} /> Tough
                </span>
              </div>
            </div>

            {emptyState ? (
              <NoResultsEmpty />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                {RACES.map((r) => (
                  <MarathonCard key={r.id} race={r} isTarget={r.target} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {modalStep === 1 && <GpxModalShade><GpxModalStep1 /></GpxModalShade>}
      {modalStep === 2 && <GpxModalShade><GpxModalStep2 /></GpxModalShade>}
    </div>
  );
}

// ── Empty state — 0 results from filters ────────────────────────
function NoResultsEmpty() {
  return (
    <div style={{
      marginTop: 32, padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#fff', border: '1px dashed var(--border)', borderRadius: 14,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 36, background: '#F1F5F9',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
          <path d="M8 11h6" />
        </svg>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
        No marathons match these filters
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
        Try removing the country filter, broadening the month range, or <a style={{ color: 'var(--primary-2)', cursor: 'pointer' }}>search all 36 races</a>.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button className="btn btn-ghost" style={{ height: 34 }}>Clear all filters</button>
        <button className="btn btn-primary" style={{ height: 34 }}>Search all races <IconArrowRight size={12} /></button>
      </div>
    </div>
  );
}

Object.assign(window, {
  RouteSilhouette, RouteGlow, MiniElevation, DifficultyBar,
  FeaturedHero, FilterBar, MarathonCard, MarathonsPage,
  MarathonsPageHeader, MarathonsTopBar, NoResultsEmpty, dots,
});
