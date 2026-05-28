import React from 'react';

interface ComponentBarProps {
  label: string;
  score: number;
  color?: string;
}

const ComponentBar: React.FC<ComponentBarProps> = ({ label, score, color = '#4F46E5' }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '108px 1fr 28px', alignItems: 'center', columnGap: 12, padding: '5px 0' }}>
    <div style={{ fontSize: 12.5, color: '#475569', fontWeight: 500 }}>{label}</div>
    <div style={{ height: 6, background: '#F1EFEC', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
    <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', textAlign: 'right' }}>{score}</div>
  </div>
);

export default ComponentBar;
