import React, { useState, useEffect } from 'react';
import type { useT } from '../../i18n/context';
import { reschedulePlanWeek } from '../../api/plans';

interface Props {
  info: { week_number: number; gap_days: number; first_date: string; second_date: string };
  planId: string;
  /** Called after a successful reschedule so the parent can refetch the plan. */
  onRescheduled: () => void;
  t: ReturnType<typeof useT>;
}

/**
 * Phase 2 re-flow banner: the current week has two hard efforts landing <2 days
 * apart. Offers to reorder the week (same workouts & volume, long run anchored)
 * so there's recovery between hard days. NEVER rewrites silently — the runner
 * chooses [Rebalance] or [Keep]. Indigo/brand tone (actionable, not a warning).
 */
const ReflowBanner: React.FC<Props> = ({ info, planId, onRescheduled, t }) => {
  const storageKey = `reflow-dismissed-${info.first_date}-${info.second_date}`;
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === '1') setDismissed(true);
    } catch { /* private mode → keep visible */ }
  }, [storageKey]);

  if (dismissed) return null;

  const handleKeep = () => {
    setDismissed(true);
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* noop */ }
  };

  const handleRebalance = async () => {
    setBusy(true);
    try {
      await reschedulePlanWeek(planId);
      onRescheduled();
    } catch {
      setBusy(false);   // keep banner so the user can retry
    }
  };

  return (
    <div style={{
      marginBottom: 20,
      padding: '14px 16px',
      borderRadius: 10,
      background: 'rgba(79,70,229,0.07)',
      border: '1px solid rgba(79,70,229,0.30)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14,
        background: '#4F46E5', color: '#fff', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
      }}>
        {/* Shuffle / reorder icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
          {t.plan.reflowTitle}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 10 }}>
          {t.plan.reflowBody}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleRebalance}
            disabled={busy}
            style={{
              background: '#4F46E5', color: '#fff', border: 'none',
              borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 600,
              cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? t.plan.reflowWorking : t.plan.reflowAction}
          </button>
          <button
            onClick={handleKeep}
            disabled={busy}
            style={{
              background: 'transparent', color: 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: 8,
              padding: '7px 14px', fontSize: 12.5, fontWeight: 600,
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            {t.plan.reflowKeep}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReflowBanner;
