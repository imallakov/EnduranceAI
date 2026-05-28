import React from 'react';
import type { ShareData, ShareFormat, ShareToggles } from '../../../types/share';
import { fmtPace, fmtDuration, daysUntilRace, confidenceToMinutes } from '../shareUtils';
import { SHARE_BRAND_NAME, SHARE_BRAND_DOMAIN, ShareBrandMark } from '../shareBrand';
import { useT } from '../../../i18n/context';

interface Props {
  data: ShareData;
  format: ShareFormat;
  toggles: ShareToggles;
}

const SplitsTemplate: React.FC<Props> = ({ data, format, toggles }) => {
  const t = useT();
  const aspectMap: Record<ShareFormat, { w: number; h: number }> = {
    '9:16': { w: 375, h: 667 },
    '1:1':  { w: 375, h: 375 },
    '4:5':  { w: 375, h: 469 },
  };
  const { w, h } = aspectMap[format];

  const isPrediction = !!data.predicted_time_formatted;

  const bigNumber = isPrediction
    ? data.predicted_time_formatted ?? '—'
    : Number(data.distance_km ?? 0).toFixed(2);
  const bigUnit = isPrediction ? '' : t.share.labelKm;

  const subLine = isPrediction
    ? (data.marathon_name ?? 'Custom race')
    : (data.duration_sec ? fmtDuration(data.duration_sec) : '');

  const dateStr = toggles.date && data.start_time
    ? new Date(data.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : '';

  // Prediction enrichments — countdown badge + confidence band.
  const daysToRace = isPrediction ? daysUntilRace(data.race_date) : null;
  const confidenceMin = isPrediction ? confidenceToMinutes(data.confidence_interval_sec) : null;

  // Build stats rows — activity mode shows metric table; prediction mode shows pace plan
  type Row = [string, string, string];
  const rows: Row[] = [];

  // Backend serializes DecimalField as string. Coerce every numeric to
  // Number() before passing it to Math.round / toFixed, and use Number()
  // > 0 as the "has value" check so zero/NaN doesn't push junk rows.
  const num = (v: number | string | null | undefined): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  if (isPrediction) {
    if (data.recommended_pace) {
      rows.push(['0–10 KM', data.recommended_pace.start_10km, '/km']);
      rows.push(['10–32 KM', data.recommended_pace.middle_22km, '/km']);
      rows.push(['32–42 KM', data.recommended_pace.finish_10km, '/km']);
    }
  } else {
    const pace = num(data.avg_pace_sec_per_km);
    const hrAvg = num(data.avg_hr);
    const hrMax = num(data.max_hr);
    const elev = num(data.elevation_gain_m);
    const vdot = num(data.vdot_estimate);
    const tss = num(data.tss);

    if (toggles.pace && pace !== null) rows.push([t.share.labelPace, fmtPace(pace), '/km']);
    if (toggles.hr && hrAvg !== null) rows.push([t.share.labelHrAvg, String(Math.round(hrAvg)), 'bpm']);
    if (toggles.hr && hrMax !== null) rows.push([t.share.labelHrMax, String(Math.round(hrMax)), 'bpm']);
    if (elev !== null) rows.push([t.share.labelElev, `+${Math.round(elev)}`, 'm']);
    if (vdot !== null) rows.push([t.share.labelVdot, vdot.toFixed(1), '']);
    if (tss !== null) rows.push([t.share.labelTss, String(Math.round(tss)), '']);

    // Fallback when nothing matched: at least show distance/duration as
    // a meaningful "what we have" card instead of an empty template.
    if (rows.length === 0) {
      if (num(data.distance_km) !== null) {
        rows.push([t.share.labelDistance, Number(data.distance_km).toFixed(2), 'km']);
      }
      if (data.duration_sec) {
        rows.push([t.share.labelDuration, fmtDuration(data.duration_sec), '']);
      }
    }
  }

  const maxRows = format === '1:1' ? 3 : 6;
  const displayRows = rows.slice(0, maxRows);

  const fontSize = {
    big: format === '1:1' ? 60 : 72,
    unit: format === '1:1' ? 16 : 18,
    sub: format === '1:1' ? 16 : 18,
  };

  const uid = 'spl';

  return (
    <div style={{
      width: w, height: h,
      background: '#FAFAF9',
      display: 'flex', flexDirection: 'column',
      padding: format === '1:1' ? '18px 20px 16px' : '24px 24px 20px',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
      // Form a stacking context so the z-index:-1 background layers below
      // stay scoped inside this template and don't leak through the parent.
      isolation: 'isolate',
    }}>
      {/* Paper-grid texture — faint horizontal lines, coach's notebook vibe */}
      <svg width="100%" height="100%" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5, zIndex: -1,
      }}>
        <defs>
          <pattern id={`paper-${uid}`} width="100%" height="22" patternUnits="userSpaceOnUse">
            <line x1="0" y1="21.5" x2="100%" y2="21.5" stroke="#0F172A" strokeOpacity="0.04" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#paper-${uid})`} />
      </svg>
      {/* Left-edge accent gradient — notebook margin / data-sheet rail */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, zIndex: -1,
        background: 'linear-gradient(180deg, #F97066 0%, #4F46E5 100%)',
        opacity: 0.7,
      }} />
      {/* Header — label on left, days-to-race (predictions) or date (activities) on right.
          Splits has more vertical room than other templates, so we put the
          countdown in the corner where it's most-glanced. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#F97066', letterSpacing: '0.12em' }}>
          {isPrediction ? t.share.labelPrediction : t.share.labelRunStats}
        </span>
        {daysToRace !== null ? (
          <span style={{
            padding: '3px 8px', borderRadius: 4,
            background: 'rgba(249,112,102,0.10)',
            color: '#B91C1C',
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6,
          }}>
            {t.share.daysToRace(daysToRace)}
          </span>
        ) : (
          <span style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 9.5, color: '#64748B', letterSpacing: 0.3,
          }}>
            {dateStr}
          </span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Big number + subline + confidence — centered as one unit so the
          visual axis stays rigid regardless of marathon name length. */}
      <div style={{
        marginTop: 10, display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: fontSize.big, fontWeight: 700, color: '#1E1B4B',
            letterSpacing: -2.5, lineHeight: 0.92,
          }}>
            {bigNumber}
          </span>
          {bigUnit && (
            <span style={{
              fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
              fontSize: fontSize.unit, color: '#1E1B4B', fontWeight: 600,
            }}>
              {bigUnit}
            </span>
          )}
        </div>
        {subLine && (
          <div style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: fontSize.sub, color: '#0F172A', marginTop: 4, letterSpacing: 0.2,
          }}>
            {subLine}
          </div>
        )}
        {confidenceMin !== null && (
          <div style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 11, color: '#64748B', marginTop: 3, letterSpacing: 0.4,
          }}>
            {t.share.confidenceMin(confidenceMin)} · {t.share.methodTag}
          </div>
        )}
      </div>

      {/* Stats card */}
      {displayRows.length > 0 && (
        <div style={{
          marginTop: format === '1:1' ? 12 : 18,
          background: '#fff',
          border: '1px solid #E7E5E4',
          borderRadius: 11, overflow: 'hidden',
        }}>
          {displayRows.map(([k, v, u], i) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: `${format === '1:1' ? 8 : 10}px 14px`,
              borderBottom: i < displayRows.length - 1 ? '1px solid #F1EFEC' : 'none',
            }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748B', letterSpacing: '0.07em' }}>{k}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{
                  fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
                  fontSize: 15, color: '#0F172A', fontWeight: 600, letterSpacing: -0.2,
                }}>{v}</span>
                {u && <span style={{
                  fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
                  fontSize: 10.5, color: '#64748B',
                }}>{u}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Strategy hint — centered to match the rest of the prediction content */}
      {isPrediction && data.recommended_pace && (
        <div style={{
          marginTop: 8,
          fontFamily: 'Inter, sans-serif',
          fontSize: 10.5, color: '#64748B', fontStyle: 'italic',
          letterSpacing: 0.1, lineHeight: 1.3,
          textAlign: 'center',
        }}>
          {t.share.paceStrategyHint}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 11, borderTop: '1px solid #E7E5E4',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ShareBrandMark size={13} variant="light" />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#1E1B4B' }}>{SHARE_BRAND_NAME}</span>
        </div>
        {/* Watermark always rendered (no toggle) */}
        <span style={{
          fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
          fontSize: 9.5, color: '#94A3B8', letterSpacing: 0.4,
        }}>
          {SHARE_BRAND_DOMAIN}
        </span>
      </div>
    </div>
  );
};

export default SplitsTemplate;
