import React, { useCallback, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import polyline from '@mapbox/polyline';
import { usePreviewGPX, useCreateCustomMarathon, useSetTargetMarathon } from '../../hooks/useMarathonsExtra';
import type { MarathonPreviewResponse } from '../../types/api';
import { useT } from '../../i18n/context';

// ── Country list ──────────────────────────────────────────────────────
const COUNTRIES = [
  { code: 'AE', name: 'UAE' }, { code: 'AT', name: 'Austria' }, { code: 'AU', name: 'Australia' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'DE', name: 'Germany' }, { code: 'DK', name: 'Denmark' },
  { code: 'ES', name: 'Spain' }, { code: 'FR', name: 'France' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'GR', name: 'Greece' }, { code: 'HR', name: 'Croatia' }, { code: 'HU', name: 'Hungary' },
  { code: 'IT', name: 'Italy' }, { code: 'JP', name: 'Japan' }, { code: 'KR', name: 'South Korea' },
  { code: 'NL', name: 'Netherlands' }, { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' },
  { code: 'RU', name: 'Russia' }, { code: 'SE', name: 'Sweden' }, { code: 'TR', name: 'Turkey' },
  { code: 'US', name: 'United States' }, { code: 'CH', name: 'Switzerland' },
];

// ── SVG route glow (decoded polyline) ─────────────────────────────────
function RouteGlowPreview({ encodedPolyline }: { encodedPolyline: string }) {
  if (!encodedPolyline) return null;
  const coords = polyline.decode(encodedPolyline);
  if (coords.length < 2) return null;

  const lats = coords.map(c => c[0]);
  const lons = coords.map(c => c[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const latRange = maxLat - minLat || 1e-6;
  const lonRange = maxLon - minLon || 1e-6;
  const pad = 8;
  const vbW = 100, vbH = 70;
  const scale = Math.min((vbW - 2 * pad) / lonRange, (vbH - 2 * pad) / latRange);

  const pts = coords.map(([lat, lon]) => {
    const x = pad + (lon - minLon) * scale;
    const y = vbH - pad - (lat - minLat) * scale;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet"
         style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <filter id="gpx-big" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <filter id="gpx-mid" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <filter id="gpx-tight" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>
      <polyline points={pts} fill="none" stroke="#4F46E5" strokeWidth="5.8" opacity="0.42"
                strokeLinejoin="round" strokeLinecap="round" filter="url(#gpx-big)" />
      <polyline points={pts} fill="none" stroke="#818CF8" strokeWidth="3.4" opacity="0.55"
                strokeLinejoin="round" strokeLinecap="round" filter="url(#gpx-mid)" />
      <polyline points={pts} fill="none" stroke="#A5B4FC" strokeWidth="1.7" opacity="0.75"
                strokeLinejoin="round" strokeLinecap="round" filter="url(#gpx-tight)" />
      <polyline points={pts} fill="none" stroke="#FFFFFF" strokeWidth="0.55"
                strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Mini elevation area chart ─────────────────────────────────────────
function MiniElevationChart({ profile }: { profile: Array<{ km: number; elevation_m: number }> }) {
  if (!profile.length) return null;
  const w = 320, h = 48;
  const vals = profile.map(p => p.elevation_m);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const padY = 6;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = padY + (1 - (v - min) / range) * (h - padY - 4);
    return [x, y];
  });
  const pathLine = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const pathArea = `${pathLine} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
         style={{ width: '100%', height: h, display: 'block' }}>
      <path d={pathArea} fill="rgba(79,70,229,0.14)" />
      <path d={pathLine} stroke="#4F46E5" strokeWidth="1.4" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Step indicator ────────────────────────────────────────────────────
function StepIndicator({ step }: { step: 1 | 2 }) {
  const t = useT();
  const steps = [
    { n: 1, label: t.marathons.stepUploadFile },
    { n: 2, label: t.marathons.stepReviewSave },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
      {steps.map((s, i, arr) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <React.Fragment key={s.n}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11,
                background: done ? '#10B981' : active ? '#4F46E5' : '#F1F5F9',
                color: done || active ? '#fff' : '#64748B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, fontFamily: 'ui-monospace, monospace',
              }}>
                {done ? '✓' : s.n}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: done || active ? '#0F172A' : '#64748B' }}>
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? '#10B981' : '#E2E8F0' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  currentTargetId?: string | null;
  onSaved?: () => void;
}

export default function AddCustomGPXModal({ open, onClose, currentTargetId, onSaved }: Props) {
  const t = useT();
  const diffLabel = (coeff: number) => {
    if (coeff <= 1.01) return t.marathons.difficultyFlat;
    if (coeff <= 1.025) return t.marathons.difficultyRolling;
    if (coeff <= 1.04) return t.marathons.difficultyHilly;
    return t.marathons.difficultyTough;
  };
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<MarathonPreviewResponse | null>(null);
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [saveToLib, setSaveToLib] = useState(true);
  const [setAsTarget, setSetAsTarget] = useState(false);
  const [, setSavedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewMut = usePreviewGPX();
  const createMut = useCreateCustomMarathon();
  const targetMut = useSetTargetMarathon();

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.gpx')) return;
    setFile(f);
    setPreview(null);
    setSavedId(null);
    // Derive name from filename
    const stem = f.name.replace(/\.gpx$/i, '').replace(/[_-]+/g, ' ');
    setName(stem.charAt(0).toUpperCase() + stem.slice(1));
    previewMut.mutate(f, {
      onSuccess: (data) => setPreview(data),
    });
  }, [previewMut]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSave = () => {
    if (!file || !name.trim() || !preview) return;
    createMut.mutate(
      { fields: { name: name.trim(), city, country, race_date: raceDate || undefined }, file },
      {
        onSuccess: (marathon) => {
          setSavedId(marathon.id);
          if (setAsTarget) {
            targetMut.mutate(
              { marathonId: marathon.id, raceDate: raceDate || null },
              { onSuccess: () => { onSaved?.(); onClose(); } },
            );
          } else {
            onSaved?.();
            onClose();
          }
        },
      },
    );
  };

  const step = preview ? 2 : 1;
  const isLoading = previewMut.isPending;
  const isSaving = createMut.isPending || targetMut.isPending;
  const error = previewMut.error?.message || createMut.error?.message;

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setName('');
    setCity('');
    setCountry('');
    setRaceDate('');
    setSaveToLib(true);
    setSetAsTarget(false);
    previewMut.reset();
    createMut.reset();
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 80, zIndex: 500,
        }}>
          <Dialog.Content className="modal-responsive" style={{
            width: 1040, background: '#fff', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 32px 80px -16px rgba(15,23,42,0.35)',
            border: '1px solid #E2E8F0',
            maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
          }} aria-describedby="gpx-modal-desc">
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9',
            }}>
              <div>
                <Dialog.Title style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#0F172A', letterSpacing: -0.3 }}>
                  {t.marathons.addCustomMarathonTitle}
                </Dialog.Title>
                <p id="gpx-modal-desc" style={{ fontSize: 12.5, color: '#64748B', marginTop: 4, marginBottom: 0 }}>
                  {t.marathons.addCustomMarathonHint}
                </p>
              </div>
              <button onClick={handleClose} aria-label="Close"
                style={{
                  width: 32, height: 32, border: 'none', background: 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8, color: '#64748B', fontSize: 18,
                }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: 24 }}>
              <StepIndicator step={step as 1 | 2} />

              {/* ── Step 1: Drop zone ── */}
              {step === 1 && (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      height: 360, borderRadius: 14, cursor: 'pointer',
                      border: `2px dashed ${dragging ? '#4F46E5' : '#CBD5E1'}`,
                      background: dragging ? '#F0F0FF' : 'linear-gradient(180deg, #FAFAF9 0%, #FFFFFF 100%)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 14, transition: 'border-color 150ms, background 150ms',
                    }}>
                    <input ref={fileInputRef} type="file" accept=".gpx" style={{ display: 'none' }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    {isLoading ? (
                      <>
                        <div style={{
                          width: 48, height: 48, borderRadius: 24,
                          border: '3px solid #EEF2FF', borderTopColor: '#4F46E5',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{t.marathons.analyzingRoute}</div>
                      </>
                    ) : (
                      <>
                        <div style={{
                          width: 64, height: 64, borderRadius: 32, background: '#EEF2FF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid #DBE0FF',
                        }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                               stroke="#4F46E5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A7 7 0 1 0 6 18h11.5z" />
                            <path d="M12 12v7" />
                            <path d="m9 15 3-3 3 3" />
                          </svg>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>{t.marathons.dropFile}</div>
                        <div style={{ fontSize: 12.5, color: '#64748B' }}>
                          or <span style={{ color: '#4F46E5', fontWeight: 500 }}>{t.marathons.clickToBrowse}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          {['Garmin', 'Strava', 'gpx.studio', 'Komoot'].map(s => (
                            <span key={s} style={{
                              display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 9px',
                              borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff',
                              fontSize: 11, color: '#64748B',
                            }}>{s}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {error && (
                    <div role="alert" style={{
                      marginTop: 12, padding: '10px 14px', background: '#FEF2F2',
                      border: '1px solid #FECACA', borderRadius: 8, fontSize: 12.5, color: '#DC2626',
                    }}>{error}</div>
                  )}
                  <div style={{
                    marginTop: 14, fontSize: 11.5, color: '#94A3B8',
                    display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>{t.marathons.gpxFormats}</span>
                    <span style={{ fontFamily: 'ui-monospace, monospace' }}>42° 26.3' N · ELEV ↑ · DIFFICULTY</span>
                  </div>
                </>
              )}

              {/* ── Step 2: Preview + form ── */}
              {step === 2 && preview && (
                <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 24 }}>
                  {/* LEFT — visual preview */}
                  <div style={{
                    background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)',
                    borderRadius: 14, overflow: 'hidden', position: 'relative',
                    border: '1px solid #4F46E5', minHeight: 460,
                    display: 'flex', flexDirection: 'column',
                  }}>
                    {/* Filename pill */}
                    <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7, height: 26, padding: '0 10px',
                        borderRadius: 13, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)',
                        color: '#fff', fontSize: 11.5,
                      }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6" />
                        </svg>
                        <span style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: 0.2, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file?.name}
                        </span>
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        height: 22, padding: '0 8px', borderRadius: 11,
                        background: 'rgba(16,185,129,0.18)', color: '#6EE7B7',
                        fontSize: 10.5, border: '1px solid rgba(16,185,129,0.3)',
                      }}>● {t.marathons.gpxParsed}</span>
                    </div>

                    {/* Glow route */}
                    <div style={{ flex: 1, padding: '46px 24px 56px' }}>
                      <RouteGlowPreview encodedPolyline={preview.polyline} />
                    </div>

                    {/* Replace link */}
                    <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
                      <button onClick={() => { setPreview(null); setFile(null); previewMut.reset(); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: 'rgba(255,255,255,0.7)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                        {t.marathons.gpxReplaceFile}
                      </button>
                    </div>
                  </div>

                  {/* RIGHT — analysis + form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {/* Analysis */}
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.07em', marginBottom: 10 }}>{t.marathons.routeAnalysis}</div>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
                        border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden',
                      }}>
                        {[
                          { l: t.marathons.distanceStat, v: Number(preview.distance_km).toFixed(2), s: 'km' },
                          { l: t.marathons.elevationStat, v: `+${Math.round(preview.elevation_gain_m)}`, s: 'm' },
                          { l: t.marathons.difficultyStat, v: diffLabel(preview.difficulty_coefficient), s: `×${preview.difficulty_coefficient.toFixed(3)}` },
                        ].map((c, i) => (
                          <div key={i} style={{
                            padding: '12px 14px', borderRight: i < 2 ? '1px solid #F1F5F9' : 'none',
                            display: 'flex', flexDirection: 'column', gap: 4,
                          }}>
                            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, color: '#64748B' }}>{c.l}</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 17, fontWeight: 600, color: '#0F172A', letterSpacing: -0.3, lineHeight: 1 }}>{c.v}</span>
                              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#64748B' }}>{c.s}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {preview.elevation_profile.length > 0 && (
                        <div style={{ marginTop: 10, padding: '8px 6px', background: '#FAFAF9', border: '1px solid #F1F5F9', borderRadius: 8 }}>
                          <MiniElevationChart profile={preview.elevation_profile} />
                        </div>
                      )}
                    </div>

                    {/* Form */}
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.07em', marginBottom: 10 }}>{t.marathons.gpxDetails}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>{t.marathons.gpxName}</span>
                          <input value={name} onChange={e => setName(e.target.value)}
                            style={{
                              height: 36, padding: '0 12px', border: '1px solid #CBD5E1',
                              borderRadius: 8, fontSize: 13, color: '#0F172A', outline: 'none',
                              fontFamily: 'inherit',
                            }} />
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>{t.marathons.gpxCity}</span>
                            <input value={city} onChange={e => setCity(e.target.value)}
                              style={{
                                height: 36, padding: '0 12px', border: '1px solid #CBD5E1',
                                borderRadius: 8, fontSize: 13, color: '#0F172A', outline: 'none',
                                fontFamily: 'inherit',
                              }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>{t.marathons.gpxCountry}</span>
                            <select value={country} onChange={e => setCountry(e.target.value)}
                              style={{
                                height: 36, padding: '0 12px', border: '1px solid #CBD5E1',
                                borderRadius: 8, fontSize: 13, color: country ? '#0F172A' : '#94A3B8',
                                outline: 'none', background: '#fff', fontFamily: 'inherit', cursor: 'pointer',
                              }}>
                              <option value="">{t.marathons.gpxSelectCountry}</option>
                              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </select>
                          </label>
                        </div>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>{t.marathons.gpxRaceDateOptional}</span>
                          <input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)}
                            style={{
                              height: 36, padding: '0 12px', border: '1px solid #CBD5E1',
                              borderRadius: 8, fontSize: 13, color: '#0F172A', outline: 'none',
                              fontFamily: 'inherit',
                            }} />
                        </label>
                      </div>
                    </div>

                    {/* Save options */}
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', letterSpacing: '0.07em', marginBottom: 10 }}>{t.marathons.gpxSaveOptions}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <CheckboxRow checked={saveToLib} onChange={setSaveToLib} label={t.marathons.gpxSaveToLib} />
                        <CheckboxRow
                          checked={setAsTarget}
                          onChange={setSetAsTarget}
                          label={t.marathons.gpxSetAsTarget}
                          sub={currentTargetId ? t.marathons.gpxReplaceTarget : undefined}
                          disabled={!raceDate}
                        />
                      </div>
                    </div>

                    {error && (
                      <div role="alert" style={{
                        padding: '10px 14px', background: '#FEF2F2',
                        border: '1px solid #FECACA', borderRadius: 8, fontSize: 12.5, color: '#DC2626',
                      }}>{error}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 24px', borderTop: '1px solid #F1F5F9',
              display: 'flex', justifyContent: step === 2 ? 'space-between' : 'flex-end',
              alignItems: 'center', gap: 8, background: '#FAFAF9',
            }}>
              {step === 2 && (
                <div style={{ fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#10B981' }}>✓</span>
                  {t.marathons.difficultyComputed}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button onClick={handleClose}
                  style={{
                    height: 36, padding: '0 16px', borderRadius: 8, border: '1px solid #E2E8F0',
                    background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#0F172A',
                    fontFamily: 'inherit',
                  }}>Cancel</button>
                {step === 2 && (
                  <button onClick={handleSave} disabled={!name.trim() || isSaving || !saveToLib}
                    style={{
                      height: 36, padding: '0 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: !name.trim() || isSaving || !saveToLib ? '#F1F5F9' : '#F97066',
                      color: !name.trim() || isSaving || !saveToLib ? '#94A3B8' : '#fff',
                      fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                      boxShadow: !name.trim() || isSaving || !saveToLib ? 'none' : '0 4px 16px -4px rgba(249,112,102,0.5)',
                    }}>
                    {isSaving ? t.marathons.gpxSaving : t.marathons.gpxSaveBtn}
                  </button>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
      {/* Spinner animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Dialog.Root>
  );
}

function CheckboxRow({ checked, onChange, label, sub, disabled }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; sub?: string; disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, opacity: disabled ? 0.5 : 1 }}>
      <button onClick={() => !disabled && onChange(!checked)} role="checkbox" aria-checked={checked}
        style={{
          width: 18, height: 18, borderRadius: 5, marginTop: 1, flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer',
          background: checked ? '#4F46E5' : '#fff',
          border: checked ? '1px solid #4F46E5' : '1.5px solid #CBD5E1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {checked && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>{label}</span>
        {sub && <span style={{ fontSize: 11.5, color: '#64748B' }}>{sub}</span>}
      </div>
    </div>
  );
}
