import React from 'react';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, style }) => {
  return (
    <div className={`glass-card ${className}`} style={style}>
      {title && <div className="text-xl mb-4 font-semibold">{title}</div>}
      {children}
    </div>
  );
};
