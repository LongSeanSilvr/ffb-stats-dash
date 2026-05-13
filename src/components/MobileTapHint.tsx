import React from 'react';
import { Hand } from 'lucide-react';

export const MobileTapHint = ({ text = "Tap data points for details", className = "md:hidden" }: { text?: string, className?: string }) => {
  return (
    <div className={`flex items-center justify-center gap-2 text-muted text-sm py-2 px-4 rounded-full bg-white/5 border border-white/10 w-fit mx-auto mb-4 animate-pulse ${className}`}>
      <Hand size={14} />
      <span>{text}</span>
    </div>
  );
};
