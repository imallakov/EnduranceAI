import React, { useRef, useState, useCallback } from 'react';

interface MiniElevationProps {
  // Real per-km profile: [{km, elevation_m}, ...]. Preferred input.
  profile?: Array<{ km: number; elevation_m: number }>;
  // Legacy synthetic numeric series — used as fallback when no real profile.
  data?: number[];
  maxLabel?: string;
  // Tall variant (detail page) vs compact (catalog cards). Detailed enables
  // mouse/touch scrubbing automatically.
  variant?: 'compact' | 'detailed';
}

/**
 * Elevation profile renderer.
 *
 * Why labels live in HTML (not SVG <text>): we use preserveAspectRatio="none"
 * to stretch the path across any container width, but that stretches text too,
 * making "0 / 21 / 42" look distorted on wide cards. Putting axis labels in
 * absolutely-positioned divs keeps them crisp regardless of container width.
 *
 * Hover/touch on the detailed variant: tracks pointer position, finds the
 * nearest km in the series, draws a vertical guideline + dot + tooltip.
 * On touch devices the same handler runs via Pointer Events (one unified API).
 */
const MiniElevation: React.FC<MiniElevationProps> = ({ profile, data, maxLabel, variant = 'compact' }) => {
  // Pick the series: prefer real elevation_m values, fall back to legacy synthetic.
  const realProfile = profile && profile.length > 1;
  const series: number[] = realProfile
    ? profile!.map(p => p.elevation_m)
    : (data ?? []);

  const interactive = variant === 'detailed';
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Resolve pointer X (relative to container) → series index.
  const updateHover = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el || series.length < 2) return;
    const rect = el.getBoundingClientRect();
    const rel = (clientX - rect.left) / Math.max(rect.width, 1);
    const clamped = Math.max(0, Math.min(1, rel));
    const idx = Math.round(clamped * (series.length - 1));
    setHoverIdx(idx);
  }, [series.length]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    updateHover(e.clientX);
  }, [updateHover]);

  const handlePointerLeave = useCallback(() => {
    setHoverIdx(null);
  }, []);

  if (series.length < 2) {
    return (
      <div style={{
        height: variant === 'detailed' ? 110 : 42,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#FAFAF9', borderRadius: 6,
        fontSize: 11, color: '#94A3B8',
      }}>
        No elevation data
      </div>
    );
  }

  const w = 320;
  const h = variant === 'detailed' ? 110 : 42;
  const min = Math.min(...series), max = Math.max(...series);
  const range = max - min || 1;
  const padY = variant === 'detailed' ? 12 : 6;
  const padX = 0;

  // Compute SVG-space coordinates for every point (used by both path + hover).
  const pts = series.map((v, i) => {
    const x = padX + (i / (series.length - 1)) * (w - 2 * padX);
    const y = padY + (1 - (v - min) / range) * (h - padY - 4);
    return [x, y] as [number, number];
  });

  const pathLine = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const pathArea = `${pathLine} L ${w - padX} ${h} L ${padX} ${h} Z`;

  // Last km marker used for X-axis label (handles distance != 42)
  const lastKm = realProfile ? profile![profile!.length - 1].km : (series.length - 1);
  const midKm = Math.round(lastKm / 2);

  // Hover-derived values
  const hoverPt = hoverIdx !== null ? pts[hoverIdx] : null;
  const hoverKm = hoverIdx !== null
    ? (realProfile ? profile![hoverIdx].km : hoverIdx)
    : null;
  const hoverElev = hoverIdx !== null ? Math.round(series[hoverIdx]) : null;
  // Position tooltip in CSS-space (percentage of container width)
  const hoverPctX = hoverIdx !== null
    ? (hoverIdx / (series.length - 1)) * 100
    : 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative', width: '100%',
        cursor: interactive ? 'crosshair' : 'default',
        // Prevent the page from scrolling while the user drags a finger over
        // the chart on mobile.
        touchAction: interactive ? 'none' : 'auto',
        userSelect: 'none',
      }}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerDown={interactive ? handlePointerMove : undefined}
      onPointerLeave={interactive ? handlePointerLeave : undefined}
      onPointerCancel={interactive ? handlePointerLeave : undefined}
    >
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
           style={{ width: '100%', height: h, display: 'block' }}>
        <defs>
          <linearGradient id={`elev-fill-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(79,70,229,0.22)" />
            <stop offset="100%" stopColor="rgba(79,70,229,0.02)" />
          </linearGradient>
        </defs>
        <path d={pathArea} fill={`url(#elev-fill-${variant})`} />
        <path d={pathLine} stroke="#4F46E5" strokeWidth={variant === 'detailed' ? 1.6 : 1.4}
              fill="none" strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke" />
        {/* Hover guideline + dot (SVG-space; line non-scales for crisp 1px) */}
        {interactive && hoverPt && (
          <>
            <line
              x1={hoverPt[0]} x2={hoverPt[0]}
              y1={0} y2={h}
              stroke="#0F172A" strokeOpacity="0.32" strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              strokeDasharray="3 3"
            />
            {/* Dot at the elevation point — drawn larger and scales with viewBox */}
            <circle
              cx={hoverPt[0]} cy={hoverPt[1]} r="3"
              fill="#fff" stroke="#4F46E5" strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      {/* Static axis labels — rendered as DOM so they don't stretch */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        fontFamily: 'ui-monospace, monospace', fontSize: variant === 'detailed' ? 10 : 9,
        color: '#94A3B8',
      }}>
        {/* X-axis: 0 / mid / end km — hidden when hover is active to avoid overlap */}
        {hoverIdx === null && (
          <>
            <span style={{ position: 'absolute', left: 2, bottom: 1 }}>0</span>
            <span style={{ position: 'absolute', left: '50%', bottom: 1, transform: 'translateX(-50%)' }}>{midKm}</span>
            <span style={{ position: 'absolute', right: 2, bottom: 1 }}>{lastKm}</span>
          </>
        )}
        {/* Y-axis labels — both show ALTITUDE above sea level so the axis is
            self-consistent. Detailed variant: min..max altitude on each side.
            Compact variant: keep maxLabel (typically cumulative gain) since
            small cards have only one slot and gain is the more useful number. */}
        {variant === 'detailed' ? (
          <>
            <span style={{ position: 'absolute', left: 4, top: 2, color: '#94A3B8' }}>
              {Math.round(min)}m
            </span>
            <span style={{ position: 'absolute', right: 4, top: 2, color: '#475569', fontWeight: 600 }}>
              {Math.round(max)}m
            </span>
          </>
        ) : (
          maxLabel && (
            <span style={{ position: 'absolute', right: 4, top: 2, color: '#475569', fontWeight: 600 }}>
              {maxLabel}
            </span>
          )
        )}
      </div>

      {/* Hover tooltip — only on detailed variant */}
      {interactive && hoverIdx !== null && hoverKm !== null && hoverElev !== null && (
        <div
          style={{
            position: 'absolute', top: -2, transform: 'translateX(-50%)',
            left: `${hoverPctX}%`, pointerEvents: 'none',
            // Pull tooltip towards the centre when hovering near edges so it
            // doesn't get clipped by the card border.
            ...(hoverPctX < 8 ? { transform: 'translateX(0%)', left: '4px' } : {}),
            ...(hoverPctX > 92 ? { transform: 'translateX(-100%)', left: 'calc(100% - 4px)' } : {}),
          }}
        >
          <div style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            padding: '5px 9px', borderRadius: 6,
            background: '#0F172A', color: '#fff',
            fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px -2px rgba(15,23,42,0.35)',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9.5, fontWeight: 500, letterSpacing: 0.4 }}>
              KM {hoverKm}
            </span>
            <span style={{ marginTop: 1 }}>{hoverElev} m alt</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniElevation;
