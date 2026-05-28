// Main desktop dashboard — full app shell + dashboard content.

const ACTIVITIES = [
  { date: '17 May', dow: 'Sun', title: 'Long run · Tiergarten loop', distance: '21.3 km', pace: '5:18/km', vdot: 47.1, kind: 'long' },
  { date: '16 May', dow: 'Sat', title: 'Recovery jog', distance: '8.2 km', pace: '5:54/km', vdot: 45.3, kind: 'easy' },
  { date: '15 May', dow: 'Fri', title: 'Threshold · 5×2km', distance: '14.7 km', pace: '4:32/km', vdot: 48.6, kind: 'workout' },
  { date: '14 May', dow: 'Thu', title: 'Easy run + strides', distance: '10.5 km', pace: '5:41/km', vdot: 46.8, kind: 'easy' },
  { date: '13 May', dow: 'Wed', title: 'VO₂ · 6×800m', distance: '12.0 km', pace: '4:18/km', vdot: 49.2, kind: 'workout' },
];

function Sidebar({ defaultActive = 'Dashboard' }) {
  const [active, setActive] = React.useState(defaultActive);
  const items = [
    ['Dashboard', IconDashboard],
    ['Activities', IconActivity],
    ['Predictions', IconPredict],
    ['Training plan', IconPlan],
    ['Marathons', IconRace],
    ['Analytics', IconAnalytics],
  ];
  const bottom = [
    ['Settings', IconSettings],
    ['Sign out', IconLogout],
  ];
  return (
    <aside style={{
      width: 240, flexShrink: 0, background: '#FAFAF9',
      borderRight: '1px solid var(--border)', padding: '20px 14px', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 22px' }}>
        <IconLogo size={22} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--primary)', letterSpacing: -0.2 }}>EnduranceAI</span>
          <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 }}>Pro · Berlin '26</span>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div className="label-sm" style={{ padding: '4px 10px 8px', fontSize: 10.5 }}>Workspace</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map(([name, Icon]) => (
            <div key={name} className={`nav-row ${active === name ? 'active' : ''}`} onClick={() => setActive(name)}>
              <Icon size={15} />
              <span style={{ flex: 1 }}>{name}</span>
              {name === 'Predictions' && <span className="pill pill-soft-indigo" style={{ height: 17, padding: '0 6px', fontSize: 10 }}>NEW</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 6px 14px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {bottom.map(([name, Icon]) => (
          <div key={name} className="nav-row">
            <Icon size={15} />
            <span style={{ flex: 1 }}>{name}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{
          border: '1px solid var(--border)', borderRadius: 10, padding: 12,
          background: '#fff', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="label-sm" style={{ fontSize: 10 }}>Plan sync</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--success)' }}>● live</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>
            Garmin · last <span className="mono" style={{ color: 'var(--text)' }}>14m</span> ago
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: 12, flex: 1 }}>
              <IconRefresh size={12} /> Sync
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <div style={{
      height: 56, borderBottom: '1px solid var(--border)', background: '#fff',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--muted)' }}>
        <span>Workspace</span>
        <IconChevRight size={12} />
        <span>Berlin Marathon '26</span>
        <IconChevRight size={12} />
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>Dashboard</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Search */}
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

// ── Hero prediction card ────────────────────────────────────────────
function HeroCard() {
  return (
    <div className="card" style={{ padding: 24, height: 200, display: 'flex' }}>
      {/* Left — prediction */}
      <div style={{ flex: '1.4 1 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="label-sm">Next race</span>
          <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
          <span className="label-sm" style={{ color: 'var(--text)', fontWeight: 700 }}>Berlin Marathon</span>
          <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
          <span className="label-sm">In <span className="mono" style={{ color: 'var(--text)' }}>42</span> days</span>
          <span className="pill pill-soft-indigo" style={{ marginLeft: 4 }}>27 Sep · 06:15 CET</span>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span className="mono" style={{ fontSize: 56, fontWeight: 600, color: 'var(--primary)', letterSpacing: -2, lineHeight: 1 }}>
              3:44:12
            </span>
            <span className="mono" style={{ fontSize: 14, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconArrowDown size={12} /> 02:46 vs 30d
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mono">±9 min</span>
            <span>confidence interval · </span>
            <span>Daniels + XGBoost · last run <span className="mono" style={{ color: 'var(--text)' }}>9m</span> ago</span>
          </div>
        </div>
      </div>

      {/* Right — breakdown */}
      <div style={{
        width: 280, flexShrink: 0, borderLeft: '1px solid var(--border)', paddingLeft: 24,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div>
          <div className="label-sm" style={{ marginBottom: 12 }}>Breakdown</div>
          {[
            ['Base time', '3:41:05', null, IconTimer, 'var(--muted)'],
            ['Course', '+0:28', 'coeff 1.002', IconMountain, 'var(--text)'],
            ['Weather', '+2:39', '17°C · 65% RH', IconCloud, 'var(--warning)'],
          ].map(([k, v, sub, Icon, vc]) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '16px 1fr auto', columnGap: 10, alignItems: 'center', padding: '4px 0' }}>
              <Icon size={13} style={{ color: 'var(--muted-2)' }} />
              <div>
                <span style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>{k}</span>
                {sub && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>{sub}</span>}
              </div>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: vc }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-coral" style={{ height: 34, fontSize: 12.5 }}>
            View prediction details <IconArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Metric tile ──────────────────────────────────────────────────────
function MetricCard({ label, value, suffix, delta, deltaTone = 'success', deltaIcon, caption, sparkData, sparkColor = '#4F46E5' }) {
  const deltaColor = {
    success: 'var(--success)', muted: 'var(--muted)', warning: 'var(--warning)', danger: 'var(--danger)',
  }[deltaTone];
  const DeltaIcon = deltaIcon || IconArrowUp;
  return (
    <div className="card hoverable" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 124 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label-sm">{label}</span>
        {sparkData && <Sparkline values={sparkData} width={56} height={20} color={sparkColor} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="mono" style={{ fontSize: 30, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.8, lineHeight: 1 }}>
          {value}
        </span>
        {suffix && <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>{suffix}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
        <DeltaIcon size={12} style={{ color: deltaColor }} />
        <span className="mono" style={{ color: deltaColor, fontWeight: 600 }}>{delta}</span>
        <span style={{ color: 'var(--muted)' }}>{caption}</span>
      </div>
    </div>
  );
}

function MetricsRow() {
  // Mini spark data — coherent with each metric
  const ctlSpark = SERIES.slice(-28).map(d => d.ctl);
  const atlSpark = SERIES.slice(-28).map(d => d.atl);
  const tsbSpark = SERIES.slice(-28).map(d => d.tsb);
  const vdotSpark = [45.2, 45.4, 45.5, 45.6, 45.8, 46.0, 46.1, 46.3, 46.4, 46.5, 46.7, 46.8, 46.9, 47.0, 47.1, 47.2];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
      <MetricCard label="VDOT" value="47.2" delta="+1.4" caption="this month"
                  deltaTone="success" deltaIcon={IconArrowUp} sparkData={vdotSpark} sparkColor="#10B981" />
      <MetricCard label="CTL · Fitness" value="58" delta="+4" caption="42d EMA"
                  deltaTone="success" deltaIcon={IconArrowUp} sparkData={ctlSpark} sparkColor="#4F46E5" />
      <MetricCard label="ATL · Fatigue" value="61" delta="+7" caption="7d EMA"
                  deltaTone="warning" deltaIcon={IconArrowUp} sparkData={atlSpark} sparkColor="#F97066" />
      <MetricCard label="TSB · Form" value="−3" delta="in zone" caption="−10 to +5"
                  deltaTone="muted" deltaIcon={IconArrowFlat} sparkData={tsbSpark} sparkColor="#64748B" />
    </div>
  );
}

function ChartCard() {
  const [range, setRange] = React.useState('84d');
  return (
    <div className="card" style={{ padding: 20, height: 320, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div className="label-sm">Fitness / Fatigue / Form</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
            {[
              ['CTL · fitness', '#4F46E5', '58', 'solid'],
              ['ATL · fatigue', '#F97066', '61', 'dashed'],
              ['TSB · form', '#10B981', '−3', 'solid'],
            ].map(([n, c, v, kind]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 14, height: 2, background: kind === 'solid' ? c : 'transparent', borderTop: kind === 'dashed' ? `2px dashed ${c}` : 'none' }} />
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{n}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
          {['28d', '84d', '6mo', '1y'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className="mono"
              style={{
                background: range === r ? '#fff' : 'transparent',
                border: range === r ? '1px solid var(--border)' : '1px solid transparent',
                color: range === r ? 'var(--text)' : 'var(--muted)',
                borderRadius: 5, padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>{r}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <LineChart height={232} />
      </div>
    </div>
  );
}

// ── Race readiness card ─────────────────────────────────────────────
function ReadinessCard() {
  return (
    <div className="card" style={{ padding: 20, height: 340, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="label-sm">Race readiness</div>
        <span className="pill pill-soft-warn">Moderate</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: 6 }}>
        <RadialGauge value={72} size={220} stroke={14} />
        <div style={{ position: 'absolute', top: 56, left: 0, right: 0, textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 50, fontWeight: 600, color: 'var(--primary)', letterSpacing: -1.5, lineHeight: 1 }}>72</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 4 }}>out of 100</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 4 }}>
        <ComponentBar label="TSB score"     score={85} />
        <ComponentBar label="Consistency"   score={72} />
        <ComponentBar label="Long runs"     score={65} />
        <ComponentBar label="VDOT trend"    score={50} />
        <ComponentBar label="Volume"        score={70} />
      </div>
    </div>
  );
}

function WeeklyVolumeCard() {
  const spark = [42, 51, 49, 58, 55, 62, 58, 67.4];
  return (
    <div className="card" style={{ padding: 18, height: 124 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label-sm">This week · vol</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Mon → Sun</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="mono" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.6, lineHeight: 1 }}>67.4</span>
            <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>km</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
            8w avg <span className="mono" style={{ color: 'var(--text)' }}>58.2 km</span>
            <span style={{ color: 'var(--success)', marginLeft: 8 }} className="mono">+15.8%</span>
          </div>
        </div>
        <Sparkline values={spark} width={108} height={36} color="#4F46E5" fill />
      </div>
    </div>
  );
}

function ActivitiesCard() {
  const kindDot = {
    long: '#1E1B4B', easy: '#94A3B8', workout: '#F97066',
  };
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label-sm">Recent activities</span>
        <a style={{ fontSize: 12, color: 'var(--primary-2)', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          See all <IconArrowRight size={11} />
        </a>
      </div>
      <div style={{ height: 1, background: 'var(--border)' }} />
      <div className="nice-scroll" style={{ maxHeight: 280, overflow: 'auto' }}>
        {ACTIVITIES.map((a, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ height: 1, background: 'var(--border-soft)', margin: '0 18px' }} />}
            <div className="act-row" style={{
              display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', columnGap: 12,
              padding: '12px 18px', height: 56,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="mono" style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600, lineHeight: 1 }}>{a.date.split(' ')[0]}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{a.dow.toUpperCase()}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 3, background: kindDot[a.kind] }} />
                  <span style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                  {a.distance} · {a.pace}
                </div>
              </div>
              <span className="pill pill-indigo mono">{a.vdot}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── The dashboard ───────────────────────────────────────────────────
function Dashboard() {
  return (
    <div data-screen-label="Desktop Dashboard" style={{
      display: 'flex', width: 1440, height: 920, background: 'var(--bg)', overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)',
    }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <div className="nice-scroll" style={{ flex: 1, overflow: 'auto', padding: '24px 32px 40px' }}>
          {/* Page header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: 'var(--text)' }}>Good morning, Marcus.</h1>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                Tuesday · 20 May · <span className="mono">42 days</span> to Berlin · synced from Garmin Forerunner 265
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost"><IconCalendar size={13} /> Block calendar</button>
              <button className="btn btn-ghost"><IconRefresh size={13} /> Re-run prediction</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <HeroCard />
              <MetricsRow />
              <ChartCard />
            </div>
            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <ReadinessCard />
              <WeeklyVolumeCard />
              <ActivitiesCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, Sidebar, TopBar });
