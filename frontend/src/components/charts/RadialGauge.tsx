import React from 'react';

interface RadialGaugeProps {
  value?: number;
  size?: number;
  stroke?: number;
  label?: string;
}

const RadialGauge: React.FC<RadialGaugeProps> = ({ value = 72, size = 220, stroke = 16 }) => {
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const dash = circ * pct;
  const gap = circ - dash;

  return (
    <svg
      width={size}
      height={size * 0.62}
      viewBox={`0 0 ${size} ${size * 0.62}`}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {/* Track */}
      <path
        d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
        fill="none" stroke="#F1EFEC" strokeWidth={stroke} strokeLinecap="round"
      />
      <defs>
        <linearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#1E1B4B" />
        </linearGradient>
      </defs>
      {/* Fill */}
      <path
        d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
        fill="none"
        stroke="url(#gaugeFill)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
      />
      {/* Tick marks every 10 */}
      {Array.from({ length: 11 }).map((_, i) => {
        const a = Math.PI + (i / 10) * Math.PI;
        const r1 = r - stroke / 2 - 4;
        const r2 = r1 - 5;
        const x1 = cx + r1 * Math.cos(a), y1 = cy + r1 * Math.sin(a);
        const x2 = cx + r2 * Math.cos(a), y2 = cy + r2 * Math.sin(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D6D3D1" strokeWidth="1" />;
      })}
    </svg>
  );
};

export default RadialGauge;
