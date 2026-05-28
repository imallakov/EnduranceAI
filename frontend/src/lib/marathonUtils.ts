import type { Marathon } from '../types/api';

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function countryToFlag(code: string): string {
  if (!code || code.length < 2) return '';
  return code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');
}

export function getDiffKey(coeff: number): 'flat' | 'mid' | 'hilly' | 'tough' {
  if (coeff <= 1.01) return 'flat';
  if (coeff <= 1.025) return 'mid';
  if (coeff <= 1.04) return 'hilly';
  return 'tough';
}

export function getDiffDots(coeff: number): string {
  const k = getDiffKey(coeff);
  if (k === 'flat') return '●○○';
  if (k === 'mid') return '●●○';
  return '●●●';
}

export function getMarathonMonth(m: Marathon): number | null {
  const keys = Object.keys(m.avg_temp_by_month);
  if (!keys.length) return null;
  return parseInt(keys[0], 10) - 1; // 0-indexed
}

export function getMonthName(m: Marathon): string {
  const idx = getMarathonMonth(m);
  return idx !== null ? MONTH_NAMES[idx] : '—';
}

export function getAvgTemp(m: Marathon): string {
  const keys = Object.keys(m.avg_temp_by_month);
  if (!keys.length) return '—';
  const temp = m.avg_temp_by_month[keys[0]];
  return `${temp}°C`;
}

// Synthetic elevation profile derived from gain/loss for visual display
export function makeSyntheticProfile(gain: number, _loss: number, seed: string, n = 43): number[] {
  const s0 = seed.charCodeAt(0) || 65;
  const s2 = seed.charCodeAt(2) || 77;
  const base = 120;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const w1 = Math.sin(t * Math.PI * (2 + (s0 % 3)));
    const w2 = Math.cos(t * Math.PI * (1 + (s2 % 2)));
    return Math.max(0, base + gain * 0.5 * w1 + gain * 0.15 * w2);
  });
}
