import React from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight } from '../icons';
import { formatPace } from '../../lib/format';
import type { Activity } from '../../types/api';
import { useT, useLang } from '../../i18n/context';

type ActivityKind = 'long' | 'easy' | 'workout';

const KIND_DOT: Record<ActivityKind, string> = {
  long: '#1E1B4B',
  easy: '#94A3B8',
  workout: '#F97066',
};

function deriveKind(distanceKm: number, avgPaceSec: number | null): ActivityKind {
  if (distanceKm >= 18) return 'long';
  if (avgPaceSec !== null && avgPaceSec < 280) return 'workout';
  return 'easy';
}

function deriveTitle(distanceKm: number, avgPaceSec: number | null): string {
  const kind = deriveKind(distanceKm, avgPaceSec);
  if (kind === 'long') return `Long run · ${distanceKm.toFixed(1)} km`;
  if (kind === 'workout') return `Workout · ${distanceKm.toFixed(1)} km`;
  return `Easy run · ${distanceKm.toFixed(1)} km`;
}

interface ActivitiesCardProps {
  activities: Activity[];
}

const ActivitiesCard: React.FC<ActivitiesCardProps> = ({ activities }) => {
  const t = useT();
  const { lang } = useLang();

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label-sm">{t.dashboard.recentActivities}</span>
        <Link to="/activities" style={{ fontSize: 12, color: 'var(--primary-2)', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          {t.activities.seeAll} <IconArrowRight size={11} />
        </Link>
      </div>
      <div style={{ height: 1, background: 'var(--border)' }} />

      {activities.length === 0 ? (
        <div style={{ padding: '28px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>{t.empty.noActivities}</div>
          <Link to="/activities" className="btn btn-ghost" style={{ textDecoration: 'none', fontSize: 12, height: 30 }}>
            {t.empty.uploadFirstActivity} <IconArrowRight size={11} />
          </Link>
        </div>
      ) : (
        <div className="nice-scroll" style={{ maxHeight: 280, overflow: 'auto' }}>
          {activities.map((a, i) => {
            const startDate = new Date(a.start_time);
            const dow = startDate.toLocaleDateString(lang, { weekday: 'short' }).toUpperCase();
            const day = startDate.toLocaleDateString(lang, { day: 'numeric' });
            const kind = deriveKind(Number(a.distance_km), a.avg_pace_sec_per_km !== null ? Number(a.avg_pace_sec_per_km) : null);
            const title = deriveTitle(Number(a.distance_km), a.avg_pace_sec_per_km !== null ? Number(a.avg_pace_sec_per_km) : null);
            const paceStr = a.avg_pace_sec_per_km !== null
              ? formatPace(Number(a.avg_pace_sec_per_km))
              : '—';
            const vdot = a.vdot_estimate !== null ? Number(a.vdot_estimate).toFixed(1) : '—';

            return (
              <React.Fragment key={a.id}>
                {i > 0 && <div style={{ height: 1, background: 'var(--border-soft)', margin: '0 18px' }} />}
                <div className="act-row" style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr auto',
                  alignItems: 'center', columnGap: 12,
                  padding: '12px 18px', height: 56,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span className="mono" style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600, lineHeight: 1 }}>{day}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{dow}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: 3, background: KIND_DOT[kind] }} />
                      <span style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                      {Number(a.distance_km).toFixed(1)} km · {paceStr}
                    </div>
                  </div>
                  <span className="pill pill-indigo mono">{vdot}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivitiesCard;
