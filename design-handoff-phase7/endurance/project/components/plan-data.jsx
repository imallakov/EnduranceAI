// Training Plan — domain data + workout icons.
// 16-week Daniels block for Berlin Marathon '26. Current week = 8 (Late Quality).

const PLAN_META = {
  race: "Berlin Marathon '26",
  raceDate: '27 Sep 2026',
  daysToRace: 42,
  totalWeeks: 16,
  currentWeek: 8,
  totalKm: 624,
  daysPerWeek: 5,
  vdot: 47.1,
};

// Phase definitions — proportional widths + colors
const PHASES = [
  { id: 'base',  label: 'Base',          color: '#4F46E5', weeks: [1, 3],   ratio: 0.20, volume: 84,  desc: 'Aerobic foundation' },
  { id: 'early', label: 'Early Quality', color: '#818CF8', weeks: [4, 7],   ratio: 0.25, volume: 176, desc: 'Introduce Tempo + Long' },
  { id: 'late',  label: 'Late Quality',  color: '#F59E0B', weeks: [8, 12],  ratio: 0.30, volume: 264, desc: 'Add VO2max intervals' },
  { id: 'taper', label: 'Taper',         color: '#10B981', weeks: [13, 16], ratio: 0.25, volume: 100, desc: 'Sharpen, reduce volume' },
];

// Workout type config — color + label
const TYPES = {
  rest:          { label: 'Rest',          color: '#94A3B8', short: 'R' },
  easy:          { label: 'Easy',          color: '#10B981', short: 'E' },
  long:          { label: 'Long',          color: '#4F46E5', short: 'L' },
  tempo:         { label: 'Tempo',         color: '#F59E0B', short: 'T' },
  interval:      { label: 'Interval',      color: '#DC2626', short: 'I' },
  repetition:    { label: 'Repetition',    color: '#F97066', short: 'R' },
  marathon_pace: { label: 'Marathon Pace', color: '#1E1B4B', short: 'M' },
};

// Pace zones from VDOT 47.1
const PACE_ZONES = [
  { key: 'E', name: 'Easy',        pace: '5:20–5:53',  unit: '/km', sub: 'Aerobic',   color: '#10B981' },
  { key: 'M', name: 'Marathon',    pace: '4:48',       unit: '/km', sub: 'Race',      color: '#1E1B4B' },
  { key: 'T', name: 'Threshold',   pace: '4:30',       unit: '/km', sub: 'Tempo',     color: '#F59E0B' },
  { key: 'I', name: 'VO2max',      pace: '4:08',       unit: '/km', sub: '200m 0:50', color: '#DC2626' },
  { key: 'R', name: 'Repetition',  pace: '3:58',       unit: '/km', sub: '400m 1:35', color: '#F97066' },
];

// Helper — phase for a given week index (1-based)
function phaseOfWeek(w) {
  for (const p of PHASES) if (w >= p.weeks[0] && w <= p.weeks[1]) return p;
  return PHASES[0];
}

// ──────────────────────────────────────────────────────────────────
// Current week (W8 of 16, Late Quality) — Mon → Sun
// ──────────────────────────────────────────────────────────────────
const CURRENT_WEEK = {
  index: 8,
  start: 'Jul 13',
  end:   'Jul 19',
  totalKm: 76,
  days: [
    { dow: 'MON', date: 'Jul 13', type: 'rest',     km: null,  pace: null,        title: 'Rest day', completed: true,  today: false, missed: false },
    { dow: 'TUE', date: 'Jul 14', type: 'easy',     km: 10,    pace: '5:20/km',   title: 'Easy 10 km',  completed: true,  today: false, missed: false },
    { dow: 'WED', date: 'Jul 15', type: 'tempo',    km: 12,    pace: '4:30/km',   title: 'Tempo 12 km', completed: false, today: true,  missed: false,
      structure: [
        { kind: 'easy',  km: 2, label: 'Warmup',    pace: '5:20' },
        { kind: 'tempo', km: 8, label: 'Threshold', pace: '4:30' },
        { kind: 'easy',  km: 2, label: 'Cooldown',  pace: '5:20' },
      ] },
    { dow: 'THU', date: 'Jul 16', type: 'easy',     km: 8,     pace: '5:30/km',   title: 'Easy 8 km', completed: false, today: false, missed: false },
    { dow: 'FRI', date: 'Jul 17', type: 'interval', km: 12,    pace: '4:08/km',   title: 'Interval 12 km', completed: false, today: false, missed: false,
      structure: [
        { kind: 'easy',  km: 2,    label: 'Warmup',     pace: '5:20' },
        { kind: 'interval', reps: 6, rep_m: 1000, recovery: '90s jog', pace: '4:08' },
        { kind: 'easy',  km: 2,    label: 'Cooldown',   pace: '5:20' },
      ] },
    { dow: 'SAT', date: 'Jul 18', type: 'easy',     km: 6,     pace: '5:40/km',   title: 'Easy 6 km', completed: false, today: false, missed: false },
    { dow: 'SUN', date: 'Jul 19', type: 'long',     km: 28,    pace: '5:20→4:48', title: 'Long 28 km · M-pace finish', completed: false, today: false, missed: false,
      structure: [
        { kind: 'easy',          km: 20, label: 'Easy',          pace: '5:20' },
        { kind: 'marathon_pace', km: 8,  label: 'Marathon pace', pace: '4:48' },
      ] },
  ],
};

