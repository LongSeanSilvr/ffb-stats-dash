import React, { useState } from 'react';
import {
  Sparkles,
  ShieldAlert,
  Crown,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  Skull
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ReferenceLine,
  Cell
} from 'recharts';
import type { ManagerScore } from '../../types/recordBook';
import type { AllTimeMatchupData } from '../../hooks/useAllTimeMatchups';
import { Card } from '../Card';

interface ScheduleLuckHubProps {
  managers: ManagerScore[];
  matchups: AllTimeMatchupData;
}

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  const size = 26;
  const safeName = (payload.name || 'mgr').replace(/[^a-zA-Z0-9]/g, '_');
  const clipId = `clip-luck-${safeName}-${Math.round(cx)}-${Math.round(cy)}`;
  const strokeColor =
    payload.scheduleLuckWins >= 2
      ? '#10b981'
      : payload.scheduleLuckWins <= -2
      ? '#f43f5e'
      : '#38bdf8';

  return (
    <g className="cursor-pointer group">
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={size / 2 - 1.5} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={size / 2 + 4} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={size / 2}
        fill="#0f1115"
        stroke={strokeColor}
        strokeWidth="2"
        className="group-hover:stroke-white group-hover:stroke-[3px] transition-all"
      />
      {avatarUrl ? (
        <image
          href={avatarUrl}
          x={cx - size / 2 + 1.5}
          y={cy - size / 2 + 1.5}
          width={size - 3}
          height={size - 3}
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <circle cx={cx} cy={cy} r={size / 2 - 1.5} fill="#475569" />
      )}
    </g>
  );
};

