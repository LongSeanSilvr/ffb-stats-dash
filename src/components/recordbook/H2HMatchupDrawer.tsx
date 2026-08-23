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
                  className="h2h-game-row"
                >
                  {/* Left Column on Desktop / Top Bar on Mobile: Date, Playoffs Badge, and Mobile Margin */}
                  <div className="flex items-center justify-between sm:justify-start gap-2 sm:w-44 shrink-0">
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

                    {/* Margin on Mobile Only */}
                    <div className="h2h-mobile-only text-xs font-mono text-purple-400 font-semibold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 shrink-0">
                      +{game.margin.toFixed(1)}
                    </div>
                  </div>

                  {/* Manager 1 (Desktop) / Team 1 Box (Mobile) */}
                  <div className={`flex items-center justify-between sm:justify-end gap-2.5 p-2 sm:p-0 rounded-lg sm:rounded-none border sm:border-none min-w-0 ${
                    m1Won 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-success-color sm:bg-transparent' 
                      : 'bg-white/[0.02] border-white/5 text-gray-400 sm:bg-transparent'
                  }`}>
                    <span className={`text-xs truncate font-medium ${m1Won ? 'text-white font-semibold' : 'text-muted'}`}>
                      {manager1.name}
                    </span>
                    <span className={`font-mono text-xs sm:text-base font-bold shrink-0 ${m1Won ? 'text-success-color' : 'text-gray-400'}`}>
                      {game.manager1Pts.toFixed(1)}
                    </span>
                  </div>

                  {/* VS Divider (Desktop Only) */}
                  <div className="h2h-desktop-only items-center justify-center text-[10px] font-bold text-muted uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/5 shrink-0">
                    vs
                  </div>

                  {/* Manager 2 (Desktop) / Team 2 Box (Mobile) */}
                  <div className={`flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-0 rounded-lg sm:rounded-none border sm:border-none min-w-0 ${
                    m2Won 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-success-color sm:bg-transparent' 
                      : 'bg-white/[0.02] border-white/5 text-gray-400 sm:bg-transparent'
                  }`}>
                    <span className={`text-xs truncate font-medium sm:order-2 ${m2Won ? 'text-white font-semibold' : 'text-muted'}`}>
                      {manager2.name}
                    </span>
                    <span className={`font-mono text-xs sm:text-base font-bold shrink-0 sm:order-1 ${m2Won ? 'text-success-color' : 'text-gray-400'}`}>
                      {game.manager2Pts.toFixed(1)}
                    </span>
                  </div>

                  {/* Right Column on Desktop: Margin Badge */}
                  <div className="h2h-desktop-only justify-end shrink-0">
                    <span className="inline-block text-xs font-mono text-purple-400 font-semibold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                      +{game.margin.toFixed(1)}
                    </span>
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
