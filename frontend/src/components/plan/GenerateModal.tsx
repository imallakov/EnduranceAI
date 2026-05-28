import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconClose, IconArrowRight } from '../icons';
import { useGeneratePlan } from '../../hooks/usePlan';
import { useAuth } from '../../hooks/useAuth';
import type { TrainingPlan } from '../../types/api';
import { useT } from '../../i18n/context';

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
  prefill?: TrainingPlan | null;
}

function secToHMS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function hmsToSec(hms: string): number | null {
  const parts = hms.split(':').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [h, m, s] = parts;
  return h * 3600 + m * 60 + s;
}

const GenerateModal: React.FC<GenerateModalProps> = ({ open, onClose, prefill }) => {
  const { user } = useAuth();
  const generate  = useGeneratePlan();
  const t = useT();

  const defaultTarget = prefill?.target_time_sec
    ? secToHMS(prefill.target_time_sec)
    : user?.current_vdot
      ? ''
      : '';

  const [raceDate,      setRaceDate]      = useState(prefill?.race_date ?? user?.target_race_date ?? '');
  const [daysPerWeek,   setDaysPerWeek]   = useState(prefill?.days_per_week ?? 4);
  const [targetTime,    setTargetTime]    = useState(defaultTarget);
  const [cutbackOn,     setCutbackOn]     = useState(true);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);

  const vdot = user?.current_vdot ? Number(user.current_vdot).toFixed(1) : null;

  const handleGenerate = async () => {
    if (!raceDate) { setErrorMsg(t.plan.raceDateRequired); return; }
    const target_time_sec = targetTime ? hmsToSec(targetTime) : null;
    try {
      setErrorMsg(null);
      await generate.mutateAsync({
        race_date: raceDate,
        days_per_week: daysPerWeek,
        target_time_sec,
        cutback_enabled: cutbackOn,
      });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErrorMsg(msg ?? t.plan.generateFailed);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)',
          zIndex: 50,
        }} />
        <Dialog.Content
          className="modal-responsive"
          style={{
            position: 'fixed', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 720, background: '#fff', borderRadius: 14,
            boxShadow: '0 32px 80px -20px rgba(15,23,42,0.30)',
            zIndex: 51, overflow: 'hidden', outline: 'none',
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="label-sm">{t.plan.generatePlan}</div>
              <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600 }}>{t.plan.configureYourBlock}</h2>
            </div>
            <Dialog.Close asChild>
              <button className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}>
                <IconClose size={13} />
              </button>
            </Dialog.Close>
          </div>

          {/* Error stripe */}
          {errorMsg && (
            <div style={{ margin: '0 24px', marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: 'var(--danger)' }}>
              {errorMsg}
            </div>
          )}

          {/* Body */}
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Race summary card */}
            <div style={{
              padding: 14, borderRadius: 10,
              background: user?.target_marathon_name ? 'var(--bg)' : '#FFFBEB',
              border: user?.target_marathon_name ? '1px solid var(--border)' : '1px solid rgba(245,158,11,0.35)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: user?.target_marathon_name
                  ? 'linear-gradient(135deg, #1E1B4B, #4F46E5)'
                  : '#F59E0B',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Geist Mono, monospace', fontWeight: 700, fontSize: 13,
                flexShrink: 0,
              }}>
                {user?.target_marathon_name
                  ? user.target_marathon_name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()
                  : '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                  {user?.target_marathon_name ?? t.plan.noTargetRaceSet}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {user?.target_marathon_name
                    ? <>{t.plan.tailoredForThisRace} <a href="/marathons" style={{ color: 'var(--primary-2)', fontWeight: 500, textDecoration: 'none' }}>{t.plan.changeTarget} ↗</a></>
                    : <>{t.plan.pickRaceOnMarathons}</>}
                </div>
              </div>
            </div>

            {/* Race date */}
            <div>
              <div className="label-sm" style={{ marginBottom: 8 }}>{t.plan.raceDate}</div>
              <input
                type="date"
                value={raceDate}
                onChange={e => setRaceDate(e.target.value)}
                min={new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)}
                style={{
                  height: 40, padding: '0 12px', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 13, color: 'var(--text)', background: '#fff', width: 200,
                  outline: 'none',
                }}
              />
            </div>

            {/* Days per week */}
            <div>
              <div className="label-sm" style={{ marginBottom: 8 }}>{t.plan.trainingDaysPerWeek}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[3, 4, 5, 6].map(d => (
                  <button
                    key={d}
                    onClick={() => setDaysPerWeek(d)}
                    className={daysPerWeek === d ? 'btn btn-primary' : 'btn btn-ghost'}
                    style={{ width: 44, height: 36, padding: 0, justifyContent: 'center', fontSize: 14, fontWeight: 600 }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Target time */}
            <div>
              <div className="label-sm" style={{ marginBottom: 8 }}>{t.plan.targetFinishTime}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <input
                  type="text"
                  placeholder="3:45:00"
                  value={targetTime}
                  onChange={e => setTargetTime(e.target.value)}
                  style={{
                    height: 44, padding: '0 16px', border: '1.5px solid var(--border)',
                    borderRadius: 10, fontSize: 22, fontFamily: 'Geist Mono, monospace',
                    fontWeight: 600, color: 'var(--primary)', width: 160, outline: 'none',
                  }}
                  onFocus={e => ((e.target as HTMLInputElement).style.borderColor = '#4F46E5')}
                  onBlur={e => ((e.target as HTMLInputElement).style.borderColor = 'var(--border)')}
                />
                {vdot && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                    {t.plan.fromYourVdot(vdot)}
                    <br />{t.plan.leaveEmptyToUseModel}
                  </div>
                )}
              </div>
            </div>

            {/* Cutback toggle */}
            <div style={{ padding: 14, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{t.plan.cutbackWeeks}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{t.plan.cutbackHint}</div>
              </div>
              <button
                onClick={() => setCutbackOn(v => !v)}
                style={{
                  width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
                  background: cutbackOn ? '#4F46E5' : '#CBD5E1', border: 'none', transition: 'background 150ms',
                }}
              >
                <div style={{
                  position: 'absolute',
                  right: cutbackOn ? 2 : undefined,
                  left: cutbackOn ? undefined : 2,
                  top: 2, width: 16, height: 16, borderRadius: 8, background: '#fff',
                  transition: 'left 150ms, right 150ms',
                }} />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Dialog.Close asChild>
              <button className="btn btn-ghost">{t.plan.cancel}</button>
            </Dialog.Close>
            <button
              className="btn btn-primary"
              onClick={() => void handleGenerate()}
              disabled={generate.isPending || !raceDate}
            >
              {generate.isPending ? t.plan.generating : t.plan.generatePlan} <IconArrowRight size={12} />
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default GenerateModal;
