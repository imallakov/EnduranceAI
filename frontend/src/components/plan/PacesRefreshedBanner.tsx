import React, { useState, useEffect } from 'react';
import type { useT } from '../../i18n/context';

interface Props {
  info: {
    old_vdot: number;
    new_vdot: number;
    delta: number;
    refreshed_at: string;
  };
  t: ReturnType<typeof useT>;
}

/**
 * One-shot notification that pace zones in the plan were auto-refreshed after
 * the user's VDOT moved by ≥2 pts. Backend sets `plan.paces_refreshed` and
 * auto-clears it after 7 days; we further allow the user to dismiss locally
 * via sessionStorage so it doesn't reappear on every page revisit within the
 * same browsing session.
 *
 * Two tones — improvement (green) and regression (amber) — because softening
 * paces after a VDOT dip is a different message than congratulating progress.
 */
const PacesRefreshedBanner: React.FC<Props> = ({ info, t }) => {
  const storageKey = `paces-refresh-dismissed-${info.refreshed_at}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === '1') {
        setDismissed(true);
      }
    } catch {
      // sessionStorage can throw in private mode — silently keep banner visible
    }
  }, [storageKey]);

  if (dismissed) return null;

  const improved = info.delta > 0;
  const accent = improved ? '#10B981' : '#F59E0B';
  const bg = improved ? 'rgba(16,185,129,0.07)' : 'rgba(245,158,11,0.08)';
  const border = improved ? 'rgba(16,185,129,0.30)' : 'rgba(245,158,11,0.30)';

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* noop */ }
  };

  return (
    <div style={{
      marginBottom: 20,
      padding: '14px 16px',
      borderRadius: 10,
      background: bg,
      border: `1px solid ${border}`,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      {/* Status dot + icon */}
      <div style={{
        width: 28, height: 28, borderRadius: 14,
        background: accent, color: '#fff', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
      }}>
        {improved ? (
          // Up-arrow trend
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M14 7h7v7" />
          </svg>
        ) : (
          // Refresh / down adjustment
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7l6 6 4-4 8 8" />
            <path d="M14 17h7v-7" />
          </svg>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
          {improved ? t.plan.pacesRefreshedTitle : t.plan.pacesRefreshedDeclineTitle}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          {improved
            ? t.plan.pacesRefreshedBody(info.old_vdot, info.new_vdot)
            : t.plan.pacesRefreshedDeclineBody(info.old_vdot, info.new_vdot)}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--muted-2)', padding: 4, lineHeight: 0, flexShrink: 0,
          marginTop: -2,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default PacesRefreshedBanner;
