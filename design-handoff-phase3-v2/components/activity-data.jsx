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

// ── Tiergarten loop — simulated GPS polyline ─────────────────────────
// Designed in a 1280 x 560 viewBox. Built from ~60 axis-aligned waypoints
// (so corners look like real intersection turns), subdivided into short
// segments with seeded jitter to mimic GPS noise.
const ROUTE_WAYPOINTS = [
  // Start SW, run east along southern streets, taking corners
  [148, 462], [200, 462], [262, 462], [262, 482], [320, 482], [380, 482],
  [380, 458], [440, 458], [510, 458], [580, 458],
  // Approach Brandenburg Gate area, touch landmark
  [580, 430], [640, 430], [640, 408],
  // Enter park via Gate
  [700, 408], [700, 372],
  // Diagonal weave west through park paths
  [658, 372], [610, 348], [560, 318], [510, 304], [462, 282], [412, 264],
  [368, 240], [368, 200],
  // North path along park edge
  [430, 184], [490, 168], [560, 158], [625, 152], [690, 148], [762, 138],
  [840, 134], [918, 144], [980, 162], [1018, 196],
  // Loop back inside park
  [1018, 248], [962, 268], [898, 282], [840, 296], [820, 326],
  // Pond loop (self-intersects)
  [800, 354], [822, 372], [822, 392], [792, 402], [754, 392], [732, 366],
  [732, 338], [758, 322], [792, 322], [800, 354],
  // Exit south through park
  [840, 372], [880, 396], [880, 426],
  // West along southern street back to start
  [848, 444], [800, 444], [740, 444], [680, 444], [620, 444], [560, 444],
  [502, 444], [442, 444], [382, 444], [322, 444], [262, 444],
  [212, 458], [178, 462],
];

function buildGpsRoute() {
  // Seeded PRNG so jitter is stable across renders
  let seed = 4242;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  const pts = [];
  for (let i = 0; i < ROUTE_WAYPOINTS.length - 1; i++) {
    const [x1, y1] = ROUTE_WAYPOINTS[i];
    const [x2, y2] = ROUTE_WAYPOINTS[i + 1];
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(2, Math.round(dist / 14)); // ~14px per recorded sample
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      let x = x1 + (x2 - x1) * t;
      let y = y1 + (y2 - y1) * t;
      if (s > 0) {
        // GPS noise: ±2.2 px
        x += (rnd() - 0.5) * 4.4;
        y += (rnd() - 0.5) * 4.4;
      }
      pts.push([x, y]);
    }
  }
  pts.push(ROUTE_WAYPOINTS[ROUTE_WAYPOINTS.length - 1]);
  return pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}

const ROUTE_POINTS = buildGpsRoute();

// Start / finish (very close — typical loop run)
const ROUTE_START = { x: 148, y: 462 };
const ROUTE_FINISH = { x: 178, y: 462 };

// Legacy alias kept so any old `d={ROUTE_PATH}` consumers still draw
// something (uses M..L.. form so it works as a <path d>).
const ROUTE_PATH = 'M ' + ROUTE_POINTS.split(' ').join(' L ');

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
  ROUTE_PATH, ROUTE_POINTS, ROUTE_START, ROUTE_FINISH, ZONE_TIME, ACTIVITY_META,
  fmtPace, fmtTime, bestIdx, worstIdx,
});
