// GPX Upload Modal — two-step flow (drop zone → preview + metadata)

function GpxModalShade({ children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 120, zIndex: 50, backdropFilter: 'blur(2px)',
    }}>
      {children}
    </div>
  );
}

// ── Step 1: Drop zone ───────────────────────────────────────────
function GpxModalStep1() {
  return (
    <div style={{
      width: 1040, background: '#fff', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 32px 80px -16px rgba(15,23,42,0.35), 0 2px 0 rgba(0,0,0,0.04) inset',
      border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 16px', borderBottom: '1px solid var(--border-soft)',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.3 }}>
            Add custom marathon
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
            Upload a GPX file to add a race to your catalog. We'll compute its difficulty and let you use it for predictions.
          </div>
        </div>
        <button className="btn btn-ghost" aria-label="Close" style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}>
          <IconClose size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 24 }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          {[
            { n: 1, label: 'Upload file', active: true },
            { n: 2, label: 'Review & save', active: false },
          ].map((s, i, arr) => (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 11,
                  background: s.active ? 'var(--primary-2)' : '#F1F5F9',
                  color: s.active ? '#fff' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }} className="mono">{s.n}</div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: s.active ? 'var(--text)' : 'var(--muted)' }}>{s.label}</span>
              </div>
              {i < arr.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Drop zone */}
        <div style={{
          height: 360, borderRadius: 14,
          border: '2px dashed var(--border)',
          background: 'linear-gradient(180deg, #FAFAF9 0%, #FFFFFF 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 32, background: '#EEF2FF',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #DBE0FF',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A7 7 0 1 0 6 18h11.5z" />
              <path d="M12 12v7" />
              <path d="m9 15 3-3 3 3" />
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Drop your .gpx file here</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            or <a style={{ color: 'var(--primary-2)', fontWeight: 500, cursor: 'pointer' }}>click to browse</a>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {['Garmin', 'Strava', 'gpx.studio', 'Komoot'].map(s => (
              <span key={s} className="chip" style={{ height: 22, fontSize: 11, color: 'var(--muted)' }}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: 14, fontSize: 11.5, color: 'var(--muted)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>We support .gpx files from any GPS app. Max 10 MB.</span>
          <span className="mono">42° 26.3' N · ELEV ↑ · DIFFICULTY</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 24px', borderTop: '1px solid var(--border-soft)',
        display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#FAFAF9',
      }}>
        <button className="btn btn-ghost">Cancel</button>
        <button className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
          Continue <IconArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Preview + metadata ──────────────────────────────────
function GpxModalStep2() {
  return (
    <div style={{
      width: 1040, background: '#fff', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 32px 80px -16px rgba(15,23,42,0.35)',
      border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 16px', borderBottom: '1px solid var(--border-soft)',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.3 }}>
            Add custom marathon
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
            Review the auto-computed analysis below, fill in the metadata, then save.
          </div>
        </div>
        <button className="btn btn-ghost" aria-label="Close" style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}>
          <IconClose size={14} />
        </button>
      </div>

      {/* Step indicator */}
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {[
            { n: 1, label: 'Upload file', done: true },
            { n: 2, label: 'Review & save', active: true },
          ].map((s, i, arr) => (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 11,
                  background: s.done ? '#10B981' : (s.active ? 'var(--primary-2)' : '#F1F5F9'),
                  color: s.done || s.active ? '#fff' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }} className="mono">
                  {s.done ? <IconCheck size={11} /> : s.n}
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: s.active || s.done ? 'var(--text)' : 'var(--muted)' }}>{s.label}</span>
              </div>
              {i < arr.length - 1 && <div style={{ flex: 1, height: 1, background: s.done ? '#10B981' : 'var(--border)' }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Body — two columns */}
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 24 }}>
        {/* LEFT — preview */}
        <div style={{
          background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)',
          borderRadius: 14, overflow: 'hidden', position: 'relative',
          border: '1px solid var(--primary)', minHeight: 460,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Filename pill */}
          <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, height: 26, padding: '0 10px',
              borderRadius: 13, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)',
              color: '#fff', fontSize: 11.5, backdropFilter: 'blur(8px)',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              <span className="mono" style={{ letterSpacing: 0.2 }}>tiergarten_long_run.gpx</span>
            </div>
            <span className="pill" style={{
              background: 'rgba(16,185,129,0.18)', color: '#6EE7B7', height: 22, fontSize: 10.5, letterSpacing: 0.4,
              border: '1px solid rgba(16,185,129,0.3)',
            }}>● Parsed</span>
          </div>

          {/* Glowing route */}
          <div style={{ flex: 1, padding: '46px 24px 56px' }}>
            <RouteGlow points={TIERGARTEN_ROUTE} />
          </div>

          {/* Replace link */}
          <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
            <a style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Replace file
            </a>
          </div>
        </div>

        {/* RIGHT — analysis + form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Section A — Analysis */}
          <div>
            <div className="label-sm" style={{ fontSize: 10.5, marginBottom: 10 }}>Route analysis</div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
              border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
            }}>
              {[
                { l: 'DISTANCE', v: '12.04', s: 'km' },
                { l: 'ELEVATION ↑', v: '+85', s: 'm' },
                { l: 'DIFFICULTY', v: 'Flat', s: '×1.012' },
              ].map((c, i) => (
                <div key={i} style={{
                  padding: '12px 14px', borderRight: i < 2 ? '1px solid var(--border-soft)' : 'none',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, color: 'var(--muted)' }}>{c.l}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="mono" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.3, lineHeight: 1 }}>{c.v}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.s}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Mini elevation strip */}
            <div style={{ marginTop: 10, padding: '8px 6px', background: '#FAFAF9', border: '1px solid var(--border-soft)', borderRadius: 8 }}>
              <MiniElevation data={TIERGARTEN_ELEV} height={48} maxLabel="+85m" color="#4F46E5" fill="rgba(79,70,229,0.14)" />
            </div>
          </div>

          {/* Section B — Metadata */}
          <div>
            <div className="label-sm" style={{ fontSize: 10.5, marginBottom: 10 }}>Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <FormField label="Name *" value="Tiergarten Long Run" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FormField label="City" value="Berlin" />
                <FormField label="Country" value="🇩🇪 Germany" chev />
              </div>
              <FormField label="Race date (optional)" value="13 Sep 2026" cal />
            </div>
          </div>

          {/* Section C — Actions */}
          <div>
            <div className="label-sm" style={{ fontSize: 10.5, marginBottom: 10 }}>Save options</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Checkbox checked label="Save to my marathons" />
              <Checkbox checked={false} label="Set as my target race" sub="will replace Berlin Marathon as current target" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 24px', borderTop: '1px solid var(--border-soft)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: '#FAFAF9',
      }}>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IconCheck size={11} style={{ color: '#10B981' }} />
          <span>Difficulty computed using Minetti coefficient from elevation profile</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost">Cancel</button>
          <button className="btn btn-coral" style={{ height: 36 }}>
            Save marathon <IconArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form field helper ─────────────────────────────────────────
function FormField({ label, value, chev = false, cal = false }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px',
        border: '1px solid var(--border)', borderRadius: 8, background: '#fff',
        fontSize: 13, color: 'var(--text)',
      }}>
        {cal && <IconCalendar size={13} style={{ color: 'var(--muted)' }} />}
        <span style={{ flex: 1 }}>{value}</span>
        {chev && <IconChevDown size={13} style={{ color: 'var(--muted)' }} />}
      </div>
    </label>
  );
}

// ── Checkbox helper ───────────────────────────────────────────
function Checkbox({ checked, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{
        width: 18, height: 18, borderRadius: 5, marginTop: 1,
        background: checked ? 'var(--primary-2)' : '#fff',
        border: checked ? '1px solid var(--primary-2)' : '1.5px solid var(--border)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {checked && <IconCheck size={11} style={{ color: '#fff' }} />}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{label}</span>
        {sub && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{sub}</span>}
      </div>
    </div>
  );
}

Object.assign(window, { GpxModalShade, GpxModalStep1, GpxModalStep2, FormField, Checkbox });
