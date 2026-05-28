// Mock data ported from dashboard.jsx and charts.jsx

// ── Fitness series (CTL/ATL/TSB, 84 days) ─────────────────────────
function genFitnessSeries() {
  const days = 84;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const tss: number[] = [];
  for (let i = 0; i < days; i++) {
    const dow = i % 7;
    let v: number;
    if (dow === 0) v = 95 + rnd() * 35;
    else if (dow === 6) v = 0;
    else if (dow === 3) v = 80 + rnd() * 20;
    else if (dow === 1) v = 0 + (rnd() < 0.3 ? 30 : 0);
    else v = 40 + rnd() * 30;
    v *= 0.85 + (i / days) * 0.45;
    if (Math.floor(i / 7) % 4 === 3) v *= 0.65;
    tss.push(v);
  }
  const ctl: number[] = [], atl: number[] = [];
  let cPrev = 35, aPrev = 30;
  const kC = 2 / (42 + 1), kA = 2 / (7 + 1);
  for (const t of tss) {
    cPrev = (t - cPrev) * kC + cPrev;
    aPrev = (t - aPrev) * kA + aPrev;
    ctl.push(cPrev);
    atl.push(aPrev);
  }
  return ctl.map((c, i) => ({ day: i, ctl: c, atl: atl[i], tsb: c - atl[i] }));
}

export const SERIES = genFitnessSeries();

// ── Activities mock ────────────────────────────────────────────────
export type ActivityKind = 'long' | 'easy' | 'workout';

export interface MockActivity {
  date: string;
  dow: string;
  title: string;
  distance: string;
  pace: string;
  vdot: number;
  kind: ActivityKind;
}

export const ACTIVITIES: MockActivity[] = [
  { date: '17 May', dow: 'Sun', title: 'Long run · Tiergarten loop', distance: '21.3 km', pace: '5:18/km', vdot: 47.1, kind: 'long' },
  { date: '16 May', dow: 'Sat', title: 'Recovery jog', distance: '8.2 km', pace: '5:54/km', vdot: 45.3, kind: 'easy' },
  { date: '15 May', dow: 'Fri', title: 'Threshold · 5×2km', distance: '14.7 km', pace: '4:32/km', vdot: 48.6, kind: 'workout' },
  { date: '14 May', dow: 'Thu', title: 'Easy run + strides', distance: '10.5 km', pace: '5:41/km', vdot: 46.8, kind: 'easy' },
  { date: '13 May', dow: 'Wed', title: 'VO₂ · 6×800m', distance: '12.0 km', pace: '4:18/km', vdot: 49.2, kind: 'workout' },
];
