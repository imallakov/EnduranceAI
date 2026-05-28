import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/context';
import { apiClient } from '../api/client';
import { updateProfile } from '../api/auth';
import { startStravaConnect } from '../api/integrations';
import { IconLogo } from '../components/icons';
import type { Marathon } from '../types/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  height: 40, border: '1px solid var(--border)', borderRadius: 8,
  padding: '0 12px', fontSize: 14, fontFamily: 'inherit',
  background: '#fff', color: 'var(--text)', outline: 'none',
  width: '100%', boxSizing: 'border-box',
  transition: 'border-color 120ms ease',
};

const STRAVA_ORANGE = '#FC4C02';

function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Progress dots ─────────────────────────────────────────────────────────────

const ProgressDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
    {Array.from({ length: total }, (_, i) => {
      const idx = i + 1;
      const done = idx < current;
      const active = idx === current;
      return (
        <div
          key={idx}
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: active
              ? 'var(--accent)'      // coral for current
              : done
                ? 'var(--primary)'   // deep indigo for completed
                : 'transparent',
            border: active || done
              ? 'none'
              : '2px solid var(--border)',
            transition: 'background 200ms',
          }}
        />
      );
    })}
  </div>
);

// ── Toast ────────────────────────────────────────────────────────────────────

const Toast: React.FC<{ msg: string; kind: 'success' | 'error'; onDone: () => void }> = ({ msg, kind, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: kind === 'success' ? '#064e3b' : '#7f1d1d',
      color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13,
      maxWidth: 420, textAlign: 'center', zIndex: 9999,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    }}>
      {msg}
    </div>
  );
};

// ── Step 1: Profile basics ────────────────────────────────────────────────────

interface Step1Props {
  onNext: (data: { date_of_birth: string; sex: string; max_hr: string }) => Promise<void>;
  submitting: boolean;
  t: ReturnType<typeof useT>;
}

