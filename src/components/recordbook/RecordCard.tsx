import React from 'react';

interface RecordCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: React.FC<{ size: number; color?: string; className?: string }>;
  managerName?: string;
  avatar?: string | null;
  color?: string;
  isNegative?: boolean;
}

export const RecordCard: React.FC<RecordCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  managerName,
  avatar,
  color = 'var(--accent-color)',
  isNegative = false,
}) => {
  const avatarUrl = avatar ? `https://sleepercdn.com/avatars/thumbs/${avatar}` : null;

  return (
    <div
      className={`glass-card flex flex-col justify-between h-full relative overflow-hidden transition-all duration-300 ${
        isNegative ? 'hover:border-red-500/40' : 'hover:border-white/30'
      }`}
      style={{
        padding: '1.75rem',
        background: isNegative
          ? 'linear-gradient(145deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 17, 21, 0.9) 100%)'
          : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(15, 17, 21, 0.8) 100%)',
        borderColor: isNegative ? 'rgba(239, 68, 68, 0.25)' : 'var(--card-border)',
      }}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted truncate">
            {title}
          </span>
          <Icon size={20} color={color} className="shrink-0" />
        </div>

        {managerName && (
          <div className="flex items-center gap-3 mb-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={managerName}
                className="w-9 h-9 rounded-full object-cover shrink-0 border border-white/20 shadow-md"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-xs text-white/60">
                N/A
              </div>
            )}
            <span className="font-bold text-base sm:text-lg text-white truncate">
              {managerName}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2">
        <div
          className="text-2xl sm:text-3xl font-black tracking-tight"
          style={{ color }}
        >
          {value}
        </div>
        <div className="text-xs text-muted mt-1.5 truncate">{subtext}</div>
      </div>
    </div>
  );
};
