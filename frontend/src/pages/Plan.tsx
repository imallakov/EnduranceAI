import React, { useState } from 'react';
import { useActivePlan } from '../hooks/usePlan';
import { useAuth } from '../hooks/useAuth';
import type { PlanWorkout, PlanWeek } from '../types/api';

import PhaseStrip from '../components/plan/PhaseStrip';
import KpiRow from '../components/plan/KpiRow';
import CurrentWeekGrid from '../components/plan/CurrentWeekGrid';
import AllWeeksList from '../components/plan/AllWeeksList';
import VolumeChart from '../components/plan/VolumeChart';
import DistributionDonut from '../components/plan/DistributionDonut';
import PaceZonesCard from '../components/plan/PaceZonesCard';
import WorkoutDrawer from '../components/plan/WorkoutDrawer';
import GenerateModal from '../components/plan/GenerateModal';
import EmptyPlanState from '../components/plan/EmptyPlanState';
import ExportMenu from '../components/plan/ExportMenu';
import PacesRefreshedBanner from '../components/plan/PacesRefreshedBanner';
import RecoveryWeekBanner from '../components/plan/RecoveryWeekBanner';
import GoalFeasibilityBanner from '../components/plan/GoalFeasibilityBanner';

import { IconRefresh, IconChevDown, IconChevRight } from '../components/icons';
import { useT, useLang } from '../i18n/context';

// ── Skeleton block ──────────────────────────────────────────────────
const Sk: React.FC<{ h: number }> = ({ h }) => (
  <div style={{ height: h, borderRadius: 12, background: 'var(--border-soft)', border: '1px solid var(--border)' }} />
);

const DOW_SHORT: Record<string, string> = { rest: 'Rest', easy: 'Easy', long: 'Long', tempo: 'Tempo', interval: 'Interval', repetition: 'Rep', marathon_pace: 'M-pace' };

function workoutNavLabel(workout: PlanWorkout | undefined, lang: string): string | undefined {
  if (!workout) return undefined;
  const d = new Date(2024, 0, 1 + (workout.day_of_week ?? 0));
  const dow = d.toLocaleDateString(lang, { weekday: 'short' }).toUpperCase();
  const type = DOW_SHORT[workout.workout_type] ?? workout.workout_type;
  const km = workout.distance_km ? ` ${Number(workout.distance_km).toFixed(0)} km` : '';
  return `${dow} · ${type}${km}`;
}

