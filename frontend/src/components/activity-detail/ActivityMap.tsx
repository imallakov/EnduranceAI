import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import polylineDecode from '@mapbox/polyline';

function FitBoundsLayer({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const posRef = useRef(positions);
  useEffect(() => {
    if (posRef.current.length > 1) {
      map.fitBounds(posRef.current as L.LatLngBoundsExpression, { padding: [50, 50] });
    }
  }, [map]);
  return null;
}

const startIcon = L.divIcon({
  className: '',
  html: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="10" fill="#1E1B4B" stroke="white" stroke-width="2"/>
    <text x="11" y="15.5" text-anchor="middle" font-size="9" fill="white" font-weight="700" font-family="Inter,sans-serif">S</text>
  </svg>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const finishIcon = L.divIcon({
  className: '',
  html: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="10" fill="#F97066" stroke="white" stroke-width="1.5"/>
    <text x="11" y="15.5" text-anchor="middle" font-size="9" fill="white" font-weight="700" font-family="Inter,sans-serif">F</text>
  </svg>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

interface ActivityMapProps {
  encodedPolyline: string;
}

const ActivityMap: React.FC<ActivityMapProps> = ({ encodedPolyline }) => {
  const decoded = polylineDecode.decode(encodedPolyline);
  const positions = decoded as [number, number][];

  if (positions.length < 2) return null;

  const center: [number, number] = [
    positions.reduce((s, p) => s + p[0], 0) / positions.length,
    positions.reduce((s, p) => s + p[1], 0) / positions.length,
  ];

  return (
    <MapContainer
      // Force remount on activity change to avoid Leaflet "Map container is
      // already initialized" errors under React StrictMode and route changes.
      key={encodedPolyline.slice(0, 32)}
      center={center}
      zoom={14}
      style={{ width: '100%', height: '100%', background: '#1E1B4B' }}
      zoomControl={false}
      scrollWheelZoom={true}
      // Attribution required by OSM + CARTO terms — styled subtly via CSS
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {/* 4-layer glow polyline */}
      <Polyline
        positions={positions}
        pathOptions={{ color: '#4F46E5', weight: 44, opacity: 0.40, className: 'route-glow-l1' }}
      />
      <Polyline
        positions={positions}
        pathOptions={{ color: '#818CF8', weight: 28, opacity: 0.50, className: 'route-glow-l2' }}
      />
      <Polyline
        positions={positions}
        pathOptions={{ color: '#A5B4FC', weight: 14, opacity: 0.65, className: 'route-glow-l3' }}
      />
      <Polyline
        positions={positions}
        pathOptions={{ color: '#FFFFFF', weight: 4, opacity: 1 }}
      />
      <Marker position={positions[0]} icon={startIcon} />
      <Marker position={positions[positions.length - 1]} icon={finishIcon} />
      <FitBoundsLayer positions={positions} />
    </MapContainer>
  );
};

export default ActivityMap;