const Step1: React.FC<Step1Props> = ({ onNext, submitting, t }) => {
  const ob = t.onboarding;
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState('');
  const [maxHr, setMaxHr] = useState('');
  const [errors, setErrors] = useState<{ sex?: string; dob?: string; maxHr?: string }>({});

  const validate = () => {
    const errs: typeof errors = {};
    if (!sex) errs.sex = ob.sexRequired;
    if (dob) {
      const age = ageFromDob(dob);
      if (age === null || age < 13 || age > 100) errs.dob = ob.dobInvalid;
    }
    if (maxHr) {
      const n = parseInt(maxHr, 10);
      if (isNaN(n) || n < 100 || n > 220) errs.maxHr = ob.maxHrInvalid;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    await onNext({ date_of_birth: dob, sex, max_hr: maxHr });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Date of birth */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
          {ob.dateOfBirth}
        </label>
        <input
          type="date"
          value={dob}
          onChange={e => setDob(e.target.value)}
          className="focus-input"
          style={INPUT_STYLE}
        />
        {errors.dob && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.dob}</div>}
      </div>

      {/* Sex */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
          {ob.sex} <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <div style={{ display: 'flex', gap: 12 }}>
          {(['M', 'F'] as const).map(val => (
            <label
              key={val}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '8px 16px', border: `1px solid ${sex === val ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 8, fontSize: 14,
                background: sex === val ? 'var(--surface-active, #f0f0ff)' : '#fff',
                transition: 'border-color 120ms',
              }}
            >
              <input
                type="radio"
                name="sex"
                value={val}
                checked={sex === val}
                onChange={() => setSex(val)}
                style={{ accentColor: 'var(--primary)' }}
              />
              {val === 'M' ? ob.sexMale : ob.sexFemale}
            </label>
          ))}
        </div>
        {errors.sex && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.sex}</div>}
      </div>

      {/* Max HR */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
          {ob.maxHr}
        </label>
        <input
          type="number"
          value={maxHr}
          onChange={e => setMaxHr(e.target.value)}
          min={100} max={220}
          placeholder="185"
          className="focus-input"
          style={{ ...INPUT_STYLE, width: 120 }}
        />
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{ob.maxHrHint}</div>
        {errors.maxHr && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 2 }}>{errors.maxHr}</div>}
      </div>

      <button
        className="btn btn-coral"
        onClick={handleNext}
        disabled={submitting}
        style={{ width: '100%', justifyContent: 'center', height: 42, marginTop: 8 }}
      >
        {submitting ? t.common.loading : t.common.next}
      </button>
    </div>
  );
};

// ── Step 2: Data import ────────────────────────────────────────────────────────

interface Step2Props {
  stravaConnected: boolean;
  onConnectStrava: () => Promise<void>;
  onSkip: () => void;
  connectingStrava: boolean;
  t: ReturnType<typeof useT>;
}

const Step2: React.FC<Step2Props> = ({ stravaConnected, onConnectStrava, onSkip, connectingStrava, t }) => {
  const ob = t.onboarding;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {stravaConnected ? (
        <div style={{
          padding: 16, borderRadius: 10, background: '#d1fae5',
          border: '1px solid #a7f3d0', textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#065f46', marginBottom: 4 }}>
            {ob.stravaConnected}
          </div>
          <div style={{ fontSize: 13, color: '#047857' }}>{ob.stravaConnectedHint}</div>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
        }}
          className="onboarding-cards"
        >
          {/* Strava card */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 10, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 10, background: '#fff',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: STRAVA_ORANGE, color: '#fff',
              padding: '3px 8px', borderRadius: 3,
              fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
              alignSelf: 'flex-start',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              STRAVA
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{ob.stravaDesc}</div>
            <button
              onClick={onConnectStrava}
              disabled={connectingStrava}
              style={{
                background: STRAVA_ORANGE, color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', opacity: connectingStrava ? 0.7 : 1,
                transition: 'opacity 120ms',
              }}
            >
              {connectingStrava ? ob.connectingStrava : ob.connectStrava}
            </button>
          </div>

          {/* Manual upload card */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 10, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 10, background: '#fff',
          }}>
            <div style={{
              fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase',
              color: 'var(--muted)',
            }}>
              FIT · GPX · TCX
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{ob.uploadDesc}</div>
            <Link
              to="/activities"
              className="btn btn-ghost"
              style={{ textDecoration: 'none', fontSize: 13, justifyContent: 'center' }}
            >
              {ob.uploadLink}
            </Link>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onSkip}
          style={{
            background: 'none', border: 'none', fontSize: 13,
            color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline',
            padding: 0,
          }}
        >
          {ob.skipForNow}
        </button>
      </div>

      {stravaConnected && (
        <button
          className="btn btn-coral"
          onClick={onSkip}
          style={{ width: '100%', justifyContent: 'center', height: 42 }}
        >
          {t.common.next}
        </button>
      )}
    </div>
  );
};

// ── Step 3: Goal race ─────────────────────────────────────────────────────────

interface Step3Props {
  onFinish: (marathonId: string | null, customDistance: string, customDate: string) => Promise<void>;
  submitting: boolean;
  t: ReturnType<typeof useT>;
}

const Step3: React.FC<Step3Props> = ({ onFinish, submitting, t }) => {
  const ob = t.onboarding;
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [customDistance, setCustomDistance] = useState('42.195');
  const [customDate, setCustomDate] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery<{ results: Marathon[] }>({
    queryKey: ['marathons', 'catalog'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/marathons/?page_size=100&is_custom=false');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const marathons = data?.results ?? [];
  const filtered = query.length < 1
    ? marathons.slice(0, 12)
    : marathons.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.city.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 12);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (m: Marathon) => {
    setSelectedId(m.id);
    setSelectedName(m.name);
    setQuery(m.name);
    setShowDropdown(false);
  };

  const handleFinish = () => {
    if (isCustom) {
      onFinish(null, customDistance, customDate);
    } else {
      onFinish(selectedId, '', '');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Toggle: catalog vs custom */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setIsCustom(false)}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13,
            border: `1px solid ${!isCustom ? 'var(--primary)' : 'var(--border)'}`,
            background: !isCustom ? 'var(--surface-active, #f0f0ff)' : '#fff',
            cursor: 'pointer', fontWeight: !isCustom ? 600 : 400, color: 'var(--text)',
            transition: 'all 120ms',
          }}
        >
          {ob.catalogToggle}
        </button>
        <button
          onClick={() => setIsCustom(true)}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13,
            border: `1px solid ${isCustom ? 'var(--primary)' : 'var(--border)'}`,
            background: isCustom ? 'var(--surface-active, #f0f0ff)' : '#fff',
            cursor: 'pointer', fontWeight: isCustom ? 600 : 400, color: 'var(--text)',
            transition: 'all 120ms',
          }}
        >
          {ob.customRaceToggle}
        </button>
      </div>

      {!isCustom ? (
        <div ref={containerRef} style={{ position: 'relative' }}>
          <input
            type="text"
            value={query}
            placeholder={ob.selectMarathon}
            onChange={e => { setQuery(e.target.value); setShowDropdown(true); setSelectedId(null); setSelectedName(''); }}
            onFocus={() => setShowDropdown(true)}
            className="focus-input"
            style={INPUT_STYLE}
          />
          {showDropdown && filtered.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto',
              marginTop: 4,
            }}>
              {filtered.map(m => (
                <div
                  key={m.id}
                  onMouseDown={() => handleSelect(m)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                    borderBottom: '1px solid var(--border-soft)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontWeight: 500 }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {m.city}{m.country ? ` · ${m.country}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
          {selectedName && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              ✓ {selectedName}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              {ob.customDistanceKm}
            </label>
            <input
              type="number"
              value={customDistance}
              onChange={e => setCustomDistance(e.target.value)}
              min={1} max={300} step={0.001}
              className="focus-input"
              style={{ ...INPUT_STYLE, width: 140 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              {ob.customRaceDate}
            </label>
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="focus-input"
              style={INPUT_STYLE}
            />
          </div>
        </div>
      )}

      <button
        className="btn btn-coral"
        onClick={handleFinish}
        disabled={submitting}
        style={{ width: '100%', justifyContent: 'center', height: 42, marginTop: 8 }}
      >
        {submitting ? t.common.loading : ob.finish}
      </button>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => onFinish(null, '', '')}
          disabled={submitting}
          style={{
            background: 'none', border: 'none', fontSize: 13,
            color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline', padding: 0,
          }}
        >
          {t.onboarding.skipForNow}
        </button>
      </div>
    </div>
  );
};

// ── Main Onboarding component ─────────────────────────────────────────────────

const Onboarding: React.FC = () => {
  const t = useT();
  const ob = t.onboarding;
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [connectingStrava, setConnectingStrava] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null);
  const hasActivities = useRef(false);

  // Handle Strava OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stravaParam = params.get('strava');
    if (!stravaParam) return;

    if (stravaParam === 'connected') {
      setStravaConnected(true);
      setStep(2);
    } else if (stravaParam === 'error') {
      const msg = params.get('message') ?? 'unknown_error';
      setToast({ msg: `${ob.stravaError} (${msg.replace(/_/g, ' ')})`, kind: 'error' });
      setStep(2);
    }
    navigate('/onboarding', { replace: true });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Step 1 handler
  const handleStep1 = async (data: { date_of_birth: string; sex: string; max_hr: string }) => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { sex: data.sex };
      if (data.date_of_birth) payload.date_of_birth = data.date_of_birth;
      if (data.max_hr) payload.max_hr = parseInt(data.max_hr, 10);
      const updated = await updateProfile(payload);
      setUser(updated);
      setStep(2);
    } catch {
      setToast({ msg: t.settings.failedToSave, kind: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2 handler
  const handleConnectStrava = async () => {
    setConnectingStrava(true);
    try {
      await startStravaConnect('/onboarding');
      // page will navigate away; connectingStrava stays true during redirect
    } catch {
      setConnectingStrava(false);
      setToast({ msg: t.strava.connectFailed, kind: 'error' });
    }
  };

  // Step 3 finish handler
  const handleFinish = async (
    marathonId: string | null,
    _customDistance: string,
    customDate: string,
  ) => {
    setSubmitting(true);
    try {
      // Track the freshest user across both writes — avoids stale-closure
      // bug where the second setUser would re-spread the OLD `user` from
      // outer scope and clobber target_marathon_name set by the first call.
      let latestUser = user;

      // Update profile with goal if provided
      if (marathonId || customDate) {
        const patch: Record<string, unknown> = {};
        if (marathonId) {
          patch.target_marathon = marathonId;
        } else if (customDate) {
          patch.target_race_date = customDate;
        }
        const updated = await updateProfile(patch);
        latestUser = updated;
        setUser(updated);
        hasActivities.current = (updated.training_weeks ?? 0) > 0;
      }

      // Mark onboarding complete
      await apiClient.post('/api/auth/onboarding/complete/');

      // Use the freshest snapshot, not the stale closure `user`.
      if (latestUser) {
        setUser({ ...latestUser, onboarding_completed: true });
      }

      // Pick toast
      const hasGoal = !!(marathonId || customDate);
      const hasData = stravaConnected || hasActivities.current;
      let msg: string;
      if (hasGoal && hasData) {
        msg = ob.toastBothReady;
      } else if (hasGoal && !hasData) {
        msg = ob.toastNoActivities;
      } else {
        msg = ob.toastEmpty;
      }

      // Set toast in sessionStorage BEFORE navigation so Dashboard picks it up on mount
      sessionStorage.setItem('onboarding_toast', JSON.stringify({ msg, kind: 'success' }));
      navigate('/dashboard', { replace: true });
    } catch {
      setToast({ msg: t.errors.anErrorOccurred, kind: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = [ob.step1Title, ob.step2Title, ob.step3Title];
  const stepSubtitles = [ob.step1Subtitle, ob.step2Subtitle, ob.step3Subtitle];

  return (
    <div style={{
      minHeight: '100vh', background: '#F5F4F1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <style>{`
        @media (max-width: 520px) {
          .onboarding-cards { grid-template-columns: 1fr !important; }
          .onboarding-card { width: 100% !important; }
        }
      `}</style>

      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 36 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <IconLogo size={24} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)', letterSpacing: -0.3 }}>
            EnduranceAI
          </div>
        </div>

        <ProgressDots current={step} total={3} />

        {/* Step header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3 }}>
            {stepTitles[step - 1]}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            {stepSubtitles[step - 1]}
          </p>
        </div>

        {/* Step content */}
        {step === 1 && (
          <Step1 onNext={handleStep1} submitting={submitting} t={t} />
        )}
        {step === 2 && (
          <Step2
            stravaConnected={stravaConnected}
            onConnectStrava={handleConnectStrava}
            onSkip={() => setStep(3)}
            connectingStrava={connectingStrava}
            t={t}
          />
        )}
        {step === 3 && (
          <Step3 onFinish={handleFinish} submitting={submitting} t={t} />
        )}

        {/* Back link (not on step 1) */}
        {step > 1 && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                background: 'none', border: 'none', fontSize: 13,
                color: 'var(--muted)', cursor: 'pointer', padding: 0,
              }}
            >
              ← {t.common.back}
            </button>
          </div>
        )}
      </div>

      {toast && (
        <Toast msg={toast.msg} kind={toast.kind} onDone={() => setToast(null)} />
      )}
    </div>
  );
};

export default Onboarding;
