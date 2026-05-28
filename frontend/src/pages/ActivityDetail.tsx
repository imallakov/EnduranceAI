import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { useActivityDetail } from '../hooks/useActivityDetail';
import { deleteActivity } from '../api/activities';
import CinematicHero from '../components/activity-detail/CinematicHero';
import StatStrip from '../components/activity-detail/StatStrip';
import PerKmCharts from '../components/activity-detail/PerKmCharts';
import SplitsTable from '../components/activity-detail/SplitsTable';
import HrZonesDonut from '../components/activity-detail/HrZonesDonut';
import AnalysisCard from '../components/activity-detail/AnalysisCard';
import ShareStoryModal from '../components/share/ShareStoryModal';
import { IconTrash, IconChevRight, IconRunner, IconArrowRight } from '../components/icons';
import { deriveKind, fmtDateTime } from '../components/activity-detail/utils';
import { useT } from '../i18n/context';

// ── Skeleton loader ──────────────────────────────────────────────────
function Skeleton({ h, style }: { h: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      height: h, borderRadius: 12, background: '#F1EFEC',
      animation: 'pulse 1.6s ease-in-out infinite',
      ...style,
    }} />
  );
}

// ── Manual entry banner ──────────────────────────────────────────────
function ManualEntryBanner() {
  const t = useT();
  return (
    <div className="card" style={{
      padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14,
      background: '#FFFBEB', borderColor: '#FDE68A',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: '#FEF3C7', color: '#B45309',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <IconRunner size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>{t.activities.manualEntryTitle}</div>
        <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
          {t.activities.manualEntryHint}
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm dialog ────────────────────────────────────────────
interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteDialog({ open, onOpenChange, onConfirm, loading }: DeleteDialogProps) {
  const t = useT();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.5)',
          zIndex: 40,
        }} />
        <Dialog.Content style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          background: '#fff', borderRadius: 14,
          padding: '28px 28px 24px',
          width: 360, maxWidth: 'calc(100vw - 32px)',
          boxShadow: '0 24px 60px -12px rgba(15,23,42,0.35)',
          border: '1px solid var(--border)',
        }}>
          <Dialog.Title style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            {t.activities.deleteActivity}
          </Dialog.Title>
          <Dialog.Description style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 24 }}>
            {t.activities.deleteActivityDesc}
          </Dialog.Description>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Dialog.Close asChild>
              <button className="btn btn-ghost" style={{ height: 36 }}>Cancel</button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                height: 36, padding: '0 16px', borderRadius: 8,
                fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                background: 'var(--danger)', color: '#fff',
                border: 'none', fontFamily: 'inherit', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading && <span className="animate-spin" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />}
              Delete
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Main page ────────────────────────────────────────────────────────
const ActivityDetail: React.FC = () => {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: activity, isLoading, isError } = useActivityDetail(id ?? '');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    setDeleteLoading(true);
    try {
      await deleteActivity(id);
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
      navigate('/activities');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div style={{ padding: '24px 32px 40px' }}>
        <div style={{ marginBottom: 24 }}>
          <Skeleton h={14} style={{ width: 200, marginBottom: 12 }} />
          <Skeleton h={28} style={{ width: 300, marginBottom: 6 }} />
          <Skeleton h={16} style={{ width: 240 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Skeleton h={560} />
          <Skeleton h={96} />
          <Skeleton h={260} />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !activity) {
    return (
      <div style={{ padding: '24px 32px 40px' }}>
        <Link
          to="/activities"
          style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}
        >
          ← {t.activities.backToActivities}
        </Link>
        <div className="card" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{t.activities.activityNotFound}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t.activities.activityNotFoundHint}</div>
          <Link to="/activities" className="btn btn-ghost" style={{ textDecoration: 'none', marginTop: 8 }}>
            {t.activities.backToActivities} <IconArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  const isManual = activity.source === 'manual';
  const distKm = Number(activity.distance_km);
  const paceSec = activity.avg_pace_sec_per_km != null ? Number(activity.avg_pace_sec_per_km) : null;
  const kind = deriveKind(distKm, paceSec);
  const kindColors: Record<string, { bg: string; color: string }> = {
    Long:    { bg: '#EEF2FF', color: '#4338CA' },
    Workout: { bg: '#FFEEEC', color: '#C44B3E' },
    Easy:    { bg: '#E2E8F0', color: '#334155' },
  };
  const kindStyle = kindColors[kind];
  const kindLabel = kind === 'Long' ? 'LONG RUN' : kind === 'Workout' ? 'WORKOUT' : 'EASY RUN';

  return (
    <div className="page-pad" style={{ padding: '24px 32px 40px', maxWidth: 1280 }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Link
              to="/activities"
              style={{
                fontSize: 12, color: 'var(--muted)', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              {t.nav.activities} <IconChevRight size={10} />
            </Link>
            <span
              className="pill"
              style={{ height: 20, padding: '0 8px', fontSize: 10.5, letterSpacing: 0.5, ...kindStyle }}
            >
              {kindLabel}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: 'var(--text)' }}>
            {t.activities.kmRun(distKm.toFixed(1))}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            <span className="mono">{fmtDateTime(activity.start_time)}</span>
            {activity.source !== 'manual' && (
              <>
                <span style={{ margin: '0 8px', color: 'var(--muted-2)' }}>·</span>
                <span>{activity.source.toUpperCase()} {t.activities.fileSource}</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ height: 36, color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={() => setDeleteOpen(true)}
          >
            <IconTrash size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <CinematicHero
          activity={activity}
          onShare={() => setShareOpen(true)}
        />

        {isManual ? <ManualEntryBanner /> : <StatStrip activity={activity} />}

        {isManual ? (
          <div className="card" style={{ padding: 20, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 4 }}>
                {t.activities.manualNoData}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {t.activities.uploadGpsHint}
              </div>
            </div>
          </div>
        ) : (
          <PerKmCharts activity={activity} />
        )}

        <div className="grid-main" style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24, alignItems: 'start' }}>
          <SplitsTable activity={activity} />
          <HrZonesDonut activity={activity} />
        </div>

        <AnalysisCard activity={activity} />
      </div>

      {/* Delete confirm dialog */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />

      {shareOpen && (
        <ShareStoryModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          data={{
            distance_km: activity.distance_km,
            duration_sec: activity.duration_sec,
            avg_pace_sec_per_km: activity.avg_pace_sec_per_km,
            avg_hr: activity.avg_hr,
            max_hr: activity.max_hr,
            elevation_gain_m: activity.elevation_gain_m,
            vdot_estimate: activity.vdot_estimate,
            tss: activity.tss,
            laps: activity.laps,
            polyline: activity.polyline,
            start_time: activity.start_time,
          }}
        />
      )}
    </div>
  );
};

export default ActivityDetail;
