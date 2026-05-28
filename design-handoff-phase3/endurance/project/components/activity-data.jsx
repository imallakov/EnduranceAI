// Synthetic data for the 21.3 km Tiergarten long run.
// All values are made up but internally consistent.

// ── Per-km splits ────────────────────────────────────────────────────
// Pace seconds per km (avg 5:18 = 318)
const PACE_SEC = [
  328, 322, 318, 315, 320, 314, 312, 316, 310, 308,
  308, 312, 310, 318, 316, 315, 320, 326, 322, 314, 308,
];

// HR avg per km (target avg 148, max 167)
const HR_PER_KM = [
  134, 139, 142, 144, 146, 147, 147, 148, 148, 148,
  148, 149, 149, 150, 150, 151, 152, 154, 156, 159, 163,
];

// Elevation delta per km (m) — sum +/- ≈ 84/-78 with mild undulations
const ELEV_DELTA = [
  +12, +8, -4, +6, -2, +5, +8, -7, +4, -3,
  +7, -9, +5, +6, -4, -3, +7, +4, +5, -10, +9,
];

// HR zone for each km, used for the tiny dot on the splits row
const HR_ZONE_PER_KM = [
  'Z1', 'Z2', 'Z2', 'Z2', 'Z2', 'Z2', 'Z2', 'Z2', 'Z2', 'Z2',
  'Z2', 'Z3', 'Z3', 'Z3', 'Z3', 'Z3', 'Z3', 'Z3', 'Z4', 'Z4', 'Z4',
];

const ZONE_COLOR = {
  Z1: '#64748B', Z2: '#10B981', Z3: '#F59E0B', Z4: '#F97066', Z5: '#DC2626',
};
const ZONE_NAME = {
  Z1: 'Easy', Z2: 'Aerobic', Z3: 'Tempo', Z4: 'Threshold', Z5: 'VO2 max',
};

// Formatters
function fmtPace(sec) {
  const m = Math.floor(sec / 60);
  const s = String(Math.round(sec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}
function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(Math.round(sec % 60)).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s}`;
  return `${m}:${s}`;
}

// Build the splits with cumulative time
function buildSplits() {
  const avg = PACE_SEC.reduce((a, b) => a + b, 0) / PACE_SEC.length;
  let cum = 0;
  let cumElev = 35; // start altitude
  return PACE_SEC.map((p, i) => {
    cum += p;
    cumElev += ELEV_DELTA[i];
    return {
      km: i + 1,
      paceSec: p,
      pace: fmtPace(p),
      cumTime: fmtTime(cum),
      cumSec: cum,
      hr: HR_PER_KM[i],
      elev: ELEV_DELTA[i],
      cumElev,
      zone: HR_ZONE_PER_KM[i],
      deltaToAvg: p - avg,           // negative = faster
      deltaToPrev: i === 0 ? 0 : p - PACE_SEC[i - 1],
    };
  });
}

const SPLITS = buildSplits();

// Best (fastest) split — exclude warmup km 1
const bestIdx = SPLITS.slice(1).reduce((acc, s, i) => (s.paceSec < SPLITS.slice(1)[acc].paceSec ? i : acc), 0) + 1;
// Worst (slowest, non-warmup)
const worstIdx = SPLITS.slice(1).reduce((acc, s, i) => (s.paceSec > SPLITS.slice(1)[acc].paceSec ? i : acc), 0) + 1;

// ── Tiergarten-like loop polyline ───────────────────────────────────
// Designed in a 1280 x 560 viewBox. Hand-tuned cubic-bezier path.
const ROUTE_PATH = [
  'M 180 412',                          // Start (S)
  'C 250 400, 320 380, 380 348',
  'C 430 322, 470 292, 520 282',
  'C 575 270, 630 290, 680 270',
  'C 730 252, 770 220, 820 210',
  'C 880 198, 940 220, 990 208',
  'C 1040 196, 1075 168, 1100 138',
  'C 1120 112, 1118 84, 1090 72',
  'C 1050 56, 990 70, 940 92',
  'C 880 118, 830 152, 770 162',
  'C 710 172, 660 158, 610 174',
  'C 555 192, 510 226, 470 252',
  'C 425 282, 385 312, 340 320',
  'C 295 328, 260 322, 230 342',
  'C 200 362, 190 388, 175 408',        // detour
  'C 162 424, 152 432, 168 424',        // hook back near S
  'C 178 418, 182 414, 186 416',        // tail
].join(' ');

// Start / finish coords (in viewBox units)
const ROUTE_START = { x: 180, y: 412 };
const ROUTE_FINISH = { x: 186, y: 416 };

// ── Time in zone (minutes) ──────────────────────────────────────────
// Total run = 1:53:12 = 113:12 = 6792 sec → 113.2 minutes
const ZONE_TIME = [
  { zone: 'Z2', label: 'Aerobic',   sec: 47 * 60 + 18, color: '#10B981' },
  { zone: 'Z3', label: 'Tempo',     sec: 28 * 60 + 42, color: '#F59E0B' },
  { zone: 'Z4', label: 'Threshold', sec: 18 * 60 + 0,  color: '#F97066' },
  { zone: 'Z1', label: 'Easy',      sec: 14 * 60 + 12, color: '#64748B' },
  { zone: 'Z5', label: 'VO2 max',   sec:  5 * 60 + 0,  color: '#DC2626' },
];

// Activity meta
const ACTIVITY_META = {
  title: 'Long run · Tiergarten loop',
  city: 'BERLIN · TIERGARTEN LOOP',
  dateLabel: '17 MAY 2026 · SUNDAY · 08:14',
  distanceKm: '21.3',
  totalTime: '1:53:12',
  pace: '5:18',
  hrAvg: 148,
  hrMax: 167,
  elevUp: 84,
  elevDown: 78,
  cadence: 178,
  vdot: 47.1,
  tss: 132,
  hrEff: 21.5,
  source: 'Garmin FIT',
  weather: '14°C · 62% RH · 2 m/s W',
  decoupling: '+2.3%',
  aerobicThresh: 152,
};

Object.assign(window, {
  PACE_SEC, HR_PER_KM, ELEV_DELTA, SPLITS, ZONE_COLOR, ZONE_NAME,
  ROUTE_PATH, ROUTE_START, ROUTE_FINISH, ZONE_TIME, ACTIVITY_META,
  fmtPace, fmtTime, bestIdx, worstIdx,
});
