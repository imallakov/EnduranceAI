export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Whole-day count from today to race date. Returns null if no race date or if
 * date already passed (we don't want negative numbers on shared images).
 * Computed in local time at day-resolution — runners think in calendar days,
 * not UTC offsets.
 */
export function daysUntilRace(raceDate: string | null | undefined): number | null {
  if (!raceDate) return null;
  const race = new Date(raceDate);
  if (Number.isNaN(race.getTime())) return null;
  const today = new Date();
  // Zero out hours so partial days don't cause off-by-one
  const startOfRace = new Date(race.getFullYear(), race.getMonth(), race.getDate());
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = startOfRace.getTime() - startOfToday.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : null;
}

/**
 * Round confidence band (in seconds) to nearest whole minute. ML model returns
 * e.g. 312 sec → user-facing "±5 MIN". Sub-minute precision is false science.
 */
export function confidenceToMinutes(sec: number | null | undefined): number | null {
  if (sec === null || sec === undefined) return null;
  const m = Math.round(sec / 60);
  return m > 0 ? m : null;
}
