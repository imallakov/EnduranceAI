import React from 'react';

interface ElevationProfileProps {
  width?: number;
  height?: number;
}

const ElevationProfile: React.FC<ElevationProfileProps> = ({ width = 480, height = 70 }) => {
  const pts: { x: number; y: number }[] = [];
  let h = 35;
  for (let i = 0; i <= 60; i++) {
    h += (Math.sin(i * 0.4) + Math.cos(i * 0.27)) * 1.2;
    pts.push({ x: (i / 60) * width, y: 50 - (h - 30) * 0.6 });
  }
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={`${d} L ${width},${height} L 0,${height} Z`} fill="#4F46E5" opacity="0.08" />
      <path d={d} fill="none" stroke="#4F46E5" strokeWidth="1.5" />
    </svg>
  );
};

export default ElevationProfile;
