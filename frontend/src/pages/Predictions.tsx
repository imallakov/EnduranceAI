import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatTime } from '../lib/format';
import useIsMobile from '../lib/useIsMobile';
import {
  useMarathons,
  useLatestPrediction,
  usePredictionsHistory,
  useCreatePrediction,
} from '../hooks/usePredictions';
import { useDashboard } from '../hooks/useDashboard';
import RadialGauge from '../components/charts/RadialGauge';
import ComponentBar from '../components/charts/ComponentBar';
import ShareStoryModal from '../components/share/ShareStoryModal';
import { useT, useLang } from '../i18n/context';
import type {
  Prediction,
  PredictionRequest,
  PredictionResponse,
  Marathon,
  RaceReadiness,
  RecommendedPace,
  FeatureImportanceItem,
} from '../types/api';

// ── Helpers ────────────────────────────────────────────────────────────

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  return Array.from(code.toUpperCase())
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

function difficultyKey(coeff: number): { key: 'flat' | 'hilly' | 'tough'; cls: string } {
  const c = Number(coeff);
  if (c <= 1.01) return { key: 'flat', cls: 'pill-soft-success' };
  if (c <= 1.04) return { key: 'hilly', cls: 'pill-soft-warn' };
  return { key: 'tough', cls: 'pill-soft-muted' };
}

function formatSignedSec(sec: number): string {
  if (sec === 0) return '±0:00';
  const sign = sec < 0 ? '−' : '+';
  const abs = Math.abs(Math.round(sec));
  const m = Math.floor(abs / 60);
  const s = String(abs % 60).padStart(2, '0');
  if (abs < 3600) return `${sign}${m}:${s}`;
  const h = Math.floor(abs / 3600);
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
  return `${sign}${h}:${mm}:${s}`;
}

function daysFromNow(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function defaultRaceDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 42);
  return d.toISOString().slice(0, 10);
}

function featureLabel(f: string): string {
  const map: Record<string, string> = {
    vdot: 'VDOT',
    course_difficulty: 'Course difficulty',
    weather_index: 'Weather',
    ctl: 'Fitness (CTL)',
    atl: 'Fatigue (ATL)',
    tsb: 'Form (TSB)',
  };
  return map[f] ?? f.replace(/_/g, ' ');
}

function fmtDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getApiError(err: Error | null): string | null {
  if (!err) return null;
  const e = err as Error & { response?: { data?: { error?: string } } };
  return e.response?.data?.error ?? err.message ?? null;
}

// ── MarathonSelectWidget ───────────────────────────────────────────────

interface MarathonSelectWidgetProps {
  marathons: Marathon[];
  value: string;
  onChange: (id: string) => void;
}