export const ScheduleLuckHub: React.FC<ScheduleLuckHubProps> = ({ matchups }) => {
  const [sortKey, setSortKey] = useState<string>('scheduleLuckWins');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedOwnerId, setExpandedOwnerId] = useState<string | null>(null);

  const luckStats = matchups.managerLuckStats || [];
  const luckiestSeasons = matchups.luckiestSeasons || [];
  const unluckiestSeasons = matchups.unluckiestSeasons || [];

  // Hero KPI calculations
  const mostLuckyManager = [...luckStats].sort((a, b) => b.scheduleLuckWins - a.scheduleLuckWins)[0];
  const mostUnluckyManager = [...luckStats].sort((a, b) => a.scheduleLuckWins - b.scheduleLuckWins)[0];
  const allPlayKing = [...luckStats].sort((a, b) => b.allPlayWinPct - a.allPlayWinPct)[0];
  const toughestGauntlet = [...luckStats].sort((a, b) => b.papg - a.papg)[0];

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'managerName' || key === 'papg' ? 'asc' : 'desc');
    }
  };

  const sortedStats = [...luckStats].sort((a, b) => {
    let aVal = (a as any)[sortKey];
    let bVal = (b as any)[sortKey];
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <ArrowUpDown size={12} className="inline ml-1 opacity-40 hover:opacity-100" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="inline ml-1 text-emerald-400" />
    ) : (
      <ArrowDown size={12} className="inline ml-1 text-emerald-400" />
    );
  };

  // Scatter chart data
  const scatterData = luckStats.map(m => ({
    name: m.managerName,
    avatar: m.avatar,
    allPlayWinPct: m.allPlayWinPct,
    scheduleLuckWins: m.scheduleLuckWins,
    actualWins: m.actualWins,
    actualLosses: m.actualLosses,
    expectedWins: m.expectedWins,
    papg: m.papg,
    seasons: m.seasonsPlayed
  }));

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const avatarUrl = data.avatar ? `https://sleepercdn.com/avatars/thumbs/${data.avatar}` : null;
      const isPositive = data.scheduleLuckWins >= 0;

      return (
        <div className="glass-card p-3 rounded-xl border border-white/20 shadow-2xl backdrop-blur-xl max-w-xs text-xs space-y-1.5 z-50">
          <div className="flex items-center gap-2 pb-1 border-b border-white/10">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-white/20" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">N/A</div>
            )}
            <span className="font-bold text-white text-sm truncate">{data.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-0.5">
            <div>
              <span className="text-muted block">Actual Record</span>
              <span className="font-bold text-white">{data.actualWins}-{data.actualLosses}</span>
            </div>
            <div>
              <span className="text-muted block">Expected Wins</span>
              <span className="font-bold text-blue-400">{data.expectedWins}</span>
            </div>
            <div>
              <span className="text-muted block">All-Play Strength</span>
              <span className="font-bold text-purple-400">{data.allPlayWinPct}%</span>
            </div>
            <div>
              <span className="text-muted block">Schedule Luck</span>
              <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? `+${data.scheduleLuckWins}` : data.scheduleLuckWins} WAE
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Context Header Banner */}
      <div className="glass-card p-4 sm:p-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-black/40 to-cyan-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Sparkles size={22} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              The Schedule Luck & Expected Wins Matrix
            </h2>
            <p className="text-xs sm:text-sm text-muted mt-0.5 max-w-3xl">
              Removing schedule variance to calculate <strong>Wins Above Expectation (WAE)</strong>. Expected Wins reflect each manager's simulated record if they played all other 11 teams simultaneously every single week.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Hero KPI Banners */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. Most Favorable Schedule */}
        {mostLuckyManager && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                <Sparkles size={14} className="text-emerald-400 shrink-0" />
                <span className="truncate">Most Favorable Schedule</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {mostLuckyManager.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${mostLuckyManager.avatar}`}
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
                    {mostLuckyManager.managerName}
                  </div>
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-emerald-400 mt-0.5 leading-snug">
                    +{mostLuckyManager.scheduleLuckWins} Wins Above Exp.
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              {mostLuckyManager.actualWins} Actual Wins vs {mostLuckyManager.expectedWins} Expected
            </div>
          </div>
        )}

        {/* 2. Toughest Schedule Gauntlet */}
        {mostUnluckyManager && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-rose-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                <Skull size={14} className="text-rose-400 shrink-0" />
                <span className="truncate">Toughest Gauntlet</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {mostUnluckyManager.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${mostUnluckyManager.avatar}`}
                    alt=""
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-rose-400/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                    N/A
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs sm:text-sm truncate">
                    {mostUnluckyManager.managerName}
                  </div>
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-rose-400 mt-0.5 leading-snug">
                    {mostUnluckyManager.scheduleLuckWins} Wins Lost to Schedule
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              {mostUnluckyManager.actualWins} Actual Wins vs {mostUnluckyManager.expectedWins} Expected
            </div>
          </div>
        )}

        {/* 3. All-Play King */}
        {allPlayKing && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-purple-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                <Crown size={14} className="text-purple-400 shrink-0" />
                <span className="truncate">All-Play King</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {allPlayKing.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${allPlayKing.avatar}`}
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
                    {allPlayKing.managerName}
                  </div>
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-purple-400 mt-0.5 leading-snug">
                    {allPlayKing.allPlayWinPct}% All-Play Win Rate
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              {allPlayKing.allPlayWins}–{allPlayKing.allPlayLosses} simulated weekly record
            </div>
          </div>
        )}

        {/* 4. Highest Opponent PPG */}
        {toughestGauntlet && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-amber-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                <ShieldAlert size={14} className="text-amber-400 shrink-0" />
                <span className="truncate">Highest Opponent PPG</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {toughestGauntlet.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${toughestGauntlet.avatar}`}
                    alt=""
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-amber-400/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                    N/A
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs sm:text-sm truncate">
                    {toughestGauntlet.managerName}
                  </div>
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-amber-400 mt-0.5 leading-snug">
                    {toughestGauntlet.papg} Points Against / Game
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              Opponents averaged highest scoring output
            </div>
          </div>
        )}
      </div>

      {/* Skill vs. Schedule Luck Scatter Plot */}
      <Card
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="text-cyan-400" size={20} />
              <span>True Strength vs. Schedule Luck Matrix</span>
            </div>
            <span className="text-xs text-muted font-normal">
              All-Play Strength (X) vs. Wins Above Expectation (Y)
            </span>
          </div>
        }
      >
        <div className="h-72 sm:h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <XAxis
                type="number"
                dataKey="allPlayWinPct"
                name="All-Play Win %"
                domain={[35, 65]}
                tickFormatter={v => `${v}%`}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="scheduleLuckWins"
                name="Wins Above Expectation"
                domain={[-8, 8]}
                tickFormatter={v => (v > 0 ? `+${v}` : `${v}`)}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
              <ReferenceLine x={50} stroke="#475569" strokeDasharray="3 3" />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
              <Scatter
                name="Managers"
                data={scatterData}
                shape={<CustomAvatarDot />}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Quadrant Legend Labels */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t border-white/5 text-[11px] text-center">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="font-bold block">Dominant & Fortunate</span>
            <span className="text-[10px] text-muted">High All-Play & Positive WAE</span>
          </div>
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <span className="font-bold block">Schedule Beneficiary</span>
            <span className="text-[10px] text-muted">Sub-50% All-Play & Positive WAE</span>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <span className="font-bold block">Unlucky Juggernaut</span>
            <span className="text-[10px] text-muted">High All-Play & Negative WAE</span>
          </div>
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <span className="font-bold block">Toughest Gauntlet</span>
            <span className="text-[10px] text-muted">Sub-50% All-Play & Negative WAE</span>
          </div>
        </div>
      </Card>

      {/* Schedule Luck Master Leaderboard */}
      <Card
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Layers className="text-emerald-400" size={20} />
              <span>Career Schedule Luck Leaderboard</span>
            </div>
            <span className="text-xs text-muted font-normal">
              Click any manager row to inspect season-by-season luck metrics
            </span>
          </div>
        }
      >
        {/* Mobile Card List (< md) */}
        <div className="block md:hidden space-y-3 pt-2">
          {sortedStats.map((m, rankIndex) => {
            const isExpanded = expandedOwnerId === m.ownerId;
            const avatarUrl = m.avatar ? `https://sleepercdn.com/avatars/thumbs/${m.avatar}` : null;
            const isPositive = m.scheduleLuckWins >= 0;

            return (
              <div key={m.ownerId} className="glass-card transition-all duration-200 p-3.5">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedOwnerId(isExpanded ? null : m.ownerId)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-4 text-xs font-bold text-muted">#{rankIndex + 1}</span>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white shrink-0">
                        N/A
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-xs sm:text-sm truncate">{m.managerName}</h4>
                      <div className="text-[11px] text-muted">
                        {m.actualWins}-{m.actualLosses} ({m.actualWinPct}%)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className={`text-xs font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? `+${m.scheduleLuckWins}` : m.scheduleLuckWins} WAE
                      </div>
                      <div className="text-[10px] text-muted font-mono">{m.allPlayWinPct}% All-Play</div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                  </div>
                </div>

                {/* Mobile Expanded Season Drill-down */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-black/40 p-2.5 rounded-lg border border-white/5">
                      <div>
                        <span className="text-muted block text-[10px] uppercase font-bold">Expected Wins</span>
                        <span className="font-bold text-white">{m.expectedWins} Wins</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px] uppercase font-bold">Opponent PAPG</span>
                        <span className="font-bold text-amber-400">{m.papg} pts/gm</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px] uppercase font-bold">All-Play Record</span>
                        <span className="font-bold text-purple-400">{m.allPlayWins}–{m.allPlayLosses}</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px] uppercase font-bold">Scoring PPG</span>
                        <span className="font-bold text-white">{m.ppg} pts/gm</span>
                      </div>
                    </div>

                    <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Calendar size={12} />
                      <span>Season-by-Season Schedule Breakdown</span>
                    </div>

                    <div className="space-y-1.5">
                      {m.seasonLuckList.map(s => {
                        const sPos = s.scheduleLuckWins >= 0;
                        return (
                          <div key={s.season} className="flex items-center justify-between p-2 rounded bg-white/5 text-[11px]">
                            <span className="font-bold text-white">{s.season}</span>
                            <span className="text-muted">{s.actualWins}-{s.actualLosses} (Exp: {s.expectedWins})</span>
                            <span className={`font-mono font-bold ${sPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {sPos ? `+${s.scheduleLuckWins}` : s.scheduleLuckWins} WAE
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10 mt-2">
          <table className="standings-table w-full whitespace-nowrap">
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr>
                <th className="text-left px-4 py-3.5 cursor-pointer select-none" onClick={() => handleSort('managerName')}>
                  Manager <SortIcon column="managerName" />
                </th>
                <th className="text-center px-3 py-3.5 cursor-pointer select-none" onClick={() => handleSort('actualWins')}>
                  Actual Record <SortIcon column="actualWins" />
                </th>
                <th className="text-center px-3 py-3.5 cursor-pointer select-none text-purple-400" onClick={() => handleSort('allPlayWinPct')}>
                  All-Play Record <SortIcon column="allPlayWinPct" />
                </th>
                <th className="text-center px-3 py-3.5 cursor-pointer select-none text-blue-400" onClick={() => handleSort('expectedWins')}>
                  Expected Wins <SortIcon column="expectedWins" />
                </th>
                <th className="text-center px-3 py-3.5 cursor-pointer select-none text-emerald-400 font-black" onClick={() => handleSort('scheduleLuckWins')}>
                  Schedule Luck (WAE) <SortIcon column="scheduleLuckWins" />
                </th>
                <th className="text-center px-3 py-3.5 cursor-pointer select-none text-amber-400" onClick={() => handleSort('papg')}>
                  Opponent PAPG <SortIcon column="papg" />
                </th>
                <th className="text-center px-3 py-3.5">Schedule Impact</th>
                <th className="text-center px-3 py-3.5">Drill-down</th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((m, i) => {
                const isExpanded = expandedOwnerId === m.ownerId;
                const avatarUrl = m.avatar ? `https://sleepercdn.com/avatars/thumbs/${m.avatar}` : null;
                const isPositive = m.scheduleLuckWins >= 0;

                const badge =
                  m.scheduleLuckWins >= 3.0 ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      🍀 Very Favorable
                    </span>
                  ) : m.scheduleLuckWins >= 1.0 ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      ✨ Favorable
                    </span>
                  ) : m.scheduleLuckWins <= -3.0 ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      💀 Gauntlet
                    </span>
                  ) : m.scheduleLuckWins <= -1.0 ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      🛡️ Unlucky
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-500/10 text-slate-300 border border-slate-500/30">
                      ⚖️ Neutral
                    </span>
                  );

                return (
                  <React.Fragment key={m.ownerId}>
                    <tr
                      className="standings-row hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setExpandedOwnerId(isExpanded ? null : m.ownerId)}
                    >
                      <td className="team-cell px-4 py-3.5">
                        <span className="team-rank w-5 inline-block text-muted">{i + 1}.</span>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="team-avatar inline-block w-8 h-8 rounded-full ml-2 mr-3 border border-white/10 object-cover" />
                        ) : (
                          <div className="team-avatar-placeholder inline-block w-8 h-8 rounded-full ml-2 mr-3 bg-slate-700" />
                        )}
                        <span className="font-semibold text-white">{m.managerName}</span>
                      </td>
                      <td className="text-center px-3 py-3.5 text-gray-300 font-medium">
                        {m.actualWins}–{m.actualLosses} <span className="text-xs text-muted">({m.actualWinPct}%)</span>
                      </td>
                      <td className="text-center px-3 py-3.5 font-mono text-purple-400">
                        {m.allPlayWins}–{m.allPlayLosses} <span className="text-xs text-muted">({m.allPlayWinPct}%)</span>
                      </td>
                      <td className="text-center px-3 py-3.5 font-mono text-blue-400 font-bold">
                        {m.expectedWins}
                      </td>
                      <td className={`text-center px-3 py-3.5 font-mono font-black text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? `+${m.scheduleLuckWins}` : m.scheduleLuckWins}
                      </td>
                      <td className="text-center px-3 py-3.5 font-mono text-amber-400">
                        {m.papg}
                      </td>
                      <td className="text-center px-3 py-3.5">{badge}</td>
                      <td className="text-center px-3 py-3.5 text-muted">
                        {isExpanded ? <ChevronUp size={16} className="inline" /> : <ChevronDown size={16} className="inline" />}
                      </td>
                    </tr>

                    {/* Desktop Expanded Row */}
                    {isExpanded && (
                      <tr className="bg-black/50 border-y border-white/10">
                        <td colSpan={8} className="p-4">
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-2">
                              <Calendar size={14} className="text-emerald-400" />
                              <span>{m.managerName}: Season-by-Season Schedule Luck Breakdown</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                              {m.seasonLuckList.map(s => {
                                const sPos = s.scheduleLuckWins >= 0;
                                return (
                                  <div key={s.season} className="glass-card p-3 rounded-lg border border-white/5 text-center">
                                    <div className="font-bold text-white text-xs mb-1">{s.season}</div>
                                    <div className="text-[11px] text-gray-300 font-medium">{s.actualWins}-{s.actualLosses}</div>
                                    <div className="text-[10px] text-muted">Exp: {s.expectedWins}</div>
                                    <div className={`text-xs font-mono font-bold mt-1 ${sPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {sPos ? `+${s.scheduleLuckWins}` : s.scheduleLuckWins} WAE
                                    </div>
                                    <div className="text-[10px] text-amber-400/80 mt-0.5">{s.papg} PAPG</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Single-Season Luck Extremes (Top 5 Favorable vs Top 5 Toughest) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top 5 Most Favorable Seasons */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Sparkles className="text-emerald-400" size={18} />
              <span>Top 5 Most Favorable Regular Seasons</span>
            </div>
          }
        >
          <div className="space-y-2.5 pt-1">
            {luckiestSeasons.map((s, idx) => {
              const avatarUrl = s.avatar ? `https://sleepercdn.com/avatars/thumbs/${s.avatar}` : null;
              return (
                <div
                  key={`${s.ownerId}-${s.season}`}
                  className="glass-card p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-black text-muted w-4">#{idx + 1}</span>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white shrink-0">N/A</div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{s.managerName}</div>
                      <div className="text-[11px] text-muted">{s.season} Season • {s.actualRecord}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-emerald-400">+{s.scheduleLuckWins} WAE</div>
                    <div className="text-[10px] text-muted">Exp: {s.expectedWins} Wins</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top 5 Most Robbed Regular Seasons */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Skull className="text-rose-400" size={18} />
              <span>Top 5 Toughest Schedule Gauntlets</span>
            </div>
          }
        >
          <div className="space-y-2.5 pt-1">
            {unluckiestSeasons.map((s, idx) => {
              const avatarUrl = s.avatar ? `https://sleepercdn.com/avatars/thumbs/${s.avatar}` : null;
              return (
                <div
                  key={`${s.ownerId}-${s.season}`}
                  className="glass-card p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-black text-muted w-4">#{idx + 1}</span>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white shrink-0">N/A</div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{s.managerName}</div>
                      <div className="text-[11px] text-muted">{s.season} Season • {s.actualRecord}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-rose-400">{s.scheduleLuckWins} WAE</div>
                    <div className="text-[10px] text-muted">Exp: {s.expectedWins} Wins</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};
