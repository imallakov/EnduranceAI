import React from 'react';

interface DifficultyBarProps {
  coeff: number;
}

const DifficultyBar: React.FC<DifficultyBarProps> = ({ coeff }) => {
  const p = Math.max(0, Math.min(1, (coeff - 1.000) / 0.055));
  return (
    <div style={{
      position: 'relative', height: 8, borderRadius: 4, overflow: 'visible',
      background: 'linear-gradient(90deg, #10B981 0%, #34D399 25%, #F59E0B 55%, #DC2626 95%)',
    }}>
      <div style={{
        position: 'absolute', top: -2, left: `calc(${(p * 100).toFixed(1)}% - 6px)`,
        width: 12, height: 12, borderRadius: 6, background: '#fff',
        border: '1.5px solid rgba(15,23,42,0.55)',
        boxShadow: '0 1px 3px rgba(15,23,42,0.25)',
      }} />
    </div>
  );
};

export default DifficultyBar;
