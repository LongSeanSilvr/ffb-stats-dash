import React from 'react';

interface Props {
  position: string;
  className?: string;
}

export const DraftPositionBadge: React.FC<Props> = ({ position, className = '' }) => {
  const getBadgeStyle = (pos: string) => {
    switch (pos) {
      case 'QB':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'RB':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'WR':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'TE':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'K':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'DEF':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-black text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none font-mono ${getBadgeStyle(
        position
      )} ${className}`}
    >
      {position || '??'}
    </span>
  );
};
