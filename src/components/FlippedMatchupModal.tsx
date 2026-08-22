import React from 'react';
import { createPortal } from 'react-dom';
import { X, User, Shield, ArrowRightLeft, UserPlus, Info, TrendingDown, Sparkles } from 'lucide-react';
import type { MatchupFlipped } from '../types/playoffs';

interface Props {
  matchup: MatchupFlipped;
  onClose: () => void;
}

export const FlippedMatchupModal: React.FC<Props> = ({ matchup, onClose }) => {
  const getAcqIcon = (type: string) => {
    switch (type) {
      case 'Trade':
        return <ArrowRightLeft size={16} className="text-accent-color" />;
      case 'Free Agency':
      case 'Waiver':
        return <UserPlus size={16} className="text-amber-400" />;
      default:
        return <Shield size={16} className="text-success-color" />;
    }
  };

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const details = matchup.transactionDetails;

  // Calculate the swing: acquired player score vs their direct replacement
  const replacementStarters = matchup.hypotheticalStarters.filter(
    hs => !matchup.actualStarters.some(as => as.id === hs.id)
  );

  const replacementPlayer = replacementStarters[0] || { name: 'Expected Replacement', pts: 0 };
  const pointSwing = matchup.pointsScored - replacementPlayer.pts;

  const actualBench = matchup.actualBench || [];
  const hypotheticalBench = matchup.hypotheticalBench || [];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f1115] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-accent-color/10 to-transparent">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-3 rounded-xl bg-accent-color/20 border border-accent-color/30">
              {getAcqIcon(matchup.acquisitionType)}
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white leading-none mb-1">
                Matchup Flipped: Week {matchup.week}
              </h2>
              <p className="text-muted text-xs md:text-sm font-medium uppercase tracking-wider">
                Impact of In-Season Acquisition on Playoff Outcome
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted hover:text-white cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* 1. TRANSACTION CARD */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
            <div className="bg-white/[0.04] px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest font-black text-white flex items-center gap-2">
                <Sparkles size={12} className="text-accent-color" />
                Acquisition Summary
              </span>
              <span className="text-[10px] bg-accent-color/10 border border-accent-color/20 text-accent-color font-bold px-2 py-0.5 rounded-full">
                Week {details?.week || matchup.week} Acquisition
              </span>
            </div>
            <div className="p-4 md:p-6">
              {details && details.type === 'Trade' ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-5 flex flex-col justify-center bg-black/30 p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-muted mb-2 tracking-wider">
                      Assets Traded Away
                    </span>
                    {details.gaveUp && details.gaveUp.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {details.gaveUp.map((asset, i) => (
                          <span
                            key={i}
                            className="text-xs font-semibold bg-danger-color/10 border border-danger-color/20 text-danger-color px-2.5 py-1 rounded-lg"
                          >
                            {asset}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted italic">None (Roster spot trade)</span>
                    )}
                  </div>

                  <div className="md:col-span-2 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-accent-color/10 border border-accent-color/30 flex items-center justify-center shadow-lg">
                      <ArrowRightLeft size={16} className="text-accent-color" />
                    </div>
                    <span className="text-[10px] text-muted font-bold mt-2 uppercase text-center leading-tight">
                      Traded with
                      <br />
                      <span className="text-white">{details.tradedBy}</span>
                    </span>
                  </div>

                  <div className="md:col-span-5 flex flex-col justify-center bg-accent-color/5 p-4 rounded-xl border border-accent-color/10">
                    <span className="text-[10px] uppercase font-bold text-accent-color mb-2 tracking-wider">
                      Assets Acquired
                    </span>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={matchup.playerAvatar}
                          className="w-9 h-9 rounded-full object-cover border border-accent-color/30 bg-black/40"
                          alt=""
                          onError={e => {
                            (e.target as HTMLImageElement).src =
                              'https://sleepercdn.com/images/v2/icons/player_default.webp';
                          }}
                        />
                        <div>
                          <div className="text-sm font-black text-white">{matchup.playerName}</div>
                          <div className="text-[10px] text-muted uppercase font-semibold">
                            Acquired Starter
                          </div>
                        </div>
                      </div>
                      {details.received && details.received.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1 border-t border-white/5 pt-2">
                          {details.received.map((asset, i) => (
                            <span
                              key={i}
                              className="text-xs font-semibold bg-accent-color/10 border border-accent-color/20 text-accent-color px-2.5 py-1 rounded-lg"
                            >
                              {asset}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={matchup.playerAvatar}
                      className="w-12 h-12 rounded-full object-cover border border-amber-500/30 bg-black/40"
                      alt=""
                      onError={e => {
                        (e.target as HTMLImageElement).src =
                          'https://sleepercdn.com/images/v2/icons/player_default.webp';
                      }}
                    />
                    <div>
                      <div className="text-base font-black text-white">{matchup.playerName}</div>
                      <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                        <UserPlus size={12} className="text-amber-400" />
                        Acquired off waivers in Week {details?.week || matchup.week}
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 py-2 px-4 rounded-xl text-center shrink-0">
                    <div className="text-[10px] text-muted uppercase tracking-widest font-black">
                      FAAB Bid
                    </div>
                    <div className="text-lg font-black text-amber-400">${details?.bid || 0}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. THE SCORECARD SWING */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 items-center">
            {/* Column 1: Reality */}
            <div className="text-center md:border-r md:border-white/10">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-success-color bg-success-color/10 border border-success-color/20 px-2 py-0.5 rounded-full mb-2">
                <Shield size={10} /> Actual Result (Win)
              </span>
              <div className="text-3xl font-black text-white font-mono leading-none mb-1">
                {matchup.actualPoints.toFixed(1)}
              </div>
              <div className="text-xs text-muted font-medium mt-1">
                Defeated <span className="text-white font-semibold">{matchup.opponentName}</span> (
                {matchup.opponentPoints.toFixed(1)})
              </div>
            </div>

            {/* Column 2: The Point Swing */}
            <div className="text-center md:border-r md:border-white/10 px-2">
              <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-accent-color bg-accent-color/10 border border-accent-color/20 px-2 py-0.5 rounded-full mb-2">
                <Sparkles size={10} /> Acquisition Swing
              </div>
              <div className="text-2xl font-black text-accent-color font-mono leading-none mb-1">
                +{pointSwing.toFixed(1)}{' '}
                <span className="text-xs uppercase font-bold tracking-normal opacity-70">pts</span>
              </div>
              <div className="text-xs text-muted leading-relaxed mt-1.5 px-2">
                <strong className="text-white font-semibold">
                  {matchup.playerName.split(' ').pop()}
                </strong>{' '}
                scored <strong className="text-accent-color">{matchup.pointsScored.toFixed(1)}</strong> vs{' '}
                <strong className="text-danger-color">{replacementPlayer.pts.toFixed(1)}</strong> from replacement (<strong className="text-white">{replacementPlayer.name}</strong>).
              </div>
            </div>

            {/* Column 3: Alternate Reality */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-danger-color bg-danger-color/10 border border-danger-color/20 px-2 py-0.5 rounded-full mb-2">
                <TrendingDown size={10} /> Without Acquisition (Loss)
              </span>
              <div className="text-3xl font-black text-white/50 font-mono leading-none mb-1">
                {matchup.hypotheticalPoints.toFixed(1)}
              </div>
              <div className="text-xs text-muted font-medium mt-1">
                Would have lost to {matchup.opponentName} by{' '}
                <strong className="text-white">
                  {(matchup.opponentPoints - matchup.hypotheticalPoints).toFixed(1)} pts
                </strong>
              </div>
            </div>
          </div>

          {/* 3. LINEUP & BENCH COMPARISON */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Info size={14} className="text-accent-color" />
                Full Roster Comparison
              </h3>
              <span className="hidden md:inline-flex items-center gap-2 text-xs text-muted bg-white/5 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded bg-accent-color"></span> Acquired Starter
                <span className="w-2 h-2 rounded bg-danger-color ml-2"></span> Replacement Player
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Actual Reality */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-bold text-success-color uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success-color"></span>
                    Actual Lineup (With {matchup.playerName.split(' ').pop()})
                  </span>
                  <span className="font-mono text-sm text-white font-bold">
                    {matchup.actualPoints.toFixed(1)} pts
                  </span>
                </div>

                {/* Starters */}
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">
                    Starters ({matchup.actualStarters.length})
                  </div>
                  <div className="space-y-1.5">
                    {matchup.actualStarters.map((s, idx) => {
                      const isThePlayer = s.name === matchup.playerName;
                      const displaySlot = (s.rosterSlot || '').replace('SUPER_FLEX', 'SFLX').replace('_FLEX', ' FLX');
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isThePlayer
                              ? 'bg-accent-color/10 border-accent-color/40 shadow-inner shadow-accent-color/5'
                              : 'bg-white/[0.03] border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span
                              className={`text-[9px] font-black uppercase w-8 text-center tracking-wider shrink-0 py-0.5 rounded ${
                                isThePlayer
                                  ? 'bg-accent-color/20 text-accent-color'
                                  : 'text-white/30 bg-white/5'
                              }`}
                            >
                              {displaySlot}
                            </span>
                            <img
                              src={s.avatar}
                              alt=""
                              className={`w-7 h-7 rounded-full object-cover shrink-0 bg-black/40 ${
                                isThePlayer
                                  ? 'border-2 border-accent-color'
                                  : 'border border-white/10'
                              }`}
                              onError={e => {
                                (e.target as HTMLImageElement).src =
                                  'https://sleepercdn.com/images/v2/icons/player_default.webp';
                              }}
                            />
                            <span
                              className={`text-xs md:text-sm font-semibold truncate ${
                                isThePlayer ? 'text-accent-color font-black' : 'text-white/85'
                              }`}
                            >
                              {s.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {isThePlayer && (
                              <span className="text-[8px] uppercase font-black text-accent-color border border-accent-color/30 bg-accent-color/5 px-1.5 py-0.5 rounded tracking-widest hidden sm:inline">
                                ACQUIRED
                              </span>
                            )}
                            <span
                              className={`font-mono text-xs font-bold ${
                                isThePlayer ? 'text-accent-color' : 'text-muted'
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

                {/* Bench */}
                {actualBench.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">
                      Bench ({actualBench.length})
                    </div>
                    <div className="space-y-1.5 opacity-85">
                      {actualBench.map((b, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg border bg-white/[0.02] border-white/5"
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
                            <span className="text-xs truncate text-muted">{b.name}</span>
                          </div>
                          <span className="font-mono text-xs text-muted/70">{b.pts.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Alternate Reality */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-bold text-danger-color uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-danger-color"></span>
                    Counterfactual Lineup (Without {matchup.playerName.split(' ').pop()})
                  </span>
                  <span className="font-mono text-sm text-white/50 font-bold">
                    {matchup.hypotheticalPoints.toFixed(1)} pts
                  </span>
                </div>

                {/* Starters */}
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">
                    Starters ({matchup.hypotheticalStarters.length})
                  </div>
                  <div className="space-y-1.5">
                    {matchup.hypotheticalStarters.map((s, idx) => {
                      const isReplacement = s.id.startsWith('REP_');
                      const isNew = !matchup.actualStarters.some(as => as.id === s.id);
                      const displaySlot = (s.rosterSlot || '').replace('SUPER_FLEX', 'SFLX').replace('_FLEX', ' FLX');

                      let rowClasses = 'bg-white/[0.03] border-white/5';
                      let textClasses = 'text-white/85';
                      let slotBadgeClasses = 'text-white/30 bg-white/5';

                      if (isReplacement) {
                        rowClasses =
                          'bg-danger-color/10 border-danger-color/40 shadow-inner shadow-danger-color/5';
                        textClasses = 'text-danger-color font-black';
                        slotBadgeClasses = 'bg-danger-color/20 text-danger-color';
                      } else if (isNew) {
                        rowClasses = 'bg-amber-500/10 border-amber-500/40';
                        textClasses = 'text-amber-400 font-black';
                        slotBadgeClasses = 'bg-amber-500/20 text-amber-400';
                      }

                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${rowClasses}`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span
                              className={`text-[9px] font-black uppercase w-8 text-center tracking-wider shrink-0 py-0.5 rounded ${slotBadgeClasses}`}
                            >
                              {displaySlot}
                            </span>
                            {!isReplacement ? (
                              <img
                                src={s.avatar}
                                alt=""
                                className={`w-7 h-7 rounded-full object-cover shrink-0 bg-black/40 border ${
                                  isNew ? 'border-amber-500/30' : 'border-white/10'
                                }`}
                                onError={e => {
                                  (e.target as HTMLImageElement).src =
                                    'https://sleepercdn.com/images/v2/icons/player_default.webp';
                                }}
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-danger-color/20 flex items-center justify-center border border-danger-color/30 shrink-0">
                                <User size={12} className="text-danger-color" />
                              </div>
                            )}
                            <span className={`text-xs md:text-sm font-semibold truncate ${textClasses}`}>
                              {isReplacement ? `Replacement ${s.name}` : s.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {isReplacement && (
                              <span className="text-[8px] uppercase font-black text-danger-color border border-danger-color/30 bg-danger-color/10 px-1.5 py-0.5 rounded tracking-widest hidden sm:inline">
                                REPLACEMENT
                              </span>
                            )}
                            {isNew && !isReplacement && (
                              <span className="text-[8px] uppercase font-black text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded tracking-widest hidden sm:inline">
                                PROMOTED
                              </span>
                            )}
                            <span className={`font-mono text-xs font-bold ${textClasses}`}>
                              {s.pts.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bench */}
                {hypotheticalBench.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">
                      Bench ({hypotheticalBench.length})
                    </div>
                    <div className="space-y-1.5 opacity-85">
                      {hypotheticalBench.map((b, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg border bg-white/[0.02] border-white/5"
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
                            <span className="text-xs truncate text-muted">{b.name}</span>
                          </div>
                          <span className="font-mono text-xs text-muted/70">{b.pts.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 bg-white/[0.02] border-t border-white/10 text-center text-[10px] md:text-xs text-muted leading-relaxed">
          The counterfactual model removes the acquired player, preserves all other starting lineup choices, 
          and starts the next best eligible bench player (or positional baseline) to verify whether this acquisition was decisive.
        </div>
      </div>
    </div>,
    document.body
  );
};