const MarathonSelectWidget: React.FC<MarathonSelectWidgetProps> = ({ marathons, value, onChange }) => {
  const t = useT();
  const selected = marathons.find(m => m.id === value) ?? null;

  const DIFF_LABELS = {
    flat: t.marathons.difficultyFlat,
    hilly: t.marathons.difficultyHilly,
    tough: t.marathons.difficultyTough,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%',
            height: 38,
            padding: '0 36px 0 12px',
            fontSize: 13.5,
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: '#fff',
            color: value ? 'var(--text)' : 'var(--muted)',
            appearance: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <option value="">{t.predictions.selectMarathon}</option>
          {marathons.map(m => (
            <option key={m.id} value={m.id}>
              {countryFlag(m.country)} {m.name}{m.city ? ` · ${m.city}` : ''}
            </option>
          ))}
        </select>
        <svg
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)' }}
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {selected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {countryFlag(selected.country)} {selected.city || selected.country}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>
            · {Number(selected.distance_km).toFixed(3)} km
          </span>
          {(() => {
            const { key, cls } = difficultyKey(Number(selected.difficulty_coefficient));
            return (
              <span className={`pill ${cls}`} style={{ height: 18, fontSize: 10.5, padding: '0 6px' }}>
                {DIFF_LABELS[key]}
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
};

// ── PredictionFormCard ─────────────────────────────────────────────────

type TargetMode = 'marathon' | 'distance';

interface PredictionFormCardProps {
  onSuccess: (result: PredictionResponse) => void;
  vdot: number | null;
}

const PredictionFormCard: React.FC<PredictionFormCardProps> = ({ onSuccess, vdot }) => {
  const t = useT();
  const { data: marathons = [], isLoading: marathonsLoading } = useMarathons();
  const mutation = useCreatePrediction();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mode, setMode] = useState<TargetMode>('marathon');
  const [marathonId, setMarathonId] = useState('');

  // Deep-link from Dashboard HeroCard: /predictions?marathon=<uuid> →
  // preselect this marathon so the user doesn't pick it again. Only honour
  // the param if the uuid actually exists in the loaded marathons list
  // (defends against stale links to deleted custom races).
  useEffect(() => {
    if (!marathons.length) return;
    const queryMarathon = searchParams.get('marathon');
    if (queryMarathon && marathons.some(m => m.id === queryMarathon)) {
      setMarathonId(queryMarathon);
      setMode('marathon');
      // Strip the param so a refresh doesn't keep re-applying it after the
      // user maybe changed their selection.
      const next = new URLSearchParams(searchParams);
      next.delete('marathon');
      setSearchParams(next, { replace: true });
    }
  }, [marathons, searchParams, setSearchParams]);
  const [distanceKm, setDistanceKm] = useState('42.195');
  const [raceDate, setRaceDate] = useState(defaultRaceDate());
  const [showWeather, setShowWeather] = useState(false);
  const [tempC, setTempC] = useState('');
  const [humidityPct, setHumidityPct] = useState('60');
  const [windMs, setWindMs] = useState('0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vdot) return;

    const payload: PredictionRequest = {
      race_date: raceDate || null,
      temp_c: tempC !== '' ? Number(tempC) : null,
      humidity_pct: Number(humidityPct),
      wind_ms: Number(windMs),
    };

    if (mode === 'marathon' && marathonId) {
      payload.marathon_id = marathonId;
    } else if (mode === 'distance') {
      payload.distance_km = Number(distanceKm);
    }

    const result = await mutation.mutateAsync(payload);
    onSuccess(result);
  };

  const inputBase: React.CSSProperties = {
    width: '100%',
    height: 38,
    padding: '0 12px',
    fontSize: 13.5,
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: '#fff',
    color: 'var(--text)',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--muted)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: 8,
  };

  const segmentLabels: Record<TargetMode, string> = {
    marathon: t.predictions.marathon,
    distance: t.predictions.distanceOnly,
  };

  const isDisabled = !vdot || mutation.isPending || (mode === 'marathon' && !marathonId);
  const errMsg = getApiError(mutation.error);

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="label-sm" style={{ marginBottom: 20 }}>{t.predictions.newPrediction}</div>

      {!vdot && (
        <div style={{
          background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8,
          padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#9A3412',
        }}>
          {t.predictions.vdotNeeded}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Segmented control */}
        <div>
          <div style={labelStyle}>{t.predictions.raceTarget}</div>
          <div style={{ display: 'flex', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {(['marathon', 'distance'] as TargetMode[]).map((m, i, arr) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  height: 36,
                  fontSize: 12.5,
                  fontWeight: 500,
                  border: 'none',
                  borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  background: mode === m ? 'var(--primary)' : '#fff',
                  color: mode === m ? '#fff' : 'var(--muted)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 120ms ease, color 120ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                {segmentLabels[m]}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--muted)' }}>
            {t.predictions.customGpxHint}{' '}
            <a href="/marathons" style={{ color: 'var(--primary-2)', fontWeight: 500, textDecoration: 'none' }}>
              {t.predictions.marathonsLink} ↗
            </a>
          </div>
        </div>

        {/* Marathon select */}
        {mode === 'marathon' && (
          <div>
            <div style={labelStyle}>{t.predictions.marathon}</div>
            {marathonsLoading ? (
              <div style={{ height: 38, background: '#F1F5F9', borderRadius: 8 }} />
            ) : (
              <MarathonSelectWidget marathons={marathons} value={marathonId} onChange={setMarathonId} />
            )}
          </div>
        )}

        {/* Distance input */}
        {mode === 'distance' && (
          <div>
            <div style={labelStyle}>{t.predictions.distanceKm}</div>
            <input
              type="number"
              value={distanceKm}
              onChange={e => setDistanceKm(e.target.value)}
              min="1" max="300" step="0.001"
              placeholder="42.195"
              style={inputBase}
            />
          </div>
        )}

        {/* Race date */}
        <div>
          <div style={labelStyle}>{t.predictions.raceDate}</div>
          <input
            type="date"
            value={raceDate}
            onChange={e => setRaceDate(e.target.value)}
            style={inputBase}
          />
        </div>

        {/* Weather expandable */}
        <div>
          <button
            type="button"
            onClick={() => setShowWeather(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              style={{ transform: showWeather ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 150ms ease', color: 'var(--muted)' }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t.predictions.raceDayWeather}
            </span>
            {!showWeather && (
              <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>
                {tempC ? `${tempC}°C set` : t.predictions.autoClimate}
              </span>
            )}
          </button>

          {showWeather && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
              {[
                { label: t.predictions.tempC, val: tempC, set: setTempC, placeholder: 'auto', min: -20, max: 45 },
                { label: t.predictions.humidityPct, val: humidityPct, set: setHumidityPct, placeholder: '60', min: 0, max: 100 },
                { label: t.predictions.windMs, val: windMs, set: setWindMs, placeholder: '0', min: 0, max: 30 },
              ].map(({ label, val, set, placeholder, min, max }) => (
                <div key={label}>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
                  <input
                    type="number"
                    value={val}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    min={min} max={max}
                    style={{ ...inputBase, height: 34, fontSize: 13 }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {errMsg && (
          <div style={{
            fontSize: 13, color: 'var(--danger)',
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 8, padding: '10px 14px',
          }}>
            {errMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isDisabled}
          style={{
            height: 44,
            background: isDisabled ? '#E7E5E4' : 'var(--accent)',
            color: isDisabled ? 'var(--muted)' : '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 150ms ease',
          }}
        >
          {mutation.isPending ? (
            <>
              <span style={{
                width: 16, height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }} />
              {t.predictions.computing}
            </>
          ) : (
            t.predictions.generateBtn
          )}
        </button>
      </form>
    </div>
  );
};

// ── HeroResultCard ─────────────────────────────────────────────────────

const HeroResultCard: React.FC<{ pred: Prediction | PredictionResponse; onShare?: () => void }> = ({ pred, onShare }) => {
  const t = useT();
  const days = daysFromNow(pred.race_date);
  const mode = pred.features_snapshot?.mode as string | undefined;
  const ciSec = pred.confidence_interval_sec;
  const ciMin = ciSec ? Math.round(ciSec / 60) : null;
  const vdot = pred.features_snapshot?.vdot as number | undefined;
  const raceLabel = pred.marathon_name
    || (pred.target_distance_km ? `${Number(pred.target_distance_km)} km` : 'Custom');

  return (
    <div style={{ background: 'var(--primary)', borderRadius: 12, padding: '24px 28px', minHeight: 190, position: 'relative' }}>
      {/* Top label */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ color: '#F97066' }}>{t.predictions.predictionLabel}</span>
        {raceLabel && <span style={{ color: 'rgba(255,255,255,0.45)' }}>· {raceLabel}</span>}
        {days !== null && days > 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>· {t.predictions.inDays(days)}</span>}
        {days !== null && days === 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>· {t.predictions.todayLabel}</span>}
        {days !== null && days < 0 && <span style={{ color: 'rgba(255,255,255,0.25)' }}>· {t.predictions.daysAgo(Math.abs(days))}</span>}
      </div>

      {/* Main time */}
      <div className="mono" style={{ fontSize: 76, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: -2, marginBottom: 12 }}>
        {pred.predicted_time_formatted}
      </div>

      {/* Subtitle row */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
        {ciMin != null && <span>{t.predictions.minConfidence(ciMin)}</span>}
        {mode && (
          <span style={{ color: mode === 'full' ? '#a5b4fc' : 'rgba(255,255,255,0.35)' }}>
            {mode === 'full' ? t.predictions.mlModeFull : t.predictions.basicMode}
          </span>
        )}
        {vdot != null && (
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>VDOT {Number(vdot).toFixed(1)}</span>
        )}
      </div>

      {/* Share button */}
      {onShare && (
        <button
          onClick={onShare}
          style={{
            position: 'absolute', top: 20, right: 20,
            height: 30, padding: '0 12px', borderRadius: 7,
            border: '1px solid rgba(255,255,255,0.20)',
            background: 'rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 5,
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {t.predictions.share}
        </button>
      )}
    </div>
  );
};

// ── BreakdownCard ──────────────────────────────────────────────────────

const BreakdownCard: React.FC<{ pred: Prediction | PredictionResponse }> = ({ pred }) => {
  const t = useT();
  const base = pred.base_time_sec;
  if (!base) return null;

  const coeff = Number(pred.course_difficulty_coefficient ?? 1);
  const wIdx = Number(pred.weather_index ?? 1);
  const afterCourse = Math.round(base * coeff);
  const courseAdj = afterCourse - base;
  const afterWeather = Math.round(afterCourse * wIdx);
  const weatherAdj = afterWeather - afterCourse;
  const mlCorrRaw = pred.predicted_time_sec - afterWeather;
  // In basic mode the residual is always floating-point rounding noise
  // (≤ a few seconds). Only show ML row when it's a real signal — i.e. mode
  // is full AND correction exceeds the rounding-noise threshold.
  const snap = pred.features_snapshot;
  const mode = (snap?.mode as string | undefined) ?? 'basic';
  const showML = mode === 'full' && Math.abs(mlCorrRaw) >= 5;
  const mlCorr = mlCorrRaw;

  const tempC = snap?.temp_c as number | undefined;
  const humidity = snap?.humidity_pct as number | undefined;
  const vdot = snap?.vdot as number | undefined;
  const raceLabel = pred.marathon_name ?? 'Custom';

  const signColor = (sec: number) =>
    sec < 0 ? '#10B981' : sec > 0 ? '#F97066' : 'var(--muted)';

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
    padding: '9px 0',
    borderBottom: '1px solid var(--border-soft)',
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="label-sm" style={{ marginBottom: 14 }}>{t.dashboard.breakdown}</div>

      <div style={rowStyle}>
        <div>
          <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{t.dashboard.baseTime}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
            Daniels{vdot != null ? ` VDOT ${Number(vdot).toFixed(1)}` : ''}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{formatTime(base)}</div>
      </div>

      <div style={rowStyle}>
        <div>
          <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{t.dashboard.course}: {raceLabel}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>×{coeff.toFixed(4)}</div>
        </div>
        <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: signColor(courseAdj) }}>
          {formatSignedSec(courseAdj)}
        </div>
      </div>

      <div style={rowStyle}>
        <div>
          <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{t.dashboard.weather}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
            {tempC != null ? `${tempC}°C` : ''}{humidity != null ? `, ${humidity}% humidity` : ''}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: signColor(weatherAdj) }}>
          {formatSignedSec(weatherAdj)}
        </div>
      </div>

      {showML && (
        <div style={rowStyle}>
          <div>
            <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{t.predictions.mlCorrection}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{t.predictions.mlEnsemble}</div>
          </div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: signColor(mlCorr) }}>
            {formatSignedSec(mlCorr)}
          </div>
        </div>
      )}

      {/* Total row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', paddingTop: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t.predictions.predictedFinish}</div>
        <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>
          {pred.predicted_time_formatted}
        </div>
      </div>
    </div>
  );
};

// ── FeatureImportanceCard ──────────────────────────────────────────────

const FeatureImportanceCard: React.FC<{ items: FeatureImportanceItem[] }> = ({ items }) => {
  const t = useT();
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => Math.abs(b.impact_sec) - Math.abs(a.impact_sec));
  const maxAbs = Math.max(...sorted.map(i => Math.abs(i.impact_sec)), 1);

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="label-sm" style={{ marginBottom: 16 }}>{t.predictions.whatsDrivingTime}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map(item => {
          const pct = (Math.abs(item.impact_sec) / maxAbs) * 100;
          const faster = item.impact_sec < 0;
          const barColor = faster ? '#10B981' : '#F97066';
          return (
            <div key={item.feature}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {featureLabel(item.feature)}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 8 }}>
                    {item.description}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: barColor, flexShrink: 0 }}>
                  {formatSignedSec(item.impact_sec)}
                </div>
              </div>
              <div style={{ height: 6, background: '#F1EFEC', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── PacingCard ─────────────────────────────────────────────────────────

const PacingCard: React.FC<{ pace: RecommendedPace }> = ({ pace }) => {
  const t = useT();
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="label-sm" style={{ marginBottom: 16 }}>{t.predictions.raceStrategy}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { label: t.predictions.start10kmLabel, value: pace.start_10km, caption: t.predictions.conservative },
          { label: t.predictions.middle22kmLabel, value: pace.middle_22km, caption: t.predictions.targetMarathonPace },
          { label: t.predictions.finish10kmLabel, value: pace.finish_10km, caption: t.predictions.ifYouHaveIt },
        ].map(({ label, value, caption }) => (
          <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              {label}
            </div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>{caption}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── CompactReadiness ───────────────────────────────────────────────────

interface CompactReadinessProps {
  readiness: RaceReadiness | null;
  score: number | null;
}

const CompactReadiness: React.FC<CompactReadinessProps> = ({ readiness, score }) => {
  const t = useT();
  const s = readiness?.score ?? score ?? 0;
  const hasData = readiness != null || score != null;
  const badge =
    s >= 80 ? { label: t.dashboard.readinessGood, cls: 'pill-soft-success' } :
    s >= 60 ? { label: t.dashboard.readinessModerate, cls: 'pill-soft-warn' } :
    { label: t.dashboard.readinessLow, cls: 'pill-soft-muted' };

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="label-sm">{t.dashboard.raceReadiness}</div>
        {hasData
          ? <span className={`pill ${badge.cls}`}>{badge.label}</span>
          : <span className="pill pill-soft-muted">{t.dashboard.readinessNoData}</span>
        }
      </div>

      {!hasData ? (
        <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>
          {t.predictions.trainForWeeks}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <RadialGauge value={s} size={120} stroke={10} />
            <div style={{ position: 'absolute', top: 22, left: 0, right: 0, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>{s}</div>
              <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>/ 100</div>
            </div>
          </div>
          {readiness?.components && (
            <div style={{ flex: 1 }}>
              <ComponentBar label={t.dashboard.tsbScore}   score={readiness.components.tsb_score} />
              <ComponentBar label={t.dashboard.consistency} score={readiness.components.consistency} />
              <ComponentBar label={t.dashboard.longRuns}   score={readiness.components.long_runs} />
              <ComponentBar label={t.dashboard.vdotTrend}  score={readiness.components.vdot_trend} />
              <ComponentBar label={t.dashboard.volume}      score={readiness.components.volume} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── ResultPanel ────────────────────────────────────────────────────────

interface ResultPanelProps {
  freshResult: PredictionResponse | null;
  latest: Prediction | null;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ freshResult, latest }) => {
  const t = useT();
  const [shareOpen, setShareOpen] = useState(false);
  const display: Prediction | PredictionResponse | null = freshResult ?? latest;

  if (!display) {
    return (
      <div className="card" style={{
        padding: 40,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 320, textAlign: 'center',
      }}>
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" style={{ marginBottom: 16, opacity: 0.25 }}>
          <circle cx="30" cy="30" r="28" stroke="#1E1B4B" strokeWidth="2" />
          <path d="M18 36 C22 20, 32 20, 38 30" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="42" cy="32" r="5" fill="#F97066" />
        </svg>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{t.predictions.noPredictions}</div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', maxWidth: 280, lineHeight: 1.5 }}>
          {t.predictions.chooseMathon}
        </div>
      </div>
    );
  }

  const featureItems = (display.feature_importance ?? []) as FeatureImportanceItem[];
  const fresh = freshResult;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <HeroResultCard pred={display} onShare={() => setShareOpen(true)} />
        <BreakdownCard pred={display} />
        {featureItems.length > 0 && <FeatureImportanceCard items={featureItems} />}
        {fresh?.recommended_pace && <PacingCard pace={fresh.recommended_pace} />}
        <CompactReadiness
          readiness={fresh?.race_readiness ?? null}
          score={display.race_readiness_score}
        />
      </div>

      {shareOpen && (
        <ShareStoryModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          data={{
            predicted_time_sec: display.predicted_time_sec,
            predicted_time_formatted: display.predicted_time_formatted,
            marathon_name: display.marathon_name,
            race_date: display.race_date,
            confidence_interval_sec: display.confidence_interval_sec,
            model_version: display.model_version,
            // Pass the marathon's route so Cinematic renders it as background art
            polyline: display.marathon_polyline || undefined,
            recommended_pace: (freshResult as PredictionResponse | null)?.recommended_pace,
          }}
        />
      )}
    </>
  );
};

// ── PastPredictions table ──────────────────────────────────────────────

const PredMobileMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div style={{
      fontSize: 10, fontWeight: 600, color: 'var(--muted-2)',
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>{label}</div>
    <div className="mono" style={{ fontSize: 13.5, color: 'var(--text)', marginTop: 1 }}>{value}</div>
  </div>
);

const PastPredictions: React.FC<{ predictions: Prediction[] }> = ({ predictions }) => {
  const t = useT();
  const { lang } = useLang();
  const isMobile = useIsMobile();
  if (!predictions.length) return null;

  const headers = [
    t.predictions.dateCol,
    t.predictions.marathonDistanceCol,
    t.predictions.raceDate,
    t.predictions.predictedCol,
    t.predictions.confidenceCol,
    t.predictions.modeCol,
  ];

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="label-sm">{t.predictions.previousPredictions}</div>
        <span className="pill pill-soft-muted" style={{ height: 20, fontSize: 11.5, padding: '0 7px' }}>
          {predictions.length}
        </span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {predictions.map(p => {
              const mode = p.features_snapshot?.mode as string | undefined;
              const ciSec = p.confidence_interval_sec;
              const ciMin = ciSec ? Math.round(ciSec / 60) : null;
              const raceName = p.marathon_name
                || (p.target_distance_km ? `${Number(p.target_distance_km)} km` : t.predictions.custom);
              return (
                <div key={p.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{raceName}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, marginLeft: 8 }}>
                      {p.race_date ? fmtDate(p.race_date, lang) : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                    <PredMobileMetric label="Predicted" value={p.predicted_time_formatted} />
                    <PredMobileMetric label="Confidence" value={ciMin != null ? `±${ciMin} min` : '—'} />
                    <PredMobileMetric label="Created" value={fmtDate(p.created_at, lang)} />
                    <PredMobileMetric label="Mode" value={mode ?? '—'} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {headers.map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px', textAlign: 'left', fontSize: 11,
                      fontWeight: 600, letterSpacing: '0.07em',
                      textTransform: 'uppercase', color: 'var(--muted)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {predictions.map((p, i) => {
                const mode = p.features_snapshot?.mode as string | undefined;
                const ciSec = p.confidence_interval_sec;
                const ciMin = ciSec ? Math.round(ciSec / 60) : null;
                const raceName = p.marathon_name
                  || (p.target_distance_km ? `${Number(p.target_distance_km)} km` : t.predictions.custom);

                return (
                  <tr
                    key={p.id}
                    style={{ borderBottom: i < predictions.length - 1 ? '1px solid var(--border-soft)' : 'none' }}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{fmtDate(p.created_at, lang)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text)' }}>{raceName}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>
                      {p.race_date ? fmtDate(p.race_date, lang) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                        {p.predicted_time_formatted}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>
                      {ciMin != null ? `±${ciMin} min` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {mode && (
                        <span className={`pill ${mode === 'full' ? 'pill-soft-indigo' : 'pill-soft-muted'}`} style={{ fontSize: 11 }}>
                          {mode}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────

const Predictions: React.FC = () => {
  const t = useT();
  const [freshResult, setFreshResult] = useState<PredictionResponse | null>(null);
  const { data: latest = null } = useLatestPrediction();
  const { data: history = [] } = usePredictionsHistory();
  const { data: dashboard } = useDashboard();

  const vdot = (dashboard?.metrics?.vdot ?? null) as number | null;

  return (
    <div className="page-pad" style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px' }}>
      {/* Page header */}
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 6 }}>
            {t.predictions.predictTitle}
          </h1>
          <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
            {t.predictions.predictSubtitle}
          </div>
        </div>
        {vdot != null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--primary-50)', border: '1px solid #C7D2FE',
            borderRadius: 10, padding: '8px 16px', flexShrink: 0,
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary-2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              VDOT
            </div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>
              {Number(vdot).toFixed(1)}
            </div>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="predictions-layout" style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 24, alignItems: 'start' }}>
        <PredictionFormCard onSuccess={setFreshResult} vdot={vdot} />
        <ResultPanel freshResult={freshResult} latest={latest} />
      </div>

      {/* Past predictions */}
      <PastPredictions predictions={history} />
    </div>
  );
};

export default Predictions;
