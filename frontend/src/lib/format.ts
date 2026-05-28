import dayjs from 'dayjs';

/** Convert total seconds to "H:MM:SS" */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Convert pace in seconds/km to "M:SS/km" */
export function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

/** Format a date string for display */
export function formatDate(dateStr: string, fmt = 'D MMM'): string {
  return dayjs(dateStr).format(fmt);
}
