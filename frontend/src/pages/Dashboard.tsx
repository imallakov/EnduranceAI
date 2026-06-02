import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';
import HeroCard from '../components/dashboard/HeroCard';
import MetricsRow from '../components/dashboard/MetricsRow';
import ChartCard from '../components/dashboard/ChartCard';
import ReadinessCard from '../components/dashboard/ReadinessCard';
import WeeklyVolumeCard from '../components/dashboard/WeeklyVolumeCard';
import ActivitiesCard from '../components/dashboard/ActivitiesCard';
import { IconRefresh, IconArrowRight } from '../components/icons';
import { useT, useLang } from '../i18n/context';

// Simple skeleton block
const Skeleton: React.FC<{ height: number }> = ({ height }) => (
  <div style={{ height, borderRadius: 12, background: 'var(--border-soft)', border: '1px solid var(--border)' }} />
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useDashboard();
  const t = useT();
  const { lang } = useLang();
  const [onboardingToast, setOnboardingToast] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('onboarding_toast');
    if (raw) {
      try {
        const { msg } = JSON.parse(raw) as { msg: string };
        setOnboardingToast(msg);
        setTimeout(() => setOnboardingToast(null), 5000);
      } catch { /* ignore */ }
      sessionStorage.removeItem('onboarding_toast');
    }
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t.dashboard.greetingMorning;
    if (h < 18) return t.dashboard.greetingAfternoon;
    return t.dashboard.greetingEvening;
  })();

  const firstName = user?.first_name ?? '';
  const today = new Date();
  const dayName = today.toLocaleDateString(lang, { weekday: 'long' });
  const dateStr = today.toLocaleDateString(lang, { day: 'numeric', month: 'long' });

  return (
    <div className="page-pad" style={{ padding: '24px 32px 40px' }}>
      {onboardingToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#064e3b', color: '#fff', padding: '10px 20px',
          borderRadius: 10, fontSize: 13, maxWidth: 420, textAlign: 'center',
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}>
          {onboardingToast}
        </div>
      )}
      {/* Page header */}
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: 'var(--text)' }}>
            {greeting}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {dayName} · {dateStr}
            {data?.days_to_race != null && (
              <> · <span className="mono">{t.dashboard.daysToRace(data.days_to_race)}</span>{data.latest_prediction?.marathon_name ? ` · ${data.latest_prediction.marathon_name}` : ''}</>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={() => void refetch()}
            title="Refresh dashboard metrics"
          >
            <IconRefresh size={13} /> {t.dashboard.refresh}
          </button>
          <Link to="/predictions" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
            {t.dashboard.newPrediction} <IconArrowRight size={13} />
          </Link>
        </div>
      </div>

      {isError && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 8,
          background: '#FEF2F2', border: '1px solid #FECACA',
          fontSize: 13, color: 'var(--danger)',
        }}>
          {t.dashboard.failedToLoad}{' '}
          <button onClick={() => void refetch()} style={{ color: 'var(--danger)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            {t.errors.tryAgain}
          </button>
        </div>
      )}

      {/* Two-column grid: 8fr left, 4fr right */}
      <div className="grid-main" style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24, minWidth: 0 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          {isLoading ? (
            <>
              <Skeleton height={200} />
              <Skeleton height={124} />
              <Skeleton height={320} />
            </>
          ) : (
            <>
              <HeroCard
                prediction={data?.latest_prediction ?? null}
                daysToRace={data?.days_to_race ?? null}
                predictionForTarget={data?.prediction_for_target ?? true}
                targetMarathonName={user?.target_marathon_name ?? null}
                targetMarathonId={user?.target_marathon ?? null}
              />
              <MetricsRow
                metrics={data?.metrics ?? { vdot: null, ctl: null, atl: null, tsb: null }}
                chart={data?.ctl_atl_tsb_chart ?? []}
              />
              <ChartCard chart={data?.ctl_atl_tsb_chart ?? []} />
            </>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          {isLoading ? (
            <>
              <Skeleton height={340} />
              <Skeleton height={124} />
              <Skeleton height={240} />
            </>
          ) : (
            <>
              <ReadinessCard readiness={data?.race_readiness ?? null} />
              <WeeklyVolumeCard
                weeklyKmCurrent={data?.weekly_km_current ?? 0}
                weeklyKmAvg8w={data?.weekly_km_avg_8w ?? 0}
                chart={data?.ctl_atl_tsb_chart ?? []}
              />
              <ActivitiesCard activities={data?.recent_activities ?? []} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
