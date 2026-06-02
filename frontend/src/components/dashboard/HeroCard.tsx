import React from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconTimer, IconMountain, IconCloud } from '../icons';
import type { Prediction } from '../../types/api';
import { formatTime } from '../../lib/format';
import { useT } from '../../i18n/context';

interface HeroCardProps {
  prediction: Prediction | null;
  daysToRace: number | null;
  predictionForTarget?: boolean;
  targetMarathonName?: string | null;
  /** Used to deep-link "Generate prediction" CTA to /predictions with the
   *  target marathon already selected, so the user doesn't pick it twice. */
  targetMarathonId?: string | null;
}

function formatConfidence(sec: number | null): string {
  if (sec === null) return '';
  const mins = Math.round(sec / 60);
  return `±${mins} min`;
}

function formatCourseAdj(baseTimeSec: number | null, coeff: number | null): string {
  if (baseTimeSec === null || coeff === null) return '—';
  const adjSec = Math.round(baseTimeSec * (coeff - 1.0));
  if (adjSec === 0) return '0:00';
  const sign = adjSec > 0 ? '+' : '-';
  const abs = Math.abs(adjSec);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m}:${String(s).padStart(2, '0')}`;
}

const HeroCard: React.FC<HeroCardProps> = ({
  prediction,
  daysToRace,
  predictionForTarget = true,
  targetMarathonName,
  targetMarathonId,
}) => {
  const t = useT();

  if (!prediction) {
    // When the user already has a target marathon set, pass its id along so
    // the Predictions page can preselect it — saves one redundant click.
    const generateHref = targetMarathonName
      ? (targetMarathonId ? `/predictions?marathon=${targetMarathonId}` : '/predictions')
      : '/marathons';
    return (
      <div className="card hero-card-root" style={{ padding: 24, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="label-sm" style={{ marginBottom: 8 }}>{t.dashboard.noPrediction}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            {targetMarathonName
              ? t.dashboard.generatePredictionFor(targetMarathonName)
              : t.dashboard.setTargetFirst}
          </div>
          <Link
            to={generateHref}
            className="btn btn-coral"
            style={{ textDecoration: 'none' }}
          >
            {targetMarathonName ? t.dashboard.generatePrediction : t.dashboard.setYourTarget} <IconArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  const baseTimeSec = prediction.base_time_sec;
  const coeff = prediction.course_difficulty_coefficient;
  const isBasicMode = prediction.features_snapshot?.is_marathon_distance === false;

  // Three distinct states:
  //   (a) prediction matches user's current target  → "Next race" (normal)
  //   (b) prediction is for a different marathon than the target  → stale-prediction amber warning
  //   (c) no target at all, but a historical prediction exists  → "Last prediction" amber warning
  const isHistoricalOnly = !targetMarathonName;
  const isStaleForTarget = !predictionForTarget && !!targetMarathonName;

  return (
    <div className="card hero-card-root" style={{ padding: 24, minHeight: 200, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Stale prediction amber warning — user HAS a target but prediction is for another race */}
      {isStaleForTarget && (
        <div style={{
          marginBottom: 8, padding: '6px 12px', borderRadius: 6,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          fontSize: 11.5, color: '#B45309',
        }}>
          <span>{t.dashboard.stalePrediction}</span>
          <Link to="/predictions" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none', fontSize: 11.5, flexShrink: 0 }}>
            {t.dashboard.updateFor(targetMarathonName!)} →
          </Link>
        </div>
      )}

      {/* Historical prediction warning — user has NO target, this is just the last saved prediction */}
      {isHistoricalOnly && (
        <div style={{
          marginBottom: 8, padding: '8px 12px', borderRadius: 6,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          fontSize: 11.5, color: '#B45309',
        }}>
          <span style={{ flex: 1, lineHeight: 1.4 }}>{t.dashboard.historicalPredictionNoTarget}</span>
          <Link to="/marathons" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none', fontSize: 11.5, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {t.dashboard.chooseTarget} →
          </Link>
        </div>
      )}

      <div className="hero-card-inner" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left — prediction */}
        <div style={{ flex: '1.4 1 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="label-sm">{isHistoricalOnly ? t.dashboard.lastPrediction : t.dashboard.nextRace}</span>
            <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
            <span className="label-sm" style={{ color: 'var(--text)', fontWeight: 700 }}>
              {prediction.marathon_name ?? 'Marathon'}
            </span>
            {daysToRace !== null && (
              <>
                <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
                <span className="label-sm">
                  {t.dashboard.in} <span className="mono" style={{ color: 'var(--text)' }}>{daysToRace}</span> {t.dashboard.days}
                </span>
              </>
            )}
            {prediction.race_date && (
              <span className="pill pill-soft-indigo" style={{ marginLeft: 4 }}>
                {prediction.race_date}
              </span>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span className="mono" style={{ fontSize: 56, fontWeight: 600, color: 'var(--primary)', letterSpacing: -2, lineHeight: 1 }}>
                {prediction.predicted_time_formatted}
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {prediction.confidence_interval_sec && (
                <span className="mono">{formatConfidence(prediction.confidence_interval_sec)}</span>
              )}
              <span>{t.dashboard.confidenceInterval} · </span>
              <span>Daniels + XGBoost</span>
              {isBasicMode && (
                <span style={{
                  padding: '1px 7px', borderRadius: 4,
                  background: 'rgba(245,158,11,0.10)', color: '#92400E',
                  fontSize: 11, fontWeight: 500, border: '1px solid rgba(245,158,11,0.25)',
                }}>
                  {t.dashboard.basicModeHint}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right — breakdown */}
        <div className="hero-breakdown" style={{
          width: 280, flexShrink: 0, borderLeft: '1px solid var(--border)', paddingLeft: 24,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div className="label-sm" style={{ marginBottom: 12 }}>{t.dashboard.breakdown}</div>
            {([
              [t.dashboard.baseTime, baseTimeSec !== null ? formatTime(baseTimeSec) : '—', null, IconTimer, 'var(--muted)'],
              [t.dashboard.course, formatCourseAdj(baseTimeSec, coeff), coeff !== null ? `coeff ${Number(coeff).toFixed(3)}` : null, IconMountain, 'var(--text)'],
              [t.dashboard.weather, prediction.weather_index !== null ? `×${Number(prediction.weather_index).toFixed(3)}` : '—', null, IconCloud, 'var(--warning)'],
            ] as const).map(([k, v, sub, Icon, vc]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '16px 1fr auto', columnGap: 10, alignItems: 'center', padding: '4px 0' }}>
                <Icon size={13} style={{ color: 'var(--muted-2)' }} />
                <div>
                  <span style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>{k}</span>
                  {sub && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>{sub}</span>}
                </div>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: vc }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link to="/predictions" className="btn btn-coral" style={{ height: 34, fontSize: 12.5, textDecoration: 'none' }}>
              {t.dashboard.viewPredictionDetails} <IconArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroCard;
