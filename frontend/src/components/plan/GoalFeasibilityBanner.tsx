import React from 'react';
import { useT } from '../../i18n/context';

interface Props {
  info: {
    projected_time_sec: number;
    target_time_sec: number;
    delta_sec: number;
    status: 'ahead' | 'on_track' | 'slightly_behind' | 'behind';
    vdot_used: number;
    course_coeff_used: number;
  };
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * L4 goal feasibility banner. Renders directly above plan content (under the
 * other adaptation banners) so the user always sees fitness-vs-target at the
 * top. Tone depends on status — green for ahead, neutral indigo for on-track,
 * amber for slightly behind, red for behind. NOT dismissible — this is
 * persistent context, not a one-time notification.
 *
 * Why not dismissible (unlike L1/L3 banners): paces refresh and recovery week
 * are events that happened once. Goal feasibility is the ongoing state of the
 * plan and should be visible whenever the user opens it.
 */
const GoalFeasibilityBanner: React.FC<Props> = ({ info }) => {
  const t = useT();
  const projected = fmtTime(info.projected_time_sec);
  const target = fmtTime(info.target_time_sec);
  const deltaMin = Math.abs(Math.round(info.delta_sec / 60));

  const config = {
    ahead: {
      title: t.plan.goalAheadTitle,
      body: t.plan.goalAheadBody(deltaMin, projected, target),
      accent: '#10B981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.30)',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
        </svg>
      ),
    },
    on_track: {
      title: t.plan.goalOnTrackTitle,
      body: t.plan.goalOnTrackBody(projected, target),
      accent: '#4F46E5', bg: 'rgba(79,70,229,0.07)', border: 'rgba(79,70,229,0.30)',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" />
        </svg>
      ),
    },
    slightly_behind: {
      title: t.plan.goalSlightlyBehindTitle,
      body: t.plan.goalSlightlyBehindBody(deltaMin, projected, target),
      accent: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.30)',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16v.5" />
        </svg>
      ),
    },
    behind: {
      title: t.plan.goalBehindTitle,
      body: t.plan.goalBehindBody(deltaMin, projected, target),
      accent: '#DC2626', bg: 'rgba(220,38,38,0.07)', border: 'rgba(220,38,38,0.30)',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4M12 17v.5" /><path d="M10.3 3.7l-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z" />
        </svg>
      ),
    },
  }[info.status];

  return (
    <div style={{
      marginBottom: 20,
      padding: '14px 16px',
      borderRadius: 10,
      background: config.bg,
      border: `1px solid ${config.border}`,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14,
        background: config.accent, color: '#fff', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
      }}>
        {config.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
          {config.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          {config.body}
        </div>
      </div>
    </div>
  );
};

export default GoalFeasibilityBanner;
