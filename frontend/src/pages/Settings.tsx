import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useStravaStatus, useStravaSync, useStravaDisconnect } from '../hooks/useStrava';
import { useUserAcceptances, useActivePolicy } from '../hooks/useLegal';
import { startStravaConnect } from '../api/integrations';
import { apiClient } from '../api/client';
import type { UserProfile, UploadStatusResponse } from '../types/api';
import type { AxiosError } from 'axios';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useToast } from '../components/ToastProvider';
import { useT, useLang } from '../i18n/context';

const INPUT_STYLE: React.CSSProperties = {
  height: 38, border: '1px solid var(--border)', borderRadius: 8,
  padding: '0 12px', fontSize: 14, fontFamily: 'inherit',
  background: '#fff', color: 'var(--text)', outline: 'none',
  width: '100%',
  transition: 'border-color 120ms ease, box-shadow 120ms ease',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 500, color: 'var(--text)',
  display: 'block', marginBottom: 6,
};

const STRAVA_ORANGE = '#FC4C02';

function extractError(err: unknown, fallback = 'Failed to save profile. Try again.'): string {
  const e = err as AxiosError<Record<string, unknown>>;
  if (e.response?.data) {
    const d = e.response.data;
    if (typeof d.detail === 'string') return d.detail;
    const msgs = Object.values(d).flat();
    if (msgs.length) return msgs.join(' ');
  }
  return fallback;
}

type StravaTimeT = { never: string; justNow: string; minutesAgo: (m: number) => string; hoursAgo: (h: number) => string; daysAgo: (d: number) => string };
function timeAgo(iso: string | null, ts: StravaTimeT): string {
  if (!iso) return ts.never;
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 2) return ts.justNow;
  if (min < 60) return ts.minutesAgo(min);
  const h = Math.floor(min / 60);
  if (h < 24) return ts.hoursAgo(h);
  const d = Math.floor(h / 24);
  return ts.daysAgo(d);
}

function StravaLogo() {
  return (
    <svg width="68" height="16" viewBox="0 0 68 16" fill="none" aria-label="Strava">
      <text
        x="0" y="13"
        fontFamily="'Arial Black', sans-serif"
        fontWeight="900"
        fontSize="14"
        fill={STRAVA_ORANGE}
        letterSpacing="-0.5"
      >
        STRAVA
      </text>
    </svg>
  );
}

interface StravaCardProps {
  onToast: (msg: string, kind: 'success' | 'error') => void;
}

