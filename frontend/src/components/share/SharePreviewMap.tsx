import React, { useMemo, useId } from 'react';
import polylineLib from '@mapbox/polyline';

interface Props {
  polyline: string;
  width: number;
  height: number;
  glow?: boolean;   // cinematic glow layers vs flat stroke
  strokeColor?: string;
  glowColor?: string;
}

function projectPoints(
  coords: [number, number][],
  width: number,
  height: number,
  padding: number,
): string {
  if (coords.length < 2) return '';

  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  for (const [lat, lon] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  const latRange = maxLat - minLat || 1e-6;
  const lonRange = maxLon - minLon || 1e-6;
  const w = width - padding * 2;
  const h = height - padding * 2;

  // maintain aspect ratio
  const scale = Math.min(w / lonRange, h / latRange);
  const offX = padding + (w - lonRange * scale) / 2;
  const offY = padding + (h - latRange * scale) / 2;

  return coords
    .map(([lat, lon]) => {
      const x = offX + (lon - minLon) * scale;
      const y = offY + (maxLat - lat) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

const SharePreviewMap: React.FC<Props> = ({
  polyline,
  width,
  height,
  glow = false,
  strokeColor = '#4F46E5',
  glowColor = '#818CF8',
}) => {
  const points = useMemo(() => {
    if (!polyline) return '';
    try {
      const coords = polylineLib.decode(polyline) as [number, number][];
      return projectPoints(coords, width, height, 16);
    } catch {
      return '';
    }
  }, [polyline, width, height]);

  const startFinish = useMemo(() => {
    if (!polyline) return null;
    try {
      const coords = polylineLib.decode(polyline) as [number, number][];
      if (coords.length < 2) return null;
      const first = coords[0];
      const last = coords[coords.length - 1];
      const pts = projectPoints(coords, width, height, 16).split(' ');
      const startPt = pts[0].split(',');
      const endPt = pts[pts.length - 1].split(',');
      return {
        startX: parseFloat(startPt[0]),
        startY: parseFloat(startPt[1]),
        endX: parseFloat(endPt[0]),
        endY: parseFloat(endPt[1]),
        samePoint: Math.abs(first[0] - last[0]) < 0.001 && Math.abs(first[1] - last[1]) < 0.001,
      };
    } catch {
      return null;
    }
  }, [polyline, width, height]);

  if (!points) return null;

  // Stable per-instance SVG <defs> id. Math.random() here caused a fresh id
  // every render, breaking url(#filter-<uid>) refs for a frame when format
  // changed (16:9 ↔ 9:16 ↔ 1:1). useId is React 18's purpose-built solution.
  // Strip colons that React adds — they're invalid in SVG/CSS id selectors.
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      {glow && (
        <defs>
          <filter id={`gBig-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id={`gMid-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <filter id={`gTight-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
      )}

      {glow ? (
        <>
          <polyline points={points} stroke={strokeColor} strokeWidth="36" fill="none"
            opacity="0.35" filter={`url(#gBig-${uid})`} strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={points} stroke={glowColor} strokeWidth="22" fill="none"
            opacity="0.50" filter={`url(#gMid-${uid})`} strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={points} stroke="#C7D2FE" strokeWidth="10" fill="none"
            opacity="0.65" filter={`url(#gTight-${uid})`} strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={points} stroke="#fff" strokeWidth="2.5" fill="none"
            strokeLinejoin="round" strokeLinecap="round" />
        </>
      ) : (
        <polyline points={points} stroke={strokeColor} strokeWidth="3" fill="none"
          strokeLinejoin="round" strokeLinecap="round" />
      )}

      {startFinish && (
        <>
          <circle cx={startFinish.startX} cy={startFinish.startY} r={glow ? 7 : 5}
            fill={glow ? '#fff' : '#fff'} stroke={strokeColor} strokeWidth={glow ? 0 : 2} />
          {!startFinish.samePoint && (
            <circle cx={startFinish.endX} cy={startFinish.endY} r={glow ? 7 : 5}
              fill="#F97066" stroke="none" />
          )}
        </>
      )}
    </svg>
  );
};

export default SharePreviewMap;
