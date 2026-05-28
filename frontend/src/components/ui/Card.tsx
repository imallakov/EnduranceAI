import React from 'react';

interface CardProps {
  children: React.ReactNode;
  hoverable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ children, hoverable = false, className = '', style }) => (
  <div className={`card ${hoverable ? 'hoverable' : ''} ${className}`} style={style}>
    {children}
  </div>
);

export default Card;
