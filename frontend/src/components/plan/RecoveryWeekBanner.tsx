import React, { useState, useEffect } from 'react';
import type { useT } from '../../i18n/context';

interface Props {
  info: { week_number: number; applied_at: string };
  t: ReturnType<typeof useT>;
}

/**
 * L3 banner: shows this week was auto-rewritten to recovery because the
 * previous week's workouts were mostly missed. Dismissible per-session so
 * users who acknowledge the change don't see it every page revisit.
 *
 * Amber tone — this is informational ("we adapted the plan") not celebratory.
 */
const RecoveryWeekBanner: React.FC<Props> = ({ info, t }) => {
  const storageKey = `recovery-week-dismissed-${info.applied_at}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === '1') setDismissed(true);
    } catch { /* private mode → keep visible */ }
  }, [storageKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* noop */ }
  };

  return (
    <div style={{
      marginBottom: 20,
      padding: '14px 16px',
      borderRadius: 10,
      background: 'rgba(245,158,11,0.08)',
      border: '1px solid rgba(245,158,11,0.30)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14,
        background: '#F59E0B', color: '#fff', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
      }}>
        {/* Pause / restore icon — visually distinct from VDOT-refresh arrows */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9v6M15 9v6" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
          {t.plan.recoveryWeekTitle}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          {t.plan.recoveryWeekBody}
        </div>
      </div>

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

export default RecoveryWeekBanner;