// ──────────────────────────────────────────────────────────────────
// All weeks list — for left-column compact rows + volume chart
// ──────────────────────────────────────────────────────────────────
const ALL_WEEKS = [
  { w: 1,  phase: 'base',  km: 24, delta: null,  cb: false, today: false, completed: true,  note: null },
  { w: 2,  phase: 'base',  km: 32, delta: '+33%', cb: false, today: false, completed: true,  note: null },
  { w: 3,  phase: 'base',  km: 28, delta: '-13%', cb: true,  today: false, completed: true,  note: 'cutback' },
  { w: 4,  phase: 'early', km: 42, delta: '+50%', cb: false, today: false, completed: true,  note: null },
  { w: 5,  phase: 'early', km: 48, delta: '+14%', cb: false, today: false, completed: true,  note: null },
  { w: 6,  phase: 'early', km: 50, delta: '+4%',  cb: false, today: false, completed: true,  note: null },
  { w: 7,  phase: 'early', km: 36, delta: '-28%', cb: true,  today: false, completed: true,  note: 'cutback' },
  { w: 8,  phase: 'late',  km: 76, delta: '+111%', cb: false, today: true,  completed: false, note: 'this week' },
  { w: 9,  phase: 'late',  km: 62, delta: '-18%', cb: false, today: false, completed: false, note: null },
  { w: 10, phase: 'late',  km: 68, delta: '+10%', cb: false, today: false, completed: false, note: null },
  { w: 11, phase: 'late',  km: 54, delta: '-21%', cb: true,  today: false, completed: false, note: 'cutback' },
  { w: 12, phase: 'late',  km: 56, delta: '+4%',  cb: false, today: false, completed: false, note: 'peak' },
  { w: 13, phase: 'taper', km: 40, delta: '-29%', cb: false, today: false, completed: false, note: null },
  { w: 14, phase: 'taper', km: 32, delta: '-20%', cb: false, today: false, completed: false, note: null },
  { w: 15, phase: 'taper', km: 20, delta: '-38%', cb: false, today: false, completed: false, note: null },
  { w: 16, phase: 'taper', km: 8,  delta: 'race', cb: false, today: false, completed: false, note: 'race week' },
];

// Workout type distribution for current phase (Late Quality)
const TYPE_DIST = [
  { type: 'easy',     pct: 60, color: '#10B981' },
  { type: 'long',     pct: 20, color: '#4F46E5' },
  { type: 'tempo',    pct: 12, color: '#F59E0B' },
  { type: 'interval', pct:  8, color: '#DC2626' },
];

// ──────────────────────────────────────────────────────────────────
// Workout icons — abstract geometric, 24×24, currentColor-aware
// ──────────────────────────────────────────────────────────────────
function WorkoutIcon({ type, size = 24, color }) {
  const c = color || TYPES[type].color;
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' };

  if (type === 'rest') return (
    <svg {...props}>
      <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.4" strokeDasharray="2 3" opacity="0.7" />
    </svg>
  );
  if (type === 'easy') return (
    // Single low arc — gentle aerobic
    <svg {...props}>
      <path d="M3 16 Q 12 6, 21 16" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
  if (type === 'long') return (
    // Long arc with two anchor dots — distance
    <svg {...props}>
      <path d="M3 17 Q 12 3, 21 17" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="3" cy="17" r="1.6" fill={c} />
      <circle cx="21" cy="17" r="1.6" fill={c} />
    </svg>
  );
  if (type === 'tempo') return (
    // Three stacked levels — warmup → threshold → cooldown
    <svg {...props}>
      <rect x="3"  y="14" width="5" height="6" rx="1" fill={c} opacity="0.35" />
      <rect x="9.5" y="6" width="5" height="14" rx="1" fill={c} />
      <rect x="16" y="14" width="5" height="6" rx="1" fill={c} opacity="0.35" />
    </svg>
  );
  if (type === 'interval') return (
    // Six tall bars — VO2max reps
    <svg {...props}>
      {[0,1,2,3,4,5].map(i => (
        <rect key={i} x={3 + i*3.2} y={5} width="2" height="14" rx="0.8" fill={c} />
      ))}
    </svg>
  );
  if (type === 'repetition') return (
    // Sharp zigzag spikes — neuromuscular
    <svg {...props}>
      <path d="M3 18 L 6 8 L 9 18 L 12 8 L 15 18 L 18 8 L 21 18" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
  if (type === 'marathon_pace') return (
    // Filled arc — race effort
    <svg {...props}>
      <path d="M3 18 Q 12 6, 21 18 L 21 19 L 3 19 Z" fill={c} opacity="0.9" />
    </svg>
  );
  return null;
}

Object.assign(window, {
  PLAN_META, PHASES, TYPES, PACE_ZONES, CURRENT_WEEK, ALL_WEEKS, TYPE_DIST,
  phaseOfWeek, WorkoutIcon,
});
