// Alternative direction — "Mission Control" layout.
//
// Differences vs. main:
//  • Race Readiness promoted to co-hero (Whoop-style emotion + prediction get equal weight)
//  • Full-bleed sticky data strip across the top instead of metric tiles
//  • Chart full width, taller; activities are a denser table below
//  • Sidebar collapsed to icons only — more horizontal canvas
//  • Adds "Next workout" panel so dashboard answers "what now?"

function AltSidebar() {
  const items = [
    [IconDashboard, true],
    [IconActivity, false],
    [IconPredict, false],
    [IconPlan, false],
    [IconRace, false],
    [IconAnalytics, false],
  ];
  return (
    <aside style={{
      width: 64, flexShrink: 0, background: '#FAFAF9', borderRight: '1px solid var(--border)',
      padding: '18px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      <div style={{ marginBottom: 16 }}><IconLogo size={24} /></div>
      {items.map(([Ic, active], i) => (
        <div key={i} style={{
          width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? '#ECEAFB' : 'transparent', color: active ? 'var(--primary)' : '#78716C', cursor: 'pointer',
        }}>
          <Ic size={17} />
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#78716C', cursor: 'pointer' }}>
        <IconSettings size={17} />
      </div>
    </aside>
  );
}

function AltTopStrip() {
  // Compact stat strip across the full width — Stripe-dashboard density
  const items = [
    { label: 'VDOT', value: '47.2', delta: '+1.4', tone: 'success', icon: IconArrowUp },
    { label: 'CTL', value: '58', delta: '+4', tone: 'success', icon: IconArrowUp },
    { label: 'ATL', value: '61', delta: '+7', tone: 'warning', icon: IconArrowUp },
    { label: 'TSB', value: '−3', delta: 'in zone', tone: 'muted', icon: IconArrowFlat },
    { label: 'Week', value: '67.4', suffix: 'km', delta: '+15.8%', tone: 'success', icon: IconArrowUp },
    { label: 'Streak', value: '23', suffix: 'd', delta: 'PR 31d', tone: 'muted', icon: IconArrowFlat },
    { label: 'Pace 7d', value: '5:21', suffix: '/km', delta: '−0:09', tone: 'success', icon: IconArrowDown },
    { label: 'HR avg', value: '142', suffix: 'bpm', delta: '−2', tone: 'success', icon: IconArrowDown },
  ];
  const tone = { success: 'var(--success)', warning: 'var(--warning)', muted: 'var(--muted)' };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
    }}>
      {items.map((it, i) => {
        const I = it.icon;
        return (
          <div key={i} style={{
            padding: '14px 16px', borderRight: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0,
          }}>
            <span className="label-sm" style={{ fontSize: 10 }}>{it.label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span className="mono" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.4, lineHeight: 1 }}>{it.value}</span>
              {it.suffix && <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{it.suffix}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5 }}>
              <I size={10} style={{ color: tone[it.tone] }} />
              <span className="mono" style={{ color: tone[it.tone], fontWeight: 600 }}>{it.delta}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AltReadinessHero() {
  return (
    <div className="card" style={{
      padding: 28, height: 280,
      background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)',
      color: '#fff', border: 'none', display: 'flex', position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative ring */}
      <div style={{
        position: 'absolute', right: -120, top: -120, width: 380, height: 380, borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.06)',
      }} />
      <div style={{
        position: 'absolute', right: -60, top: -60, width: 260, height: 260, borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.05)',
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 1, minWidth: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="label-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Race readiness</span>
            <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(245,158,11,0.18)', color: '#FCD34D', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Moderate</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 14 }}>
            <span className="mono" style={{ fontSize: 84, fontWeight: 600, letterSpacing: -3, lineHeight: 0.9 }}>72</span>
            <span className="mono" style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)' }}>/ 100</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', marginTop: 8, maxWidth: 320, lineHeight: 1.5 }}>
            Form is fine. Long-run inventory is the limiter — schedule another 32+ km in the next 14 days to clear it.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18 }}>
          {[
            ['TSB', 85, 'high'],
            ['Consistency', 72, ''],
            ['Long runs', 65, 'low'],
            ['VDOT', 50, 'low'],
            ['Volume', 70, ''],
          ].map(([k, v, tag]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{k}</span>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${v}%`, height: '100%', background: tag === 'low' ? '#F97066' : tag === 'high' ? '#10B981' : '#A5B4FC', borderRadius: 2 }} />
              </div>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AltPredictionHero() {
  return (
    <div className="card" style={{ padding: 28, height: 280, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="label-sm">Predicted finish · Berlin</span>
          <span className="pill pill-soft-indigo">42d</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 14 }}>
          <span className="mono" style={{ fontSize: 64, fontWeight: 600, color: 'var(--primary)', letterSpacing: -2, lineHeight: 0.95 }}>
            3:44:12
          </span>
          <span className="mono" style={{ fontSize: 13, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <IconArrowDown size={12} /> 2:46 vs 30d
          </span>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
          <span className="mono">±9 min</span> CI · BQ −15:48 · Sub-3:30 −14:12
        </div>
      </div>

      {/* Mini elevation profile w/ predicted splits */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span className="label-sm" style={{ fontSize: 10 }}>Berlin · elevation 42.2 km</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>Δ +43 / −41 m</span>
        </div>
        <ElevationProfile height={56} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 8 }}>
          {[
            ['10K', '52:24', '5:14/km'],
            ['Half', '1:50:30', '5:14/km'],
            ['30K', '2:38:48', '5:18/km'],
            ['Finish', '3:44:12', '5:19/km'],
          ].map(([k, t, p]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{k}</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t}</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="chip"><IconCloud size={11} /> 17°C · 65%</span>
          <span className="chip"><IconMountain size={11} /> ×1.002</span>
        </div>
        <button className="btn btn-coral" style={{ height: 34, fontSize: 12.5 }}>
          Predict <IconArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

function AltChartCard() {
  return (
    <div className="card" style={{ padding: 22, height: 280, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div className="label-sm">Fitness / Fatigue / Form — 84d</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
            {[
              ['CTL', '#4F46E5', '58', 'solid'],
              ['ATL', '#F97066', '61', 'dashed'],
              ['TSB', '#10B981', '−3', 'solid'],
            ].map(([n, c, v, kind]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 14, height: 2, background: kind === 'solid' ? c : 'transparent', borderTop: kind === 'dashed' ? `2px dashed ${c}` : 'none' }} />
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{n}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="chip active">84d</span>
          <span className="chip">6mo</span>
          <span className="chip">1y</span>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <LineChart height={200} />
      </div>
    </div>
  );
}

function AltNextWorkout() {
  return (
    <div className="card" style={{ padding: 22, height: 280, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="label-sm">Today · scheduled</span>
        <span className="pill pill-soft-indigo">Quality</span>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>
          Threshold · 4 × 2 km @ T-pace
        </div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          Target 4:24/km · 2:00 jog · 15 km total · ~108 TSS
        </div>
      </div>

      {/* Visual interval blocks */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56, marginBottom: 12 }}>
        {[
          [12, 'var(--muted-2)', 'wu'],
          [22, 'var(--primary-2)', 'T'],
          [6, '#CBD5E1', 'r'],
          [22, 'var(--primary-2)', 'T'],
          [6, '#CBD5E1', 'r'],
          [22, 'var(--primary-2)', 'T'],
          [6, '#CBD5E1', 'r'],
          [22, 'var(--primary-2)', 'T'],
          [10, 'var(--muted-2)', 'cd'],
        ].map(([w, c, l], i) => (
          <div key={i} style={{
            flex: w, background: c, borderRadius: 3, height: c === 'var(--primary-2)' ? '100%' : c === '#CBD5E1' ? '38%' : '60%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9.5, fontWeight: 600,
          }}>{l === 'T' ? 'T' : ''}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        {[
          ['Effort', '7.5/10'],
          ['Zone', 'Z3-4'],
          ['Window', '17:00–18:30'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{k}</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 3 }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 12.5 }}>
          Push to watch
        </button>
        <button className="btn btn-ghost" style={{ height: 36, padding: '0 12px' }}>
          Edit
        </button>
      </div>
    </div>
  );
}

function AltActivityTable() {
  const rows = [
    { date: '17 May', dow: 'Sun', title: 'Long run · Tiergarten loop', kind: 'Long', dist: '21.3', pace: '5:18', hr: 148, tss: 132, vdot: 47.1 },
    { date: '16 May', dow: 'Sat', title: 'Recovery jog',                 kind: 'Easy', dist: '8.2',  pace: '5:54', hr: 128, tss: 38,  vdot: 45.3 },
    { date: '15 May', dow: 'Fri', title: 'Threshold · 5×2 km',           kind: 'Workout', dist: '14.7', pace: '4:32', hr: 162, tss: 121, vdot: 48.6 },
    { date: '14 May', dow: 'Thu', title: 'Easy + strides',               kind: 'Easy', dist: '10.5', pace: '5:41', hr: 134, tss: 56,  vdot: 46.8 },
    { date: '13 May', dow: 'Wed', title: 'VO₂ · 6×800m',                 kind: 'Workout', dist: '12.0', pace: '4:18', hr: 168, tss: 108, vdot: 49.2 },
    { date: '12 May', dow: 'Tue', title: 'Easy aerobic',                 kind: 'Easy', dist: '9.0',  pace: '5:46', hr: 132, tss: 47,  vdot: 46.1 },
  ];
  const kindStyle = {
    Long:    { bg: '#EEF2FF', fg: '#1E1B4B' },
    Easy:    { bg: '#F1F5F9', fg: '#475569' },
    Workout: { bg: '#FFEEEC', fg: '#C2362F' },
  };
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
        <div className="label-sm">Recent activities</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="chip"><IconFilter size={11} /> All</span>
          <span className="chip">7d</span>
          <a style={{ fontSize: 12, color: 'var(--primary-2)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            Open log <IconArrowRight size={11} />
          </a>
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--border)' }} />
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 70 }}/>
          <col />
          <col style={{ width: 78 }}/>
          <col style={{ width: 80 }}/>
          <col style={{ width: 80 }}/>
          <col style={{ width: 70 }}/>
          <col style={{ width: 70 }}/>
          <col style={{ width: 72 }}/>
        </colgroup>
        <thead>
          <tr style={{ background: '#FAFAF9' }}>
            {['Date', 'Activity', 'Type', 'Dist', 'Pace', 'HR', 'TSS', 'VDOT'].map((h, i) => (
              <th key={h} style={{
                textAlign: i >= 3 ? 'right' : 'left', padding: '8px 16px',
                fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4,
                borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="act-row" style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
              <td style={{ padding: '12px 16px' }}>
                <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{r.date.split(' ')[0]} <span style={{ color: 'var(--muted)' }}>{r.date.split(' ')[1]}</span></div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, letterSpacing: 0.3 }}>{r.dow.toUpperCase()}</div>
              </td>
              <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{
                  display: 'inline-flex', padding: '2px 7px', borderRadius: 5, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.2,
                  background: kindStyle[r.kind].bg, color: kindStyle[r.kind].fg,
                }}>{r.kind}</span>
              </td>
              <td className="mono" style={{ padding: '12px 16px', fontSize: 12.5, fontWeight: 500, color: 'var(--text)', textAlign: 'right' }}>{r.dist} <span style={{ color: 'var(--muted)' }}>km</span></td>
              <td className="mono" style={{ padding: '12px 16px', fontSize: 12.5, fontWeight: 500, color: 'var(--text)', textAlign: 'right' }}>{r.pace}<span style={{ color: 'var(--muted)' }}>/km</span></td>
              <td className="mono" style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--muted)', textAlign: 'right' }}>{r.hr}</td>
              <td className="mono" style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--muted)', textAlign: 'right' }}>{r.tss}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                <span className="pill pill-indigo mono">{r.vdot}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AltTopBar() {
  return (
    <div style={{
      height: 56, borderBottom: '1px solid var(--border)', background: '#fff',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>Mission control</h1>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>· Berlin Marathon '26 · <span className="mono">42 days</span> · Tue 20 May</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 30, padding: '0 8px 0 10px',
        border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg)',
        fontSize: 12, color: 'var(--muted)',
      }}>
        <IconCommand size={12} />
        <span>Command</span>
        <kbd className="mono" style={{ fontSize: 10, padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 4, background: '#fff', color: 'var(--muted)' }}>⌘K</kbd>
      </div>
      <button className="btn btn-ghost" style={{ height: 30, padding: '0 10px', fontSize: 12 }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--success)' }} />
        Garmin · live
      </button>
      <div style={{
        width: 30, height: 30, borderRadius: 15, background: 'linear-gradient(135deg, #1E1B4B, #4F46E5)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 600, letterSpacing: 0.4,
      }}>MS</div>
    </div>
  );
}

function AlternativeDashboard() {
  return (
    <div data-screen-label="Alt · Mission Control" style={{
      display: 'flex', width: 1440, height: 1080, background: 'var(--bg)', overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)',
    }}>
      <AltSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AltTopBar />
        <div className="nice-scroll" style={{ flex: 1, overflow: 'auto', padding: '24px 32px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Data strip */}
          <AltTopStrip />

          {/* Twin hero — readiness + prediction */}
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 24 }}>
            <AltReadinessHero />
            <AltPredictionHero />
          </div>

          {/* Chart + next workout */}
          <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24 }}>
            <AltChartCard />
            <AltNextWorkout />
          </div>

          {/* Activities table */}
          <AltActivityTable />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AlternativeDashboard });
