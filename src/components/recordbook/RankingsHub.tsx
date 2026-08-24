import React from 'react';
import { Trophy, Crown, Sparkles, Swords, Target, Medal } from 'lucide-react';
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
  const top1 = sortedByPower[0];
  const top2 = sortedByPower[1];
  const top3 = sortedByPower[2];

  const maxChampionships = Math.max(0, ...managers.map(m => m.championships));
  const powerLeader = sortedByPower[0];
  const ringLeader = managers.reduce((prev, curr) => (curr.championships > prev.championships ? curr : prev), managers[0]);
  const winLeader = managers.reduce((prev, curr) => (curr.wins > prev.wins ? curr : prev), managers[0]);
  const efficiencyLeader = managers.reduce((prev, curr) => (curr.coachingEfficiency > prev.coachingEfficiency ? curr : prev), managers[0]);

  const champions = managers
    .filter(m => m.championships > 0)
    .sort((a, b) => b.championships - a.championships);

  return (
    <div className="space-y-10 animate-fade-in">
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

      {/* Top 3 Dynasty Podium */}
      {top1 && top2 && top3 && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-purple-500/5 via-black/40 to-black/60 shadow-2xl">
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Medal size={14} className="text-purple-400" />
              All-Time Dynasty Podium
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              The Multiverse Heavyweights
            </h2>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Top 3 franchises ranked by cumulative legacy composite power score.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end">
            {/* Rank 2: Silver (#2, Left on Desktop) */}
            <div className="order-2 md:order-1 glass-card p-5 rounded-2xl border border-slate-300/30 bg-gradient-to-b from-slate-400/10 to-black/40 text-center flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-full bg-slate-300/20 border border-slate-300/40 text-slate-200 font-black text-sm flex items-center justify-center mx-auto mb-3">
                  #2
                </div>
                <div className="relative inline-block mb-3">
                  {top2.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${top2.avatar}`}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover border-2 border-slate-300 shadow-lg mx-auto"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-700 border-2 border-slate-300 flex items-center justify-center text-xs text-white/60 mx-auto">
                      N/A
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-white text-base truncate">{top2.managerName}</h3>
                <div className="text-xs text-purple-400 font-bold mt-0.5">{top2.powerScore} Power Score</div>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-4 mt-4 border-t border-white/10 text-center text-xs">
                <div>
                  <span className="text-[10px] text-muted uppercase block">Titles</span>
                  <span className="font-bold text-yellow-400">{top2.championships}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase block">Win %</span>
                  <span className="font-bold text-white">{top2.winPercentage}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase block">Record</span>
                  <span className="font-bold text-gray-300">{top2.wins}-{top2.losses}</span>
                </div>
              </div>
            </div>

            {/* Rank 1: Gold (#1, Center - Elevated on Desktop) */}
            <div className="order-1 md:order-2 glass-card p-6 rounded-2xl border-2 border-yellow-400/50 bg-gradient-to-b from-yellow-500/15 via-yellow-500/5 to-black/60 text-center flex flex-col justify-between shadow-xl shadow-yellow-500/10 md:-translate-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/50 text-yellow-300 font-black text-xs uppercase tracking-wider mx-auto mb-3">
                  <Crown size={14} className="text-yellow-400" />
                  All-Time Champion #1
                </div>
                <div className="relative inline-block mb-3">
                  {top1.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${top1.avatar}`}
                      alt=""
                      className="w-20 h-20 rounded-full object-cover border-2 border-yellow-400 shadow-2xl mx-auto"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-700 border-2 border-yellow-400 flex items-center justify-center text-sm text-white/60 mx-auto">
                      N/A
                    </div>
                  )}
                  <Crown
                    size={22}
                    className="text-yellow-400 absolute -top-3.5 -right-1 drop-shadow-[0_0_10px_rgba(251,191,36,1)] animate-bounce"
                  />
                </div>
                <h3 className="font-black text-white text-lg sm:text-xl truncate">{top1.managerName}</h3>
                <div className="text-sm text-yellow-400 font-black mt-1 font-mono">{top1.powerScore} Power Score</div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-yellow-400/20 text-center text-xs">
                <div>
                  <span className="text-[10px] text-muted uppercase block">Titles</span>
                  <span className="font-bold text-yellow-400 text-sm">{top1.championships}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase block">Win %</span>
                  <span className="font-bold text-white text-sm">{top1.winPercentage}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase block">Record</span>
                  <span className="font-bold text-gray-200 text-sm">{top1.wins}-{top1.losses}</span>
                </div>
              </div>
            </div>

            {/* Rank 3: Bronze (#3, Right on Desktop) */}
            <div className="order-3 md:order-3 glass-card p-5 rounded-2xl border border-amber-600/30 bg-gradient-to-b from-amber-600/10 to-black/40 text-center flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-full bg-amber-600/20 border border-amber-600/40 text-amber-300 font-black text-sm flex items-center justify-center mx-auto mb-3">
                  #3
                </div>
                <div className="relative inline-block mb-3">
                  {top3.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${top3.avatar}`}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-600 shadow-lg mx-auto"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-700 border-2 border-amber-600 flex items-center justify-center text-xs text-white/60 mx-auto">
                      N/A
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-white text-base truncate">{top3.managerName}</h3>
                <div className="text-xs text-purple-400 font-bold mt-0.5">{top3.powerScore} Power Score</div>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-4 mt-4 border-t border-white/10 text-center text-xs">
                <div>
                  <span className="text-[10px] text-muted uppercase block">Titles</span>
                  <span className="font-bold text-yellow-400">{top3.championships}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase block">Win %</span>
                  <span className="font-bold text-white">{top3.winPercentage}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase block">Record</span>
                  <span className="font-bold text-gray-300">{top3.wins}-{top3.losses}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynasty Champions Showcase Banner */}
      {champions.length > 0 && (
        <div
          className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8"
          style={{
            background: 'linear-gradient(145deg, rgba(251, 191, 36, 0.08) 0%, rgba(15, 17, 21, 0.9) 100%)',
            borderColor: 'rgba(251, 191, 36, 0.3)',
            boxShadow: '0 8px 32px rgba(251, 191, 36, 0.08)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center shrink-0">
              <Trophy size={30} className="text-yellow-400" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-widest text-yellow-400 mb-1">
                Hall of Champions
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white leading-none">
                Championship Ring Ledger
              </h2>
            </div>
          </div>

          {/* Horizontal Champions Podium Row */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-white/10">
            {champions.map(champ => {
              const avatarUrl = champ.avatar
                ? `https://sleepercdn.com/avatars/thumbs/${champ.avatar}`
                : null;
              const isTop = champ.championships === maxChampionships;

              return (
                <div key={champ.ownerId} className="flex items-center gap-3">
                  <div className="relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={champ.managerName}
                        className={`w-12 h-12 rounded-full object-cover shadow-lg border-2 ${
                          isTop ? 'border-yellow-400' : 'border-white/30'
                        }`}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-700 border-2 border-white/30 flex items-center justify-center text-xs text-white/60">
                        N/A
                      </div>
                    )}
                    {isTop && (
                      <Crown
                        size={16}
                        className="text-yellow-400 absolute -top-2.5 -right-1.5 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                      />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{champ.managerName}</div>
                    <div className="text-xs font-black text-yellow-400 uppercase tracking-wide">
                      {champ.championships} {champ.championships === 1 ? 'Ring' : 'Rings'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All-Time Master Ledger Table */}
      <MasterLedgerHub managers={managers} />

      {/* Season Trajectory Bump Chart */}
      <SeasonBumpChart managers={managers} seasons={seasons} />
    </div>
  );
};
