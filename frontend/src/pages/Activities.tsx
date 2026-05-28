import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import dayjs from 'dayjs';
import type { AxiosError } from 'axios';
import { queryClient } from '../api/queryClient';
import {
  uploadFile, uploadZip, getUploadStatus,
  createManual, deleteActivity,
} from '../api/activities';
import { useActivities } from '../hooks/useActivities';
import { IconUpload, IconTrash, IconClose } from '../components/icons';
import ShareActivityButton from '../components/share/ShareActivityButton';
import { formatPace } from '../lib/format';
import type { Activity, SingleFileResult, ManualActivityPayload } from '../types/api';
import { useT } from '../i18n/context';
import useIsMobile from '../lib/useIsMobile';

// ── Local types ───────────────────────────────────────────────────────

interface UploadJob {
  id: string;
  filename: string;
  isZip: boolean;
  phase: 'uploading' | 'polling' | 'success' | 'duplicate' | 'failure';
  taskId?: string;
  distanceKm?: number;
  errors?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────

const ALLOWED_EXTS = ['fit', 'gpx', 'tcx', 'zip'];

function getExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function deriveKind(distanceKm: number, avgPaceSec: number | null): 'Long' | 'Workout' | 'Easy' {
  if (distanceKm >= 18) return 'Long';
  if (avgPaceSec !== null && avgPaceSec < 280) return 'Workout';
  return 'Easy';
}

const KIND_STYLE: Record<string, React.CSSProperties> = {
  Long: { background: '#EEF2FF', color: '#4338CA' },
  Workout: { background: '#FFEEEC', color: '#C44B3E' },
  Easy: { background: '#F1F5F9', color: '#475569' },
};

// ── Shared modal styles ───────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(15, 23, 42, 0.5)',
  zIndex: 40,
};

const dialogContentStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  background: '#fff',
  borderRadius: 12,
  padding: 28,
  width: 440,
  maxWidth: 'calc(100vw - 32px)',
  zIndex: 41,
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
};

// ── Spinner ───────────────────────────────────────────────────────────

const Spinner: React.FC = () => (
  <span
    className="animate-spin"
    style={{
      width: 14, height: 14, flexShrink: 0,
      border: '2px solid var(--border)',
      borderTopColor: 'var(--primary-2)',
      borderRadius: '50%',
    }}
  />
);

// ── Job status row ────────────────────────────────────────────────────

