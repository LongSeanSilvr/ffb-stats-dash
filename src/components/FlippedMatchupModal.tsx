import React from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, User, Shield, ArrowRightLeft, UserPlus } from 'lucide-react';
import type { MatchupFlipped } from '../types/playoffs';

interface Props {
  matchup: MatchupFlipped;
  onClose: () => void;
}

export const FlippedMatchupModal: React.FC<Props> = ({ matchup, onClose }) => {
  const getAcqIcon = (type: string) => {
    switch(type) {
      case 'Trade': return <ArrowRightLeft size={16} className="text-accent-color" />;
      case 'Free Agency': return <UserPlus size={16} className="text-warning-color" />;
      default: return <Shield size={16} className="text-success-color" />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f1115] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-accent-color/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent-color/20 border border-accent-color/30">
               {getAcqIcon(matchup.acquisitionType)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-none mb-1">How it Flipped: Week {matchup.week}</h2>
              <p className="text-muted text-sm font-medium uppercase tracking-wider">Playoff Alternate Reality Analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors text-muted hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-muted text-xs uppercase font-bold tracking-widest mb-1">Reality</div>
              <div className="text-success-color font-black text-2xl">{matchup.actualPoints.toFixed(1)}</div>
              <div className="text-muted text-xs">Defeated {matchup.opponentName} ({matchup.opponentPoints.toFixed(1)})</div>
            </div>
            <div className="flex items-center justify-center">
               <ArrowRight size={32} className="text-white/10" />
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-muted text-xs uppercase font-bold tracking-widest mb-1">Alternate Reality</div>
              <div className="text-danger-color font-black text-2xl">{matchup.hypotheticalPoints.toFixed(1)}</div>
              <div className="text-muted text-xs">Would have LOST to {matchup.opponentName}</div>
            </div>
          </div>

          <div className="bg-accent-color/5 border border-accent-color/20 rounded-xl p-8 my-10 text-center italic text-lg text-white/90 leading-relaxed">
            "Without acquiring <span className="text-accent-color font-bold">{matchup.playerName}</span>,{' '}
            <span className="text-white font-bold">{matchup.managerName}</span> would have been forced to start{' '}
            <span className="text-white font-bold">Expected Replacement Value (ERV)</span> players, resulting in a{' '}
            <span className="text-danger-color font-bold">{(matchup.opponentPoints - matchup.hypotheticalPoints).toFixed(1)}pt loss</span>."
          </div>

          {/* Lineup Comparison Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Actual Reality */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success-color"></div>
                  The Reality (Actual)
                </h3>
                <span className="text-success-color font-mono font-bold">{matchup.actualPoints.toFixed(1)}</span>
              </div>
              <div className="space-y-2">
                {matchup.actualStarters.map((s, idx) => {
                  const isThePlayer = s.id === matchup.actualStarters.find(as => as.name === matchup.playerName)?.id;
                  const displaySlot = (s.rosterSlot || '').replace('SUPER_FLEX', 'SFLX').replace('_FLEX', ' FLX');
                  return (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${isThePlayer ? 'bg-accent-color/10 border-accent-color/30' : 'bg-white/20 border-white/5'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-white/30 uppercase w-8 text-center tracking-wider">{displaySlot}</span>
                        <img src={s.avatar} alt="" className="w-8 h-8 rounded-full bg-black/40" />
                        <span className={`text-sm font-medium ${isThePlayer ? 'text-accent-color font-bold' : 'text-white'}`}>{s.name}</span>
                      </div>
                      <span className={`font-mono text-xs ${isThePlayer ? 'text-accent-color font-bold' : 'text-muted'}`}>{s.pts.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alternate Reality */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-danger-color"></div>
                  The "What If" (Without {matchup.playerName.split(' ').pop()})
                </h3>
                <span className="text-danger-color font-mono font-bold">{matchup.hypotheticalPoints.toFixed(1)}</span>
              </div>
              <div className="space-y-2">
                {matchup.hypotheticalStarters.map((s, idx) => {
                  const isReplacement = s.id.startsWith('REP_');
                  const isNew = !matchup.actualStarters.some(as => as.id === s.id);
                  const displaySlot = (s.rosterSlot || '').replace('SUPER_FLEX', 'SFLX').replace('_FLEX', ' FLX');
                  
                  let rowClasses = 'bg-white/20 border-white/5';
                  if (isReplacement) rowClasses = 'bg-danger-color/10 border-danger-color/30';
                  else if (isNew) rowClasses = 'bg-warning-color/10 border-warning-color/30';

                  let textClasses = 'text-white';
                  if (isReplacement) textClasses = 'text-danger-color font-bold';
                  else if (isNew) textClasses = 'text-warning-color font-bold';

                  return (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${rowClasses}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-white/30 uppercase w-8 text-center tracking-wider">{displaySlot}</span>
                        {!isReplacement && <img src={s.avatar} alt="" className="w-8 h-8 rounded-full bg-black/40" />}
                        {isReplacement && <div className="w-8 h-8 rounded-full bg-danger-color/20 flex items-center justify-center border border-danger-color/30"><User size={16} className="text-danger-color" /></div>}
                        <span className={`text-sm font-medium ${textClasses}`}>{isReplacement ? `Replacement ${s.name}` : s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         {isReplacement && <span className="text-[10px] uppercase font-bold text-danger-color border border-danger-color/30 px-1 rounded">Replacement Level</span>}
                         {isNew && !isReplacement && <span className="text-[10px] uppercase font-bold text-warning-color border border-warning-color/30 px-1 rounded">Promoted</span>}
                         <span className={`font-mono text-xs ${textClasses}`}>{s.pts.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/5 border-t border-white/5 text-center text-xs text-muted leading-relaxed">
          The Alternate Reality uses the <span className="text-white font-medium">Expected Replacement Value (ERV)</span> algorithm. 
          It removes the acquired player from the roster, locks in the manager's actual starting decisions for the remaining positions, 
          and backfills the vacated spot with the highest-scoring eligible bench player. If no bench player is eligible, it uses the league's average Replacement Level score for that position.
        </div>
      </div>
    </div>,
    document.body
  );
};
