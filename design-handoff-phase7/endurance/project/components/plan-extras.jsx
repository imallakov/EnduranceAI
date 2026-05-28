// Training Plan — extras: Drawer, Generate modal, Empty state, Export menu,
// plus zoom-detail and side-by-side cell artboards for the canvas.

// ──────────────────────────────────────────────────────────────────
// Export menu — small floating popover
// ──────────────────────────────────────────────────────────────────
function ExportMenu() {
  const items = [
    { label: 'Export as PDF',     sub: 'Print-ready, week-per-page',    icon: 'PDF', accent: '#DC2626' },
    { label: 'Export as CSV',     sub: 'Raw workouts · 16 weeks',       icon: 'CSV', accent: '#10B981' },
    { label: 'Sync to Garmin',    sub: 'Push as structured workouts',   icon: '↗',   accent: '#4F46E5' },
    { label: 'Calendar (.ics)',   sub: 'Subscribe in Apple / Google',   icon: 'ICS', accent: '#F59E0B' },
  ];
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
      width: 280, background: '#fff', border: '1px solid var(--border)',
      borderRadius: 10, padding: 6,
      boxShadow: '0 12px 32px -8px rgba(15,23,42,0.14), 0 4px 12px -4px rgba(15,23,42,0.08)',
      zIndex: 20,
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '36px 1fr auto', alignItems: 'center', columnGap: 10,
          padding: '9px 10px', borderRadius: 7, cursor: 'pointer',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 7,
            background: `${it.accent}14`, color: it.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10.5, fontWeight: 700, fontFamily: 'Geist Mono, monospace', letterSpacing: 0.4,
          }}>{it.icon}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{it.label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{it.sub}</div>
          </div>
          <IconChevRight size={12} style={{ color: 'var(--muted-2)' }} />
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Workout detail drawer — slides in from the right
// ──────────────────────────────────────────────────────────────────
function WorkoutDrawer({ day = CURRENT_WEEK.days[2], onClose = () => {} }) {
  const t = TYPES[day.type];
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 420, background: '#fff', borderLeft: '1px solid var(--border)',
      boxShadow: '-24px 0 48px -16px rgba(15,23,42,0.10)',
      display: 'flex', flexDirection: 'column', zIndex: 30,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
          <span>Week 8</span>
          <IconChevRight size={11} />
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{day.dow} · {day.date}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }}>
            <IconChevRight size={13} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }}>
            <IconChevRight size={13} />
          </button>
          <button className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }} onClick={onClose}>
            <IconClose size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="nice-scroll" style={{ flex: 1, overflow: 'auto', padding: '20px 24px 24px' }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <WorkoutIcon type={day.type} size={22} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: t.color }}>
            {t.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Late Quality · W8 of 16</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: 'var(--text)' }}>
          Wednesday Tempo
        </h2>
        <div className="mono" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          12 km · est. 56 minutes
        </div>

        {/* Big metric block */}
        <div style={{
          marginTop: 18, padding: 18, borderRadius: 12,
          background: 'linear-gradient(180deg, #FAFAF9 0%, #fff 100%)',
          border: '1px solid var(--border)',
        }}>
          <div className="label-sm" style={{ fontSize: 10 }}>Target pace</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 38, fontWeight: 600, color: 'var(--primary)', letterSpacing: -1, lineHeight: 1 }}>4:30</span>
            <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>/km</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>±3% range</span>
            <span className="mono" style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>4:22 — 4:38</span>
          </div>
          {/* range bar */}
          <div style={{ marginTop: 10, position: 'relative', height: 6, background: 'var(--border-soft)', borderRadius: 3 }}>
            <div style={{ position: 'absolute', left: '35%', right: '20%', height: '100%', background: 'rgba(245,158,11,0.30)', borderRadius: 3 }} />
            <div style={{ position: 'absolute', left: 'calc(50% - 1px)', top: -2, width: 2, height: 10, background: '#F59E0B', borderRadius: 1 }} />
          </div>
        </div>

        {/* Structure breakdown */}
        <div style={{ marginTop: 22 }}>
          <div className="label-sm" style={{ marginBottom: 10 }}>Structure</div>
          <div style={{ marginBottom: 14 }}>
            <StructureBar day={day} totalKm={day.km} height={10} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { kind: 'easy',  label: 'Warmup',    km: 2, pace: '5:20', zone: 'Easy' },
              { kind: 'tempo', label: 'Threshold', km: 8, pace: '4:30', zone: 'Tempo' },
              { kind: 'easy',  label: 'Cooldown',  km: 2, pace: '5:20', zone: 'Easy' },
            ].map((seg, i, arr) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ height: 1, background: 'var(--border-soft)' }} />}
                <div style={{ display: 'grid', gridTemplateColumns: '8px 1fr auto auto', alignItems: 'center', columnGap: 12, padding: '12px 0' }}>
                  <span style={{ width: 6, height: 28, borderRadius: 2, background: TYPES[seg.kind].color, opacity: seg.kind === 'easy' ? 0.45 : 1 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{seg.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{seg.zone} pace</div>
                  </div>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{seg.km} km</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--muted)', minWidth: 38, textAlign: 'right' }}>{seg.pace}/km</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Coach note */}
        <div style={{ marginTop: 22, padding: 14, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div className="label-sm" style={{ fontSize: 10, marginBottom: 6 }}>Why this workout</div>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55 }}>
            Threshold work raises your lactate ceiling — the pace you can sustain for an hour comfortably hard.
            Keep the tempo block <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>4:30/km</span> ±5 sec.
            If the second half feels easier than the first, you're holding back; if you fade past 4:40, end early.
          </p>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
          <button className="btn btn-coral" style={{ flex: 1, height: 38 }}>
            <IconCheck size={14} stroke="2.5" /> Mark complete
          </button>
          <button className="btn btn-ghost" style={{ height: 38 }}>
            <IconRefresh size={13} /> Swap <IconChevDown size={11} />
          </button>
        </div>

        {/* Previous / next footer */}
        <div style={{
          marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <IconChevRight size={11} style={{ transform: 'rotate(180deg)' }} />
            <div>
              <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted-2)' }}>Previous</div>
              <div style={{ color: 'var(--text)', fontWeight: 500, marginTop: 1 }}>Tue · Easy 10 km</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', textAlign: 'right' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted-2)' }}>Next</div>
              <div style={{ color: 'var(--text)', fontWeight: 500, marginTop: 1 }}>Thu · Easy 8 km</div>
            </div>
            <IconChevRight size={11} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Empty state — no plan yet
// ──────────────────────────────────────────────────────────────────
function EmptyPlanState() {
  return (
    <div data-screen-label="Training Plan — Empty" style={{
      display: 'flex', width: 1440, height: 920, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)',
    }}>
      <Sidebar defaultActive="Training plan" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PlanTopBar />
        <div style={{ padding: '24px 32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Minimal header */}
          <div>
            <span className="label-sm">Training plan</span>
            <h1 style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>No active plan</h1>
          </div>
          {/* Centered hero card */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 720, padding: 40, borderRadius: 16,
              background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)',
              color: '#fff', position: 'relative', overflow: 'hidden',
              boxShadow: '0 24px 60px -20px rgba(30,27,75,0.45)',
            }}>
              {/* Decorative pattern - 16 phase ticks like a mini strip */}
              <svg viewBox="0 0 720 60" style={{ position: 'absolute', left: 0, right: 0, bottom: 28, width: '100%', height: 60, opacity: 0.95 }}>
                <defs>
                  <filter id="emptyGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" /></filter>
                </defs>
                {PHASES.map((p, i) => {
                  const ratios = [0, 0.2, 0.45, 0.75, 1].map(r => 40 + r * 640);
                  return <rect key={i} x={ratios[i]} y="22" width={ratios[i+1] - ratios[i] - 2} height="6" rx="3" fill={p.color} opacity="0.55" />;
                })}
                {Array.from({ length: 16 }).map((_, i) => (
                  <circle key={i} cx={40 + ((i + 0.5) / 16) * 640} cy="25" r="1.5" fill="rgba(255,255,255,0.4)" />
                ))}
              </svg>

              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
                  Daniels methodology · evidence-based
                </div>
                <h2 style={{ margin: '10px 0 0', fontSize: 34, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1.15 }}>
                  Build a marathon plan<br/>tuned to your fitness.
                </h2>
                <p style={{ margin: '14px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, maxWidth: 520 }}>
                  16 weeks of structured workouts across four phases — Base, Early Quality,
                  Late Quality, and Taper — generated from your VDOT, days available,
                  and target race. Sync to Garmin and adapt week-to-week.
                </p>

                {/* Race + actions */}
                <div style={{ marginTop: 96, display: 'flex', alignItems: 'center', gap: 20 }}>
                  <button className="btn btn-coral" style={{ height: 42, padding: '0 18px', fontSize: 13.5 }}>
                    <IconPlan size={14} /> Generate your training plan
                  </button>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                    Takes about <span className="mono" style={{ color: '#fff' }}>8 seconds</span> · adjustable any time
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Sub guidance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 'auto' }}>
            {[
              ['01', 'Pick a target race', 'Berlin Marathon · Sep 27 is already in your workspace.'],
              ['02', 'Confirm pace zones',  'Your VDOT 47.1 sets E / M / T / I / R targets automatically.'],
              ['03', 'Generate · review · go', 'Edit any workout, swap types, or regenerate with new inputs.'],
            ].map(([n, ttl, sub]) => (
              <div key={n} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted-2)', letterSpacing: 0.5 }}>{n}</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 6 }}>{ttl}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Generate plan modal — wizard
// ──────────────────────────────────────────────────────────────────
function GenerateModal({ onClose = () => {} }) {
  return (
    <>
      {/* backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 40 }} />
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: 720, background: '#fff', borderRadius: 14,
        boxShadow: '0 32px 80px -20px rgba(15,23,42,0.30)', zIndex: 41, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="label-sm">Generate plan</div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600 }}>Configure your training block</h2>
          </div>
          <button className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }} onClick={onClose}>
            <IconClose size={13} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 28, alignItems: 'center' }}>
          {[
            ['1', 'Race & date', true],
            ['2', 'Schedule', true],
            ['3', 'Target', false],
            ['4', 'Review', false],
          ].map(([n, lbl, done], i, arr) => (
            <React.Fragment key={n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 11,
                  background: i === 2 ? '#F97066' : done ? '#10B981' : 'var(--border-soft)',
                  color: i === 2 ? '#fff' : done ? '#fff' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: 'Geist Mono, monospace',
                }}>
                  {done ? <IconCheck size={11} stroke="3" /> : n}
                </div>
                <span style={{ fontSize: 12.5, fontWeight: i === 2 ? 600 : 500, color: i === 2 ? 'var(--text)' : 'var(--muted)' }}>{lbl}</span>
              </div>
              {i < arr.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Body — step 3 */}
        <div style={{ padding: 24 }}>
          {/* Race summary */}
          <div style={{
            padding: 14, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #1E1B4B, #4F46E5)', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist Mono, monospace', fontWeight: 700 }}>
              BLN
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Berlin Marathon '26</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                <span className="mono">27 Sep 2026</span> · 16 weeks from <span className="mono">8 Jun</span> · 5 days/week
              </div>
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--primary-2)', fontWeight: 500, cursor: 'pointer' }}>Edit ↗</span>
          </div>

          {/* Target time field */}
          <div className="label-sm" style={{ marginBottom: 10 }}>Target finish time</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', padding: '14px 20px',
              border: '1.5px solid #4F46E5', borderRadius: 10, background: '#fff',
              boxShadow: '0 0 0 3px rgba(79,70,229,0.12)',
            }}>
              <span className="mono" style={{ fontSize: 32, fontWeight: 600, color: 'var(--primary)', letterSpacing: -1 }}>3:44:00</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>From your VDOT <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>47.1</span> · model predicts <span className="mono" style={{ color: 'var(--success)', fontWeight: 600 }}>3:44:12</span> ±9 min</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                {['3:30', '3:45', '4:00', '4:15'].map((s, i) => (
                  <span key={i} className="chip" style={{ cursor: 'pointer', color: s === '3:45' ? 'var(--text)' : 'var(--muted)' }}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Pace zones preview */}
          <div style={{ marginTop: 22 }}>
            <div className="label-sm" style={{ marginBottom: 10 }}>Implied pace zones</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {PACE_ZONES.map(z => (
                <div key={z.key} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: z.color, color: '#fff',
                                   display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                   fontSize: 9.5, fontWeight: 700, fontFamily: 'Geist Mono, monospace' }}>{z.key}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{z.name}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 6 }}>{z.pace}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{z.unit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced toggle */}
          <div style={{ marginTop: 22, padding: 14, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>Include cutback weeks every 4th week</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Recommended for amateurs · reduces injury risk by ~28%</div>
            </div>
            {/* toggle */}
            <div style={{ width: 36, height: 20, background: '#4F46E5', borderRadius: 10, position: 'relative', cursor: 'pointer' }}>
              <div style={{ position: 'absolute', right: 2, top: 2, width: 16, height: 16, borderRadius: 8, background: '#fff' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Step <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>3</span> of <span className="mono">4</span></span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost">Back</button>
            <button className="btn btn-primary">Review plan <IconArrowRight size={12} /></button>
          </div>
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Zoom artboard — Phase Strip at 2× detail
// ──────────────────────────────────────────────────────────────────
function PhaseStripDetail() {
  return (
    <div style={{
      width: 1200, padding: 40, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 18 }}>
        <span className="label-sm">Artboard 2</span>
        <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Phase progression strip · the centerpiece</h2>
      </div>
      <div style={{ transform: 'scale(1.0)', transformOrigin: 'top left' }}>
        <PhaseStrip height={260} />
      </div>
      {/* Annotations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 22 }}>
        {[
          ['4 colored bands',  'Proportional to phase ratios (20/25/30/25). Past phases at full opacity, upcoming at 30%.'],
          ['16 tick marks',    'One per week. Past weeks brighten the tick — visual progress signal.'],
          ['Glow stack',       '4-layer SVG bloom (44/28/14/4 radii, 26/16/8/0 blur). Same DNA as the Activity map polyline.'],
          ['Race terminus',    'Coral dot with white stroke — Race Day. Reinforces "what we\u2019re training for."'],
        ].map(([t, sub], i) => (
          <div key={i} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted-2)' }}>0{i+1}</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>{t}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Zoom artboard — Current Week 7-day grid (focused)
// ──────────────────────────────────────────────────────────────────
function CurrentWeekDetail() {
  return (
    <div style={{
      width: 1200, padding: 40, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 18 }}>
        <span className="label-sm">Artboard 3</span>
        <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Current week · Mon → Sun</h2>
      </div>
      <CurrentWeekGrid />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Workout cell variants — 7 side by side
// ──────────────────────────────────────────────────────────────────
function WorkoutCellVariants() {
  const variants = [
    { dow: 'MON', date: 'Jul 13', type: 'rest',     km: null, pace: null,         completed: false, today: false, missed: false },
    { dow: 'TUE', date: 'Jul 14', type: 'easy',     km: 10,   pace: '5:20/km',    completed: true,  today: false, missed: false },
    { dow: 'WED', date: 'Jul 15', type: 'long',     km: 28,   pace: '5:20→4:48',  completed: false, today: false, missed: false,
      structure: [
        { kind: 'easy', km: 20, label: 'Easy', pace: '5:20' },
        { kind: 'marathon_pace', km: 8, label: 'M-pace', pace: '4:48' },
      ] },
    { dow: 'THU', date: 'Jul 16', type: 'tempo',    km: 12,   pace: '4:30/km',    completed: false, today: true,  missed: false,
      structure: [
        { kind: 'easy', km: 2, label: 'WU', pace: '5:20' },
        { kind: 'tempo', km: 8, label: 'T',  pace: '4:30' },
        { kind: 'easy', km: 2, label: 'CD', pace: '5:20' },
      ] },
    { dow: 'FRI', date: 'Jul 17', type: 'interval', km: 12,   pace: '4:08/km',    completed: false, today: false, missed: false,
      structure: [
        { kind: 'easy',  km: 2, label: 'WU', pace: '5:20' },
        { kind: 'interval', reps: 6, rep_m: 1000, recovery: '90s', pace: '4:08' },
        { kind: 'easy',  km: 2, label: 'CD', pace: '5:20' },
      ] },
    { dow: 'SAT', date: 'Jul 18', type: 'repetition', km: 8,  pace: '3:58/km',    completed: false, today: false, missed: false },
    { dow: 'SUN', date: 'Jul 19', type: 'marathon_pace', km: 16, pace: '4:48/km', completed: false, today: false, missed: true },
  ];
  return (
    <div style={{
      width: 1200, padding: 40, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 18 }}>
        <span className="label-sm">Artboard 4</span>
        <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Workout cell · 7 variants + states</h2>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          Rest · Easy (completed) · Long w/ M-pace · Tempo (today) · Interval · Repetition · Marathon-pace (missed)
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
        {variants.map((d, i) => <WorkoutCell key={i} day={d} />)}
      </div>
      {/* State legend */}
      <div style={{ marginTop: 24, padding: 16, background: '#fff', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div className="label-sm" style={{ marginBottom: 10 }}>States</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            ['Default',  '1px solid Border · white bg',                  'var(--border)'],
            ['Today',    '2px solid Indigo Mid + corner badge',          '#4F46E5'],
            ['Completed','Sage Emerald wash · coral check filled',       '#10B981'],
            ['Missed',   '0.7 opacity · muted bg · for past skipped',    'var(--muted-2)'],
          ].map(([n, sub, c]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: c }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{n}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// All-weeks list compact (artboard 8)
// ──────────────────────────────────────────────────────────────────
function AllWeeksListDetail() {
  return (
    <div style={{ width: 460, padding: 28, background: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ marginBottom: 14 }}>
        <span className="label-sm">Artboard 8</span>
        <h2 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>All weeks · row component</h2>
      </div>
      <AllWeeksList />
    </div>
  );
}

// Weekly volume detail (artboard 9)
function VolumeChartDetail() {
  return (
    <div style={{ width: 460, padding: 28, background: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ marginBottom: 14 }}>
        <span className="label-sm">Artboard 9</span>
        <h2 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Weekly volume · 16 bars</h2>
      </div>
      <VolumeChart />
    </div>
  );
}

// Export menu detail (artboard 10)
function ExportMenuDetail() {
  return (
    <div style={{ width: 460, padding: 28, background: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', minHeight: 320 }}>
      <div style={{ marginBottom: 14 }}>
        <span className="label-sm">Artboard 10</span>
        <h2 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Export menu</h2>
      </div>
      {/* Faux trigger button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div className="btn btn-ghost" style={{ pointerEvents: 'none' }}>
          Export <IconChevDown size={12} />
        </div>
      </div>
      {/* Menu positioned absolutely under trigger */}
      <div style={{ position: 'relative', height: 0 }}>
        <div style={{ position: 'absolute', right: 28, top: 0 }}>
          <div style={{ position: 'relative' }}>
            <ExportMenu />
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Plan page with drawer open — crop view for the canvas
// ──────────────────────────────────────────────────────────────────
function PlanPageWithDrawer() {
  return (
    <div data-screen-label="Training Plan — Drawer Open" style={{
      position: 'relative', width: 1440, height: 920, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)', overflow: 'hidden', display: 'flex',
    }}>
      <Sidebar defaultActive="Training plan" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <PlanTopBar />
        <div style={{ padding: '24px 32px', overflow: 'hidden', flex: 1 }}>
          <PlanPageHeader />
          <PhaseStrip />
          <div style={{ height: 24 }} />
          <CurrentWeekGrid />
        </div>
      </div>
      {/* Backdrop covers only the right portion of the content area */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 240, background: 'rgba(15,23,42,0.18)', backdropFilter: 'blur(1px)', zIndex: 20 }} />
      <WorkoutDrawer />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Plan page with generate modal open
// ──────────────────────────────────────────────────────────────────
function PlanPageWithGenerate() {
  return (
    <div data-screen-label="Training Plan — Generate Modal" style={{
      position: 'relative', width: 1440, height: 920, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)', overflow: 'hidden', display: 'flex',
    }}>
      <Sidebar defaultActive="Training plan" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PlanTopBar />
        <div style={{ padding: '24px 32px' }}>
          <PlanPageHeader />
          <PhaseStrip />
        </div>
      </div>
      <GenerateModal />
    </div>
  );
}

// Plan page with export menu open — crop
function PlanPageWithExport() {
  return (
    <div data-screen-label="Training Plan — Export Open" style={{
      position: 'relative', width: 1440, height: 720, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)', overflow: 'hidden', display: 'flex',
    }}>
      <Sidebar defaultActive="Training plan" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <PlanTopBar />
        <div style={{ padding: '24px 32px' }}>
          <PlanPageHeader exportOpen={true} />
          <PhaseStrip />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ExportMenu, WorkoutDrawer, EmptyPlanState, GenerateModal,
  PhaseStripDetail, CurrentWeekDetail, WorkoutCellVariants,
  AllWeeksListDetail, VolumeChartDetail, ExportMenuDetail,
  PlanPageWithDrawer, PlanPageWithGenerate, PlanPageWithExport,
});
