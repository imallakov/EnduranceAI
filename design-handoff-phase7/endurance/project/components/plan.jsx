// Training Plan — main page components.
// PhaseStrip (cinematic dark hero), KpiRow, CurrentWeekGrid, WorkoutCell,
// AllWeeksList, VolumeChart, DistributionDonut, PaceZonesCard, PlanPage.

// ──────────────────────────────────────────────────────────────────
// Top bar for /plans — breadcrumb matches dashboard convention
// ──────────────────────────────────────────────────────────────────
function PlanTopBar() {
  return (
    <div style={{
      height: 56, borderBottom: '1px solid var(--border)', background: '#fff',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--muted)' }}>
        <span>Workspace</span>
        <IconChevRight size={12} />
        <span>Berlin Marathon '26</span>
        <IconChevRight size={12} />
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>Training plan</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 10px',
        border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg)',
        fontSize: 13, color: 'var(--muted)', width: 240,
      }}>
        <IconSearch size={14} />
        <span>Jump to week, workout…</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          <kbd className="mono" style={{ fontSize: 10, padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 4, background: '#fff', color: 'var(--muted)' }}>⌘</kbd>
          <kbd className="mono" style={{ fontSize: 10, padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 4, background: '#fff', color: 'var(--muted)' }}>K</kbd>
        </span>
      </div>
      <button className="btn btn-ghost" style={{ width: 32, padding: 0, justifyContent: 'center', position: 'relative' }}>
        <IconBell size={15} />
        <span style={{ position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: 3, background: 'var(--accent)' }} />
      </button>
      <div style={{
        width: 30, height: 30, borderRadius: 15, background: 'linear-gradient(135deg, #1E1B4B, #4F46E5)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11.5, fontWeight: 600, letterSpacing: 0.4,
      }}>MS</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Page header — title + actions
// ──────────────────────────────────────────────────────────────────
function PlanPageHeader({ exportOpen = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span className="label-sm">Training plan</span>
          <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
          <span className="label-sm" style={{ color: 'var(--text)' }}>Daniels · 16 weeks</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: 'var(--text)' }}>
          {PLAN_META.race}
        </h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{PLAN_META.raceDate}</span>
          <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
          <span><span className="mono">{PLAN_META.daysToRace}</span> days to race</span>
          <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
          <span><span className="mono">{PLAN_META.totalKm}</span> km total volume</span>
          <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
          <span><span className="mono">{PLAN_META.daysPerWeek}</span> days/wk</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
        <button className="btn btn-ghost"><IconRefresh size={13} /> Regenerate</button>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-ghost">
            Export <IconChevDown size={12} />
          </button>
          {exportOpen && <ExportMenu />}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// PHASE PROGRESSION STRIP — the hero. Dark gradient, ~200px tall.
