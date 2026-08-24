import React from 'react';
import { Trophy, Crown } from 'lucide-react';
import type { ManagerScore } from '../../types/recordBook';
import { SeasonBumpChart } from './SeasonBumpChart';

import { MasterLedgerHub } from './MasterLedgerHub';

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

      {/* All-Time Master Ledger Table */}
      <MasterLedgerHub managers={managers} />

      {/* Season Trajectory Bump Chart */}
      <SeasonBumpChart managers={managers} seasons={seasons} />
    </div>
  );
};

