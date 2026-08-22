import React from 'react';
import { Sparkles, AlertOctagon, TrendingUp, TrendingDown } from 'lucide-react';
import { DraftPositionBadge } from './DraftPositionBadge';
import type { DraftAsset } from '../../hooks/useDraftEfficiency';

interface Props {
  picks: (DraftAsset & { managerName: string; avatar?: string | null; valOverPos?: number })[];
}

export const DraftStealsAndBusts: React.FC<Props> = ({ picks }) => {
  // Steals: Drafted in Round 7 or later with high positional value (excluding keepers)
  const steals = picks
    .filter(p => !p.isKeeper && p.round >= 7 && (p.valOverPos !== undefined ? p.valOverPos > 15 : p.starterPoints > 50))
    .sort((a, b) => (b.valOverPos ?? b.starterPoints) - (a.valOverPos ?? a.starterPoints))
    .slice(0, 6);

  // Busts: Drafted in Rounds 1-4 with low starter points (excluding keepers)
  const busts = picks
    .filter(p => !p.isKeeper && p.round <= 4 && (p.valOverPos !== undefined ? p.valOverPos < 0 : p.starterPoints < 120))
    .sort((a, b) => (a.valOverPos ?? a.starterPoints) - (b.valOverPos ?? b.starterPoints))
    .slice(0, 6);

  if (steals.length === 0 && busts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* 1. DRAFT STEALS */}
      <div className="glass-card p-5 md:p-6 border border-emerald-500/20 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Sparkles size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-none mb-1 flex items-center gap-2">
                <span>Top Draft Steals</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Round 7+
                </span>
              </h3>
              <p className="text-xs text-muted">
                Late-round selections delivering the highest fantasy value over positional baseline.
              </p>
            </div>
          </div>
        </div>

        {steals.length === 0 ? (
          <div className="text-xs text-muted italic p-6 text-center">
            No late-round breakouts identified for this season.
          </div>
        ) : (
          <div className="space-y-3">
            {steals.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/30 hover:border-emerald-500/40 hover:bg-black/40 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={`https://sleepercdn.com/content/nfl/players/thumb/${p.playerId}.jpg`}
                      alt={p.playerName}
                      className="w-10 h-10 rounded-full object-cover border border-emerald-500/30 bg-black/40"
                      onError={e => {
                        (e.target as HTMLImageElement).src =
                          'https://sleepercdn.com/images/v2/icons/player_default.webp';
                      }}
                    />
                    {p.avatar && (
                      <img
                        src={`https://sleepercdn.com/avatars/thumbs/${p.avatar}`}
                        alt={p.managerName}
                        className="w-4 h-4 rounded-full border border-black absolute -bottom-0.5 -right-0.5 shadow"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">
                        {p.playerName}
                      </span>
                      <DraftPositionBadge position={p.position} />
                    </div>
                    <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="font-mono text-emerald-400 font-semibold">
                        Rd {p.round}.{String(p.pickNo % 12 || 12).padStart(2, '0')}
                      </span>
                      <span>•</span>
                      <span className="truncate">{p.managerName}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <div className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                    {p.valOverPos !== undefined && p.valOverPos > 0
                      ? `+${p.valOverPos.toFixed(1)}`
                      : p.starterPoints.toFixed(1)}{' '}
                    <span className="text-[10px] text-muted">
                      {p.valOverPos !== undefined && p.valOverPos > 0 ? `vs ${p.position} avg` : 'pts'}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted font-mono flex items-center justify-end gap-1">
                    <TrendingUp size={12} className="text-emerald-400" />
                    <span>{p.starterPoints.toFixed(1)} pts • {p.gamesStartedOnRoster} starts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. DRAFT BUSTS */}
      <div className="glass-card p-5 md:p-6 border border-rose-500/20 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <AlertOctagon size={20} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-none mb-1 flex items-center gap-2">
                <span>Biggest Draft Busts</span>
                <span className="text-[10px] font-mono uppercase bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30">
                  Rounds 1–4
                </span>
              </h3>
              <p className="text-xs text-muted">
                Premium draft picks that severely underperformed starter expectations.
              </p>
            </div>
          </div>
        </div>

        {busts.length === 0 ? (
          <div className="text-xs text-muted italic p-6 text-center">
            No major early-round busts identified for this season.
          </div>
        ) : (
          <div className="space-y-3">
            {busts.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/30 hover:border-rose-500/40 hover:bg-black/40 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={`https://sleepercdn.com/content/nfl/players/thumb/${p.playerId}.jpg`}
                      alt={p.playerName}
                      className="w-10 h-10 rounded-full object-cover border border-rose-500/30 bg-black/40"
                      onError={e => {
                        (e.target as HTMLImageElement).src =
                          'https://sleepercdn.com/images/v2/icons/player_default.webp';
                      }}
                    />
                    {p.avatar && (
                      <img
                        src={`https://sleepercdn.com/avatars/thumbs/${p.avatar}`}
                        alt={p.managerName}
                        className="w-4 h-4 rounded-full border border-black absolute -bottom-0.5 -right-0.5 shadow"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate group-hover:text-rose-400 transition-colors">
                        {p.playerName}
                      </span>
                      <DraftPositionBadge position={p.position} />
                    </div>
                    <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="font-mono text-rose-400 font-semibold">
                        Rd {p.round}.{String(p.pickNo % 12 || 12).padStart(2, '0')}
                      </span>
                      <span>•</span>
                      <span className="truncate">{p.managerName}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <div className="text-sm sm:text-base font-black text-rose-400 font-mono">
                    {p.starterPoints.toFixed(1)} <span className="text-[10px] text-muted">pts</span>
                  </div>
                  <div className="text-[11px] text-muted font-mono flex items-center justify-end gap-1">
                    <TrendingDown size={12} className="text-rose-400" />
                    <span>
                      {p.gamesStartedOnRoster > 0
                        ? `${p.gamesStartedOnRoster} starts`
                        : p.gamesMissed > 0
                        ? `${p.gamesMissed} games missed`
                        : '0 starts (benched)'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
