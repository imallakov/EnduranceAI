import React from 'react';
import type { WorkoutType } from '../../types/api';

const COLORS: Record<WorkoutType, string> = {
  rest:          '#94A3B8',
  easy:          '#10B981',
  long:          '#4F46E5',
  tempo:         '#F59E0B',
  interval:      '#DC2626',
  repetition:    '#F97066',
  marathon_pace: '#1E1B4B',
};

interface WorkoutIconProps {
  type: WorkoutType;
  size?: number;
  color?: string;
}

const WorkoutIcon: React.FC<WorkoutIconProps> = ({ type, size = 24, color }) => {
  const c = color ?? COLORS[type] ?? '#94A3B8';
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' } as const;

  if (type === 'rest') return (
    <svg {...props}>
      <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.4" strokeDasharray="2 3" opacity="0.7" />
    </svg>
  );
  if (type === 'easy') return (
    <svg {...props}>
      <path d="M3 16 Q 12 6, 21 16" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
  if (type === 'long') return (
    <svg {...props}>
      <path d="M3 17 Q 12 3, 21 17" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="3" cy="17" r="1.6" fill={c} />
      <circle cx="21" cy="17" r="1.6" fill={c} />
    </svg>
  );
  if (type === 'tempo') return (
    <svg {...props}>
      <rect x="3"    y="14" width="5" height="6" rx="1" fill={c} opacity="0.35" />
      <rect x="9.5"  y="6"  width="5" height="14" rx="1" fill={c} />
      <rect x="16"   y="14" width="5" height="6" rx="1" fill={c} opacity="0.35" />
    </svg>
  );
  if (type === 'interval') return (
    <svg {...props}>
      {[0,1,2,3,4,5].map(i => (
        <rect key={i} x={3 + i * 3.2} y={5} width="2" height="14" rx="0.8" fill={c} />
      ))}
    </svg>
  );
  if (type === 'repetition') return (
    <svg {...props}>
      <path d="M3 18 L 6 8 L 9 18 L 12 8 L 15 18 L 18 8 L 21 18"
            stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (type === 'marathon_pace') return (
    <svg {...props}>
      <path d="M3 18 Q 12 6, 21 18 L 21 19 L 3 19 Z" fill={c} opacity="0.9" />
    </svg>
  );
  return null;
};

export { COLORS as WORKOUT_COLORS };
export default WorkoutIcon;
