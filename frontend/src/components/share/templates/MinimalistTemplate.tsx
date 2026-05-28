import React from 'react';
import type { ShareData, ShareFormat, ShareToggles } from '../../../types/share';
import SharePreviewMap from '../SharePreviewMap';
import { fmtPace, fmtDuration, daysUntilRace, confidenceToMinutes } from '../shareUtils';
import { SHARE_BRAND_NAME, SHARE_BRAND_DOMAIN, ShareBrandMark } from '../shareBrand';
import { useT } from '../../../i18n/context';

interface Props {
  data: ShareData;
  format: ShareFormat;
  toggles: ShareToggles;
}

const MinimalistTemplate: React.FC<Props> = ({ data, format, toggles }) => {
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

  const dateLine = isPrediction
    ? (data.marathon_name ?? '')
    : [
        data.duration_sec ? fmtDuration(data.duration_sec) : null,
        toggles.pace && data.avg_pace_sec_per_km ? fmtPace(data.avg_pace_sec_per_km) + ' /km' : null,
      ].filter(Boolean).join('  ·  ');

  const statLine = [
    toggles.hr && data.avg_hr ? `${t.share.labelHrAvg.replace(' AVG', '')} ${data.avg_hr}` : null,
    data.vdot_estimate ? `${t.share.labelVdot} ${Number(data.vdot_estimate).toFixed(1)}` : null,
    data.tss ? `${t.share.labelTss} ${Math.round(data.tss)}` : null,
  ].filter(Boolean).join('  ·  ');

  const dateStr = toggles.date && data.start_time
    ? new Date(data.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()
    : '';

  // Prediction enrichments — countdown badge + confidence band + method tag.
  const daysToRace = isPrediction ? daysUntilRace(data.race_date) : null;
  const confidenceMin = isPrediction ? confidenceToMinutes(data.confidence_interval_sec) : null;

  const mapH = Math.round(h * 0.28);

  return (
    <div style={{
      width: w, height: h,
      background: '#FAFAF9',
      display: 'flex', flexDirection: 'column',
      padding: format === '1:1' ? '20px 24px 20px' : '28px 28px 24px',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Wordmark — kept left-aligned (brand identity convention) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <ShareBrandMark size={16} variant="light" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1E1B4B', letterSpacing: -0.1 }}>
          {SHARE_BRAND_NAME}
        </span>
      </div>

      {/* Center — all content horizontally centered to give the card a rigid
          visual axis regardless of marathon name length. */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        gap: 4, textAlign: 'center',
      }}>
        {/* Top label + optional days-to-race chip on one line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#F97066', letterSpacing: '0.13em' }}>
            {isPrediction ? t.share.labelPrediction : t.share.labelLongRun}
          </span>
          {daysToRace !== null && (
            <span style={{
              padding: '2px 7px', borderRadius: 4,
              background: 'rgba(249,112,102,0.10)',
              color: '#B91C1C',
              fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
              fontSize: 9, fontWeight: 700, letterSpacing: 0.6,
            }}>
              {t.share.daysToRace(daysToRace)}
            </span>
          )}
        </div>
        {/* Hairline divider — watch-face / calendar-entry aesthetic. Almost
            invisible but gives the eye an anchor between label and hero number. */}
        <div style={{ width: 32, height: 1, background: '#E7E5E4', margin: '8px 0 4px' }} />
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'center',
          gap: 6, flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: format === '1:1' ? 68 : 88,
            fontWeight: 700,
            color: '#1E1B4B',
            letterSpacing: -3,
            lineHeight: 0.92,
          }}>
            {bigNumber}
          </span>
          {bigUnit && (
            <span style={{
              fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
              fontSize: 20,
              color: '#1E1B4B',
              fontWeight: 600,
              letterSpacing: 0.3,
            }}>
              {bigUnit}
            </span>
          )}
        </div>
        {dateLine && (
          <div style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 14,
            color: '#0F172A',
            marginTop: 4,
            letterSpacing: 0.1,
          }}>
            {dateLine}
          </div>
        )}
        {/* Confidence band — credibility signal: most predictors hide their
            uncertainty, showing ± positions the product as scientifically honest. */}
        {confidenceMin !== null && (
          <div style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 11, color: '#64748B', marginTop: 2, letterSpacing: 0.4,
          }}>
            {t.share.confidenceMin(confidenceMin)}
          </div>
        )}

        {/* Route silhouette */}
        {toggles.map && data.polyline && format !== '1:1' && (
          <div style={{ width: '100%', marginTop: 20 }}>
            <SharePreviewMap
              polyline={data.polyline}
              width={w - 56}
              height={mapH}
              glow={false}
              strokeColor="#4F46E5"
            />
          </div>
        )}
      </div>

      {/* Bottom */}
      <div>
        {statLine && (
          <div style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 11,
            color: '#0F172A',
            letterSpacing: 0.3,
            marginBottom: 12,
          }}>
            {statLine}
          </div>
        )}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: 12, borderTop: '1px solid #E7E5E4',
        }}>
          {/* Left slot: date for activities, methodology tag for predictions.
              Predictions don't have a meaningful start_time to show anyway. */}
          <span style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 9.5, color: '#64748B', letterSpacing: 0.4, fontWeight: isPrediction ? 600 : 400,
          }}>
            {isPrediction ? t.share.methodTag : dateStr}
          </span>
          {/* Watermark always rendered (no toggle) — see note in CinematicTemplate */}
          <span style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 9.5, color: '#94A3B8', letterSpacing: 0.4,
          }}>
            {SHARE_BRAND_DOMAIN}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MinimalistTemplate;
