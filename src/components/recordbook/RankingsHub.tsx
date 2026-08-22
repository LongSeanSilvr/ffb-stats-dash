import React from 'react';
import { Trophy, Award, Crown, Medal } from 'lucide-react';
import type { ManagerScore } from '../../types/recordBook';
import { SeasonBumpChart } from './SeasonBumpChart';

interface RankingsHubProps {
  managers: ManagerScore[];
  seasons: { league: { season: string } }[];
}

export const RankingsHub: React.FC<RankingsHubProps> = ({ managers, seasons }) => {
  const maxChampionships = Math.max(0, ...managers.map(m => m.championships));
  const champions = managers
    .filter(m => m.championships > 0)
    .sort((a, b) => b.championships - a.championships);

  return (
    <div className="space-y-12 animate-fade-in">
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
                Championship Dynasties
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

      {/* All-Time Power Rankings Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Award className="text-purple-400" size={24} />
              All-Time Power Rankings
            </h2>
            <p className="text-sm text-muted mt-1">
              Weighted composite index based on Titles, Win %, Average Finish, and Starting Lineup Efficiency
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {managers.map((m, rankIndex) => {
            const avatarUrl = m.avatar ? `https://sleepercdn.com/avatars/thumbs/${m.avatar}` : null;
            const rank = rankIndex + 1;
            const isTop3 = rank <= 3;
            const rankColor =
              rank === 1 ? 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' :
              rank === 2 ? 'text-slate-300 border-slate-300/40 bg-slate-300/10' :
              rank === 3 ? 'text-amber-600 border-amber-600/40 bg-amber-600/10' :
              'text-muted border-white/10 bg-black/40';

            return (
              <div
                key={m.ownerId}
                className="glass-card flex flex-col justify-between transition-all duration-300 hover:border-purple-500/40"
                style={{ padding: '1.5rem' }}
              >
                <div>
                  {/* Card Header: Avatar, Name, and Top-Right Rank Badge */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={m.managerName}
                          className="w-11 h-11 rounded-full object-cover border border-white/20 shadow-md shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                          N/A
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-base truncate">{m.managerName}</h3>
                        <div className="text-xs text-purple-400 font-bold">
                          {m.seasonsPlayed} {m.seasonsPlayed === 1 ? 'Season' : 'Seasons'}
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black border shrink-0 ${rankColor}`}>
                      #{rank}
                    </div>
                  </div>

                  {/* Power Score Hero */}
                  <div className="my-4 py-3 px-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Power Score
                    </span>
                    <span className="text-xl font-black text-purple-400 font-mono">
                      {m.powerScore}
                    </span>
                  </div>
                </div>

                {/* 3 Stat Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center">
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Titles</div>
                    <div className="font-bold text-sm text-yellow-400 mt-0.5">{m.championships}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Win %</div>
                    <div className="font-bold text-sm text-white mt-0.5">{m.winPercentage}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Avg Fin</div>
                    <div className="font-bold text-sm text-blue-400 mt-0.5">{m.averageFinish}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Season Trajectory Bump Chart */}
      <SeasonBumpChart managers={managers} seasons={seasons} />
    </div>
  );
};
