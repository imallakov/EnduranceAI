// Activity Detail page composer — shell + sections.

function ActivityTopBar() {
  return (
    <div style={{
      height: 56, borderBottom: '1px solid var(--border)', background: '#fff',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--muted)' }}>
        <span>Workspace</span>
        <IconChevRight size={12} />
        <span>Activities</span>
        <IconChevRight size={12} />
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>Tiergarten loop · 17 May</span>
      </div>

      <div style={{ flex: 1 }} />

      <button className="btn btn-ghost" style={{ height: 32, padding: '0 10px' }}>
        <IconChevRight size={12} style={{ transform: 'rotate(180deg)' }} /> Prev
      </button>
      <button className="btn btn-ghost" style={{ height: 32, padding: '0 10px' }}>
        Next <IconChevRight size={12} />
      </button>

      <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 6px' }} />

      <button className="btn btn-ghost" style={{ height: 32, padding: '0 10px' }}>
        <IconExternal size={13} /> Export FIT
      </button>
      <button className="btn btn-ghost" aria-label="More" style={{ height: 32, width: 32, padding: 0, justifyContent: 'center' }}>
        <span style={{ fontSize: 16, color: 'var(--muted)' }}>···</span>
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

function ActivityPageHeader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className="pill pill-soft-indigo" style={{ height: 20, padding: '0 8px', fontSize: 10.5, letterSpacing: 0.5 }}>LONG RUN</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Activity #482 · Week 8 of Berlin block</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: 'var(--text)' }}>
          Tiergarten loop
        </h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          <span className="mono">17 May 2026 · 08:14</span>
          <span style={{ margin: '0 8px', color: 'var(--muted-2)' }}>·</span>
          Sunday long · finished in 1:53:12
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost"><IconCalendar size={13} /> Add note</button>
        <button className="btn btn-ghost"><IconRefresh size={13} /> Re-analyze</button>
      </div>
    </div>
  );
}

// ── Activity Detail page ───────────────────────────────────────────
function ActivityDetail({ noGps = false, modalOpen: defaultModalOpen = false }) {
  const [modalOpen, setModalOpen] = React.useState(defaultModalOpen);

  return (
    <div data-screen-label="Activity Detail" style={{
      display: 'flex', width: 1440, minHeight: 1700, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)', position: 'relative',
    }}>
      <Sidebar defaultActive="Activities" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <ActivityTopBar />
        <div style={{ padding: '24px 32px 40px' }}>
          <ActivityPageHeader />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <CinematicHero noGps={noGps} onShare={() => setModalOpen(true)} />

            {noGps ? <ManualEntryNote /> : <StatStrip />}

            {noGps ? <ManualChartsEmpty /> : <LinkedCharts />}

            <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24, alignItems: 'start' }}>
              {noGps ? <ManualSplitsEmpty /> : <SplitsTable />}
              <ZonesDonut />
            </div>

            <CoachInsights />
          </div>
        </div>
      </div>

      {modalOpen && <ShareModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

// ── Manual entry empty states ──────────────────────────────────────
function ManualEntryNote() {
  return (
    <div className="card" style={{
      padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14,
      background: '#FFFBEB', borderColor: '#FDE68A',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: '#FEF3C7', color: '#B45309',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconRunner size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>Manually entered activity</div>
        <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
          Distance + total time only · no GPS, HR, splits or per-km data available
        </div>
      </div>
      <button className="btn btn-ghost" style={{ height: 32, fontSize: 12.5, background: '#fff' }}>
        Upload .FIT file
      </button>
    </div>
  );
}

function ManualChartsEmpty() {
  return (
    <div className="card" style={{ padding: 20, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>Manually entered — no per-km data</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Connect Garmin or upload a .FIT file to unlock pace, HR and elevation charts.</div>
      </div>
    </div>
  );
}

function ManualSplitsEmpty() {
  return (
    <div className="card" style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>Splits unavailable</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          Per-kilometer splits require a GPS or treadmill recording. This activity has only the totals you entered.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ActivityDetail, ActivityPageHeader, ActivityTopBar });
