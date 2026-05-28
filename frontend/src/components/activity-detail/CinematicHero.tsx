import React from 'react';
import type { ActivityDetail } from '../../types/api';
import ActivityMap from './ActivityMap';
import { formatPace, formatTime, deriveKind } from './utils';
import { IconExternal } from '../icons';

function HeroNoGpsBg() {
  return (
    <svg
      viewBox="0 0 1280 560"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id="noGpsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E1B4B" />
          <stop offset="1" stopColor="#2A2566" />
        </linearGradient>
        <pattern id="dotgrid" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#fff" opacity="0.05" />
        </pattern>
      </defs>
      <rect width="1280" height="560" fill="url(#noGpsGrad)" />
      <rect width="1280" height="560" fill="url(#dotgrid)" />
    </svg>
  );
}

const KIND_LABEL: Record<string, string> = {
  Long: 'Long run',
  Workout: 'Workout',
  Easy: 'Easy run',
};

interface CinematicHeroProps {
  activity: ActivityDetail;
  onShare: () => void;
}

const CinematicHero: React.FC<CinematicHeroProps> = ({ activity, onShare }) => {
  const hasGps = !!activity.polyline;
  const distKm = Number(activity.distance_km);
  const paceSec = activity.avg_pace_sec_per_km != null ? Number(activity.avg_pace_sec_per_km) : null;
  const kind = deriveKind(distKm, paceSec);

  return (
    <div className="activity-hero-map" style={{
      position: 'relative',
      height: 560,
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid var(--primary)',
      background: '#1E1B4B',
      boxShadow: '0 24px 60px -20px rgba(30, 27, 75, 0.35)',
    }}>
      {hasGps ? (
        <ActivityMap encodedPolyline={activity.polyline} />
      ) : (
        <HeroNoGpsBg />
      )}

      {/* Overlay layer — above all Leaflet panes (Leaflet uses z-index up to 700).
          pointer-events: none so the map underneath stays scrollable/zoomable;
          interactive elements (the share button) re-enable pointer-events. */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 800, pointerEvents: 'none',
      }}>

      {/* Top-left wordmark */}
      <div className="hero-wordmark" style={{
        position: 'absolute', top: 24, left: 28,
        display: 'inline-flex', alignItems: 'center', gap: 9,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 18 C 7 6, 13 6, 17 14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="19.5" cy="16" r="2.2" fill="#F97066" />
        </svg>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', letterSpacing: -0.1 }}>EnduranceAI</span>
      </div>

      {/* Bottom-left emotional stack */}
      <div className="hero-stack" style={{
        position: 'absolute', left: 48, bottom: 56,
        display: 'flex', flexDirection: 'column',
      }}>
        <span className="hero-kind" style={{
          fontSize: 14, fontWeight: 700, color: '#F97066',
          letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16,
        }}>
          {KIND_LABEL[kind]}
        </span>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span className="mono hero-number" style={{
            fontSize: 140, fontWeight: 700, color: '#FFFFFF',
            letterSpacing: -5, lineHeight: 0.88,
            textShadow: '0 12px 48px rgba(0,0,0,0.45)',
          }}>
            {distKm.toFixed(1)}
          </span>
          <span className="mono hero-unit" style={{
            fontSize: 32, fontWeight: 500, color: '#A5B4FC', letterSpacing: 0.5,
          }}>KM</span>
        </div>

        <div className="mono hero-subtext" style={{
          fontSize: 12, color: '#A5B4FC', marginTop: 14, letterSpacing: 0.3, opacity: 0.85,
        }}>
          {formatTime(activity.duration_sec)}
          <span style={{ opacity: 0.55, margin: '0 10px' }}>·</span>
          {formatPace(paceSec)} /km
          <span style={{ opacity: 0.55, margin: '0 10px' }}>·</span>
          {activity.avg_hr ? `${activity.avg_hr} bpm` : '—'}
        </div>
      </div>

      {/* Bottom-right CTA — re-enable pointer events so it's clickable */}
      <div className="hero-share-cta" style={{ position: 'absolute', right: 28, bottom: 28, pointerEvents: 'auto' }}>
        {!hasGps ? (
          <button
            className="btn btn-ghost hero-share-btn"
            style={{
              height: 40, padding: '0 16px', fontSize: 13, fontWeight: 600,
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
              borderRadius: 10,
            }}
          >
            Add GPS later
          </button>
        ) : (
          <button
            className="hero-share-btn"
            onClick={onShare}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              height: 40, padding: '0 16px', borderRadius: 10,
              border: 'none', cursor: 'pointer',
              background: '#F97066', color: '#fff',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              boxShadow: '0 8px 24px -6px rgba(249,112,102,0.65), 0 1px 0 rgba(255,255,255,0.18) inset',
              transition: 'background 120ms ease, transform 120ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E0544A'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#F97066'; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <IconExternal size={16} />
            <span>Share to story</span>
          </button>
        )}
      </div>

      </div>{/* end overlay layer */}
    </div>
  );
};

export default CinematicHero;