const Plan: React.FC = () => {
  const { user }               = useAuth();
  const { data: plan, isLoading, isError, refetch } = useActivePlan();
  const t = useT();
  const { lang } = useLang();

  const [generateOpen,      setGenerateOpen]      = useState(false);
  const [exportOpen,        setExportOpen]         = useState(false);
  const [drawerOpen,        setDrawerOpen]         = useState(false);
  const [selectedWorkout,   setSelectedWorkout]    = useState<PlanWorkout | null>(null);
  const [selectedWeek,      setSelectedWeek]       = useState<PlanWeek | null>(null);
  const [displayedWeekNum,  setDisplayedWeekNum]   = useState<number>(1);

  // When plan loads, initialize displayedWeekNum to current week
  React.useEffect(() => {
    if (plan?.current_week_number) {
      setDisplayedWeekNum(plan.current_week_number);
    }
  }, [plan?.current_week_number]);

  const handleCellClick = (workout: PlanWorkout, week: PlanWeek) => {
    setSelectedWorkout(workout);
    setSelectedWeek(week);
    setDrawerOpen(true);
  };

  // Drawer prev/next navigation — within selected week's workouts
  const handleDrawerNavigate = (direction: 'prev' | 'next') => {
    if (!selectedWeek || !selectedWorkout) return;
    const sorted = [...selectedWeek.workouts].sort((a, b) => (a.day_of_week ?? 0) - (b.day_of_week ?? 0));
    const idx = sorted.findIndex(w => w.id === selectedWorkout.id);
    const next = direction === 'prev' ? sorted[idx - 1] : sorted[idx + 1];
    if (next) setSelectedWorkout(next);
  };

  const drawerSorted = selectedWeek
    ? [...selectedWeek.workouts].sort((a, b) => (a.day_of_week ?? 0) - (b.day_of_week ?? 0))
    : [];
  const drawerIdx    = drawerSorted.findIndex(w => w.id === selectedWorkout?.id);
  const prevWorkout  = drawerSorted[drawerIdx - 1];
  const nextWorkout  = drawerSorted[drawerIdx + 1];

  // Marathon name for breadcrumb
  const marathonName = user?.target_marathon_name ?? t.plan.workspace;

  return (
    <div className="page-pad" style={{ padding: '24px 32px 40px' }}>
      {/* Page header */}
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
        <div>
          {/* Breadcrumb */}
          <div className="plan-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
            <span>{t.plan.workspace}</span>
            <IconChevRight size={11} />
            <span>{marathonName}</span>
            <IconChevRight size={11} />
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{t.plan.trainingPlan}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span className="label-sm">{t.plan.trainingPlan}</span>
            <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
            <span className="label-sm" style={{ color: 'var(--text)' }}>
              Daniels · {plan ? t.plan.weeks(plan.total_weeks) : t.plan.weeks(16)}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: 'var(--text)' }}>
            {plan
              ? (user?.target_marathon_name
                  ?? `Marathon ${new Date(plan.race_date).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })}`)
              : t.plan.noActivePlan}
          </h1>
          {plan && (
            <div className="plan-meta-row" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>{new Date(plan.race_date).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
              <span><span className="mono">{Math.max(0, plan.days_to_race)}</span> {t.plan.daysToRace}</span>
              <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
              <span><span className="mono">{Math.round(plan.plan_total_km)}</span> {t.plan.kmTotalShort}</span>
              <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--muted-2)' }} />
              <span>{t.plan.daysPerWeek(plan.days_per_week)}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {plan && (
            <>
              <button className="btn btn-ghost" onClick={() => setGenerateOpen(true)}>
                <IconRefresh size={13} /> {t.plan.regenerate}
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setExportOpen(v => !v)}
                >
                  {t.plan.export} <IconChevDown size={12} />
                </button>
                {exportOpen && (
                  <ExportMenu planId={plan.id} onClose={() => setExportOpen(false)} />
                )}
              </div>
            </>
          )}
          {!plan && !isLoading && (
            <button className="btn btn-coral" onClick={() => setGenerateOpen(true)}>
              {t.plan.generatePlan}
            </button>
          )}
        </div>
      </div>

      {/* Error stripe */}
      {isError && (
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: 'var(--danger)' }}>
          {t.plan.failedToLoad}{' '}
          <button onClick={() => void refetch()} style={{ color: 'var(--danger)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            {t.errors.tryAgain}
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <>
          <Sk h={220} />
          <div style={{ height: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
            <Sk h={110} /><Sk h={110} /><Sk h={110} /><Sk h={110} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Sk h={340} />
              <Sk h={420} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Sk h={220} />
              <Sk h={160} />
              <Sk h={200} />
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && !plan && !isError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <EmptyPlanState onGenerate={() => setGenerateOpen(true)} />
          {/* Hint cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {([
              ['01', t.plan.pickTargetRace,     t.plan.pickTargetRaceHint(user?.target_marathon_name ?? undefined)],
              ['02', t.plan.confirmPaceZones,   t.plan.confirmPaceZonesHint(user?.current_vdot ? Number(user.current_vdot).toFixed(1) : undefined)],
              ['03', t.plan.generateReviewGo,   t.plan.generateReviewGoHint],
            ] as const).map(([n, ttl, sub]) => (
              <div key={n} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted-2)', letterSpacing: 0.5 }}>{n}</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 6 }}>{ttl}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active plan layout */}
      {!isLoading && plan && (
        <>
          {/* L1 adaptation banner — appears only when plan.paces_refreshed is
              set by backend (within 7 days of a refresh, VDOT moved ≥0.5 pts). */}
          {plan.paces_refreshed && (
            <PacesRefreshedBanner info={plan.paces_refreshed} t={t} />
          )}

          {/* L3 missed-week recovery banner — only on the recovered week itself */}
          {plan.recovery_week && (
            <RecoveryWeekBanner info={plan.recovery_week} t={t} />
          )}

          {/* L4 goal feasibility — persistent state banner above plan content */}
          {plan.goal_feasibility && (
            <GoalFeasibilityBanner info={plan.goal_feasibility} />
          )}

          {/* Phase strip */}
          <div style={{ marginBottom: 24 }}>
            <PhaseStrip plan={plan} />
          </div>

          {/* KPI row */}
          <div style={{ marginBottom: 24 }}>
            <KpiRow plan={plan} />
          </div>

          {/* Two-column body */}
          <div className="grid-main" style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <CurrentWeekGrid
                plan={plan}
                displayedWeekNumber={displayedWeekNum}
                onWeekChange={setDisplayedWeekNum}
                onCellClick={handleCellClick}
              />
              <AllWeeksList
                plan={plan}
                displayedWeekNumber={displayedWeekNum}
                onWeekSelect={n => { setDisplayedWeekNum(n); }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <VolumeChart plan={plan} />
              <DistributionDonut plan={plan} />
              <PaceZonesCard plan={plan} />
            </div>
          </div>
        </>
      )}

      {/* Workout drawer */}
      <WorkoutDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        workout={selectedWorkout}
        week={selectedWeek}
        plan={plan!}
        onNavigate={handleDrawerNavigate}
        prevLabel={workoutNavLabel(prevWorkout, lang)}
        nextLabel={workoutNavLabel(nextWorkout, lang)}
      />

      {/* Generate / Regenerate modal */}
      <GenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        prefill={plan ?? null}
      />

      {/* Close export menu on outside click */}
      {exportOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          onClick={() => setExportOpen(false)}
        />
      )}
    </div>
  );
};

export default Plan;
