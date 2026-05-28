import React, { useState, useCallback } from 'react';
import { getActivity } from '../../api/activities';
import ShareStoryModal from './ShareStoryModal';
import { IconShare } from '../icons';
import type { ShareData } from '../../types/share';

interface Props {
  activityId: string;
  /** Visual style for the trigger button. 'icon' = compact icon-only (table
   *  rows, mobile cards), 'pill' = labelled button (detail page). */
  variant?: 'icon' | 'pill';
  label?: string;
  /** Optional title attribute for icon-variant tooltip (e.g. "Share to story") */
  title?: string;
}

/**
 * Drop-in share trigger usable from anywhere we list activities. On click it
 * fetches the FULL activity (polyline, laps, max_hr, etc — none of which the
 * list endpoint returns) and opens the share modal once data arrives.
 *
 * Why fetch-on-click instead of preloading: list pages render 50+ activities;
 * preloading polylines for all would bloat the list endpoint and waste
 * bandwidth since most users won't share most activities.
 *
 * Loading window is typically 100-300ms — short enough that a subtle button
 * spinner is sufficient UX (no skeleton or modal-empty-state needed).
 */
const ShareActivityButton: React.FC<Props> = ({
  activityId, variant = 'icon', label = 'Share', title = 'Share to story',
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    // Critical inside Link-wrapped rows: stop the row's navigation handler so
    // clicking Share doesn't bounce the user to the activity detail page.
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const full = await getActivity(activityId);
      setData({
        distance_km: full.distance_km,
        duration_sec: full.duration_sec,
        avg_pace_sec_per_km: full.avg_pace_sec_per_km,
        avg_hr: full.avg_hr,
        max_hr: full.max_hr,
        elevation_gain_m: full.elevation_gain_m,
        vdot_estimate: full.vdot_estimate,
        tss: full.tss,
        laps: full.laps,
        polyline: full.polyline,
        start_time: full.start_time,
      });
      setOpen(true);
    } catch (err) {
      console.error('Failed to load activity for share:', err);
      setError('Could not load activity. Try opening it in detail view.');
      // Auto-clear after a few seconds so it doesn't stick
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  }, [activityId, loading]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Keep `data` mounted briefly so the closing animation doesn't flash empty.
    // Cleared on next open via fresh setData call.
  }, []);

  const buttonContent = loading ? (
    <span
      className="animate-spin"
      style={{
        width: variant === 'icon' ? 13 : 14, height: variant === 'icon' ? 13 : 14,
        border: '2px solid rgba(0,0,0,0.15)',
        borderTopColor: 'currentColor',
        borderRadius: '50%',
      }}
    />
  ) : (
    <IconShare size={variant === 'icon' ? 13 : 14} />
  );

  return (
    <>
      {variant === 'icon' ? (
        <button
          className="btn btn-ghost"
          style={{
            height: 28, width: 28, padding: 0, border: 'none',
            color: 'var(--muted-2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={error ?? title}
          onClick={handleClick}
          disabled={loading}
          aria-label={title}
        >
          {buttonContent}
        </button>
      ) : (
        <button
          className="btn btn-ghost"
          style={{
            height: 36, padding: '0 12px',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12.5, fontWeight: 500,
          }}
          onClick={handleClick}
          disabled={loading}
        >
          {buttonContent}
          {loading ? 'Loading…' : label}
        </button>
      )}
      {open && data && (
        <ShareStoryModal open={open} onClose={handleClose} data={data} />
      )}
    </>
  );
};

export default ShareActivityButton;
