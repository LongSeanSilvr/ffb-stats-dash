import React from 'react';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`glass-card ${className}`}>
      {title && <h3 className="text-xl mb-4">{title}</h3>}
      {children}
    </div>
  );
};