const StravaCard: React.FC<StravaCardProps> = ({ onToast }) => {
  const t = useT();
  const qc = useQueryClient();
  const { data: status, isLoading } = useStravaStatus();
  const syncMutation = useStravaSync();
  const disconnectMutation = useStravaDisconnect();

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleConnect = async () => {
    if (!showWarning) {
      setShowWarning(true);
      return;
    }
    try {
      await startStravaConnect();
    } catch {
      onToast(t.strava.connectFailed, 'error');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { task_id } = await syncMutation.mutateAsync();
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await apiClient.get<UploadStatusResponse>(
            `/api/activities/upload-status/${task_id}/`,
          );
          if (data.status === 'SUCCESS' || data.status === 'FAILURE') {
            clearInterval(pollRef.current!);
            setSyncing(false);
            if (data.status === 'SUCCESS') {
              const result = data.result as Record<string, unknown> | undefined;
              const imported = typeof result?.imported === 'number' ? result.imported : 0;
              onToast(t.strava.imported(imported), 'success');
              qc.invalidateQueries({ queryKey: ['activities'] });
              qc.invalidateQueries({ queryKey: ['dashboard'] });
              qc.invalidateQueries({ queryKey: ['strava', 'status'] });
            } else {
              onToast(t.strava.syncFailed, 'error');
            }
          }
        } catch {
          clearInterval(pollRef.current!);
          setSyncing(false);
          onToast(t.strava.syncStatusFailed, 'error');
        }
      }, 2000);
    } catch {
      setSyncing(false);
      onToast(t.strava.syncStartFailed, 'error');
    }
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      setConfirmDisconnect(false);
      onToast(t.strava.disconnected, 'success');
    } catch {
      onToast(t.strava.disconnectFailed, 'error');
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '16px 0', color: 'var(--muted)', fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  const connected = status?.connected ?? false;
  const broken = status?.is_broken ?? false;

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 10,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StravaLogo />
        {connected && !broken && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px',
            borderRadius: 20, background: '#d1fae5', color: '#065f46',
          }}>
            Connected
          </span>
        )}
        {broken && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px',
            borderRadius: 20, background: '#fef3c7', color: '#92400e',
          }}>
            {t.strava.reConnectNeeded}
          </span>
        )}
      </div>

      {!connected || broken ? (
        <>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            {t.strava.importRuns}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
            {t.strava.compatibleWith}
          </p>
          {showWarning ? (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5',
              padding: '12px 14px', borderRadius: 8, fontSize: 12.5,
              color: '#991b1b', lineHeight: 1.45, marginTop: 4,
            }}>
              <strong style={{ display: 'block', marginBottom: 4 }}>{t.strava.warningImportant}</strong>
              {t.strava.warningBody}
              <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleConnect}
                  style={{
                    background: STRAVA_ORANGE, color: '#fff',
                    border: 'none', borderRadius: 6, padding: '6px 12px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {t.strava.warningContinue}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWarning(false)}
                  style={{
                    background: 'transparent', border: 'none',
                    fontSize: 12, color: '#991b1b', cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {t.strava.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              style={{
                alignSelf: 'flex-start',
                background: STRAVA_ORANGE, color: '#fff',
                border: 'none', borderRadius: 8, padding: '8px 16px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'opacity 120ms',
                marginTop: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {t.strava.connectArrow}
            </button>
          )}

          <div style={{ marginTop: 4 }}>
            <StravaBadge />
          </div>
        </>
      ) : (
        <>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
              {t.strava.connectedAs(status!.athlete_username ?? '')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Last sync: {timeAgo(status!.last_sync_at, t.strava)} · {t.strava.totalImported(status!.total_imported)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="btn btn-ghost"
              style={{ fontSize: 13, gap: 6, display: 'flex', alignItems: 'center' }}
            >
              {syncing ? (
                <>
                  <span style={{
                    display: 'inline-block', width: 12, height: 12,
                    border: '2px solid var(--border)', borderTopColor: 'var(--text)',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                  {t.strava.syncing}
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  {t.strava.syncNow}
                </>
              )}
            </button>

            {!confirmDisconnect ? (
              <button
                type="button"
                onClick={() => setConfirmDisconnect(true)}
                className="btn btn-ghost"
                style={{ fontSize: 13, color: 'var(--danger)' }}
              >
                Disconnect
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {t.strava.confirmDisconnect}
                </span>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  style={{
                    background: 'var(--danger)', color: '#fff', border: 'none',
                    borderRadius: 6, padding: '5px 12px', fontSize: 12,
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {disconnectMutation.isPending ? t.strava.disconnecting : t.strava.confirm}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(false)}
                  className="btn btn-ghost"
                  style={{ fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <StravaBadge />
          </div>
        </>
      )}
    </div>
  );
};

function StravaBadge() {
  const t = useT();
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: STRAVA_ORANGE, color: '#fff',
      padding: '3px 8px', borderRadius: 3,
      fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
      </svg>
      {t.strava.poweredBy}
    </div>
  );
}

const Settings: React.FC = () => {
  const t = useT();
  const { lang } = useLang();
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: acceptances } = useUserAcceptances();
  // Latest active versions for each policy — used to surface "you have an
  // older version on file" badges when our published policy moved ahead of
  // what the user clicked Accept on. Static cached for 1h.
  const { data: activePrivacy } = useActivePolicy('privacy');
  const { data: activeTerms }   = useActivePolicy('terms');
  const activeByType: Record<string, string | undefined> = {
    privacy: activePrivacy?.version,
    terms:   activeTerms?.version,
  };

  const [first_name, setFirstName] = useState(user?.first_name ?? '');
  const [last_name, setLastName] = useState(user?.last_name ?? '');
  const [date_of_birth, setDob] = useState(user?.date_of_birth ?? '');
  const [sex, setSex] = useState(user?.sex ?? '');
  const [max_hr, setMaxHr] = useState<string>(user?.max_hr?.toString() ?? '');
  const [units, setUnits] = useState(user?.units ?? 'metric');
  const [profileLang] = useState(user?.lang ?? 'ru');

  const [submitting, setSubmitting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Handle ?strava=connected / ?strava=error after OAuth redirect.
  // Errors come from backend as machine codes (missing_permissions, etc) —
  // map them to localized, user-friendly messages and surface via global toast
  // (top-right) instead of as a tiny red footer that users miss.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stravaParam = params.get('strava');
    if (!stravaParam) return;

    if (stravaParam === 'connected') {
      showToast(t.strava.connectedSuccess, 'success');
    } else if (stravaParam === 'error') {
      const msg = params.get('message') ?? 'unknown_error';
      const friendly = {
        missing_permissions: t.strava.errMissingPermissions,
        access_denied: t.strava.errAccessDenied,
        invalid_state: t.strava.errInvalidState,
        exchange_failed: t.strava.errExchangeFailed,
      }[msg] ?? `${t.strava.connectionFailed} ${msg.replace(/_/g, ' ')}`;
      // missing_permissions is a user-recoverable mistake (warning, amber);
      // the rest are real failures (error, red).
      showToast(friendly, msg === 'missing_permissions' ? 'warning' : 'error', 8000);
    }
    // Clear query params from URL so refreshing doesn't re-toast
    navigate('/settings', { replace: true });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await apiClient.get('/api/users/me/data-export/', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().split('T')[0];
      a.download = `enduranceai_export_${ts}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        handleToast('Export is limited to once per hour. Please try again later.', 'error');
      } else {
        handleToast('Failed to generate export archive. Please try again.', 'error');
      }
    } finally {
      setExportLoading(false);
    }
  };

  // Reroute the legacy onToast prop to the global ToastProvider so every
  // success/error from StravaCard, export, etc. surfaces in the same
  // top-right location with consistent styling.
  const handleToast = (msg: string, kind: 'success' | 'error') => {
    showToast(msg, kind);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        first_name, last_name,
        date_of_birth: date_of_birth || null,
        sex: sex || null,
        max_hr: max_hr ? Number(max_hr) : null,
        units, lang: profileLang,
      };
      const { data } = await apiClient.put<UserProfile>('/api/auth/profile/', payload);
      setUser(data);
      showToast(t.settings.profileUpdated, 'success');
    } catch (err) {
      showToast(extractError(err, t.settings.failedToSave), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-pad" style={{ padding: '24px 32px 40px' }}>
      <h1 style={{
        margin: 0, fontSize: 22, fontWeight: 600,
        letterSpacing: -0.4, color: 'var(--text)',
      }}>
        {t.settings.title}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, marginBottom: 24 }}>
        {t.settings.subtitle}
      </p>

      <form onSubmit={handleSubmit} className="card" style={{
        maxWidth: 640, padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {/* Profile */}
        <div>
          <div className="label-sm" style={{ marginBottom: 14 }}>{t.settings.profile}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={LABEL_STYLE}>{t.settings.firstName}</label>
              <input className="focus-input" style={INPUT_STYLE}
                     value={first_name} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label style={LABEL_STYLE}>{t.settings.lastName}</label>
              <input className="focus-input" style={INPUT_STYLE}
                     value={last_name} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={LABEL_STYLE}>{t.settings.email}</label>
            <input
              style={{ ...INPUT_STYLE, background: 'var(--bg)', color: 'var(--muted)' }}
              value={user?.email ?? ''} readOnly
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {t.settings.emailFixed}
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Athletic data */}
        <div>
          <div className="label-sm" style={{ marginBottom: 14 }}>{t.settings.athleticData}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={LABEL_STYLE}>{t.settings.dateOfBirth}</label>
              <input type="date" className="focus-input" style={INPUT_STYLE}
                     value={date_of_birth ?? ''}
                     onChange={(e) => setDob(e.target.value)} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {t.settings.dateOfBirthHint}
              </div>
            </div>
            <div>
              <label style={LABEL_STYLE}>{t.settings.sex}</label>
              <select className="focus-input" style={INPUT_STYLE}
                      value={sex ?? ''} onChange={(e) => setSex(e.target.value)}>
                <option value="">{t.settings.sexNotSay}</option>
                <option value="M">{t.settings.sexMale}</option>
                <option value="F">{t.settings.sexFemale}</option>
              </select>
            </div>
          </div>

          <div>
            <label style={LABEL_STYLE}>{t.settings.maxHr}</label>
            <input
              type="number" min={100} max={230}
              className="focus-input"
              style={{ ...INPUT_STYLE, maxWidth: 200 }}
              value={max_hr} onChange={(e) => setMaxHr(e.target.value)}
              placeholder="e.g. 185"
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {t.settings.maxHrHint}
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Connected Apps */}
        <div>
          <div className="label-sm" style={{ marginBottom: 14 }}>{t.settings.connectedApps}</div>
          <StravaCard onToast={handleToast} />
        </div>

        <div className="divider" />

        {/* Preferences */}
        <div>
          <div className="label-sm" style={{ marginBottom: 14 }}>{t.settings.preferences}</div>
          <div>
            <label style={LABEL_STYLE}>{t.settings.units}</label>
            <select className="focus-input" style={{ ...INPUT_STYLE, maxWidth: 280 }}
                    value={units} onChange={(e) => setUnits(e.target.value)}>
              <option value="metric">{t.settings.unitsMetric}</option>
              <option value="imperial">{t.settings.unitsImperial}</option>
            </select>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
              Interface language is set in the dedicated Language section below.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="submit" disabled={submitting} className="btn btn-coral"
                  style={{ minWidth: 140, justifyContent: 'center' }}>
            {submitting ? t.settings.saving : t.settings.saveChanges}
          </button>
        </div>
      </form>

      {/* Language section */}
      <div className="card" style={{ maxWidth: 640, padding: 28, marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="label-sm">{t.settings.language}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
            {t.settings.languageHintFull}
          </div>
        </div>
        <div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Legal & Privacy section */}
      <div className="card" style={{ maxWidth: 640, padding: 28, marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="label-sm">{t.settings.legalPrivacy}</div>

        {/* Policy acceptances */}
        {acceptances && acceptances.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {acceptances.map(a => {
              const policyLabel = a.policy_type === 'privacy' ? t.legal.privacy
                                : a.policy_type === 'terms' ? t.legal.terms
                                : a.policy_type === 'cookies' ? t.legal.cookies
                                : a.policy_type;
              const dateStr = new Date(a.accepted_at).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
              const timeStr = new Date(a.accepted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
              const currentVersion = activeByType[a.policy_type];
              const isOutdated = currentVersion && currentVersion !== a.policy_version;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                        {policyLabel} v{a.policy_version}
                      </span>
                      {isOutdated && (
                        <span
                          title={t.settings.newVersionAvailable(currentVersion!)}
                          style={{
                            fontSize: 10.5, fontWeight: 600, padding: '2px 7px',
                            borderRadius: 20, background: '#FFFBEB',
                            color: '#92400E', border: '1px solid #FDE68A',
                            letterSpacing: 0.2,
                          }}
                        >
                          {t.settings.newVersionBadge(currentVersion!)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                      {t.settings.acceptedAt(dateStr, timeStr)}
                    </div>
                  </div>
                  <Link
                    to={`/legal/${a.policy_type}`}
                    style={{
                      fontSize: 12,
                      color: isOutdated ? '#92400E' : 'var(--primary)',
                      textDecoration: 'none',
                      fontWeight: isOutdated ? 600 : 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isOutdated ? t.settings.reviewAcceptArrow : t.settings.viewArrow}
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/legal/privacy" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none' }}>
            {t.settings.viewPrivacyPolicy}
          </Link>
          <span style={{ color: 'var(--muted)' }}>·</span>
          <Link to="/legal/terms" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none' }}>
            {t.settings.viewTerms}
          </Link>
        </div>

        <div className="divider" />

        {/* GDPR actions */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>{t.settings.yourDataRights}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost"
              onClick={handleExport}
              disabled={exportLoading}
              style={{ fontSize: 13 }}
            >
              {exportLoading ? 'Generating…' : t.settings.downloadMyData}
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
            You can also{' '}
            <span style={{ color: 'var(--danger)', fontWeight: 500 }}>{t.settings.deleteAccountLink}</span>
            {' '}from the account section above — all your data will be permanently deleted (GDPR right to erasure).
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
