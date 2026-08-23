import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Card';
import { MobileTapHint } from '../components/MobileTapHint';
import { useLeagueContext } from '../context/LeagueContext';
import { useDraftEfficiency } from '../hooks/useDraftEfficiency';
import { DraftStealsAndBusts } from '../components/draft/DraftStealsAndBusts';
import { DraftHeatmap } from '../components/draft/DraftHeatmap';
import { DraftPositionBadge } from '../components/draft/DraftPositionBadge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  Label,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from 'recharts';
import {
  Trophy,
  Sparkles,
  Target,
  ShieldAlert,
  Flame,
  LayoutGrid,
  PieChart,
  Grid,
  TrendingUp,
  Award,
} from 'lucide-react';

const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
];

// Reusable scatter dot with manager avatar
const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 30;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  if (!cx || !cy) return null;

  return (
    <svg x={cx - size / 2} y={cy - size / 2} width={size} height={size} style={{ cursor: 'pointer' }}>
      <defs>
        <clipPath id={`clip-draft-${payload.name.replace(/\s+/g, '-')}`}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 1.5} />
        </clipPath>
      </defs>
      {avatarUrl ? (
        <image
          href={avatarUrl}
          x="1.5"
          y="1.5"
          width={size - 3}
          height={size - 3}
          clipPath={`url(#clip-draft-${payload.name.replace(/\s+/g, '-')})`}
        />
      ) : (
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 1.5} fill="#475569" />
      )}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 1}
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.5}
      />
    </svg>
  );
};

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0f1115]/95 border border-white/15 rounded-xl p-3.5 min-w-[230px] shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/10">
          {data.avatar ? (
            <img
              src={`https://sleepercdn.com/avatars/thumbs/${data.avatar}`}
              alt=""
              className="w-7 h-7 rounded-full object-cover border border-white/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60">
              N/A
            </div>
          )}
          <span className="font-bold text-sm text-white">{data.name}</span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {data.roi !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted">Draft ROI:</span>
              <span className={`font-bold ${data.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.roi >= 0 ? '+' : ''}{data.roi}%
              </span>
            </div>
          )}
          {data.wins !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted">Season Wins:</span>
              <span className="text-white font-bold">{data.wins}</span>
            </div>
          )}
          {data.earlyDiff !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted">Early Rd Value:</span>
              <span className={`font-bold ${data.earlyDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.earlyDiff >= 0 ? '+' : ''}{data.earlyDiff} pts
              </span>
            </div>
          )}
          {data.lateDiff !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted">Late Rd Value:</span>
              <span className={`font-bold ${data.lateDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.lateDiff >= 0 ? '+' : ''}{data.lateDiff} pts
              </span>
            </div>
          )}
          {data.gamesMissed !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted">Games Missed:</span>
              <span className="text-rose-400 font-bold">{data.gamesMissed}</span>
            </div>
          )}
          <div className="pt-2 mt-2 border-t border-white/5 flex justify-between text-[11px]">
            <span className="text-muted">Starter Pts:</span>
            <span className="text-white font-bold">{data.actualTotal} pts</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const Draft: React.FC = () => {
  const { selectedSeason } = useLeagueContext();
  const season = selectedSeason?.league?.season;
  const { data: draftData, loading, error } = useDraftEfficiency();

  const [activeTab, setActiveTab] = useState<'performance' | 'strategy'>('performance');
  const [radarMgrs, setRadarMgrs] = useState<number[]>([]);

  useEffect(() => {
    if (draftData && draftData.length > 0 && radarMgrs.length === 0) {
      setRadarMgrs(draftData.slice(0, 4).map(d => d.roster_id));
    }
  }, [draftData, radarMgrs.length]);

  const roundAverages = useMemo(() => {
    if (!draftData || draftData.length === 0) return {};
    const allLeaguePicks = draftData.flatMap(d => d.draftPicks || []);
    const aggregates: Record<number, { sum: number; count: number }> = {};

    allLeaguePicks.forEach(p => {
      if (!p.round) return;
      if (!aggregates[p.round]) aggregates[p.round] = { sum: 0, count: 0 };
      aggregates[p.round].sum += p.starterPoints || 0;
      aggregates[p.round].count += 1;
    });

    const avgs: Record<number, number> = {};
    Object.keys(aggregates).forEach(rnd => {
      const r = Number(rnd);
      avgs[r] = aggregates[r].count > 0 ? aggregates[r].sum / aggregates[r].count : 0;
    });
    return avgs;
  }, [draftData]);

  const scatterData = useMemo(() => {
    if (!draftData || draftData.length === 0) return [];
    return draftData.map(d => {
      let expectedEarly = 0;
      let actualEarly = 0;
      let expectedLate = 0;
      let actualLate = 0;
      let expectedTotal = 0;

      (d.draftPicks || []).forEach(p => {
        const expected = roundAverages[p.round] !== undefined ? roundAverages[p.round] : 50;
        expectedTotal += expected;
        if (p.round <= 5) {
          expectedEarly += expected;
          actualEarly += p.starterPoints || 0;
        } else {
          expectedLate += expected;
          actualLate += p.starterPoints || 0;
        }
      });

      const actualTotal = d.draftStarterPoints || 0;
      const roi = expectedTotal > 0 ? (actualTotal / expectedTotal) * 100 - 100 : 0;
      const earlyDiff = actualEarly - expectedEarly;
      const lateDiff = actualLate - expectedLate;

      return {
        name: d.user?.display_name || `Team ${d.roster_id}`,
        avatar: d.user?.avatar,
        wins: selectedSeason?.rosters?.find(r => r.roster_id === d.roster_id)?.settings?.wins || 0,
        roi: Number(roi.toFixed(1)),
        earlyDiff: Number(earlyDiff.toFixed(1)),
        lateDiff: Number(lateDiff.toFixed(1)),
        actualTotal: Number(actualTotal.toFixed(1)),
        expectedTotal: Number(expectedTotal.toFixed(1)),
        gamesMissed: d.totalGamesMissed || 0,
      };
    });
  }, [draftData, roundAverages, selectedSeason]);

  const getMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const scatterAvgs = useMemo(() => {
    if (scatterData.length === 0) return { expectedTotal: 0, actualTotal: 0, wins: 0, gamesMissed: 0 };
    return {
      expectedTotal: getMedian(scatterData.map(d => d.expectedTotal)),
      actualTotal: getMedian(scatterData.map(d => d.actualTotal)),
      wins: getMedian(scatterData.map(d => d.wins)),
      gamesMissed: getMedian(scatterData.map(d => d.gamesMissed)),
    };
  }, [scatterData]);

  // Calculate positional baseline across all drafted players & keepers with starts
  const posStarterAvgs = useMemo(() => {
    if (!draftData || draftData.length === 0) return {};
    const allAssets = draftData.flatMap(d => [...(d.draftPicks || []), ...(d.keepers || [])]);
    const totals: Record<string, { pts: number; count: number }> = {};
    
    allAssets.forEach(p => {
      const pos = p.position || 'FLEX';
      if (!totals[pos]) totals[pos] = { pts: 0, count: 0 };
      if (p.starterPoints > 0) {
        totals[pos].pts += p.starterPoints;
        totals[pos].count += 1;
      }
    });

    const avgs: Record<string, number> = {};
    Object.entries(totals).forEach(([pos, val]) => {
      avgs[pos] = val.count > 0 ? val.pts / val.count : 0;
    });
    return avgs;
  }, [draftData]);

  if (loading || !selectedSeason) return <div className="flex flex-col justify-center items-center h-full min-h-[60vh] gap-4"><div className="loading-spinner"></div><div className="text-muted text-sm font-medium">Analyzing draft picks and roster tenures...</div></div>;
  if (error) return <div className="text-danger-color p-8 text-center">Error loading draft data: {error}</div>;
  if (!draftData.length) return <div className="text-muted p-8 text-center">No draft data available for this season.</div>;

  const allDraftPicks = draftData.flatMap(d => d.draftPicks.map(pick => ({
    ...pick,
    managerName: d.user?.display_name || `Team ${d.roster_id}`,
    avatar: d.user?.avatar,
    valOverPos: Number((pick.starterPoints - (posStarterAvgs[pick.position] || 0)).toFixed(1)),
  }))).sort((a, b) => b.starterPoints - a.starterPoints);

  const allKeepers = draftData.flatMap(d => d.keepers.map(k => ({
    ...k,
    managerName: d.user?.display_name || `Team ${d.roster_id}`,
    avatar: d.user?.avatar,
    valOverPos: Number((k.starterPoints - (posStarterAvgs[k.position] || 0)).toFixed(1)),
  }))).sort((a, b) => b.valOverPos - a.valOverPos);

  const topDrafter = [...draftData].sort((a, b) => b.draftStarterPoints - a.draftStarterPoints)[0];
  const biggestSteal = [...allDraftPicks].filter(p => !p.isKeeper && p.round >= 7).sort((a, b) => b.valOverPos - a.valOverPos)[0];
  const bestRoiTeam = [...scatterData].sort((a, b) => b.roi - a.roi)[0];
  const bestHitRate = [...draftData].map(d => {
      const picks = d.draftPicks.filter(p => !p.isKeeper);
      const hits = picks.filter(p => p.gamesStartedOnRoster > 0 || p.starterPoints > 20).length;
      return { name: d.user?.display_name || `Team ${d.roster_id}`, avatar: d.user?.avatar, pct: picks.length > 0 ? (hits / picks.length) * 100 : 0 };
    }).sort((a, b) => b.pct - a.pct)[0];

  const draftPointsData = [...draftData].map(d => ({ name: d.user?.display_name || `Team ${d.roster_id}`, 'Starter Pts': Number((d.draftStarterPoints || 0).toFixed(1)), 'Bench Pts': Number((d.draftBenchPoints || 0).toFixed(1)), total: (d.draftStarterPoints || 0) + (d.draftBenchPoints || 0) })).sort((a, b) => b.total - a.total);
  const draftHitRateData = [...draftData].map(d => {
      const totalPicks = d.draftPicks ? d.draftPicks.filter(p => !p.isKeeper).length : 0;
      const hitPicks = d.draftPicks ? d.draftPicks.filter(p => !p.isKeeper && (p.gamesStartedOnRoster > 0 || p.starterPoints > 20)).length : 0;
      const hitRate = totalPicks > 0 ? (hitPicks / totalPicks) * 100 : 0;
      return { name: d.user?.display_name || `Team ${d.roster_id}`, 'Hit %': Number(hitRate.toFixed(1)), 'Bust %': Number((100 - hitRate).toFixed(1)) };
    }).sort((a, b) => b['Hit %'] - a['Hit %']);

  const keeperPointsData = [...draftData].filter(d => d.keepers && d.keepers.length > 0).map(d => {
      const starterPts = d.keepers.reduce((sum, k) => sum + (k.starterPoints || 0), 0);
      const benchPts = d.keepers.reduce((sum, k) => sum + (k.benchPoints || 0), 0);
      return { name: d.user?.display_name || `Team ${d.roster_id}`, 'Starter Pts': Number(starterPts.toFixed(1)), 'Bench Pts': Number(benchPts.toFixed(1)), total: starterPts + benchPts };
    }).sort((a, b) => b.total - a.total);

  const radarProfiles = draftData.map(d => ({ roster_id: d.roster_id, user: d.user, draftPicks: d.draftPicks || [] }));
  const activeRadarProfiles = radarProfiles.filter(p => radarMgrs.includes(p.roster_id));

  const buildPosRadarData = (minRound: number, maxRound: number, excludeKeepers = false) => {
    const data = [
      { subject: 'QB', fullMark: 100 }, { subject: 'RB', fullMark: 100 }, { subject: 'WR', fullMark: 100 },
      { subject: 'TE', fullMark: 100 }, { subject: 'K', fullMark: 100 }, { subject: 'DEF/IDP', fullMark: 100 },
    ] as any[];

    const allManagerTotals = radarProfiles.map(p => {
      let qb = 0, rb = 0, wr = 0, te = 0, k = 0, idp = 0;
      const picks = p.draftPicks.filter((pick: any) => pick.round >= minRound && pick.round <= maxRound && (!excludeKeepers || !pick.isKeeper));
      picks.forEach((pick: any) => {
        const pos = pick.position || '??';
        if (pos === 'QB') qb++; else if (pos === 'RB') rb++; else if (pos === 'WR') wr++; else if (pos === 'TE') te++; else if (pos === 'K') k++; else if (['DEF', 'DL', 'LB', 'DB', 'IDP'].includes(pos)) idp++;
      });
      return { qb, rb, wr, te, k, idp };
    });

    const maxQB = Math.max(...allManagerTotals.map(t => t.qb), 1);
    const maxRB = Math.max(...allManagerTotals.map(t => t.rb), 1);
    const maxWR = Math.max(...allManagerTotals.map(t => t.wr), 1);
    const maxTE = Math.max(...allManagerTotals.map(t => t.te), 1);
    const maxK = Math.max(...allManagerTotals.map(t => t.k), 1);
    const maxIDP = Math.max(...allManagerTotals.map(t => t.idp), 1);

    activeRadarProfiles.forEach((p, idx) => {
      let qb = 0, rb = 0, wr = 0, te = 0, k = 0, idp = 0;
      const picks = p.draftPicks.filter((pick: any) => pick.round >= minRound && pick.round <= maxRound && (!excludeKeepers || !pick.isKeeper));
      picks.forEach((pick: any) => {
        const pos = pick.position || '??';
        if (pos === 'QB') qb++; else if (pos === 'RB') rb++; else if (pos === 'WR') wr++; else if (pos === 'TE') te++; else if (pos === 'K') k++; else if (['DEF', 'DL', 'LB', 'DB', 'IDP'].includes(pos)) idp++;
      });
      data[0][`manager_${idx}`] = Number(((qb / maxQB) * 100).toFixed(1));
      data[1][`manager_${idx}`] = Number(((rb / maxRB) * 100).toFixed(1));
      data[2][`manager_${idx}`] = Number(((wr / maxWR) * 100).toFixed(1));
      data[3][`manager_${idx}`] = Number(((te / maxTE) * 100).toFixed(1));
      data[4][`manager_${idx}`] = Number(((k / maxK) * 100).toFixed(1));
      data[5][`manager_${idx}`] = Number(((idp / maxIDP) * 100).toFixed(1));
      data[0][`raw_${idx}`] = qb; data[1][`raw_${idx}`] = rb; data[2][`raw_${idx}`] = wr; data[3][`raw_${idx}`] = te; data[4][`raw_${idx}`] = k; data[5][`raw_${idx}`] = idp;
    });
    return data;
  };

  const earlyRadarData = buildPosRadarData(1, 4, false);
  const midRadarData = buildPosRadarData(5, 9, false);
  const lateRadarData = buildPosRadarData(10, 30, true);

  const handleToggle = (id: number) => {
    setRadarMgrs(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      const next = [...prev, id];
      return next.length > 4 ? next.slice(1) : next;
    });
  };

  return (
    <div className="animate-fade-in pb-16">
      <h1 className="text-3xl text-gradient mt-4 mb-1">Draft & Keeper Analytics ({season})</h1>
      <p className="text-muted mb-8">Draft capital conversion, breakout steals, early-round busts, and round-by-round value efficiency.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {topDrafter && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-white/10 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-2"><Trophy size={14} className="text-yellow-400" /><span>Top Draft Class</span></div>
              <div className="flex items-center gap-3">
                {topDrafter.user?.avatar ? <img src={`https://sleepercdn.com/avatars/thumbs/${topDrafter.user.avatar}`} alt="" className="w-10 h-10 rounded-full border border-yellow-400/40 object-cover shrink-0" /> : <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">N/A</div>}
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm truncate">{topDrafter.user?.display_name || `Team ${topDrafter.roster_id}`}</div>
                  <div className="text-xs font-mono font-bold text-yellow-400 mt-0.5">{topDrafter.draftStarterPoints.toFixed(1)} starter pts</div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">Most starter points scored by drafted players</div>
          </div>
        )}

        {biggestSteal && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Sparkles size={14} className="text-emerald-400 shrink-0" />
                <span className="truncate">Biggest Steal</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={`https://sleepercdn.com/content/nfl/players/thumb/${biggestSteal.playerId}.jpg`}
                    alt=""
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-emerald-500/40 object-cover bg-black/40"
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        'https://sleepercdn.com/images/v2/icons/player_default.webp';
                    }}
                  />
                  {biggestSteal.avatar && (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${biggestSteal.avatar}`}
                      alt={biggestSteal.managerName}
                      className="w-4 h-4 rounded-full border border-black absolute -bottom-0.5 -right-0.5 shadow"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5 leading-snug">
                    <span className="truncate">{biggestSteal.playerName}</span>
                    <DraftPositionBadge position={biggestSteal.position} />
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted truncate mt-0.5 flex items-center gap-1 font-mono">
                    <span className="text-emerald-400 font-bold">Rd {biggestSteal.round}</span>
                    <span>•</span>
                    <span className="text-gray-200 font-sans truncate">{biggestSteal.managerName}</span>
                    <span className="text-emerald-400 font-semibold shrink-0">
                      (+{biggestSteal.valOverPos > 0 ? biggestSteal.valOverPos.toFixed(0) : biggestSteal.starterPoints.toFixed(0)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight truncate">
              Highest fantasy value over positional baseline (Round 7+)
            </div>
          </div>
        )}

        {bestRoiTeam && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-blue-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Target size={14} className="text-blue-400 shrink-0" />
                <span className="truncate">Highest Draft ROI</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {bestRoiTeam.avatar ? <img src={`https://sleepercdn.com/avatars/thumbs/${bestRoiTeam.avatar}`} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-blue-400/40 object-cover shrink-0" /> : <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">N/A</div>}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs sm:text-sm truncate">{bestRoiTeam.name}</div>
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-blue-400 mt-0.5 truncate">+{bestRoiTeam.roi}% vs expected</div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight truncate">Outperformed draft slot capital expectation</div>
          </div>
        )}

        {bestHitRate && (
          <div className="glass-card p-3 sm:p-4 rounded-xl border border-purple-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Target size={14} className="text-purple-400 shrink-0" />
                <span className="truncate">Hit Rate Leader</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {bestHitRate.avatar ? <img src={`https://sleepercdn.com/avatars/thumbs/${bestHitRate.avatar}`} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-purple-400/40 object-cover shrink-0" /> : <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">N/A</div>}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs sm:text-sm truncate">{bestHitRate.name}</div>
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-purple-400 mt-0.5 truncate">{bestHitRate.pct.toFixed(0)}% starting picks</div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight truncate">Highest % of draft picks that started ≥1 game</div>
          </div>
        )}
      </div>

      {/* 2-Hub Tab Navigation (Full Width 2-Column Grid) */}
      <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-2 mb-8 w-full">
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-3.5 px-6 py-3.5 rounded-xl text-sm font-bold transition-all cursor-pointer w-full ${
            activeTab === 'performance'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
              : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${activeTab === 'performance' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'}`}>
            <LayoutGrid size={20} />
          </div>
          <div className="text-left min-w-0">
            <div className="leading-tight text-sm sm:text-base font-bold truncate">Draft Performance & Heatmap</div>
            <div className={`text-xs font-normal mt-0.5 truncate ${activeTab === 'performance' ? 'text-blue-100' : 'text-gray-400'}`}>
              Steals, Hit Rates, Keepers & Board Heatmap
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('strategy')}
          className={`flex items-center gap-3.5 px-6 py-3.5 rounded-xl text-sm font-bold transition-all cursor-pointer w-full ${
            activeTab === 'strategy'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
              : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${activeTab === 'strategy' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'}`}>
            <Target size={20} />
          </div>
          <div className="text-left min-w-0">
            <div className="leading-tight text-sm sm:text-base font-bold truncate">Strategy & Capital Matrices</div>
            <div className={`text-xs font-normal mt-0.5 truncate ${activeTab === 'strategy' ? 'text-blue-100' : 'text-gray-400'}`}>
              4-Quadrant Scatter Charts & Positional Radars
            </div>
          </div>
        </button>
      </div>

      {activeTab === 'performance' && (
        <div className="space-y-8 animate-fade-in">
          <DraftStealsAndBusts picks={allDraftPicks} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card title="Draft Points Generated">
              <div className="chart-header"><div className="chart-description">Total fantasy points produced by drafted players while rostered.</div></div>
              <MobileTapHint />
              <div style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={draftPointsData} layout="vertical" margin={{ left: 15, right: 15, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#fff' }} width={95} tickMargin={4} />
                    <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                    <Bar dataKey="Starter Pts" stackId="a" fill="var(--accent-color)" isAnimationActive={false} />
                    <Bar dataKey="Bench Pts" stackId="a" fill="rgba(59, 130, 246, 0.3)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Draft Hit Rate %">
              <div className="chart-header"><div className="chart-description">Percentage of draft picks that became viable fantasy starters.</div></div>
              <MobileTapHint />
              <div style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={draftHitRateData} layout="vertical" margin={{ left: 15, right: 15, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#fff' }} width={95} tickMargin={4} />
                    <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                    <Bar dataKey="Hit %" stackId="a" fill="#10b981" isAnimationActive={false} />
                    <Bar dataKey="Bust %" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          {allKeepers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card title="Keeper Points Generated">
                <div className="chart-header"><div className="chart-description">Total starter vs bench points generated by designated keepers on their original rosters.</div></div>
                <MobileTapHint />
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={keeperPointsData} layout="vertical" margin={{ left: 15, right: 15, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#fff' }} width={95} tickMargin={4} />
                      <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                      <Bar dataKey="Starter Pts" stackId="a" fill="#10b981" isAnimationActive={false} />
                      <Bar dataKey="Bench Pts" stackId="a" fill="rgba(16, 185, 129, 0.3)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card title="Top Keepers Leaderboard">
                <div className="chart-header mb-4">
                  <div className="chart-description">
                    Most impactful retained assets ranked by value created over positional average.
                  </div>
                </div>
                <div className="space-y-3 overflow-y-auto pr-1.5 custom-scrollbar" style={{ maxHeight: '360px' }}>
                  {allKeepers.slice(0, 15).map((pick, i) => (
                    <div
                      key={`${pick.playerId}-${pick.rosterId}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/30 hover:border-emerald-500/40 hover:bg-black/40 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-xs font-mono font-bold text-emerald-400 w-5 text-right shrink-0">
                          #{i + 1}
                        </div>
                        <img
                          src={`https://sleepercdn.com/content/nfl/players/thumb/${pick.playerId}.jpg`}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-emerald-500/30 bg-black/40 shrink-0"
                          onError={e => {
                            (e.target as HTMLImageElement).src =
                              'https://sleepercdn.com/images/v2/icons/player_default.webp';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs sm:text-sm truncate group-hover:text-emerald-400 transition-colors">
                              {pick.playerName}
                            </span>
                            <DraftPositionBadge position={pick.position} />
                          </div>
                          <div className="text-[11px] text-muted truncate mt-0.5">
                            Rd {pick.round} • <span className="text-gray-300">{pick.managerName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-sm font-mono font-bold text-emerald-400">
                          {pick.valOverPos > 0 ? `+${pick.valOverPos.toFixed(1)}` : pick.starterPoints.toFixed(1)}{' '}
                          <span className="text-[10px] text-muted">
                            {pick.valOverPos > 0 ? `vs ${pick.position}` : 'pts'}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted font-mono">
                          {pick.starterPoints.toFixed(1)} pts • {pick.gamesStartedOnRoster} starts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
          <Card title="Draft Value by Round Heatmap">
            <div className="chart-header mb-4">
              <div className="chart-description">
                Average total fantasy points per pick in each round. Green indicates scoring above the round's league-wide average per pick; red indicates scoring below average.
                <span className="block mt-1 text-[11px] text-muted/80">
                  💡 <strong>Note on multi-pick rounds:</strong> When a manager holds multiple picks in a single round via trades (e.g. <em>"3 picks"</em>), the cell displays their average points scored across those picks.
                </span>
              </div>
            </div>
            <DraftHeatmap draftData={draftData} />
          </Card>
        </div>
      )}

      {activeTab === 'strategy' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Scatter 1: Draft Capital vs Starter Yield */}
            <Card title="Draft Capital vs Starter Yield">
              <div className="chart-header">
                <div className="chart-description">Total draft capital owned entering the draft (expected points for pick slots) vs actual starter points generated.</div>
                <div className="chart-legend-grid">
                  <div className="legend-item"><div className="legend-item-header">🚀 <span>Top-Left (Value Extractors)</span></div><div className="legend-item-desc">High starter production achieved from modest draft capital.</div></div>
                  <div className="legend-item"><div className="legend-item-header">👑 <span>Top-Right (Capital Delivered)</span></div><div className="legend-item-desc">Heavy draft investment converted into elite starter points.</div></div>
                  <div className="legend-item"><div className="legend-item-header">📉 <span>Bottom-Left (Low Capital & Yield)</span></div><div className="legend-item-desc">Modest draft investment and low starting lineup output.</div></div>
                  <div className="legend-item"><div className="legend-item-header">💸 <span>Bottom-Right (Capital Wasted)</span></div><div className="legend-item-desc">Premium draft capital heavily underperformed starter expectations.</div></div>
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 380, marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 45, left: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="expectedTotal" name="Expected Points" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={['auto', 'auto']} label={{ value: 'Expected Draft Capital (Points)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' }} />
                    <YAxis type="number" dataKey="actualTotal" name="Actual Points" stroke="#94a3b8" tick={{ fontSize: 12 }} label={{ value: 'Actual Starter Points', angle: -90, position: 'insideLeft', offset: 0, fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' }} />
                    <RechartsTooltip content={<CustomScatterTooltip />} />
                    <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={false} />
                    <ReferenceLine x={scatterAvgs.expectedTotal} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                    <ReferenceLine y={scatterAvgs.actualTotal} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Scatter 2: Draft ROI vs Season Wins */}
            <Card title="Draft ROI vs Season Wins">
              <div className="chart-header">
                <div className="chart-description">Correlates draft return on investment (% above/below draft slot expectation) with regular-season wins.</div>
                <div className="chart-legend-grid">
                  <div className="legend-item"><div className="legend-item-header">🔄 <span>Top-Left (Waiver & Trade Saviors)</span></div><div className="legend-item-desc">Overcame poor draft returns to win games through in-season moves.</div></div>
                  <div className="legend-item"><div className="legend-item-header">🏆 <span>Top-Right (Draft-Powered Winners)</span></div><div className="legend-item-desc">Strong draft efficiency translated directly into regular-season wins.</div></div>
                  <div className="legend-item"><div className="legend-item-header">💀 <span>Bottom-Left (Draft-Sunk Struggles)</span></div><div className="legend-item-desc">Draft busts and negative ROI directly doomed the season.</div></div>
                  <div className="legend-item"><div className="legend-item-header">💔 <span>Bottom-Right (Unlucky / Mismanaged)</span></div><div className="legend-item-desc">Draft outscored expectations but fell victim to tough schedule or coaching.</div></div>
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 380, marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 45, left: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="roi" name="Draft ROI" stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" domain={['auto', 'auto']} label={{ value: 'Draft ROI (% vs expected)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' }} />
                    <YAxis type="number" dataKey="wins" name="Wins" stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} label={{ value: 'Regular Season Wins', angle: -90, position: 'insideLeft', offset: 0, fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' }} />
                    <RechartsTooltip content={<CustomScatterTooltip />} />
                    <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={false} />
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                    <ReferenceLine y={scatterAvgs.wins} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Scatter 3: Early Capital (1-5) vs Late Steals (6+) */}
            <Card title="Early Capital (1–5) vs Late Steals (6+)">
              <div className="chart-header">
                <div className="chart-description">Compares value extracted in premium early rounds (1–5) vs late-round discovery (6+).</div>
                <div className="chart-legend-grid">
                  <div className="legend-item"><div className="legend-item-header">🎯 <span>Top-Left (Late-Round Saviors)</span></div><div className="legend-item-desc">Rescued early-round misses with high-impact late-round steals.</div></div>
                  <div className="legend-item"><div className="legend-item-header">💎 <span>Top-Right (Complete Draft Masters)</span></div><div className="legend-item-desc">Hit on early foundation stars and discovered late-round gems.</div></div>
                  <div className="legend-item"><div className="legend-item-header">⚠️ <span>Bottom-Left (Total Draft Struggles)</span></div><div className="legend-item-desc">Missed expectations across both early foundation and late flyers.</div></div>
                  <div className="legend-item"><div className="legend-item-header">🧱 <span>Bottom-Right (Early-Round Reliant)</span></div><div className="legend-item-desc">Strong top-round anchors but failed to uncover late-round depth.</div></div>
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 380, marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 45, left: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="earlyDiff" name="Early Rd Value" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={['auto', 'auto']} label={{ value: 'Early Rounds (1–5) Value (+/- vs Avg)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' }} />
                    <YAxis type="number" dataKey="lateDiff" name="Late Rd Value" stroke="#94a3b8" tick={{ fontSize: 12 }} label={{ value: 'Late Rounds (6+) Value (+/- vs Avg)', angle: -90, position: 'insideLeft', offset: 0, fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' }} />
                    <RechartsTooltip content={<CustomScatterTooltip />} />
                    <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={false} />
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Scatter 4: Draft Injury Impact (Luck vs Skill) */}
            <Card title="Draft Injury Impact (Luck vs Skill)">
              <div className="chart-header">
                <div className="chart-description">Correlates draft return on investment (skill) against games lost to injury by drafted starters (luck).</div>
                <div className="chart-legend-grid">
                  <div className="legend-item"><div className="legend-item-header">🩹 <span>Top-Left (Sunk by Injuries)</span></div><div className="legend-item-desc">Draft underperformed primarily due to severe injuries to key starters.</div></div>
                  <div className="legend-item"><div className="legend-item-header">🛡️ <span>Top-Right (Injury-Resilient Drafters)</span></div><div className="legend-item-desc">Positive draft ROI despite losing heavy starter time to injury.</div></div>
                  <div className="legend-item"><div className="legend-item-header">📉 <span>Bottom-Left (Healthy Underperformers)</span></div><div className="legend-item-desc">Draft missed expectations despite starters staying mostly healthy.</div></div>
                  <div className="legend-item"><div className="legend-item-header">🌟 <span>Bottom-Right (Healthy & Productive)</span></div><div className="legend-item-desc">Drafted starters stayed healthy and produced as intended.</div></div>
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 380, marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 45, left: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="roi" name="Draft ROI" stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" domain={['auto', 'auto']} label={{ value: 'Draft ROI (% vs expected)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' }} />
                    <YAxis type="number" dataKey="gamesMissed" name="Games Missed" stroke="#94a3b8" tick={{ fontSize: 12 }} label={{ value: 'Starter Games Missed to Injury', angle: -90, position: 'insideLeft', offset: 0, fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' }} />
                    <RechartsTooltip content={<CustomScatterTooltip />} />
                    <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={false} />
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                    <ReferenceLine y={scatterAvgs.gamesMissed} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <Card title="Positional Strategy Radar Maps">
            <div className="chart-header">
              <div className="chart-description">
                Concentration of draft picks allocated to each position across different draft phases.
                <span className="block mt-1 text-[11px] text-muted/80">
                  👆 Click manager pills below to compare strategies (showing {activeRadarProfiles.length}/4 selected).
                </span>
              </div>
            </div>
            <MobileTapHint />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4">
              {[{ title: 'Early Phase (Rounds 1–4)', data: earlyRadarData }, { title: 'Middle Phase (Rounds 5–9)', data: midRadarData }, { title: 'Late Phase (Rounds 10+)', data: lateRadarData }].map((hub, i) => (
                <div key={i} className="flex flex-col items-center bg-black/20 p-4 rounded-xl border border-white/5">
                  <h3 className="text-sm text-white font-bold mb-2">{hub.title}</h3>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={hub.data}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <RechartsTooltip formatter={(_value: any, name: any, entry: any) => { const rawKey = entry.dataKey?.replace('manager_', 'raw_'); return [`${entry.payload[rawKey]} picks`, name]; }} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                        {activeRadarProfiles.map((p, idx) => <Radar key={p.roster_id} name={p.user?.display_name || `Team ${p.roster_id}`} dataKey={`manager_${idx}`} stroke={CHART_COLORS[idx]} fill={CHART_COLORS[idx]} fillOpacity={0.2} />)}
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-6 border-t border-white/10 pt-4">
              {radarProfiles.map(p => {
                const activeIdx = radarMgrs.indexOf(p.roster_id);
                const isActive = activeIdx !== -1;
                const color = isActive ? CHART_COLORS[activeIdx] : '#64748b';
                return (
                  <button key={p.roster_id} onClick={() => handleToggle(p.roster_id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${isActive ? 'bg-white/10 text-white shadow' : 'bg-transparent text-muted border-white/5 hover:border-white/20'}`} style={{ borderColor: isActive ? color : undefined }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span>{p.user?.display_name || `Team ${p.roster_id}`}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Draft;
