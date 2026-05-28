// Share-to-story modal + 3 story templates (9:16).

// ── Template thumbnail (shrunken 9:16 card for the modal selector) ──
function TemplateThumb({ active, onClick, title, sub, children }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: 12, borderRadius: 10,
      border: `1.5px solid ${active ? 'var(--primary-2)' : 'var(--border)'}`,
      background: active ? '#F5F4FF' : '#fff',
      cursor: 'pointer', transition: 'all 120ms ease',
    }}>
      <div style={{
        width: 60, height: 92, borderRadius: 7, overflow: 'hidden',
        flexShrink: 0, position: 'relative', background: '#FAFAF9',
        border: '1px solid var(--border)',
      }}>
        {children}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.35 }}>{sub}</div>
      </div>
      <div style={{
        width: 16, height: 16, borderRadius: 9,
        border: `1.5px solid ${active ? 'var(--primary-2)' : 'var(--border)'}`,
        background: active ? 'var(--primary-2)' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {active && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#fff' }} />}
      </div>
    </div>
  );
}

// Compact micro-versions (used inside thumbnails)
function ThumbA() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#FAFAF9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', letterSpacing: -0.5 }}>21.3</span>
      <span className="mono" style={{ fontSize: 7, color: 'var(--muted)' }}>1:53:12</span>
      <svg width="44" height="20" viewBox="0 0 1280 560" preserveAspectRatio="xMidYMid meet" style={{ marginTop: 4 }}>
        <path d={ROUTE_PATH} stroke="#4F46E5" strokeWidth="22" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}
function ThumbB() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' }}>
      <svg width="50" height="22" viewBox="0 0 1280 560" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', top: 28, opacity: 0.7 }}>
        <path d={ROUTE_PATH} stroke="#6366F1" strokeWidth="28" fill="none" strokeLinecap="round" />
      </svg>
      <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: -0.5, marginTop: 28 }}>21.3</span>
    </div>
  );
}
function ThumbC() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#FAFAF9', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: -0.3 }}>21.3</span>
      <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
      {['PACE', 'HR', 'ELEV', 'VDOT'].map(k => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 5, color: 'var(--muted)', letterSpacing: 0.4 }}>{k}</span>
          <span className="mono" style={{ fontSize: 5, color: 'var(--text)', fontWeight: 600 }}>···</span>
        </div>
      ))}
    </div>
  );
}

// ── Story templates (375 × 667) ────────────────────────────────────
function TemplateA() {
  // Minimalist
  return (
    <div style={{
      width: 375, height: 667, background: '#FAFAF9',
      display: 'flex', flexDirection: 'column', position: 'relative',
      padding: '28px 28px 28px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Top: wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconLogo size={18} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', letterSpacing: -0.2 }}>EnduranceAI</span>
      </div>

      {/* Center stack */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: 1.4 }}>LONG RUN</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="mono" style={{ fontSize: 92, fontWeight: 700, color: 'var(--primary)', letterSpacing: -4, lineHeight: 0.9 }}>
            21.3
          </span>
          <span className="mono" style={{ fontSize: 22, color: 'var(--primary)', fontWeight: 600, letterSpacing: 0.5 }}>KM</span>
        </div>
        <div className="mono" style={{ fontSize: 16, color: 'var(--text)', marginTop: 6, letterSpacing: 0.2 }}>
          1:53:12 <span style={{ color: 'var(--muted-2)', margin: '0 6px' }}>·</span> 5:18 /km
        </div>

        {/* Route silhouette */}
        <div style={{ width: '100%', marginTop: 24 }}>
          <svg width="100%" height="140" viewBox="0 0 1280 560" preserveAspectRatio="xMidYMid meet">
            <path d={ROUTE_PATH} stroke="#4F46E5" strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={ROUTE_START.x} cy={ROUTE_START.y} r="22" fill="#fff" stroke="#4F46E5" strokeWidth="5" />
            <circle cx={ROUTE_FINISH.x + 20} cy={ROUTE_FINISH.y - 14} r="18" fill="#4F46E5" />
          </svg>
        </div>
      </div>

      {/* Bottom stats */}
      <div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--text)', textAlign: 'left', letterSpacing: 0.4 }}>
          VDOT 47.1 <span style={{ color: 'var(--muted-2)', margin: '0 6px' }}>·</span>
          HR 148 <span style={{ color: 'var(--muted-2)', margin: '0 6px' }}>·</span>
          TSS 132
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0.5 }}>17.05.26 · BERLIN</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0.5 }}>endurance.ai</span>
        </div>
      </div>
    </div>
  );
}

