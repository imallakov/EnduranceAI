import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMarathon } from '../hooks/useMarathonDetail';
import { useSetTargetMarathon } from '../hooks/useMarathonsExtra';
import { useAuth } from '../hooks/useAuth';
import ActivityMap from '../components/activity-detail/ActivityMap';
import DifficultyBar from '../components/marathon/DifficultyBar';
import MiniElevation from '../components/marathon/MiniElevation';
import { useT } from '../i18n/context';
import useIsMobile from '../lib/useIsMobile';
import {
  countryToFlag, getDiffKey, MONTH_NAMES, MONTH_NAMES_FULL,
  makeSyntheticProfile,
} from '../lib/marathonUtils';

// Has real per-km elevation data from GPX? Anything ≥2 points renders fine.
function hasRealProfile(m: { elevation_profile?: Array<{ km: number; elevation_m: number }> } | null | undefined): boolean {
  return !!(m?.elevation_profile && m.elevation_profile.length > 1);
}

// ── Helpers ───────────────────────────────────────────────────────────

function getDiffLabel(coeff: number, t: ReturnType<typeof useT>): string {
  const k = getDiffKey(coeff);
  if (k === 'flat')  return t.marathons.difficultyFlat;
  if (k === 'mid')   return t.marathons.difficultyRolling;
  if (k === 'hilly') return t.marathons.difficultyHilly;
  return t.marathons.difficultyTough;
}

function getTempCategory(temp: number, t: ReturnType<typeof useT>): { label: string; color: string } {
  if (temp < 10)  return { label: t.marathonDetail.tempCategoryCold,  color: 'var(--primary)' };
  if (temp <= 18) return { label: t.marathonDetail.tempCategoryIdeal, color: '#10B981' };
  if (temp <= 22) return { label: t.marathonDetail.tempCategoryWarm,  color: '#F59E0B' };
  return           { label: t.marathonDetail.tempCategoryHot,          color: '#EF4444' };
}

// ── Skeleton ──────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div style={{ padding: '24px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ height: 16, width: 160, background: '#E2E8F0', borderRadius: 4, marginBottom: 24 }} />
      <div style={{ height: 32, width: '50%', background: '#E2E8F0', borderRadius: 6, marginBottom: 12 }} />
      <div style={{ height: 16, width: '30%', background: '#F1F5F9', borderRadius: 4, marginBottom: 32 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        <div style={{ height: 380, background: '#F1F5F9', borderRadius: 12 }} />
        <div style={{ height: 380, background: '#F1F5F9', borderRadius: 12 }} />
      </div>
    </div>
  );
}

// ── KPI cell ──────────────────────────────────────────────────────────
function KpiCell({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div style={{
      padding: '16px 18px', borderRadius: 10,
      background: '#FAFAF9', border: '1px solid #E2E8F0',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 22, fontWeight: 600, color: '#0F172A', letterSpacing: -0.5, lineHeight: 1.1 }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#64748B' }}>{unit}</span>
        )}
      </div>
      {sub && (
        <span style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.3 }}>{sub}</span>
      )}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────
function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
      padding: '24px 28px', ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#0F172A', letterSpacing: -0.2 }}>
      {children}
    </h2>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
const MarathonDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const isMobile = useIsMobile();

  const { data: marathon, isLoading, isError } = useMarathon(id ?? '');
  const setTargetMut = useSetTargetMarathon();
  const [settingTarget, setSettingTarget] = useState(false);

  // ── Derived values ──────────────────────────────────────────────────
  const coeff = marathon ? Number(marathon.difficulty_coefficient) : 1.0;
  const gain  = marathon ? Math.round(Number(marathon.elevation_gain_m) ?? 0) : 0;
  const loss  = marathon ? Math.round(Number(marathon.elevation_loss_m) ?? 0) : 0;

  const isTarget = user?.target_marathon === marathon?.id;

  // Race-day temperature from avg_temp_by_month (single key per marathon)
  const raceMonthKey = marathon ? Object.keys(marathon.avg_temp_by_month)[0] ?? null : null;
  const raceTemp     = raceMonthKey && marathon ? marathon.avg_temp_by_month[raceMonthKey] ?? null : null;
  const raceMonthIdx = raceMonthKey ? parseInt(raceMonthKey, 10) - 1 : null;
  const raceMonthShort = raceMonthIdx !== null && raceMonthIdx >= 0 ? MONTH_NAMES[raceMonthIdx] : null;
  const raceMonthFull  = raceMonthIdx !== null && raceMonthIdx >= 0 ? MONTH_NAMES_FULL[raceMonthIdx] : null;

  const tempCat = raceTemp !== null ? getTempCategory(raceTemp, t) : null;

  const elevProfile = useMemo(() => {
    if (!marathon) return [];
    return makeSyntheticProfile(gain, loss, marathon.name);
  }, [gain, loss, marathon]);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleSetTarget = () => {
    if (!marathon) return;
    setSettingTarget(true);
    setTargetMut.mutate(
      { marathonId: marathon.id, raceDate: user?.target_race_date ?? null },
      {
        onSuccess: () => {
          setSettingTarget(false);
          if (user) setUser({ ...user, target_marathon: marathon.id, target_marathon_name: marathon.name });
        },
        onError: () => setSettingTarget(false),
      },
    );
  };

  // ── Loading / error states ───────────────────────────────────────────
  if (isLoading) return <DetailSkeleton />;

  if (isError || !marathon) {
    return (
      <div style={{ padding: '64px 32px', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
          {t.errors.notFound}
        </div>
        <button onClick={() => navigate('/marathons')}
          style={{
            marginTop: 16, height: 36, padding: '0 16px', borderRadius: 8,
            border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, color: '#4F46E5', fontFamily: 'inherit',
          }}>
          {t.marathonDetail.backToCatalog}
        </button>
      </div>
    );
  }

  const heroGap = 20;
  const mapCol  = isMobile ? '100%' : '60%';
  const kpiCol  = isMobile ? '100%' : 'calc(40% - 20px)';

  return (
    <div style={{
      padding: isMobile ? '16px 16px 40px' : '24px 32px 48px',
      fontFamily: 'Inter, system-ui, sans-serif', color: '#0F172A',
      maxWidth: 1200, margin: '0 auto',
    }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        {/* Back link */}
        <Link to="/marathons" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 13, color: '#64748B', textDecoration: 'none', marginBottom: 18,
        }}>
          {t.marathonDetail.backToCatalog}
        </Link>

        {/* Country + city row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>{countryToFlag(marathon.country)}</span>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 600, color: '#64748B', letterSpacing: 0.4 }}>
            {marathon.country}
          </span>
          {marathon.city && (
            <>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span style={{ fontSize: 12, color: '#64748B' }}>{marathon.city}</span>
            </>
          )}
        </div>

        {/* Title + badges row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 600, letterSpacing: -0.4, color: '#0F172A', lineHeight: 1.1 }}>
              {marathon.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {marathon.major && (
                <span style={{
                  height: 22, padding: '0 10px', borderRadius: 6,
                  background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                  color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6,
                  display: 'inline-flex', alignItems: 'center',
                }}>{t.marathonDetail.majorBadge}</span>
              )}
              {marathon.is_custom && (
                <span style={{
                  height: 22, padding: '0 10px', borderRadius: 6,
                  background: '#EEF2FF', color: '#4F46E5', fontSize: 10.5, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center',
                }}>{t.marathonDetail.customBadge}</span>
              )}
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {marathon.official_url && (
              <a href={marathon.official_url} target="_blank" rel="noopener noreferrer"
                style={{
                  height: 38, padding: '0 14px', borderRadius: 8,
                  border: '1px solid #E2E8F0', background: '#fff',
                  fontSize: 13, fontWeight: 500, color: '#0F172A',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  textDecoration: 'none', cursor: 'pointer',
                }}>
                {t.marathonDetail.officialSite}
              </a>
            )}
            {isTarget ? (
              <div style={{
                height: 38, padding: '0 16px', borderRadius: 8,
                background: '#10B981', color: '#fff',
                fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                {t.marathonDetail.currentTarget}
              </div>
            ) : (
              <button onClick={handleSetTarget} disabled={settingTarget}
                style={{
                  height: 38, padding: '0 16px', borderRadius: 8, border: 'none',
                  background: settingTarget ? 'rgba(249,112,102,0.5)' : '#F97066',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
                }}>
                {settingTarget ? t.marathonDetail.settingTarget : t.marathonDetail.setAsTarget}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero: map + KPI ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        gap: heroGap, marginBottom: 24,
      }}>
        {/* Map */}
        <div style={{
          width: mapCol, height: 380, borderRadius: 12, overflow: 'hidden',
          border: '1px solid #E2E8F0', flexShrink: 0,
        }}>
          {marathon.polyline ? (
            <ActivityMap
              key={marathon.polyline.slice(0, 32)}
              encodedPolyline={marathon.polyline}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', background: '#1E1B4B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)', fontSize: 13,
            }}>
              No route data
            </div>
          )}
        </div>

        {/* KPI + CTA column */}
        <div style={{
          width: kpiCol, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* 2×2 KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
            <KpiCell
              label={t.marathonDetail.distance}
              value={Number(marathon.distance_km).toFixed(2)}
              unit="km"
            />
            <KpiCell
              label={t.marathonDetail.elevation}
              value={`+${gain}`}
              unit="m"
              sub={loss ? `-${loss} m loss` : undefined}
            />
            <KpiCell
              label={t.marathonDetail.difficulty}
              value={getDiffLabel(coeff, t)}
              sub={t.marathonDetail.coeffLabel(coeff.toFixed(3))}
            />
            <KpiCell
              label={t.marathonDetail.raceDayTemp}
              value={raceTemp !== null ? `${raceTemp}°C` : '—'}
              sub={raceMonthShort ? `${raceMonthShort} avg` : undefined}
            />
          </div>

          {/* Predict CTA */}
          <button
            onClick={() => {
              // TODO: pass ?marathon_id to Predictions when it supports pre-selection
              navigate('/predictions');
            }}
            style={{
              width: '100%', height: 44, borderRadius: 10, border: 'none',
              background: '#4F46E5', color: '#fff',
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
            {t.marathonDetail.predictMyTime}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Course profile ─────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeading>{t.marathonDetail.courseProfile}</SectionHeading>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748B', lineHeight: 1.55 }}>
            {t.marathonDetail.courseProfileExplanation}
          </p>
          <div style={{ marginBottom: 16 }}>
            <DifficultyBar coeff={coeff} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 10.5, color: '#10B981', fontWeight: 600 }}>{t.marathons.difficultyFlat}</span>
              <span style={{ fontSize: 10.5, color: '#F59E0B', fontWeight: 600 }}>{t.marathons.difficultyHilly}</span>
              <span style={{ fontSize: 10.5, color: '#DC2626', fontWeight: 600 }}>{t.marathons.difficultyTough}</span>
            </div>
          </div>
          {hasRealProfile(marathon) ? (
            <MiniElevation
              profile={marathon.elevation_profile}
              maxLabel={`+${gain}m`}
              variant="detailed"
            />
          ) : elevProfile.length > 1 ? (
            <MiniElevation data={elevProfile} maxLabel={`+${gain}m`} variant="detailed" />
          ) : (
            <div style={{
              height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#FAFAF9', borderRadius: 8, fontSize: 12, color: '#94A3B8',
            }}>
              Elevation data unavailable for this course
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>
            {[
              { label: t.marathonDetail.distance, value: `${Number(marathon.distance_km).toFixed(2)} km` },
              { label: t.marathonDetail.elevationGain, value: `+${gain} m` },
              { label: t.marathonDetail.elevationLoss, value: `-${loss} m` },
            ].map(({ label, value }) => (
              <div key={label} style={{
                padding: '10px 14px', borderRadius: 8, background: '#F8FAFC',
                border: '1px solid #F1F5F9',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Race-day conditions ────────────────────────────────────── */}
        <SectionCard>
          <SectionHeading>{t.marathonDetail.raceDayConditions}</SectionHeading>
          {raceTemp !== null && tempCat ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <div style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 52, fontWeight: 600, color: '#0F172A',
                  letterSpacing: -2, lineHeight: 1,
                }}>
                  {raceTemp}°C
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    height: 24, padding: '0 10px', borderRadius: 6,
                    background: `${tempCat.color}1A`,
                    color: tempCat.color,
                    fontSize: 12, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center',
                  }}>
                    {tempCat.label}
                  </span>
                  {raceMonthShort && (
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      {raceMonthShort}
                    </span>
                  )}
                </div>
              </div>
              {raceMonthFull && (
                <p style={{
                  margin: 0, fontSize: 12.5, color: '#94A3B8',
                  fontStyle: 'italic', lineHeight: 1.55, maxWidth: 380,
                  alignSelf: 'flex-end',
                }}>
                  {t.marathonDetail.historicalAverage(raceMonthFull)}
                </p>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#94A3B8' }}>
              {t.marathonDetail.weatherUnavailable}
            </div>
          )}
        </SectionCard>

        {/* ── Historical results ─────────────────────────────────────── */}
        <SectionCard>
          <SectionHeading>{t.marathonDetail.pastFinishers}</SectionHeading>
          {marathon.has_historical_data === false || !marathon.has_historical_data ? (
            <div style={{
              padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center',
              border: '1px dashed #CBD5E1', borderRadius: 10,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 28, background: '#F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 12h6M9 16h4" />
                </svg>
              </div>
              <p style={{
                margin: 0, fontSize: 13, color: '#64748B', maxWidth: 380,
                textAlign: 'center', lineHeight: 1.6,
              }}>
                {t.marathonDetail.noResultsImported}
              </p>
            </div>
          ) : (
            // Future: table with useMarathonResults when has_historical_data becomes true
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    {[
                      t.marathonDetail.tableYear,
                      t.marathonDetail.tableSex,
                      t.marathonDetail.tableAgeGroup,
                      t.marathonDetail.tablePosition,
                      t.marathonDetail.tableTime,
                      t.marathonDetail.tableCountry,
                    ].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: 'left',
                        fontSize: 10.5, fontWeight: 700, color: '#94A3B8',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody />
              </table>
            </div>
          )}
        </SectionCard>

        {/* ── Footer CTA ────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          padding: '16px 20px', borderRadius: 12,
          background: '#FAFAF9', border: '1px solid #F1F5F9',
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigate('/predictions')}
              style={{
                height: 38, padding: '0 16px', borderRadius: 8, border: 'none',
                background: '#4F46E5', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {t.marathonDetail.predictMyTime}
            </button>
            {!isTarget && (
              <button onClick={handleSetTarget} disabled={settingTarget}
                style={{
                  height: 38, padding: '0 16px', borderRadius: 8,
                  border: '1px solid #E2E8F0', background: '#fff',
                  color: '#0F172A', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {settingTarget ? t.marathonDetail.settingTarget : t.marathonDetail.setAsTarget}
              </button>
            )}
          </div>
          <span style={{ fontSize: 11.5, color: '#94A3B8' }}>
            {marathon.last_updated
              ? t.marathonDetail.lastUpdated(marathon.last_updated)
              : t.marathonDetail.lastUpdatedUnknown}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MarathonDetail;