// ──────────────────────────────────────────────────────────────────
function PhaseStrip({ height = 220, currentWeek = PLAN_META.currentWeek, totalWeeks = PLAN_META.totalWeeks }) {
  const padX = 36;
  const stripY = 88;           // y-position of the strip's vertical center (inside the SVG)
  const stripH = 14;           // height of the colored bands
  const W = 1200;              // intrinsic SVG width; scales via viewBox
  const innerW = W - padX * 2;
  // Phase x-ranges in absolute coords
  let cursor = padX;
  const phaseRanges = PHASES.map(p => {
    const start = cursor;
    const w = innerW * p.ratio;
    cursor += w;
    return { ...p, x: start, w, mid: start + w / 2 };
  });
  // Current week position (proportional to total)
  const cwX = padX + innerW * ((currentWeek - 0.5) / totalWeeks);
  const cwPhase = phaseRanges.find(p => currentWeek >= p.weeks[0] && currentWeek <= p.weeks[1]);

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)',
      borderRadius: 16,
      padding: '24px 32px',
      height,
      overflow: 'hidden',
      color: '#fff',
    }}>
      {/* subtle radial wash behind the dot */}
      <div style={{
        position: 'absolute',
        left: `${(cwX / W) * 100}%`, top: '50%',
        width: 480, height: 480, transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(165,180,252,0.10) 0%, rgba(79,70,229,0) 60%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.09 * 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
            Phase progression
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.2 }}>{cwPhase.label}</span>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>
              Week <span className="mono" style={{ color: '#fff' }}>{currentWeek}</span> of <span className="mono">{totalWeeks}</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              {cwPhase.desc}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 22 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Distance run</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>360 <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>/ 624 km</span></div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4, textTransform: 'uppercase' }}>To race</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{PLAN_META.daysToRace} <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>days</span></div>
          </div>
        </div>
      </div>

      {/* The strip itself */}
      <svg viewBox={`0 0 ${W} 170`} width="100%" height={height - 64} style={{ display: 'block', marginTop: 8, overflow: 'visible' }}>
        <defs>
          <filter id="psGlowBig" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26" /></filter>
          <filter id="psGlowMid" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16" /></filter>
          <filter id="psGlowTight" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
        </defs>

        {/* Phase labels above strip */}
        {phaseRanges.map((p, i) => (
          <g key={p.id}>
            <circle cx={p.x + 7} cy={stripY - 30} r="3.5" fill={p.color} />
            <text x={p.x + 17} y={stripY - 26} fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="600" fill="#fff">{p.label}</text>
            <text x={p.x + 17} y={stripY - 11} fontFamily="Geist Mono, monospace" fontSize="10.5" fill="rgba(255,255,255,0.5)">
              W{p.weeks[0]}–{p.weeks[1]} · {p.volume} km
            </text>
          </g>
        ))}

        {/* Background track */}
        <rect x={padX - 2} y={stripY - 1} width={innerW + 4} height={stripH + 2} rx={(stripH + 2) / 2} fill="rgba(255,255,255,0.04)" />

        {/* Colored phase bands */}
        {phaseRanges.map((p, i) => {
          const r0 = i === 0 ? stripH / 2 : 0;
          const r1 = i === phaseRanges.length - 1 ? stripH / 2 : 0;
          // Use paths to do per-corner rounding so segments butt against each other
          const x0 = p.x, x1 = p.x + p.w;
          const d = `M ${x0 + r0} ${stripY} L ${x1 - r1} ${stripY} Q ${x1} ${stripY} ${x1} ${stripY + r1 ? stripH / 2 : 0} L ${x1} ${stripY + stripH - (r1 ? stripH / 2 : 0)} Q ${x1} ${stripY + stripH} ${x1 - r1} ${stripY + stripH} L ${x0 + r0} ${stripY + stripH} Q ${x0} ${stripY + stripH} ${x0} ${stripY + stripH - (r0 ? stripH / 2 : 0)} L ${x0} ${stripY + (r0 ? stripH / 2 : 0)} Q ${x0} ${stripY} ${x0 + r0} ${stripY} Z`;
          // Past phases are slightly muted
          const finished = currentWeek > p.weeks[1];
          const upcoming = currentWeek < p.weeks[0];
          const opacity = finished ? 0.95 : upcoming ? 0.30 : 1;
          return <path key={p.id} d={d} fill={p.color} opacity={opacity} />;
        })}

        {/* Tick marks — 16 weeks */}
        {Array.from({ length: totalWeeks }, (_, i) => {
          const x = padX + innerW * ((i + 0.5) / totalWeeks);
          const isCurrent = (i + 1) === currentWeek;
          if (isCurrent) return null;
          const isPast = (i + 1) < currentWeek;
          return (
            <line key={i} x1={x} y1={stripY - 4} x2={x} y2={stripY + stripH + 4}
                  stroke={isPast ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'}
                  strokeWidth="1" />
          );
        })}

        {/* Current-week glow stack at cwX */}
        <g>
          <circle cx={cwX} cy={stripY + stripH / 2} r="22" fill="#4F46E5" opacity="0.40" filter="url(#psGlowBig)" />
          <circle cx={cwX} cy={stripY + stripH / 2} r="14" fill="#818CF8" opacity="0.55" filter="url(#psGlowMid)" />
          <circle cx={cwX} cy={stripY + stripH / 2} r="8"  fill="#A5B4FC" opacity="0.75" filter="url(#psGlowTight)" />
          <circle cx={cwX} cy={stripY + stripH / 2} r="6"  fill="#fff" />
        </g>

        {/* "You are here" label below dot */}
        <g>
          <text x={cwX} y={stripY + stripH + 28} textAnchor="middle"
                fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" fill="#fff" letterSpacing="0.5">
            YOU ARE HERE
          </text>
          <text x={cwX} y={stripY + stripH + 44} textAnchor="middle"
                fontFamily="Geist Mono, monospace" fontSize="11" fill="rgba(255,255,255,0.55)">
            W{currentWeek} · 76 km
          </text>
        </g>

        {/* Race flag at end */}
        <g>
          <circle cx={padX + innerW} cy={stripY + stripH / 2} r="5.5" fill="#F97066" stroke="#fff" strokeWidth="1.5" />
          <text x={padX + innerW + 14} y={stripY + stripH / 2 + 4}
                fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" fill="#F97066">
            RACE
          </text>
        </g>
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// KPI row — 4 dense cards
// ──────────────────────────────────────────────────────────────────
function KpiRow() {
  const items = [
    { label: 'Phase',            value: '3',  suffix: '/ 4', caption: 'Late Quality',  accent: '#F59E0B' },
    { label: 'Week',             value: '8',  suffix: '/ 16', caption: 'Halfway point', accent: '#4F46E5' },
    { label: 'Days to race',     value: '42', suffix: 'd',    caption: 'Sun · 27 Sep',  accent: '#F97066' },
    { label: 'Plan total',       value: '624', suffix: 'km',  caption: '38 of 39 sessions', accent: '#1E1B4B' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
      {items.map((m, i) => (
        <div key={i} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, borderRadius: 2, background: m.accent }} />
          <div style={{ paddingLeft: 8 }}>
            <span className="label-sm">{m.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: 8 }}>
            <span className="mono" style={{ fontSize: 32, fontWeight: 600, color: 'var(--text)', letterSpacing: -1, lineHeight: 1 }}>{m.value}</span>
            <span className="mono" style={{ fontSize: 14, color: 'var(--muted)' }}>{m.suffix}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', paddingLeft: 8 }}>{m.caption}</div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Structure bar — visualizes warmup/main/cooldown or interval reps
// ──────────────────────────────────────────────────────────────────
function StructureBar({ day, height = 8, totalKm }) {
  if (!day.structure) return null;
  const total = totalKm ?? day.km;
  if (day.type === 'interval') {
    // Pattern: warmup, then alternating rep/recovery × N, then cooldown
    const wu = day.structure[0];
    const cd = day.structure[2];
    const reps = day.structure[1];
    const repKm = (reps.reps * reps.rep_m) / 1000;
    // each rep + (reps-1) recovery gaps fill (total - wu.km - cd.km)
    const middle = total - wu.km - cd.km;
    const recoveryPortion = (middle - repKm) / Math.max(reps.reps - 1, 1);
    return (
      <div style={{ display: 'flex', height, width: '100%', borderRadius: 4, overflow: 'hidden', background: '#F1EFEC' }}>
        <div style={{ flex: wu.km, background: '#10B981', opacity: 0.35 }} />
        {Array.from({ length: reps.reps }, (_, i) => (
          <React.Fragment key={i}>
            <div style={{ flex: reps.rep_m / 1000, background: '#DC2626' }} />
            {i < reps.reps - 1 && <div style={{ flex: recoveryPortion, background: '#E7E5E4' }} />}
          </React.Fragment>
        ))}
        <div style={{ flex: cd.km, background: '#10B981', opacity: 0.35 }} />
      </div>
    );
  }
  // Generic structure — colored segments by kind
  return (
    <div style={{ display: 'flex', height, width: '100%', borderRadius: 4, overflow: 'hidden', background: '#F1EFEC' }}>
      {day.structure.map((seg, i) => (
        <div key={i} style={{
          flex: seg.km,
          background: TYPES[seg.kind].color,
          opacity: seg.kind === 'easy' ? 0.35 : 0.95,
        }} />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Workout cell — the single most reused component
// ──────────────────────────────────────────────────────────────────
function WorkoutCell({ day, onClick, mini = false }) {
  const t = TYPES[day.type];
  const isRest = day.type === 'rest';
  const completed = day.completed;
  const today = day.today;
  const missed = day.missed;

  // Background & border state
  let bg = '#fff';
  let border = '1px solid var(--border)';
  if (completed) { bg = 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.02) 100%)'; border = '1px solid rgba(16,185,129,0.30)'; }
  if (today)     { border = '2px solid #4F46E5'; bg = '#fff'; }
  if (missed)    { bg = 'var(--bg)'; border = '1px solid var(--border-soft)'; }

  return (
    <div onClick={onClick} style={{
      width: '100%', height: mini ? 180 : 208, padding: 14, borderRadius: 14,
      background: bg, border, position: 'relative', cursor: onClick ? 'pointer' : 'default',
      display: 'flex', flexDirection: 'column', opacity: missed ? 0.7 : 1, transition: 'border-color 120ms ease',
    }}>
      {/* Top row: day + date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.09 * 11, color: today ? '#4F46E5' : 'var(--muted)' }}>{day.dow}</span>
        <span style={{ fontSize: 10, color: 'var(--muted-2)' }} className="mono">{day.date}</span>
      </div>

      {isRest ? (
        // Rest layout — centered icon + label
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <WorkoutIcon type="rest" size={28} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Rest</span>
          <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>recovery day</span>
        </div>
      ) : (
        <>
          {/* Icon + type label */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <WorkoutIcon type={day.type} size={22} />
            <span style={{ fontSize: 13, fontWeight: 600, color: t.color }}>{t.label}</span>
          </div>
          {/* Big distance */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.6, lineHeight: 1 }}>{day.km}</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>km</span>
          </div>
          {/* Pace */}
          <div className="mono" style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>{day.pace}</div>
          {/* Structure bar */}
          {day.structure && (
            <div style={{ marginTop: 'auto', paddingTop: 8 }}>
              <StructureBar day={day} totalKm={day.km} />
              <div style={{ marginTop: 4, fontSize: 10, color: 'var(--muted-2)', display: 'flex', justifyContent: 'space-between' }}>
                {day.type === 'interval' ? (
                  <>
                    <span className="mono">2k</span>
                    <span className="mono" style={{ color: 'var(--danger)', fontWeight: 600 }}>6×1k</span>
                    <span className="mono">2k</span>
                  </>
                ) : day.type === 'tempo' ? (
                  <>
                    <span className="mono">2 W/U</span>
                    <span className="mono" style={{ color: t.color, fontWeight: 600 }}>8 T</span>
                    <span className="mono">2 C/D</span>
                  </>
                ) : day.type === 'long' ? (
                  <>
                    <span className="mono">20 km E</span>
                    <span className="mono" style={{ color: '#1E1B4B', fontWeight: 600 }}>8 km M</span>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {/* Completion checkbox bottom-right */}
      {!isRest && (
        <div style={{
          position: 'absolute', right: 10, bottom: 10,
          width: 22, height: 22, borderRadius: 6,
          border: completed ? 'none' : '1.5px solid var(--border)',
          background: completed ? '#F97066' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {completed && <IconCheck size={13} stroke="2.5" />}
        </div>
      )}

      {/* "today" pill in top-right corner */}
      {today && (
        <div style={{
          position: 'absolute', top: -1, right: -1,
          padding: '2px 8px 3px', background: '#4F46E5', color: '#fff',
          fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
          borderRadius: '0 13px 0 6px',
        }}>Today</div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Current week grid (Mon–Sun)
// ──────────────────────────────────────────────────────────────────
function CurrentWeekGrid({ onCellClick, weekIndex = 8, totalWeeks = 16 }) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div className="label-sm">Current week</div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>
              Week {weekIndex}
              <span style={{ color: 'var(--muted-2)', fontWeight: 400 }}> of {totalWeeks}</span>
            </h2>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {CURRENT_WEEK.start} – {CURRENT_WEEK.end} · Late Quality
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Week total</span>
          <span className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{CURRENT_WEEK.totalKm}</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>km</span>
          <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} />
          <button className="btn btn-ghost" style={{ width: 32, padding: 0, justifyContent: 'center' }}><IconChevRight size={14} style={{ transform: 'rotate(180deg)' }} /></button>
          <button className="btn btn-ghost" style={{ width: 32, padding: 0, justifyContent: 'center' }}><IconChevRight size={14} /></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
        {CURRENT_WEEK.days.map((d, i) => (
          <WorkoutCell key={i} day={d} onClick={() => onCellClick && onCellClick(d)} />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// All weeks list — compact rows, clickable
// ──────────────────────────────────────────────────────────────────
function AllWeeksList() {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label-sm">All weeks · 16</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost" style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}>
            <IconFilter size={11} /> Filter
          </button>
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--border)' }} />
      <div className="nice-scroll">
        {ALL_WEEKS.map((wk, i) => {
          const ph = PHASES.find(p => p.id === wk.phase);
          const isCurrent = wk.today;
          return (
            <React.Fragment key={wk.w}>
              {i > 0 && <div style={{ height: 1, background: 'var(--border-soft)', marginLeft: 18 }} />}
              <div className="act-row" style={{
                display: 'grid',
                gridTemplateColumns: '4px 36px 1fr auto auto auto',
                alignItems: 'center',
                columnGap: 12,
                padding: '11px 18px 11px 0',
                background: isCurrent ? 'rgba(79,70,229,0.04)' : 'transparent',
                position: 'relative',
              }}>
                {/* Phase color bar on left */}
                <div style={{ width: 4, height: 36, background: ph.color, opacity: wk.completed ? 1 : (isCurrent ? 1 : 0.45), borderRadius: '0 2px 2px 0' }} />
                {/* Week number */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--muted-2)' }}>W</span>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: isCurrent ? 'var(--primary-2)' : 'var(--text)' }}>
                    {String(wk.w).padStart(2, '0')}
                  </span>
                </div>
                {/* Phase + note */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: isCurrent ? 600 : 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {ph.label}
                    {wk.note && (
                      <span style={{
                        fontSize: 10, color: wk.cb ? 'var(--warning)' : (wk.note === 'race week' ? 'var(--accent)' : (wk.note === 'peak' ? 'var(--danger)' : 'var(--muted)')),
                        fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
                      }}>
                        · {wk.note}
                      </span>
                    )}
                  </div>
                </div>
                {/* Mini volume bar */}
                <div style={{ width: 60, height: 6, background: 'var(--border-soft)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min((wk.km / 80) * 100, 100)}%`, height: '100%', background: ph.color, opacity: wk.completed ? 1 : 0.5 }} />
                </div>
                {/* km */}
                <div style={{ minWidth: 56, textAlign: 'right' }}>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{wk.km}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 2 }}>km</span>
                </div>
                {/* delta or status */}
                <div style={{ minWidth: 64, textAlign: 'right' }}>
                  {wk.completed ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--success)' }}>
                      <IconCheck size={11} stroke="2.5" /> Done
                    </span>
                  ) : isCurrent ? (
                    <span className="pill pill-indigo">Active</span>
                  ) : (
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{wk.delta}</span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Volume chart (right column) — 16 bars
// ──────────────────────────────────────────────────────────────────
function VolumeChart() {
  const maxKm = Math.max(...ALL_WEEKS.map(w => w.km));
  const W = 396, H = 168, padX = 4, padTop = 12, padBot = 28;
  const innerW = W - padX * 2;
  const barW = (innerW - 6 * (ALL_WEEKS.length - 1) / ALL_WEEKS.length) / ALL_WEEKS.length;
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div className="label-sm">Weekly volume</div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
            Peak <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>76 km</span>
            <span style={{ margin: '0 6px' }}>·</span>
            Avg <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>39 km</span>
          </div>
        </div>
        <span className="pill pill-soft-indigo">W8 peak</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', marginTop: 6 }}>
        {/* horizontal grid */}
        {[0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i} x1={padX} x2={W - padX} y1={padTop + (H - padTop - padBot) * (1 - t)} y2={padTop + (H - padTop - padBot) * (1 - t)}
                stroke="#F1EFEC" strokeWidth="1" />
        ))}
        {ALL_WEEKS.map((wk, i) => {
          const ph = PHASES.find(p => p.id === wk.phase);
          const x = padX + i * ((innerW) / ALL_WEEKS.length);
          const bw = (innerW / ALL_WEEKS.length) - 4;
          const h = (wk.km / maxKm) * (H - padTop - padBot);
          const y = H - padBot - h;
          const isCurrent = wk.today;
          return (
            <g key={wk.w}>
              <rect x={x + 2} y={y} width={bw} height={h} rx="2"
                    fill={ph.color}
                    opacity={isCurrent ? 1 : (wk.completed ? 0.85 : 0.40)}
                    stroke={isCurrent ? '#fff' : 'none'}
                    strokeWidth={isCurrent ? 2 : 0} />
              {isCurrent && (
                <>
                  <rect x={x + 2 - 2} y={y - 4} width={bw + 4} height={h + 8} rx="3"
                        fill="none" stroke={ph.color} strokeWidth="1.5" />
                  <circle cx={x + 2 + bw / 2} cy={y - 8} r="2.5" fill={ph.color} />
                </>
              )}
              {/* x labels every 4 */}
              {((wk.w - 1) % 4 === 0 || wk.w === 16) && (
                <text x={x + 2 + bw / 2} y={H - 10} textAnchor="middle"
                      fontFamily="Geist Mono, monospace" fontSize="9.5" fill="var(--muted)">
                  W{wk.w}
                </text>
              )}
            </g>
          );
        })}
        {/* phase divider lines */}
        {[3, 7, 12].map(w => {
          const x = padX + (w / ALL_WEEKS.length) * innerW;
          return <line key={w} x1={x} x2={x} y1={padTop} y2={H - padBot} stroke="#E7E5E4" strokeDasharray="2 3" />;
        })}
      </svg>
      {/* Phase legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {PHASES.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Workout type distribution donut
// ──────────────────────────────────────────────────────────────────
function DistributionDonut() {
  const size = 116, stroke = 14;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let cursor = 0;
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="label-sm">Workout distribution</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>This phase · Late Quality</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 12 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1EFEC" strokeWidth={stroke} />
          {TYPE_DIST.map((d, i) => {
            const length = (d.pct / 100) * C;
            const dash = `${length} ${C - length}`;
            const off = -cursor;
            cursor += length;
            return <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
                           stroke={d.color} strokeWidth={stroke}
                           strokeDasharray={dash} strokeDashoffset={off} strokeLinecap="butt" />;
          })}
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {TYPE_DIST.map(d => (
            <div key={d.type} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto', alignItems: 'center', columnGap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{TYPES[d.type].label}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Pace zones card
// ──────────────────────────────────────────────────────────────────
function PaceZonesCard() {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="label-sm">Pace zones</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            From VDOT <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{PLAN_META.vdot}</span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--primary-2)', fontWeight: 500, cursor: 'pointer' }}>Edit ↗</span>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
        {PACE_ZONES.map((z, i) => (
          <React.Fragment key={z.key}>
            {i > 0 && <div style={{ height: 1, background: 'var(--border-soft)' }} />}
            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto auto', alignItems: 'center', columnGap: 10, padding: '10px 0' }}>
              <span style={{
                width: 22, height: 22, borderRadius: 5, background: z.color, color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, fontFamily: 'Geist Mono, monospace',
              }}>{z.key}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>{z.name}</span>
                <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>{z.sub}</span>
              </div>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{z.pace}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{z.unit}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// THE PAGE
// ──────────────────────────────────────────────────────────────────
function PlanPage({ exportOpen = false, drawerOpen = false }) {
  return (
    <div data-screen-label="Training Plan — Active" style={{
      display: 'flex', width: 1440, minHeight: 1820, background: 'var(--bg)',
      fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)',
    }}>
      <Sidebar defaultActive="Training plan" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <PlanTopBar />
        <div style={{ padding: '24px 32px 40px' }}>
          <PlanPageHeader exportOpen={exportOpen} />

          {/* Cinematic phase strip */}
          <div style={{ marginBottom: 24 }}>
            <PhaseStrip />
          </div>

          {/* KPI row */}
          <div style={{ marginBottom: 24 }}>
            <KpiRow />
          </div>

          {/* Two-column body */}
          <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <CurrentWeekGrid onCellClick={() => {}} />
              <AllWeeksList />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <VolumeChart />
              <DistributionDonut />
              <PaceZonesCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  PlanTopBar, PlanPageHeader, PhaseStrip, KpiRow,
  WorkoutCell, StructureBar, CurrentWeekGrid,
  AllWeeksList, VolumeChart, DistributionDonut, PaceZonesCard, PlanPage,
});
