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

/**
 * Layout principles for Cinematic (rewritten):
 *  - Header row pinned to top: brand mark on the LEFT, domain watermark on the RIGHT.
 *    No collision between days-to-race chip and watermark anymore.
 *  - Days-to-race chip moved INTO the centered content block, above the label,
 *    where it draws focus without fighting the brand row.
 *  - All text content is horizontally CENTERED so the visual axis is rigid
 *    regardless of label length (e.g. "BOSTON MARATHON" vs "LONG RUN").
 *  - When a map polyline is present, content sits in the lower portion as before.
 *    When NO map (typical for prediction shares — Prediction doesn't carry the
 *    marathon route), the content centers vertically inside the canvas so the
 *    big number lives at the visual midpoint instead of pushed to the bottom edge.
 */
const CinematicTemplate: React.FC<Props> = ({ data, format, toggles }) => {
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

  const topLabel = isPrediction
    ? `${t.share.labelPrediction} · ${(data.marathon_name ?? 'CUSTOM').toUpperCase()}`
    : t.share.labelLongRun;

  const subTime = isPrediction ? '' : (data.duration_sec ? fmtDuration(data.duration_sec) : '');

  const statsRow: Array<[string, string, string]> = [];
  if (toggles.pace && data.avg_pace_sec_per_km) {
    statsRow.push([t.share.labelPace, fmtPace(data.avg_pace_sec_per_km), '/km']);
  }
  if (toggles.hr && data.avg_hr) {
    statsRow.push([t.share.labelHrAvg, String(data.avg_hr), 'bpm']);
  }
  if (data.elevation_gain_m) {
    statsRow.push([t.share.labelElev, `+${Math.round(data.elevation_gain_m)}`, 'm']);
  }

  const stripCols = statsRow.length || 1;

  const daysToRace = isPrediction ? daysUntilRace(data.race_date) : null;
  const confidenceMin = isPrediction ? confidenceToMinutes(data.confidence_interval_sec) : null;

  // Render route as full-canvas ambient art when polyline is available.
  // For predictions this now works because PredictionSerializer passes the
  // marathon's polyline through ShareData.polyline. Reduced opacity keeps
  // the hero text readable on top.
  const hasRoute = toggles.map && !!data.polyline;
  // Opacity tuned per format so the route is felt but doesn't compete with the
  // text. Stories (9:16) get more "air" to absorb the art; square gets less.
  const routeOpacity = format === '1:1' ? 0.35 : 0.50;

  const uid = 'cin';

  return (
    <div style={{
      width: w, height: h,
      background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* LAYER 1 — radial spotlight always present (sets dramatic mood) */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
          <radialGradient id={`spot-${uid}`} cx="50%" cy="45%" r="70%">
            <stop offset="0" stopColor="#4F46E5" stopOpacity="0.28" />
            <stop offset="1" stopColor="#4F46E5" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#spot-${uid})`} />
      </svg>

      {/* LAYER 2 — route as ambient art behind the text. Fills the entire
          canvas (not a band) so the bottom of the route bleeds into the
          stats strip area without a hard cut. Lower opacity than the
          previous "focused map" treatment because text now lives ON TOP. */}
      {hasRoute && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          opacity: routeOpacity,
        }}>
          <SharePreviewMap
            polyline={data.polyline!}
            width={w}
            height={h}
            glow={true}
            strokeColor="#A5B4FC"
            glowColor="#818CF8"
          />
        </div>
      )}

      {/* LAYER 3 — dot grid texture on top of route (visual grit) */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.6, pointerEvents: 'none' }}>
        <defs>
          <pattern id={`dot-${uid}`} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#fff" opacity="0.07" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dot-${uid})`} />
      </svg>

      {/* LAYER 4 — vertical vignette: darker top & bottom edges to lift text
          legibility regardless of where the route polyline happens to pass. */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(15,15,40,0.45) 0%, rgba(15,15,40,0) 22%, rgba(15,15,40,0) 65%, rgba(15,15,40,0.55) 100%)',
      }} />

      {/* Top row — brand (left) + domain watermark (right). Single flex row,
          space-between, so they never collide. */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '22px 22px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <ShareBrandMark size={16} variant="dark" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: -0.1 }}>{SHARE_BRAND_NAME}</span>
        </div>
        <span style={{
          fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
          fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.4,
        }}>
          {SHARE_BRAND_DOMAIN}
        </span>
      </div>

      {/* Content area — always vertically centered now. Route sits behind as
          ambient art (full-canvas), so we no longer need to push content to
          the bottom to make room for it. */}
      <div style={{
        position: 'relative', zIndex: 2,
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 22px',
        paddingBottom: statsRow.length > 0 ? 100 : 40,
        textAlign: 'center',
      }}>
        {/* Days-to-race chip — first focal point. Moved out of the top row
            (where it collided with the domain) into the centered hero block. */}
        {daysToRace !== null && (
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 11px', borderRadius: 4,
            background: 'rgba(249,112,102,0.18)',
            border: '1px solid rgba(249,112,102,0.45)',
            color: '#FCA5A0',
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 10, fontWeight: 700, letterSpacing: 0.7,
            marginBottom: 14,
          }}>
            {t.share.daysToRace(daysToRace)}
          </span>
        )}

        <span style={{
          fontSize: 10, fontWeight: 700, color: '#F97066', letterSpacing: '0.13em',
        }}>
          {topLabel}
        </span>

        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'center',
          gap: 7, marginTop: 8,
        }}>
          <span style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontVariantNumeric: 'tabular-nums',
            // Bigger than Minimalist/Splits — Cinematic is the "hero" template
            fontSize: format === '1:1' ? 68 : 96,
            fontWeight: 600, color: '#fff',
            letterSpacing: -4.5, lineHeight: 0.88,
            // Deeper shadow for dramatic lift off the dark background
            textShadow: '0 10px 40px rgba(0,0,0,0.55), 0 0 24px rgba(79,70,229,0.20)',
          }}>
            {bigNumber}
          </span>
          {bigUnit && (
            <span style={{
              fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
              fontSize: 22, color: '#fff', opacity: 0.85, fontWeight: 500, letterSpacing: 0.4,
            }}>
              {bigUnit}
            </span>
          )}
        </div>

        {subTime && (
          <span style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 16, color: '#fff', opacity: 0.85, marginTop: 8, letterSpacing: 0.25,
          }}>
            {subTime}
          </span>
        )}

        {confidenceMin !== null && (
          <span style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 13, color: 'rgba(255,255,255,0.70)', marginTop: 8, letterSpacing: 0.5,
            fontWeight: 500,
          }}>
            {t.share.confidenceMin(confidenceMin)}
          </span>
        )}

        {/* Methodology stamp under the confidence band — completes the
            "honest, scientific" message. Was a corner stamp before but the
            centred layout makes it work better as a final line of context. */}
        {isPrediction && (
          <span style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 9.5, color: 'rgba(255,255,255,0.50)', letterSpacing: 0.7,
            fontWeight: 600, marginTop: confidenceMin !== null ? 4 : 10,
          }}>
            {t.share.methodTag}
          </span>
        )}

        {toggles.date && data.start_time && (
          <span style={{
            fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
            fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 8, letterSpacing: 0.5,
          }}>
            {new Date(data.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </span>
        )}
      </div>

      {/* Stats strip — pinned to bottom. Was 'absolute bottom: 22' which is
          fine but converting to a flex sibling of the content block makes
          the layout collapse predictably when the strip is empty. */}
      {statsRow.length > 0 && (
        <div style={{
          position: 'absolute', left: 22, right: 22, bottom: 22,
          zIndex: 2,
          background: 'rgba(15, 23, 42, 0.45)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 13, padding: '11px 14px',
          display: 'grid',
          gridTemplateColumns: Array(stripCols).fill('1fr').join(' '),
          gap: 4,
        }}>
          {statsRow.map(([k, v, u], i) => (
            <div key={k} style={{
              display: 'flex', flexDirection: 'column', gap: 1,
              paddingLeft: i > 0 ? 12 : 0,
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none',
            }}>
              <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.60)', letterSpacing: '0.07em', fontWeight: 600 }}>{k}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{
                  fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
                  fontSize: 16, color: '#fff', fontWeight: 600,
                }}>{v}</span>
                {u && <span style={{
                  fontFamily: 'Geist Mono Variable, ui-monospace, monospace',
                  fontSize: 9.5, color: 'rgba(255,255,255,0.60)',
                }}>{u}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CinematicTemplate;
