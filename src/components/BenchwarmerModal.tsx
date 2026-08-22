import React from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react';
import type { BenchwarmerBlue } from '../hooks/usePlayoffAnalytics';

interface Props {
  matchup: BenchwarmerBlue;
  onClose: () => void;
}

export const BenchwarmerModal: React.FC<Props> = ({ matchup, onClose }) => {
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const actualBench = matchup.actualBench || [];
  const optimalBench = matchup.optimalBench || [];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1115] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-black/50 border-b border-white/10 p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
              <TrendingDown size={20} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white leading-none mb-1">
                Benchwarmer Blues: Week {matchup.week}
              </h2>
              <p className="text-muted text-xs md:text-sm font-medium uppercase tracking-wider">
                Full Roster Lineup Alternate Reality Analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted hover:text-white cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-muted text-[11px] uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-danger-color" />
                <span>Actual Reality</span>
              </div>
              <div className="text-danger-color font-black text-2xl font-mono">
                {matchup.actualScore.toFixed(1)}
              </div>
              <div className="text-muted text-xs mt-1">
                Lost to {matchup.opponentName} ({matchup.opponentScore.toFixed(1)})
              </div>
            </div>

            <div className="flex items-center justify-center py-1 md:py-0">
              <ArrowRight size={24} className="text-white/20 rotate-90 md:rotate-0" />
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-muted text-[11px] uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-success-color" />
                <span>Optimal Lineup</span>
              </div>
              <div className="text-success-color font-black text-2xl font-mono">
                {matchup.optimalScore.toFixed(1)}
              </div>
              <div className="text-muted text-xs mt-1">
                Would have WON vs {matchup.opponentName}
              </div>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 md:p-6 text-center italic text-sm md:text-base text-white/90 leading-relaxed">
            "If <span className="text-white font-bold">{matchup.managerName}</span> had started their optimal lineup, they would have scored{' '}
            <span className="text-success-color font-bold font-mono">{matchup.optimalScore.toFixed(1)}</span> and defeated{' '}
            <span className="text-white font-bold">{matchup.opponentName}</span> by{' '}
            <span className="text-amber-400 font-bold font-mono">{(matchup.optimalScore - matchup.opponentScore).toFixed(1)} pts</span>."
          </div>

          {/* Side-by-Side Full Roster Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* 1. ACTUAL ROSTER */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-danger-color"></div>
                  <span>The Reality (Actual Roster)</span>
                </h3>
                <span className="text-danger-color font-mono font-bold text-sm">
                  {matchup.actualScore.toFixed(1)} pts
                </span>
              </div>

              {/* Actual Starters */}
              <div>
                <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">
                  Active Starters ({matchup.actualStarters.length})
                </div>
                <div className="space-y-1.5">
                  {matchup.actualStarters.map((s, idx) => {
                    const isBenchedInOptimal = !matchup.optimalStarters.some(os => os.id === s.id);
                    const displaySlot = (s.rosterSlot || '').replace('SUPER_FLEX', 'SFLX').replace('_FLEX', ' FLX');
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                          isBenchedInOptimal
                            ? 'bg-danger-color/10 border-danger-color/40'
                            : 'bg-white/[0.03] border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-bold text-white/40 uppercase w-7 text-center tracking-wider shrink-0">
                            {displaySlot}
                          </span>
                          <img
                            src={s.avatar}
                            alt=""
                            className="w-7 h-7 rounded-full bg-black/40 shrink-0 object-cover"
                            onError={e => {
                              (e.target as HTMLImageElement).src =
                                'https://sleepercdn.com/images/v2/icons/player_default.webp';
                            }}
                          />
                          <span
                            className={`text-xs font-medium truncate ${
                              isBenchedInOptimal ? 'text-danger-color font-bold' : 'text-white'
                            }`}
                          >
                            {s.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {isBenchedInOptimal && (
                            <span className="text-[9px] uppercase font-bold text-danger-color border border-danger-color/30 bg-danger-color/10 px-1.5 py-0.5 rounded">
                              Benched in Optimal
                            </span>
                          )}
                          <span
                            className={`font-mono text-xs font-bold ${
                              isBenchedInOptimal ? 'text-danger-color' : 'text-muted'
                            }`}
                          >
                            {s.pts.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actual Bench */}
              {actualBench.length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">
                    Bench Players ({actualBench.length})
                  </div>
                  <div className="space-y-1.5 opacity-90">
                    {actualBench.map((b, idx) => {
                      const wouldHaveStarted = matchup.optimalStarters.some(os => os.id === b.id);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                            wouldHaveStarted
                              ? 'bg-amber-500/10 border-amber-500/40'
                              : 'bg-white/[0.02] border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[9px] font-bold text-white/30 uppercase w-7 text-center shrink-0">
                              BN
                            </span>
                            <img
                              src={b.avatar}
                              alt=""
                              className="w-6 h-6 rounded-full bg-black/40 shrink-0 object-cover"
                              onError={e => {
                                (e.target as HTMLImageElement).src =
                                  'https://sleepercdn.com/images/v2/icons/player_default.webp';
                              }}
                            />
                            <span
                              className={`text-xs truncate ${
                                wouldHaveStarted ? 'text-amber-400 font-bold' : 'text-muted'
                              }`}
                            >
                              {b.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {wouldHaveStarted && (
                              <span className="text-[9px] uppercase font-bold text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                Should Have Started
                              </span>
                            )}
                            <span
                              className={`font-mono text-xs ${
                                wouldHaveStarted ? 'text-amber-400 font-bold' : 'text-muted/70'
                              }`}
                            >
                              {b.pts.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. OPTIMAL ROSTER */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-success-color"></div>
                  <span>Optimal Lineup (Winning Alternate Reality)</span>
                </h3>
                <span className="text-success-color font-mono font-bold text-sm">
                  {matchup.optimalScore.toFixed(1)} pts
                </span>
              </div>

              {/* Optimal Starters */}
              <div>
                <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">
                  Optimal Starters ({matchup.optimalStarters.length})
                </div>
                <div className="space-y-1.5">
                  {matchup.optimalStarters.map((s, idx) => {
                    const wasBenchSub = !matchup.actualStarters.some(as => as.id === s.id);
                    const displaySlot = (s.rosterSlot || '').replace('SUPER_FLEX', 'SFLX').replace('_FLEX', ' FLX');
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                          wasBenchSub
                            ? 'bg-success-color/10 border-success-color/40 shadow-inner shadow-success-color/5'
                            : 'bg-white/[0.03] border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-bold text-white/40 uppercase w-7 text-center tracking-wider shrink-0">
                            {displaySlot}
                          </span>
                          <img
                            src={s.avatar}
                            alt=""
                            className="w-7 h-7 rounded-full bg-black/40 shrink-0 object-cover"
                            onError={e => {
                              (e.target as HTMLImageElement).src =
                                'https://sleepercdn.com/images/v2/icons/player_default.webp';
                            }}
                          />
                          <span
                            className={`text-xs font-medium truncate ${
                              wasBenchSub ? 'text-success-color font-bold' : 'text-white'
                            }`}
                          >
                            {s.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {wasBenchSub && (
                            <span className="text-[9px] uppercase font-bold text-success-color border border-success-color/30 bg-success-color/10 px-1.5 py-0.5 rounded">
                              Promoted from Bench
                            </span>
                          )}
                          <span
                            className={`font-mono text-xs font-bold ${
                              wasBenchSub ? 'text-success-color' : 'text-muted'
                            }`}
                          >
                            {s.pts.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optimal Bench */}
              {optimalBench.length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">
                    Optimal Bench ({optimalBench.length})
                  </div>
                  <div className="space-y-1.5 opacity-90">
                    {optimalBench.map((b, idx) => {
                      const wasActualStarter = matchup.actualStarters.some(as => as.id === b.id);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                            wasActualStarter
                              ? 'bg-danger-color/10 border-danger-color/30'
                              : 'bg-white/[0.02] border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[9px] font-bold text-white/30 uppercase w-7 text-center shrink-0">
                              BN
                            </span>
                            <img
                              src={b.avatar}
                              alt=""
                              className="w-6 h-6 rounded-full bg-black/40 shrink-0 object-cover"
                              onError={e => {
                                (e.target as HTMLImageElement).src =
                                  'https://sleepercdn.com/images/v2/icons/player_default.webp';
                              }}
                            />
                            <span
                              className={`text-xs truncate ${
                                wasActualStarter ? 'text-danger-color font-medium' : 'text-muted'
                              }`}
                            >
                              {b.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {wasActualStarter && (
                              <span className="text-[9px] uppercase font-bold text-danger-color border border-danger-color/30 bg-danger-color/10 px-1.5 py-0.5 rounded">
                                Demoted to Bench
                              </span>
                            )}
                            <span className="font-mono text-xs text-muted/70">
                              {b.pts.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
