import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Trophy, Swords } from 'lucide-react';
import type { MatchupGameLog } from '../../types/recordBook';

interface H2HMatchupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  manager1: { id: string; name: string; avatar: string | null };
  manager2: { id: string; name: string; avatar: string | null };
  gameLogs: MatchupGameLog[];
}

export const H2HMatchupDrawer: React.FC<H2HMatchupDrawerProps> = ({
  isOpen,
  onClose,
  manager1,
  manager2,
  gameLogs,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const m1Wins = gameLogs.filter(g => g.winnerId === manager1.id).length;
  const m2Wins = gameLogs.filter(g => g.winnerId === manager2.id).length;
  const ties = gameLogs.filter(g => g.winnerId === 'tie').length;

  const avatar1 = manager1.avatar ? `https://sleepercdn.com/avatars/thumbs/${manager1.avatar}` : null;
  const avatar2 = manager2.avatar ? `https://sleepercdn.com/avatars/thumbs/${manager2.avatar}` : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-card border border-white/10 rounded-2xl w-full max-w-3xl max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl my-auto"
        style={{ padding: 0, background: 'rgba(15, 17, 21, 0.95)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-black/50 border-b border-white/10 p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {avatar1 ? (
                <img
                  src={avatar1}
                  alt={manager1.name}
                  className="w-12 h-12 rounded-full border-2 border-[#0f1115] shadow-md object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-700 border-2 border-[#0f1115] flex items-center justify-center text-xs text-white/70">
                  {manager1.name.slice(0, 2)}
                </div>
              )}
              {avatar2 ? (
                <img
                  src={avatar2}
                  alt={manager2.name}
                  className="w-12 h-12 rounded-full border-2 border-[#0f1115] shadow-md object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-700 border-2 border-[#0f1115] flex items-center justify-center text-xs text-white/70">
                  {manager2.name.slice(0, 2)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Swords size={18} className="text-amber-400" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {manager1.name} vs {manager2.name}
                </h2>
              </div>
              <p className="text-muted text-xs sm:text-sm font-semibold mt-1">
                Lifetime Series: <span className="text-success-color font-black">{m1Wins}W</span> –{' '}
                <span className="text-danger-color font-black">{m2Wins}L</span>{' '}
                {ties > 0 && <span className="text-muted">({ties}T)</span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors text-muted hover:text-white cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content Box Scores */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {gameLogs.length === 0 ? (
            <div className="py-12 text-center text-muted text-sm">
              No historical head-to-head regular season or playoff games found.
            </div>
          ) : (
            gameLogs.map((game, i) => {
              const m1Won = game.winnerId === manager1.id;
              const m2Won = game.winnerId === manager2.id;

              return (
                <div
                  key={`${game.season}-${game.week}-${i}`}
                  className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 text-gray-300 border border-white/5 shrink-0">
                        <Calendar size={13} />
                        {game.season} Wk {game.week}
                      </span>
                      {game.isPlayoffs && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          <Trophy size={11} /> Playoffs
                        </span>
                      )}
                    </div>

                    <div className="sm:hidden text-xs font-mono text-purple-400 font-semibold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                      +{game.margin.toFixed(1)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 sm:border-t-0 sm:pt-0 sm:flex sm:items-center sm:justify-end sm:gap-5 flex-1 min-w-0">
                    <div className={`flex items-center justify-between sm:justify-start gap-2 p-2 sm:p-0 rounded-lg bg-white/[0.02] sm:bg-transparent min-w-0 ${m1Won ? 'font-bold text-success-color' : 'text-gray-300'}`}>
                      <span className="text-xs text-muted truncate">{manager1.name}:</span>
                      <span className="font-mono text-xs sm:text-sm font-bold shrink-0">{game.manager1Pts.toFixed(1)}</span>
                    </div>

                    <div className={`flex items-center justify-between sm:justify-start gap-2 p-2 sm:p-0 rounded-lg bg-white/[0.02] sm:bg-transparent min-w-0 ${m2Won ? 'font-bold text-success-color' : 'text-gray-300'}`}>
                      <span className="text-xs text-muted truncate">{manager2.name}:</span>
                      <span className="font-mono text-xs sm:text-sm font-bold shrink-0">{game.manager2Pts.toFixed(1)}</span>
                    </div>

                    <div className="hidden sm:block text-xs font-mono text-purple-400 pl-3 border-l border-white/10 shrink-0 font-semibold">
                      +{game.margin.toFixed(1)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