function TemplateB() {
  // Cinematic — dark gradient, glowing route, white type
  return (
    <div style={{
      width: 375, height: 667,
      background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)',
      display: 'flex', flexDirection: 'column', position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Subtle dot grid */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <defs>
          <pattern id="storyDot" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#fff" opacity="0.05" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#storyDot)" />
      </svg>

      {/* Wordmark */}
      <div style={{ position: 'relative', padding: '24px 24px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 18 C 7 6, 13 6, 17 14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="19.5" cy="16" r="2.2" fill="#F97066" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: -0.2 }}>EnduranceAI</span>
      </div>

      {/* Map zone — 60% middle */}
      <div style={{ position: 'absolute', top: 78, left: 0, right: 0, height: 380 }}>
        <svg viewBox="0 0 1280 560" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
          <defs>
            <filter id="bGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="12" />
            </filter>
            <radialGradient id="bSpot" cx="50%" cy="50%" r="70%">
              <stop offset="0" stopColor="#4F46E5" stopOpacity="0.18" />
              <stop offset="1" stopColor="#4F46E5" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1280" height="560" fill="url(#bSpot)" />
          {/* Glow */}
          <path d={ROUTE_PATH} stroke="#6366F1" strokeWidth="32" fill="none" opacity="0.5" filter="url(#bGlow)" />
          <path d={ROUTE_PATH} stroke="#A5B4FC" strokeWidth="18" fill="none" opacity="0.4" filter="url(#bGlow)" />
          {/* Crisp route */}
          <path d={ROUTE_PATH} stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Start / finish */}
          <circle cx={ROUTE_START.x} cy={ROUTE_START.y} r="14" fill="#fff" />
          <circle cx={ROUTE_FINISH.x + 20} cy={ROUTE_FINISH.y - 14} r="14" fill="#F97066" />
        </svg>
      </div>

      {/* Overlay number */}
      <div style={{
        position: 'absolute', left: 24, right: 24, bottom: 130,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#F97066', letterSpacing: 1.5 }}>LONG RUN · BERLIN</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <span className="mono" style={{ fontSize: 96, fontWeight: 600, color: '#fff', letterSpacing: -4, lineHeight: 0.9, textShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            21.3
          </span>
          <span className="mono" style={{ fontSize: 22, color: '#fff', opacity: 0.85, fontWeight: 500, letterSpacing: 0.5 }}>KM</span>
        </div>
        <span className="mono" style={{ fontSize: 17, color: '#fff', opacity: 0.85, marginTop: 6, letterSpacing: 0.3 }}>
          1:53:12
        </span>
      </div>

      {/* Glassmorphism bottom strip */}
      <div style={{
        position: 'absolute', left: 24, right: 24, bottom: 24,
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.16)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderRadius: 14, padding: '12px 14px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4,
      }}>
        {[['PACE', '5:18', '/km'], ['HR AVG', '148', 'bpm'], ['ELEV', '+84', 'm']].map(([k, v, u], i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', gap: 2,
            paddingLeft: i > 0 ? 12 : 0,
            borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.16)' : 'none',
          }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.8, fontWeight: 600 }}>{k}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span className="mono" style={{ fontSize: 17, color: '#fff', fontWeight: 600 }}>{v}</span>
              <span className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>{u}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Corner watermark */}
      <span className="mono" style={{
        position: 'absolute', top: 28, right: 24,
        fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5,
      }}>17.05.26</span>
    </div>
  );
}

function TemplateC() {
  // Splits
  const rows = [
    ['PACE',  '5:18',  '/km'],
    ['HR AVG','148',   'bpm'],
    ['HR MAX','167',   'bpm'],
    ['ELEV',  '+84',   'm'],
    ['VDOT',  '47.1',  ''],
    ['TSS',   '132',   ''],
  ];
  return (
    <div style={{
      width: 375, height: 667, background: '#FAFAF9',
      display: 'flex', flexDirection: 'column', position: 'relative',
      padding: '28px 28px 24px', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: 1.4 }}>BERLIN · TIERGARTEN</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0.4 }}>17 MAY 2026</span>
      </div>
      <h2 style={{ margin: '8px 0 0', fontSize: 19, fontWeight: 600, color: 'var(--primary)', letterSpacing: -0.4 }}>
        Sunday long run
      </h2>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="mono" style={{ fontSize: 78, fontWeight: 700, color: 'var(--primary)', letterSpacing: -3, lineHeight: 0.9 }}>
          21.3
        </span>
        <span className="mono" style={{ fontSize: 19, color: 'var(--primary)', fontWeight: 600 }}>KM</span>
      </div>
      <div className="mono" style={{ fontSize: 19, color: 'var(--text)', marginTop: 6, letterSpacing: 0.3 }}>
        1:53:12
      </div>

      {/* Stats card */}
      <div style={{
        marginTop: 22, background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
        overflow: 'hidden',
      }}>
        {rows.map(([k, v, u], i) => (
          <div key={k} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '11px 16px',
            borderBottom: i < rows.length - 1 ? '1px solid var(--border-soft)' : 'none',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: 0.8 }}>{k}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span className="mono" style={{ fontSize: 16, color: 'var(--text)', fontWeight: 600, letterSpacing: -0.2 }}>{v}</span>
              {u && <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{u}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 14, borderTop: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconLogo size={14} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>EnduranceAI</span>
        </div>
        <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0.5 }}>endurance.ai/m</span>
      </div>
    </div>
  );
}

