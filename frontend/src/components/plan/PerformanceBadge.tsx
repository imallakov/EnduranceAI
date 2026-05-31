import React from 'react';
import { useT } from '../../i18n/context';

interface Props {
  /** -2 (worst) .. +2 (best). Null = no score available, badge not rendered. */
  score: number | null;
  /** Compact = chip for inline use (week grid cell); full = pill with label
   *  for drawer/detail views. */
  size?: 'compact' | 'full';
}

/**
 * Color + label mapping for the L2 performance score (-2..+2). Chosen so:
 *   -2 / -1 (off the prescribed pace, in a negative direction): warning amber → red
 *    0 (in zone): neutral indigo — the "expected" result
 *   +1 / +2 (favourable deviation for quality work): emerald → emerald-stronger
 *
 * Renders nothing when score is null (workout not yet scored). Caller decides
 * whether to wrap in a "completed" state — scoring only happens after link.
 */
const PerformanceBadge: React.FC<Props> = ({ score, size = 'compact' }) => {
  const t = useT();
  if (score === null || score === undefined) return null;

  const config: Record<number, { color: string; bg: string; label: string }> = {
    [-2]: { color: '#B91C1C', bg: 'rgba(220,38,38,0.10)', label: t.plan.perfBadgeWayOff },
    [-1]: { color: '#B45309', bg: 'rgba(245,158,11,0.10)', label: t.plan.perfBadgeOff },
    [0]:  { color: '#4338CA', bg: 'rgba(79,70,229,0.10)',  label: t.plan.perfBadgeInZone },
    [1]:  { color: '#047857', bg: 'rgba(16,185,129,0.10)', label: t.plan.perfBadgeFavourable },
    [2]:  { color: '#065F46', bg: 'rgba(16,185,129,0.15)', label: t.plan.perfBadgeAhead },
  };
  const c = config[score] ?? config[0];

  if (size === 'compact') {
    // Just a coloured dot for use inside dense week-grid cells
    return (
      <span
        title={c.label}
        aria-label={c.label}
        style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: 3,
          background: c.color, flexShrink: 0,
        }}
      />
    );
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 6,
      background: c.bg, color: c.color,
      fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3,
    }}>
      {c.label}
    </span>
  );
};

export default PerformanceBadge;
