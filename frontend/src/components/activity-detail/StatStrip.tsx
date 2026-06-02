import React, { useState } from 'react';
import type { ActivityDetail } from '../../types/api';
import { formatPace } from './utils';
import { IconArrowUp } from '../icons';
import { useT } from '../../i18n/context';

interface StatStripProps {
  activity: ActivityDetail;
}

const StatStrip: React.FC<StatStripProps> = ({ activity }) => {
  const t = useT();
  // Index of the cell whose info caption is currently expanded, or null.
  // Click-toggle (vs hover) so it works on touch and gives the user explicit
  // control — accidental hovers don't pop a wall of text.
  const [openInfo, setOpenInfo] = useState<number | null>(null);
  const pace = activity.avg_pace_sec_per_km != null ? Number(activity.avg_pace_sec_per_km) : null;
  const elevGain = activity.elevation_gain_m != null ? Math.round(Number(activity.elevation_gain_m)) : null;
  const elevLoss = activity.elevation_loss_m != null ? Math.round(Number(activity.elevation_loss_m)) : null;
  const vdot = activity.vdot_estimate != null ? Number(activity.vdot_estimate).toFixed(1) : null;
  const tss = activity.tss != null ? Math.round(Number(activity.tss)) : null;
  const hrEff =
    pace != null && activity.avg_hr != null && activity.avg_hr > 0
      ? (pace / activity.avg_hr).toFixed(1)
      : null;

  const elevStr =
    elevGain != null || elevLoss != null
      ? `${elevGain != null ? `+${elevGain}` : '—'} / ${elevLoss != null ? `−${elevLoss}` : '—'}`
      : '—';

  // tooltip is opt-in via `title` so screen-readers / hover both work without
  // pulling in a tooltip library.
  const cells: Array<{
    label: string; value: string; suffix: string;
    delta: { text: string; tone: 'success' } | null;
    title?: string;
  }> = [
    { label: 'PACE',          value: formatPace(pace),                                    suffix: '/km',   delta: null },
    { label: 'HR AVG / MAX',  value: `${activity.avg_hr ?? '—'} / ${activity.max_hr ?? '—'}`, suffix: 'bpm',   delta: null },
    { label: 'ELEV ↑ / ↓',   value: elevStr,                                             suffix: 'm',     delta: null },
    { label: 'CADENCE',       value: activity.avg_cadence != null ? String(activity.avg_cadence) : '—', suffix: 'spm', delta: null },
    {
      label: 'VDOT (RUN)',
      value: vdot ?? '—',
      suffix: '',
      delta: vdot ? { text: 'estimated', tone: 'success' } : null,
      title: t.activities.vdotRunTooltip,
    },
    { label: 'TSS',           value: tss != null ? String(tss) : '—',                    suffix: '',      delta: null },
    { label: 'HR EFFICIENCY', value: hrEff ?? '—',                                        suffix: hrEff ? 's/bpm' : '', delta: null },
    { label: 'SOURCE',        value: activity.source.toUpperCase(),                       suffix: '',      delta: null },
  ];

  return (
    <div className="activity-stats-bento" style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12
    }}>
      {cells.map((c, i) => (
        <div key={i} className="card hoverable" style={{
          padding: '16px',
          background: '#F8FAFC',
          display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center',
          boxShadow: 'none', border: '1px solid var(--border-soft)',
          // Anchor for the floating info popover. position:relative is
          // enough — the popover uses position:absolute inside.
          position: 'relative',
        }}>
          <span className="label-sm" style={{
            fontSize: 10.5,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            {c.label}
            {c.title && (
              <button
                type="button"
                onClick={() => setOpenInfo(openInfo === i ? null : i)}
                aria-label="More info"
                aria-expanded={openInfo === i}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 14, height: 14, padding: 0, border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  color: openInfo === i ? '#4F46E5' : 'currentColor',
                  opacity: openInfo === i ? 1 : 0.55,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                     aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </button>
            )}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 2 }}>
            <span className="mono" style={{
              fontSize: 21, fontWeight: 600, color: 'var(--text)',
              letterSpacing: -0.3, lineHeight: 1,
            }}>
              {c.value}
            </span>
            {c.suffix && (
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.suffix}</span>
            )}
          </div>
          {c.delta && (
            <div style={{ marginTop: 4 }}>
              <span className="pill pill-soft-success" style={{ height: 20, padding: '0 6px', fontSize: 10, gap: 3 }}>
                <IconArrowUp size={10} />
                {c.delta.text}
              </span>
            </div>
          )}
          {/* Floating popover. position:absolute keeps the grid row at its
              natural height — the caption hovers above other cards rather
              than pushing them down. Click ⓘ again (or anywhere else once
              we add outside-click) to dismiss. */}
          {c.title && openInfo === i && (
            <>
              {/* invisible backdrop catches outside clicks */}
              <div
                onClick={() => setOpenInfo(null)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 40,
                  background: 'transparent',
                }}
              />
              <div
                role="tooltip"
                style={{
                  position: 'absolute', zIndex: 50,
                  top: 'calc(100% + 6px)', left: 12, right: 12,
                  padding: '10px 12px',
                  fontSize: 11.5, lineHeight: 1.5,
                  color: 'var(--text)',
                  background: '#fff',
                  border: '1px solid #C7D2FE',
                  borderRadius: 8,
                  boxShadow: '0 12px 28px -8px rgba(15,23,42,0.18)',
                  minWidth: 220,
                }}
              >
                {/* little arrow */}
                <div style={{
                  position: 'absolute', top: -6, left: 20,
                  width: 12, height: 12,
                  background: '#fff',
                  borderTop: '1px solid #C7D2FE',
                  borderLeft: '1px solid #C7D2FE',
                  transform: 'rotate(45deg)',
                }} />
                {c.title}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatStrip;