const JobStatus: React.FC<{ job: UploadJob }> = ({ job }) => {
  const t = useT();
  const { phase } = job;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px' }}>
      {(phase === 'uploading' || phase === 'polling') && <Spinner />}
      {phase === 'success' && (
        <span style={{
          width: 14, height: 14, flexShrink: 0, borderRadius: '50%',
          background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 13 4 4L19 7" />
          </svg>
        </span>
      )}
      {phase === 'duplicate' && (
        <span style={{
          width: 14, height: 14, flexShrink: 0, borderRadius: '50%',
          background: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700, color: '#fff', lineHeight: 1,
        }}>!</span>
      )}
      {phase === 'failure' && (
        <span style={{
          width: 14, height: 14, flexShrink: 0, borderRadius: '50%',
          background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconClose size={8} style={{ color: '#fff' }} />
        </span>
      )}
      <span
        className="mono"
        style={{ flex: 1, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {job.filename}
      </span>
      <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
        {phase === 'uploading' && t.activities.uploading}
        {phase === 'polling' && t.activities.processing}
        {phase === 'success' && (job.distanceKm != null ? `${Number(job.distanceKm).toFixed(1)} km` : t.activities.done)}
        {phase === 'duplicate' && t.activities.duplicate}
        {phase === 'failure' && (job.errors?.[0] ?? t.activities.uploadFailed)}
      </span>
    </div>
  );
};

// ── Manual entry modal ────────────────────────────────────────────────

interface ManualEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const t = useT();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [distanceKm, setDistanceKm] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [avgHr, setAvgHr] = useState('');
  const [elevation, setElevation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setDate(dayjs().format('YYYY-MM-DD'));
    setDistanceKm('');
    setHours('');
    setMinutes('');
    setSeconds('');
    setAvgHr('');
    setElevation('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const h = parseInt(hours || '0', 10);
    const m = parseInt(minutes || '0', 10);
    const s = parseInt(seconds || '0', 10);
    const durationSec = h * 3600 + m * 60 + s;

    if (durationSec < 61) {
      setError(t.activities.durationMin);
      return;
    }
    const km = parseFloat(distanceKm);
    if (!km || km < 0.1) {
      setError(t.activities.distanceMin);
      return;
    }

    const payload: ManualActivityPayload = {
      date,
      distance_km: km,
      duration_sec: durationSec,
      ...(avgHr ? { avg_hr: parseInt(avgHr, 10) } : {}),
      ...(elevation ? { elevation_gain_m: parseFloat(elevation) } : {}),
    };

    setSubmitting(true);
    try {
      await createManual(payload);
      reset();
      onSuccess();
    } catch (err) {
      const axErr = err as AxiosError<Record<string, unknown>>;
      if (axErr.response?.data) {
        const d = axErr.response.data;
        if (typeof d.detail === 'string') { setError(d.detail); return; }
        const msgs = Object.values(d).flat().filter(Boolean);
        if (msgs.length) { setError(String(msgs[0])); return; }
      }
      setError(t.activities.failedToCreate);
    } finally {
      setSubmitting(false);
    }
  };

  const inputSt: React.CSSProperties = {
    height: 36, width: '100%',
    border: '1px solid var(--border)', borderRadius: 8,
    padding: '0 10px', fontSize: 13, fontFamily: 'inherit',
    color: 'var(--text)', background: '#fff',
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <Dialog.Portal>
        <Dialog.Overlay style={overlayStyle} />
        <Dialog.Content style={dialogContentStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Dialog.Title style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              {t.activities.addActivityManually}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-2)', padding: 4 }}>
                <IconClose size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>{t.activities.dateLabel}</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="focus-input" style={inputSt} required />
              </div>

              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>{t.activities.distanceKmLabel}</label>
                <input type="number" value={distanceKm} onChange={e => setDistanceKm(e.target.value)}
                  className="focus-input" style={inputSt}
                  min="0.1" step="0.01" placeholder="e.g. 10.5" required />
              </div>

              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>{t.activities.durationLabel}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 14px 1fr 14px 1fr', gap: 4, alignItems: 'center' }}>
                  <input type="number" value={hours} onChange={e => setHours(e.target.value)}
                    className="focus-input" style={inputSt} min="0" max="23" placeholder="h" />
                  <span style={{ color: 'var(--muted)', textAlign: 'center', fontWeight: 500 }}>:</span>
                  <input type="number" value={minutes} onChange={e => setMinutes(e.target.value)}
                    className="focus-input" style={inputSt} min="0" max="59" placeholder="mm" />
                  <span style={{ color: 'var(--muted)', textAlign: 'center', fontWeight: 500 }}>:</span>
                  <input type="number" value={seconds} onChange={e => setSeconds(e.target.value)}
                    className="focus-input" style={inputSt} min="0" max="59" placeholder="ss" />
                </div>
              </div>

              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>
                  {t.activities.avgHrLabel} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({t.activities.optional})</span>
                </label>
                <input type="number" value={avgHr} onChange={e => setAvgHr(e.target.value)}
                  className="focus-input" style={inputSt} min="40" max="220" placeholder="bpm" />
              </div>

              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>
                  {t.activities.elevationGainM} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({t.activities.optional})</span>
                </label>
                <input type="number" value={elevation} onChange={e => setElevation(e.target.value)}
                  className="focus-input" style={inputSt} min="0" step="1" placeholder="meters" />
              </div>
            </div>

            {error && (
              <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--danger)' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <Dialog.Close asChild>
                <button type="button" className="btn btn-ghost">Cancel</button>
              </Dialog.Close>
              <button type="submit" className="btn btn-coral" disabled={submitting}>
                {submitting ? t.activities.savingActivity : t.activities.saveActivity}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// ── Main page ─────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type DateFilter = 'all' | '7d' | '30d' | '90d';

function useDateFilterOptions(): Array<{ label: string; value: DateFilter }> {
  const t = useT();
  return [
    { label: t.activities.allTime, value: 'all' },
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
  ];
}

// ── Mobile card components ────────────────────────────────────────────

const MobileMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div style={{
      fontSize: 10, fontWeight: 600, color: 'var(--muted-2)',
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>{label}</div>
    <div className="mono" style={{ fontSize: 13.5, color: 'var(--text)', marginTop: 1 }}>{value}</div>
  </div>
);

const ActivityMobileCard: React.FC<{
  activity: Activity;
  onDelete: () => void;
}> = ({ activity, onDelete }) => {
  const km = Number(activity.distance_km);
  const pace = activity.avg_pace_sec_per_km !== null ? Number(activity.avg_pace_sec_per_km) : null;
  const kind = deriveKind(km, pace);
  const d = dayjs(activity.start_time);
  return (
    <Link
      to={`/activities/${activity.id}`}
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        padding: '14px 16px', borderBottom: '1px solid var(--border-soft)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{d.format('D MMM')}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.04 }}>{d.format('ddd')}</span>
          <span className="pill" style={{ ...KIND_STYLE[kind], height: 18, padding: '0 6px', fontSize: 10, fontWeight: 600, marginLeft: 4 }}>{kind}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <ShareActivityButton activityId={activity.id} />
          <button
            className="btn btn-ghost"
            style={{ height: 36, width: 36, padding: 0, border: 'none', color: 'var(--muted-2)' }}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
            aria-label="Delete activity"
          >
            <IconTrash size={13} />
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        <MobileMetric label="Distance" value={`${km.toFixed(1)} km`} />
        <MobileMetric label="Pace" value={pace !== null ? formatPace(pace) : '—'} />
        <MobileMetric label="HR" value={activity.avg_hr ? `${activity.avg_hr} bpm` : '—'} />
        <MobileMetric label="VDOT" value={activity.vdot_estimate !== null ? Number(activity.vdot_estimate).toFixed(1) : '—'} />
      </div>
    </Link>
  );
};

// ── Main page ─────────────────────────────────────────────────────────

const Activities: React.FC = () => {
  const t = useT();
  const isMobile = useIsMobile();
  const dateFilterOptions = useDateFilterOptions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jobsRef = useRef<UploadJob[]>([]);

  const [jobs, setJobsRaw] = useState<UploadJob[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [minKmStr, setMinKmStr] = useState('');
  const [page, setPage] = useState(1);

  // Keep jobsRef in sync with jobs state for the polling interval's closure
  const setJobs = useCallback((updater: UploadJob[] | ((prev: UploadJob[]) => UploadJob[])) => {
    setJobsRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      jobsRef.current = next;
      return next;
    });
  }, []);

  const dateFrom = useMemo(() => {
    if (dateFilter === 'all') return undefined;
    const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
    return dayjs().subtract(days, 'day').format('YYYY-MM-DD');
  }, [dateFilter]);

  const minKm = minKmStr ? parseFloat(minKmStr) : undefined;

  const filters = useMemo(() => ({
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(minKm && minKm > 0 ? { min_km: minKm } : {}),
    page,
  }), [dateFrom, minKm, page]);

  const { data, isLoading, isError, refetch } = useActivities(filters);

  // Single interval for the component's lifetime — reads from ref to avoid stale closure
  useEffect(() => {
    const intervalId = setInterval(async () => {
      const polling = jobsRef.current.filter(j => j.phase === 'polling' && j.taskId);
      if (polling.length === 0) return;

      for (const job of polling) {
        try {
          const resp = await getUploadStatus(job.taskId!);
          if (resp.status !== 'SUCCESS' && resp.status !== 'FAILURE') continue;

          setJobs(prev => prev.map(j => {
            if (j.taskId !== job.taskId) return j;
            if (resp.status === 'SUCCESS') {
              const r = resp.result as SingleFileResult | undefined;
              return { ...j, phase: 'success' as const, distanceKm: r?.distance_km ?? undefined };
            }
            const r = resp.result as SingleFileResult | undefined;
            return { ...j, phase: 'failure' as const, errors: r?.errors?.length ? r.errors : ['Parse failed'] };
          }));

          if (resp.status === 'SUCCESS') {
            void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            void queryClient.invalidateQueries({ queryKey: ['activities'] });
          }
        } catch {
          // ignore transient poll errors
        }
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, []); // intentionally empty — interval reads state via ref

  const handleFiles = useCallback(async (files: File[]) => {
    setFileError(null);
    const invalid = files.filter(f => !ALLOWED_EXTS.includes(getExt(f.name)));
    if (invalid.length > 0) {
      setFileError(`Unsupported: ${invalid.map(f => f.name).join(', ')}. Use FIT, GPX, TCX, or ZIP.`);
    }
    const valid = files.filter(f => ALLOWED_EXTS.includes(getExt(f.name)));
    if (valid.length === 0) return;

    for (const file of valid) {
      const isZip = getExt(file.name) === 'zip';
      const jobId = crypto.randomUUID();

      setJobs(prev => [...prev, { id: jobId, filename: file.name, isZip, phase: 'uploading' }]);

      try {
        const resp = isZip ? await uploadZip(file) : await uploadFile(file);

        if ('duplicate' in resp && resp.duplicate) {
          setJobs(prev => prev.map(j => j.id === jobId ? { ...j, phase: 'duplicate' } : j));
          continue;
        }

        const { task_id } = resp as { task_id: string };
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, phase: 'polling', taskId: task_id } : j));
      } catch (err) {
        const axErr = err as AxiosError<{ error?: string }>;
        const msg = axErr.response?.data?.error ?? 'Upload failed';
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, phase: 'failure', errors: [msg] } : j));
      }
    }
  }, [setJobs]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const onDragLeave = useCallback(() => setIsDragOver(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    void handleFiles([...e.dataTransfer.files]);
  }, [handleFiles]);

  const onBrowse = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void handleFiles([...e.target.files]);
    e.target.value = '';
  }, [handleFiles]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteActivity(deleteTarget.id);
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch { /* surface in Phase 3b */ }
    setDeleteTarget(null);
  };

  const handleManualSuccess = () => {
    setManualOpen(false);
    void queryClient.invalidateQueries({ queryKey: ['activities'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="page-pad" style={{ padding: '24px 32px 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: 'var(--text)' }}>
          {t.nav.activities}
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>
          {t.activities.pageSubtitle}
        </p>
      </div>

      {/* Upload zone */}
      <div
        className="card"
        style={{
          marginBottom: jobs.length > 0 ? 12 : 24,
          borderStyle: 'dashed',
          borderColor: isDragOver ? 'var(--primary-2)' : 'var(--border)',
          background: isDragOver ? 'var(--primary-50)' : 'var(--surface)',
          transition: 'border-color 120ms ease, background 120ms ease',
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <IconUpload size={28} style={{ color: 'var(--muted-2)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
              {t.activities.dropFilesHere}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              {t.activities.supportedFormats}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
              <IconUpload size={13} /> {t.activities.browseFiles}
            </button>
            <button className="btn btn-ghost" onClick={() => setManualOpen(true)}>
              {t.activities.addManually}
            </button>
          </div>
          {fileError && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--danger)', textAlign: 'center', maxWidth: 480 }}>
              {fileError}
            </p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".fit,.gpx,.tcx,.zip"
          style={{ display: 'none' }}
          onChange={onBrowse}
        />
      </div>

      {/* Upload job list */}
      {jobs.length > 0 && (
        <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid var(--border-soft)',
          }}>
            <span className="label-sm">{t.activities.uploadProgress}</span>
            <button
              className="btn btn-ghost"
              style={{ height: 24, fontSize: 11, padding: '0 8px' }}
              onClick={() => setJobs([])}
            >
              {t.activities.clear}
            </button>
          </div>
          <div style={{ padding: '4px 0' }}>
            {jobs.map(job => <JobStatus key={job.id} job={job} />)}
          </div>
        </div>
      )}

      {/* Activities table */}
      <div className="card" style={{ overflow: 'hidden' }}>

        {/* Toolbar */}
        <div className="filter-bar-wrap" style={{
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {t.activities.allActivities}
            {totalCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>{totalCount}</span>
            )}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {dateFilterOptions.map(opt => (
              <button
                key={opt.value}
                className={`chip${dateFilter === opt.value ? ' active' : ''}`}
                onClick={() => { setDateFilter(opt.value); setPage(1); }}
              >
                {opt.label}
              </button>
            ))}
            <input
              type="number"
              placeholder={t.activities.minKm}
              value={minKmStr}
              min="0"
              step="0.5"
              onChange={e => { setMinKmStr(e.target.value); setPage(1); }}
              style={{
                height: 24, width: 68, padding: '0 8px', fontSize: 12,
                border: '1px solid var(--border)', borderRadius: 6,
                fontFamily: 'inherit', color: 'var(--text)', background: '#fff',
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <Spinner /> Loading…
            </div>
          </div>
        ) : isError ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--danger)' }}>{t.activities.failedToLoad}</p>
            <button className="btn btn-ghost" onClick={() => void refetch()}>Try again</button>
          </div>
        ) : !data?.results.length ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>
              {t.activities.noActivitiesYet}
            </p>
            <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
              <IconUpload size={13} /> Browse files
            </button>
          </div>
        ) : (
          <>
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.results.map(activity => (
                  <ActivityMobileCard
                    key={activity.id}
                    activity={activity}
                    onDelete={() => setDeleteTarget(activity)}
                  />
                ))}
              </div>
            ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFAF9' }}>
                    {[
                      { label: t.activities.dateCol, align: 'left' as const },
                      { label: t.activities.activityCol, align: 'left' as const },
                      { label: t.activities.typeCol, align: 'left' as const },
                      { label: t.activities.distCol, align: 'right' as const },
                      { label: t.activities.paceCol, align: 'right' as const },
                      { label: t.activities.hrCol, align: 'right' as const },
                      { label: t.activities.tssCol, align: 'right' as const },
                      { label: t.activities.vdotCol, align: 'right' as const },
                    ].map(col => (
                      <th key={col.label} style={{
                        padding: '8px 12px',
                        textAlign: col.align,
                        fontSize: 10, fontWeight: 600,
                        letterSpacing: '0.07em', textTransform: 'uppercase',
                        color: 'var(--muted)', whiteSpace: 'nowrap',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        {col.label}
                      </th>
                    ))}
                    <th style={{ width: 40, borderBottom: '1px solid var(--border)' }} />
                  </tr>
                </thead>
                <tbody>
                  {data.results.map(activity => {
                    const km = Number(activity.distance_km);
                    const pace = activity.avg_pace_sec_per_km !== null ? Number(activity.avg_pace_sec_per_km) : null;
                    const kind = deriveKind(km, pace);
                    const d = dayjs(activity.start_time);

                    return (
                      <tr key={activity.id} className="act-row" style={{ borderBottom: '1px solid var(--border-soft)' }}>

                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <Link to={`/activities/${activity.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{d.format('D MMM')}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.format('ddd').toUpperCase()}</div>
                          </Link>
                        </td>

                        <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                          <Link to={`/activities/${activity.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {kind === 'Long' ? 'Long run' : kind === 'Workout' ? 'Workout' : 'Easy run'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {km.toFixed(1)} km{activity.elevation_gain_m ? ` · +${Math.round(Number(activity.elevation_gain_m))}m` : ''}
                            </div>
                          </Link>
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <Link to={`/activities/${activity.id}`} style={{ textDecoration: 'none' }}>
                            <span className="pill" style={{ ...KIND_STYLE[kind], height: 20, padding: '0 7px', fontSize: 10.5, fontWeight: 600 }}>
                              {kind}
                            </span>
                          </Link>
                        </td>

                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <Link to={`/activities/${activity.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <span className="mono" style={{ fontSize: 13, color: 'var(--text)' }}>{km.toFixed(1)}</span>
                          </Link>
                        </td>

                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <Link to={`/activities/${activity.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <span className="mono" style={{ fontSize: 13, color: 'var(--text)' }}>
                              {pace !== null ? formatPace(pace) : '—'}
                            </span>
                          </Link>
                        </td>

                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <Link to={`/activities/${activity.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>
                              {activity.avg_hr ?? '—'}
                            </span>
                          </Link>
                        </td>

                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <Link to={`/activities/${activity.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>
                              {activity.tss !== null ? Math.round(Number(activity.tss)) : '—'}
                            </span>
                          </Link>
                        </td>

                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <Link to={`/activities/${activity.id}`} style={{ textDecoration: 'none' }}>
                            {activity.vdot_estimate !== null ? (
                              <span className="pill pill-soft-indigo" style={{ height: 20, padding: '0 7px', fontSize: 10.5, fontWeight: 600 }}>
                                {Number(activity.vdot_estimate).toFixed(1)}
                              </span>
                            ) : (
                              <span className="mono" style={{ fontSize: 13, color: 'var(--muted-2)' }}>—</span>
                            )}
                          </Link>
                        </td>

                        <td style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <ShareActivityButton activityId={activity.id} />
                            <button
                              className="btn btn-ghost"
                              style={{ height: 28, width: 28, padding: 0, border: 'none', color: 'var(--muted-2)' }}
                              title="Delete activity"
                              onClick={e => { e.stopPropagation(); setDeleteTarget(activity); }}
                            >
                              <IconTrash size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
            {totalPages > 1 && (
              <div style={{
                padding: '10px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderTop: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    {t.activities.prev}
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    {t.activities.nextPage}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Manual entry modal */}
      <ManualEntryModal
        open={manualOpen}
        onOpenChange={setManualOpen}
        onSuccess={handleManualSuccess}
      />

      {/* Delete confirm dialog */}
      <Dialog.Root open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay style={overlayStyle} />
          <Dialog.Content style={{ ...dialogContentStyle, width: 360 }}>
            <Dialog.Title style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              {t.activities.deleteActivity}
            </Dialog.Title>
            <Dialog.Description style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)' }}>
              {t.activities.cannotBeUndone}
            </Dialog.Description>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Dialog.Close asChild>
                <button className="btn btn-ghost">Cancel</button>
              </Dialog.Close>
              <button
                className="btn"
                style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
                onClick={() => void handleDeleteConfirm()}
              >
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default Activities;
