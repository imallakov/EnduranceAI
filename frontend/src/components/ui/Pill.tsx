import React from 'react';

type PillVariant = 'indigo' | 'soft-success' | 'soft-warn' | 'soft-muted' | 'soft-indigo';

interface PillProps {
  variant?: PillVariant;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const variantClass: Record<PillVariant, string> = {
  'indigo': 'pill pill-indigo',
  'soft-success': 'pill pill-soft-success',
  'soft-warn': 'pill pill-soft-warn',
  'soft-muted': 'pill pill-soft-muted',
  'soft-indigo': 'pill pill-soft-indigo',
};

const Pill: React.FC<PillProps> = ({ variant = 'indigo', children, className = '', style }) => (
  <span className={`${variantClass[variant]} ${className}`} style={style}>
    {children}
  </span>
);

export default Pill;
