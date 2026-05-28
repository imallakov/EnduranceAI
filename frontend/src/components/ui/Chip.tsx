import React from 'react';

interface ChipProps {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const Chip: React.FC<ChipProps> = ({ active = false, children, onClick, className = '' }) => (
  <span className={`chip ${active ? 'active' : ''} ${className}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
    {children}
  </span>
);

export default Chip;
