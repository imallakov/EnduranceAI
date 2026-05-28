// Mobile variant — iPhone 14 sized, hero card + metrics row stacked.
// 390 × 844 viewport with native iOS status bar.

function MobileStatusBar() {
  return (
    <div style={{
      height: 47, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 15, fontWeight: 600, color: 'var(--text)',
    }}>
      <span className="mono">9:41</span>
      <div style={{ width: 110, height: 32, background: '#0F172A', borderRadius: 18 }} />
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {/* Signal */}
        <svg width="17" height="11" viewBox="0 0 17 11"><g fill="var(--text)">
          <rect x="0" y="7" width="3" height="4" rx="0.5"/>
          <rect x="5" y="5" width="3" height="6" rx="0.5"/>
          <rect x="10" y="2" width="3" height="9" rx="0.5"/>
          <rect x="14" y="0" width="3" height="11" rx="0.5" opacity="0.35"/>
        </g></svg>
        {/* WiFi */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M8 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm0-3.2c1.4 0 2.6.5 3.5 1.4l-1.2 1.2A3.2 3.2 0 0 0 8 7c-.9 0-1.7.3-2.3.9L4.5 6.7C5.4 5.8 6.6 5.3 8 5.3zm0-3.3c2.3 0 4.3.9 5.8 2.4l-1.2 1.2A6.5 6.5 0 0 0 8 3a6.5 6.5 0 0 0-4.6 1.9L2.2 3.7C3.7 2.9 5.7 2 8 2z" fill="var(--text)"/>
        </svg>
        {/* Battery */}
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="22" height="12" rx="3" fill="none" stroke="var(--text)" opacity="0.4"/>
          <rect x="2" y="2" width="19" height="9" rx="1.5" fill="var(--text)"/>
          <rect x="23.5" y="4" width="2" height="5" rx="1" fill="var(--text)" opacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

function MobileHeader() {
  return (
    <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconLogo size={22} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>EnduranceAI</span>
          <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Dashboard</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" style={{ width: 36, height: 36, padding: 0, justifyContent: 'center' }}>
          <IconSearch size={15} />
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: 18, background: 'linear-gradient(135deg, #1E1B4B, #4F46E5)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600, letterSpacing: 0.4,
        }}>MS</div>
      </div>
    </div>
  );
}

function MobileHeroCard() {
  return (
    <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', rowGap: 4 }}>
        <span className="label-sm" style={{ fontSize: 10 }}>Next race</span>
        <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
        <span className="label-sm" style={{ fontSize: 10, color: 'var(--text)', fontWeight: 700 }}>Berlin</span>
        <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
        <span className="label-sm" style={{ fontSize: 10 }}>
          in <span className="mono" style={{ color: 'var(--text)' }}>42</span>d
        </span>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span className="mono" style={{ fontSize: 48, fontWeight: 600, color: 'var(--primary)', letterSpacing: -1.6, lineHeight: 1 }}>
            3:44:12
          </span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <IconArrowDown size={11} /> 2:46
          </span>
        </div>
        <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--muted)' }}>
          <span className="mono">±9 min</span> · CI · Daniels + XGBoost
        </div>
      </div>

      {/* Breakdown row */}
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {[
          ['Base', '3:41:05', null, 'var(--muted)'],
          ['Course', '+0:28', '×1.002 elev', 'var(--text)'],
          ['Weather', '+2:39', '17°C · 65%', 'var(--warning)'],
        ].map(([k, v, sub, color]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 11.5, color: 'var(--text)' }}>
              {k}{sub && <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 10.5 }}>{sub}</span>}
            </span>
            <span className="mono" style={{ fontSize: 12, fontWeight: 600, color }}>{v}</span>
          </div>
        ))}
      </div>

      <button className="btn btn-coral" style={{ height: 40, justifyContent: 'center', fontSize: 13 }}>
        View prediction details <IconArrowRight size={13} />
      </button>
    </div>
  );
}

