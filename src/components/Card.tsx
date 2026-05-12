import React from 'react';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`glass-card ${className}`}>
      {title && <div className="text-xl mb-4 font-semibold">{title}</div>}
      {children}
    </div>
  );
};
