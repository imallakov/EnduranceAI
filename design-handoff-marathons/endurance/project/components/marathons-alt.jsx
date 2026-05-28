// Marathons — alternative magazine-style direction
// Larger cards, 2 columns. Route + elevation feel more like a poster.

function MarathonCardMag({ race, isTarget = false }) {
  return (
    <div className="card hoverable" style={{
      borderRadius: 16, overflow: 'hidden', display: 'grid',
      gridTemplateColumns: '1.05fr 1fr',
      background: 'var(--surface)', height: 280,
    }}>
      {/* LEFT — visual */}
      <div style={{
        position: 'relative',
        background: 'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 1px) 0 0/14px 14px, linear-gradient(180deg, #FFFFFF 0%, #F5F4F1 100%)',
        borderRight: '1px solid var(--border-soft)',
      }}>
        {/* Top: flag + cc + month */}
        <div style={{
          position: 'absolute', top: 14, left: 14, right: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{race.flag}</span>
            <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.5 }}>{race.cc}</span>
            {race.major && (
              <span style={{
                marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
                height: 18, padding: '0 7px', borderRadius: 5,
                background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.7,
              }}>★ MAJOR</span>
            )}
          </div>
          <span className="label-sm" style={{ fontSize: 10.5 }}>{race.month}</span>
        </div>

        {/* Route silhouette — bigger */}
        <div style={{ position: 'absolute', inset: 0, padding: '46px 24px 64px' }}>
          <RouteSilhouette points={ROUTES[race.id]} width={3.2} />
        </div>

        {/* Bottom: elevation profile strip */}
        <div style={{
          position: 'absolute', left: 14, right: 14, bottom: 12,
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(6px)',
          border: '1px solid var(--border-soft)', borderRadius: 8,
          padding: '6px 8px',
        }}>
          <MiniElevation data={ELEVATION[race.id]} height={40} maxLabel={`+${race.elev}m`} color="#4F46E5" fill="rgba(79,70,229,0.13)" />
        </div>
      </div>

      {/* RIGHT — info */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.3, lineHeight: 1.15 }}>
            {race.name}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
            {race.city} · {race.country} · <span className="mono">{race.date}</span>
          </div>
        </div>

        {/* Blurb */}
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45, textWrap: 'pretty' }}>
          {race.blurb}
        </div>

        {/* Stats — vertical list */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, rowGap: 8,
          paddingTop: 4, marginTop: 'auto',
        }}>
          {[
            { l: 'DIST', v: race.distance, s: 'km' },
            { l: 'ELEV ↑', v: '+' + race.elev, s: 'm' },
            { l: 'AVG TIME', v: race.avgTime, s: '' },
            { l: 'TEMP', v: race.avgTemp.replace('°C', ''), s: '°C' },
          ].map((c, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, color: 'var(--muted)' }}>{c.l}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>{c.v}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{c.s}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Difficulty bar */}
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, color: 'var(--muted)' }}>DIFFICULTY</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{race.diff} · {race.coeff.toFixed(3)}</span>
          </div>
          <DifficultyBar coeff={race.coeff} />
        </div>

        {/* Action */}
        <div style={{ marginTop: 8 }}>
          {isTarget ? (
            <button style={{
              width: '100%', height: 34, borderRadius: 8, border: 'none', cursor: 'default',
              background: '#F97066', color: '#fff', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <IconCheck size={12} /> Current target race
            </button>
          ) : (
            <button className="btn btn-ghost" style={{ width: '100%', height: 34, justifyContent: 'center', fontSize: 12.5 }}>
              Set as target <IconArrowRight size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Magazine-layout page ────────────────────────────────────────
function MarathonsPageMagazine() {
  return (
    <div data-screen-label="Marathons Catalog (Magazine)" style={{
      display: 'flex', width: 1440, minHeight: 1700, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)',
    }}>
      <Sidebar defaultActive="Marathons" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <MarathonsTopBar />
        <div style={{ padding: '24px 32px 40px' }}>
          <MarathonsPageHeader />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <FeaturedHero race={RACES[0]} />
            <FilterBar activeDiff="all" activeMonths={[]} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Showing <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>9</span> of <span className="mono" style={{ color: 'var(--text)' }}>36</span> marathons · <span style={{ color: 'var(--text)' }}>Magazine view</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {RACES.map((r) => (
                <MarathonCardMag key={r.id} race={r} isTarget={r.target} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty state page (full chrome, dimmed grid behind centered card) ──
function MarathonsEmptyPage() {
  return (
    <div data-screen-label="Marathons Catalog · No results" style={{
      display: 'flex', width: 1440, minHeight: 900, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)', position: 'relative',
    }}>
      <Sidebar defaultActive="Marathons" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <MarathonsTopBar />
        <div style={{ padding: '24px 32px 40px' }}>
          <MarathonsPageHeader />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, opacity: 1 }}>
            {/* Dimmed filter bar to make context clear */}
            <FilterBar activeDiff="tough" activeMonths={[1, 2]} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Showing <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>0</span> of <span className="mono" style={{ color: 'var(--text)' }}>36</span> marathons
                <span style={{ marginLeft: 10, color: 'var(--accent)' }}>· filters: Tough difficulty, Feb–Mar</span>
              </div>
            </div>
            <NoResultsEmpty />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MarathonCardMag, MarathonsPageMagazine, MarathonsEmptyPage });