function MobileMetricsGrid() {
  const vdotSpark = [45.8, 46.0, 46.2, 46.4, 46.7, 46.9, 47.0, 47.2];
  const ctlSpark = SERIES.slice(-14).map(d => d.ctl);
  const atlSpark = SERIES.slice(-14).map(d => d.atl);
  const tsbSpark = SERIES.slice(-14).map(d => d.tsb);

  const Cell = ({ label, value, suffix, delta, deltaTone, deltaIcon, spark, sparkColor }) => {
    const dc = { success: 'var(--success)', warning: 'var(--warning)', muted: 'var(--muted)' }[deltaTone];
    const D = deltaIcon || IconArrowUp;
    return (
      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="label-sm" style={{ fontSize: 10 }}>{label}</span>
          {spark && <Sparkline values={spark} width={36} height={14} color={sparkColor} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span className="mono" style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.6, lineHeight: 1 }}>{value}</span>
          {suffix && <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{suffix}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5 }}>
          <D size={10} style={{ color: dc }} />
          <span className="mono" style={{ color: dc, fontWeight: 600 }}>{delta}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <Cell label="VDOT" value="47.2" delta="+1.4 / mo" deltaTone="success" spark={vdotSpark} sparkColor="#10B981" />
        </div>
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <Cell label="CTL · Fitness" value="58" delta="+4" deltaTone="success" spark={ctlSpark} sparkColor="#4F46E5" />
        </div>
        <div style={{ borderRight: '1px solid var(--border)' }}>
          <Cell label="ATL · Fatigue" value="61" delta="+7" deltaTone="warning" spark={atlSpark} sparkColor="#F97066" />
        </div>
        <div>
          <Cell label="TSB · Form" value="−3" delta="in zone" deltaTone="muted" deltaIcon={IconArrowFlat} spark={tsbSpark} sparkColor="#64748B" />
        </div>
      </div>
    </div>
  );
}

function MobileTabBar() {
  const tabs = [
    ['Dashboard', IconDashboard, true],
    ['Activities', IconActivity, false],
    ['Plan', IconPlan, false],
    ['Race', IconRace, false],
    ['Profile', IconSettings, false],
  ];
  return (
    <div style={{
      borderTop: '1px solid var(--border)', background: '#fff', padding: '8px 12px 20px',
      display: 'flex', justifyContent: 'space-between',
    }}>
      {tabs.map(([n, Ic, active]) => (
        <div key={n} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          color: active ? 'var(--primary)' : 'var(--muted-2)',
          flex: 1, padding: '4px 0',
        }}>
          <Ic size={18} />
          <span style={{ fontSize: 10, fontWeight: active ? 600 : 500 }}>{n}</span>
        </div>
      ))}
    </div>
  );
}

function MobileVariant() {
  return (
    <div data-screen-label="Mobile · Hero + Metrics" style={{
      width: 390, height: 844, background: '#000', borderRadius: 54, padding: 12,
      boxShadow: '0 30px 60px -20px rgba(15,23,42,0.4)',
    }}>
      <div style={{
        width: '100%', height: '100%', background: 'var(--bg)', borderRadius: 42,
        overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column',
      }}>
        <MobileStatusBar />
        <MobileHeader />
        <div className="nice-scroll" style={{ flex: 1, overflow: 'auto', padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Greeting */}
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>Good morning, Marcus</h1>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
              Tue 20 May · synced <span className="mono">14m</span> ago
            </div>
          </div>

          <MobileHeroCard />
          <MobileMetricsGrid />

          {/* Tiny readiness teaser */}
          <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', width: 56, height: 36 }}>
              <RadialGauge value={72} size={62} stroke={6} />
              <div style={{ position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center' }}>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>72</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label-sm" style={{ fontSize: 10 }}>Race readiness</div>
              <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 2 }}>Moderate · TSB driving the score</div>
            </div>
            <IconChevRight size={14} style={{ color: 'var(--muted-2)' }} />
          </div>
        </div>
        <MobileTabBar />
      </div>
    </div>
  );
}

Object.assign(window, { MobileVariant });
