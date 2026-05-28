import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import polylineDecode from '@mapbox/polyline';

/**
 * Tiny static-feeling Leaflet map for marathon catalog cards and the featured
 * hero. Renders actual map tiles under the route polyline but disables every
 * interaction so the card itself remains the click target (parent component
 * wraps this in a <Link>).
 *
 * Design choices:
 *  - CARTO Voyager basemap: neutral, doesn't fight with the indigo route.
 *  - No interactions at all (dragging/zoom/keyboard) — these maps are visual,
 *    not explorable. Users tap the card to open the full interactive view.
 *  - fitBounds with light padding so the route fills most of the frame.
 *  - Force-remount via `key={polyline}` to dodge Leaflet's "container already
 *    initialized" error under StrictMode + route changes (same trick as
 *    ActivityMap).
 */

/**
 * Re-fits bounds whenever the map's container size changes. Critical for two
 * scenarios that otherwise leave the route off-centre with dark empty space:
 *  1. Mobile CSS media-queries shrink the hero from 320→180px AFTER React's
 *     initial render — Leaflet computed bounds against the wrong size.
 *  2. Narrow horizontal cards on phones (100px wide) — the initial fit uses
 *     stale width, leaving the route as a tiny dot.
 * invalidateSize() forces Leaflet to re-read the DOM size, then we re-fit.
 */
function FitBoundsLayer({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const posRef = useRef(positions);
  posRef.current = positions;

  useEffect(() => {
    if (posRef.current.length < 2) return;

    const refit = () => {
      map.invalidateSize({ animate: false });
      map.fitBounds(posRef.current as L.LatLngBoundsExpression, {
        // Tight padding so the route actually fills the tiny card; was [10,10]
        // which on a 100px-wide card swallowed 20% of the canvas.
        padding: [4, 4],
        animate: false,
        maxZoom: 14,
      });
    };

    refit();

    // Watch the container for size changes (orientation flip, media-query
    // breakpoints, parent flex re-layout, etc.) and re-fit on each.
    const container = map.getContainer();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      // Defer to next frame so Leaflet sees the post-layout size.
      requestAnimationFrame(refit);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);

  return null;
}

// Small start/finish markers — same visual language as ActivityMap but ~30% smaller
const startIcon = L.divIcon({
  className: '',
  html: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="6" fill="#10B981" stroke="white" stroke-width="1.5"/>
  </svg>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
const finishIcon = L.divIcon({
  className: '',
  html: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="6" fill="#F97066" stroke="white" stroke-width="1.5"/>
  </svg>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

interface Props {
  encodedPolyline: string;
  /** Numeric → fixed pixel height. '100%' → fill parent (parent must size it).
   *  Use '100%' inside containers whose height varies via CSS media-queries
   *  (e.g. the hero where mobile shrinks from 320→180px); the map then matches
   *  whatever the parent renders. */
  height?: number | string;
  /** Tile theme. 'light' for catalog cards on white background, 'dark' for the
   *  featured hero on the dark gradient. */
  theme?: 'light' | 'dark';
  /** Slightly larger route weight for the hero. */
  weight?: number;
}

const MarathonMiniMap: React.FC<Props> = ({
  encodedPolyline,
  height = 132,
  theme = 'light',
  weight = 3,
}) => {
  const positions = useMemo(() => {
    if (!encodedPolyline) return [] as [number, number][];
    let decoded: [number, number][];
    try {
      decoded = polylineDecode.decode(encodedPolyline) as [number, number][];
    } catch {
      return [] as [number, number][];
    }
    // Decimate to ~targetPoints. NYC ships 5400 points; on a 132-300px wide
    // card you can't see more than ~100 of them. Sampling every Nth keeps the
    // shape visually identical and cuts Leaflet's per-segment work an order of
    // magnitude. Always keep first + last so start/finish markers stay aligned.
    const targetPoints = 150;
    if (decoded.length <= targetPoints) return decoded;
    const step = Math.ceil(decoded.length / targetPoints);
    const sampled: [number, number][] = [];
    for (let i = 0; i < decoded.length; i += step) sampled.push(decoded[i]);
    if (sampled[sampled.length - 1] !== decoded[decoded.length - 1]) {
      sampled.push(decoded[decoded.length - 1]);
    }
    return sampled;
  }, [encodedPolyline]);

  if (positions.length < 2) {
    return (
      <div style={{
        height: height as React.CSSProperties['height'], width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: theme === 'dark' ? '#1E1B4B' : '#FAFAF9',
        color: theme === 'dark' ? 'rgba(255,255,255,0.35)' : '#94A3B8',
        fontSize: 11,
      }}>
        No route data
      </div>
    );
  }

  const center: [number, number] = [
    positions.reduce((s, p) => s + p[0], 0) / positions.length,
    positions.reduce((s, p) => s + p[1], 0) / positions.length,
  ];

  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <MapContainer
      key={encodedPolyline.slice(0, 32)}
      center={center}
      zoom={11}
      style={{
        width: '100%', height: height as React.CSSProperties['height'],
        background: theme === 'dark' ? '#1E1B4B' : '#FAFAF9',
      }}
      // Kill every interaction — the card itself is the click target.
      dragging={false}
      zoomControl={false}
      scrollWheelZoom={false}
      touchZoom={false}
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
      attributionControl={false}
      // Tap is required false to avoid mobile interaction leaks
    >
      <TileLayer url={tileUrl} />
      {/* Subtle glow under the route — lighter than ActivityMap's 4 layers
          since the card is small and we don't want to dominate the tiles. */}
      <Polyline
        positions={positions}
        pathOptions={{ color: '#4F46E5', weight: weight + 6, opacity: 0.18 }}
      />
      <Polyline
        positions={positions}
        pathOptions={{ color: '#4F46E5', weight, opacity: 1 }}
      />
      <Marker position={positions[0]} icon={startIcon} />
      <Marker position={positions[positions.length - 1]} icon={finishIcon} />
      <FitBoundsLayer positions={positions} />
    </MapContainer>
  );
};

export default MarathonMiniMap;
