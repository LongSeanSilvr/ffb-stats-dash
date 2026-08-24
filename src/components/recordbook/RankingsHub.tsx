import React from 'react';
import { Crown, Sparkles, Swords, Target } from 'lucide-react';
import type { ManagerScore } from '../../types/recordBook';
import { SeasonBumpChart } from './SeasonBumpChart';
import { MasterLedgerHub } from './MasterLedgerHub';

interface RankingsHubProps {
  managers: ManagerScore[];
  seasons: { league: { season: string } }[];
}

export const RankingsHub: React.FC<RankingsHubProps> = ({ managers, seasons }) => {
  if (!managers || managers.length === 0) return null;

  const sortedByPower = [...managers].sort((a, b) => b.powerScore - a.powerScore);
  const powerLeader = sortedByPower[0];
  const ringLeader = managers.reduce((prev, curr) => (curr.championships > prev.championships ? curr : prev), managers[0]);
  const winLeader = managers.reduce((prev, curr) => (curr.wins > prev.wins ? curr : prev), managers[0]);
  const efficiencyLeader = managers.reduce((prev, curr) => (curr.coachingEfficiency > prev.coachingEfficiency ? curr : prev), managers[0]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 4 Legacy Hero KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. All-Time Power King */}
        {powerLeader && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-purple-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                <Sparkles size={14} className="text-purple-400 shrink-0" />
                <span className="truncate">All-Time Power King</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {powerLeader.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${powerLeader.avatar}`}
                    alt=""
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-purple-400/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                    N/A
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs sm:text-sm truncate">
                    {powerLeader.managerName}
                  </div>
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-purple-400 mt-0.5 leading-snug">
                    {powerLeader.powerScore} Power Index
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              {powerLeader.winPercentage}% Win Rate • {powerLeader.averageFinish} Avg Finish
            </div>
          </div>
        )}

        {/* 2. Dynasty Ring Leader */}
        {ringLeader && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-yellow-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                <Crown size={14} className="text-yellow-400 shrink-0" />
                <span className="truncate">Dynasty Ring Leader</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {ringLeader.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${ringLeader.avatar}`}
                    alt=""
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-yellow-400/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                    N/A
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs sm:text-sm truncate">
                    {ringLeader.managerName}
                  </div>
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-yellow-400 mt-0.5 leading-snug">
                    {ringLeader.championships} {ringLeader.championships === 1 ? 'Championship' : 'Championships'}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              {ringLeader.playoffWins}-{ringLeader.playoffLosses} Career Playoff Record
            </div>
          </div>
        )}

        {/* 3. All-Time Win Leader */}
        {winLeader && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                <Swords size={14} className="text-emerald-400 shrink-0" />
                <span className="truncate">All-Time Win Leader</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {winLeader.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${winLeader.avatar}`}
                    alt=""
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-emerald-400/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                    N/A
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs sm:text-sm truncate">
                    {winLeader.managerName}
                  </div>
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-emerald-400 mt-0.5 leading-snug">
                    {winLeader.wins} Total Career Wins
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              {winLeader.wins}-{winLeader.losses} Record ({winLeader.winPercentage}% Win Rate)
            </div>
          </div>
        )}

        {/* 4. Lineup Savant */}
        {efficiencyLeader && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-teal-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                <Target size={14} className="text-teal-400 shrink-0" />
                <span className="truncate">Lineup Savant</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {efficiencyLeader.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${efficiencyLeader.avatar}`}
                    alt=""
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-teal-400/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                    N/A
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs sm:text-sm truncate">
                    {efficiencyLeader.managerName}
                  </div>
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-teal-400 mt-0.5 leading-snug">
                    {efficiencyLeader.coachingEfficiency}% Lineup Efficiency
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              Maximum optimal points started per week
            </div>
          </div>
        )}
      </div>

      {/* All-Time Master Ledger Table */}
      <MasterLedgerHub managers={managers} />

      {/* Season Trajectory Bump Chart */}
      <SeasonBumpChart managers={managers} seasons={seasons} />
    </div>
  );
};