// ── Share modal ────────────────────────────────────────────────────
function ShareModal({ onClose }) {
  const [template, setTemplate] = React.useState('B');
  const [format, setFormat] = React.useState('9:16');
  const [opts, setOpts] = React.useState({
    map: true, hr: false, pace: true, watermark: true,
  });

  const previewW = 330;
  const previewH = previewW * (16 / 9); // 586

  // Always render template at 375x667 then scale via transform
  const scale = previewW / 375;

  const TemplateEl = template === 'A' ? TemplateA : template === 'B' ? TemplateB : TemplateC;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.60)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, backdropFilter: 'blur(2px)',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 1040, background: '#fff', borderRadius: 16,
        border: '1px solid var(--border)', overflow: 'hidden',
        display: 'flex', boxShadow: '0 40px 80px -20px rgba(15,23,42,0.4)',
        maxHeight: '90%',
      }}>
        {/* LEFT — Preview */}
        <div style={{
          width: 624, background: '#F5F4F1',
          padding: '32px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16,
          borderRight: '1px solid var(--border)',
        }}>
          <div style={{
            width: previewW, height: previewH,
            borderRadius: 28, overflow: 'hidden',
            boxShadow: '0 24px 50px -12px rgba(15,23,42,0.30)',
            position: 'relative',
            background: '#fff',
            border: '8px solid #0F172A',
          }}>
            <div style={{
              width: 375, height: 667,
              transform: `scale(${scale})`, transformOrigin: 'top left',
            }}>
              <TemplateEl />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['9:16', '1:1', '4:5'].map(f => (
              <button key={f} onClick={() => setFormat(f)} style={{
                height: 28, padding: '0 12px', borderRadius: 6,
                border: `1px solid ${format === f ? 'var(--primary-2)' : 'var(--border)'}`,
                background: format === f ? '#EEF0FF' : '#fff',
                color: format === f ? 'var(--primary-2)' : 'var(--muted)',
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Geist Mono, monospace',
              }}>
                {f === '9:16' ? 'Story 9:16' : f === '1:1' ? 'Square 1:1' : 'Feed 4:5'}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — Controls */}
        <div style={{ width: 416, padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.3 }}>
                Share to story
              </h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Optimized for Instagram, TikTok, Telegram stories.
              </div>
            </div>
            <button onClick={onClose} className="btn btn-ghost"
                    style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }}>
              <IconClose size={14} />
            </button>
          </div>

          {/* Template selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="label-sm" style={{ fontSize: 10.5 }}>Template</span>
            <TemplateThumb active={template === 'A'} onClick={() => setTemplate('A')}
                           title="Minimalist" sub="Big number on white, route silhouette below">
              <ThumbA />
            </TemplateThumb>
            <TemplateThumb active={template === 'B'} onClick={() => setTemplate('B')}
                           title="Cinematic" sub="Dark indigo gradient, glowing route, big number">
              <ThumbB />
            </TemplateThumb>
            <TemplateThumb active={template === 'C'} onClick={() => setTemplate('C')}
                           title="Splits" sub="Stats card with metrics table, screenshot-able">
              <ThumbC />
            </TemplateThumb>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              ['map', 'Include map route'],
              ['hr', 'Show heart rate avg'],
              ['pace', 'Show pace'],
              ['watermark', 'EnduranceAI watermark'],
            ].map(([k, label]) => (
              <label key={k} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 0', cursor: 'pointer', fontSize: 12.5, color: 'var(--text)',
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: `1.5px solid ${opts[k] ? 'var(--primary-2)' : 'var(--border)'}`,
                  background: opts[k] ? 'var(--primary-2)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 120ms ease',
                }}>
                  {opts[k] && <IconCheck size={11} stroke={3} style={{ color: '#fff' }} />}
                </span>
                <span style={{ flex: 1 }}>{label}</span>
                {k === 'watermark' && <span style={{ fontSize: 11, color: 'var(--muted)' }}>small, bottom corner</span>}
              </label>
            ))}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-primary" style={{ height: 40, fontSize: 13, fontWeight: 600 }}>
              <IconArrowDown size={13} /> Download PNG
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 40 }}>Copy link</button>
              <button className="btn btn-coral" style={{ flex: 1, height: 40, fontSize: 13 }}>
                <IconExternal size={13} /> Share to IG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ShareModal, TemplateA, TemplateB, TemplateC });
