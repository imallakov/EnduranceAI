import React from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

const Sparkline: React.FC<SparklineProps> = ({
  values,
  width = 100,
  height = 28,
  color = '#4F46E5',
  fill = false,
}) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const n = values.length;
  const xAt = (i: number) => (i / (n - 1)) * width;
  const yAt = (v: number) => height - 2 - ((v - min) / range) * (height - 4);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`).join(' ');
  const fillD = `${d} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fill && <path d={fillD} fill={color} opacity="0.08" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xAt(n - 1)} cy={yAt(values[n - 1])} r="2" fill={color} />
    </svg>
  );
};

export default Sparkline;
