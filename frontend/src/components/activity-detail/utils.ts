export function formatPace(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = String(Math.round(sec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

export function formatTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = String(Math.round(totalSec % 60)).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s}`;
  return `${m}:${s}`;
}

export function deriveKind(distanceKm: number, avgPaceSec: number | null): 'Long' | 'Workout' | 'Easy' {
  if (distanceKm >= 18) return 'Long';
  if (avgPaceSec !== null && avgPaceSec < 280) return 'Workout';
  return 'Easy';
}

export function fmtDate(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

export const ZONE_DOT_COLOR: Record<string, string> = {
  Z1: '#64748B',
  Z2: '#10B981',
  Z3: '#F59E0B',
  Z4: '#F97066',
  Z5: '#DC2626',
};

export function lapZone(hr: number | null | undefined, maxHr: number | null): string | null {
  if (!hr || !maxHr || maxHr <= 0) return null;
  const pct = hr / maxHr;
  if (pct < 0.65) return 'Z1';
  if (pct < 0.80) return 'Z2';
  if (pct < 0.88) return 'Z3';
  if (pct < 0.93) return 'Z4';
  return 'Z5';
}
