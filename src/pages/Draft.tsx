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

  const [activeTab, setActiveTab] = useState<'overview' | 'matrices' | 'strategy' | 'keepers' | 'heatmap'>('overview');
  const [radarMgrs, setRadarMgrs] = useState<number[]>([]);

  useEffect(() => {
    if (draftData && draftData.length > 0 && radarMgrs.length === 0) {
      setRadarMgrs(draftData.slice(0, 4).map(d => d.roster_id));
    }
  }, [draftData, radarMgrs.length]);

  // Round averages computation
  const roundAverages = useMemo(() => {
    if (!draftData || draftData.length === 0) return {};
    const allLeaguePicks = draftData.flatMap(d => d.draftPicks || []);
    const aggregates: Record<number, { sum: number; count: number }> = {};

    allLeaguePicks.forEach(p => {
      if (!p || !p.round) return;
      if (!aggregates[p.round]) aggregates[p.round] = { sum: 0, count: 0 };
      aggregates[p.round].sum += p.starterPoints || 0;
      aggregates[p.round].count += 1;
    });

    const avgs: Record<number, number> = {};
    Object.entries(aggregates).forEach(([rd, val]) => {
      avgs[Number(rd)] = val.count > 0 ? val.sum / val.count : 0;
    });
    return avgs;
  }, [draftData]);

  // Scatter data computation
  const scatterData = useMemo(() => {
    if (!draftData || draftData.length === 0) return [];
    return draftData.map(d => {
      let expectedTotal = 0;
      let expectedEarly = 0;
      let actualEarly = 0;
      let expectedLate = 0;
      let actualLate = 0;

      const picks = d.draftPicks || [];
      picks.forEach(p => {
        const expected = roundAverages[p.round] || 0;
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

  if (loading || !selectedSeason) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh] gap-4">
        <div className="loading-spinner"></div>
        <div className="text-muted text-sm font-medium">
          Analyzing draft picks and roster tenures...
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-danger-color p-8 text-center">Error loading draft data: {error}</div>;
  }

  if (!draftData.length) {
    return <div className="text-muted p-8 text-center">No draft data available for this season.</div>;
  }

  // All individual draft picks and keepers
  const allDraftPicks = draftData
    .flatMap(d =>
      d.draftPicks.map(pick => ({
        ...pick,
        managerName: d.user?.display_name || `Team ${d.roster_id}`,
        avatar: d.user?.avatar,
      }))
    )
    .sort((a, b) => b.starterPoints - a.starterPoints);

  const allKeepers = draftData
    .flatMap(d =>
      d.keepers.map(k => ({
        ...k,
        managerName: d.user?.display_name || `Team ${d.roster_id}`,
        avatar: d.user?.avatar,
      }))
    )
    .sort((a, b) => b.starterPoints - a.starterPoints);

  // 1. Top Drafter KPI
  const topDrafter = [...draftData].sort((a, b) => b.draftStarterPoints - a.draftStarterPoints)[0];
  // 2. Biggest Steal KPI
  const biggestSteal = allDraftPicks
    .filter(p => !p.isKeeper && p.round >= 7)
    .sort((a, b) => b.starterPoints - a.starterPoints)[0];
  // 3. Best ROI KPI
  const bestRoiTeam = [...scatterData].sort((a, b) => b.roi - a.roi)[0];
  // 4. Hit Rate Leader KPI
  const bestHitRate = [...draftData]
    .map(d => {
      const total = d.draftHits + d.draftBusts;
      return {
        name: d.user?.display_name || `Team ${d.roster_id}`,
        avatar: d.user?.avatar,
        pct: total > 0 ? (d.draftHits / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.pct - a.pct)[0];

  // Chart datasets
  const draftPointsData = [...draftData]
    .sort((a, b) => b.draftStarterPoints - a.draftStarterPoints)
    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      'Starter Pts': Number(d.draftStarterPoints.toFixed(1)),
      'Bench Pts': Number(d.draftBenchPoints.toFixed(1)),
    }));

  const draftHitRateData = [...draftData]
    .map(d => {
      const totalPicks = d.draftHits + d.draftBusts;
      const hitPct = totalPicks > 0 ? Number(((d.draftHits / totalPicks) * 100).toFixed(1)) : 0;
      const bustPct = totalPicks > 0 ? Number((100 - hitPct).toFixed(1)) : 0;
      return {
        name: d.user?.display_name || `Team ${d.roster_id}`,
        'Hit %': hitPct,
        'Bust %': bustPct,
        totalPicks,
        hits: d.draftHits,
        busts: d.draftBusts,
      };
    })
    .sort((a, b) => b['Hit %'] - a['Hit %']);

  const keeperPointsData = [...draftData]
    .filter(d => d.keepers.length > 0)
    .sort((a, b) => b.keeperStarterPoints - a.keeperStarterPoints)
    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      'Starter Pts': Number(d.keeperStarterPoints.toFixed(1)),
      'Bench Pts': Number(d.keeperBenchPoints.toFixed(1)),
    }));

  // Positional Radar Data
  const radarProfiles = [...draftData].sort((a, b) =>
    (a.user?.display_name || '').localeCompare(b.user?.display_name || '')
  );
  const activeRadarProfiles = radarMgrs
    .map(id => radarProfiles.find(p => p.roster_id === id))
    .filter(p => !!p) as any[];

  const buildPosRadarData = (minRound: number, maxRound: number, excludeKeepers: boolean) => {
    const data: Record<string, any>[] = [
      { subject: 'QB' },
      { subject: 'RB' },
      { subject: 'WR' },
      { subject: 'TE' },
      { subject: 'K' },
      { subject: 'DEF/IDP' },
    ];

    const allManagerTotals = radarProfiles.map(p => {
      let qb = 0, rb = 0, wr = 0, te = 0, k = 0, idp = 0;
      const picks = p.draftPicks.filter(
        (pick: any) =>
          pick.round >= minRound && pick.round <= maxRound && (!excludeKeepers || !pick.isKeeper)
      );
      picks.forEach((pick: any) => {
        const pos = pick.position || '??';
        if (pos === 'QB') qb++;
        else if (pos === 'RB') rb++;
        else if (pos === 'WR') wr++;
        else if (pos === 'TE') te++;
        else if (pos === 'K') k++;
        else if (['DEF', 'DL', 'LB', 'DB', 'IDP'].includes(pos)) idp++;
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

      const picks = p.draftPicks.filter(
        (pick: any) =>
          pick.round >= minRound && pick.round <= maxRound && (!excludeKeepers || !pick.isKeeper)
      );

      picks.forEach((pick: any) => {
        const pos = pick.position || '??';
        if (pos === 'QB') qb++;
        else if (pos === 'RB') rb++;
        else if (pos === 'WR') wr++;
        else if (pos === 'TE') te++;
        else if (pos === 'K') k++;
        else if (['DEF', 'DL', 'LB', 'DB', 'IDP'].includes(pos)) idp++;
      });

      data[0][`manager_${idx}`] = Number(((qb / maxQB) * 100).toFixed(1));
      data[1][`manager_${idx}`] = Number(((rb / maxRB) * 100).toFixed(1));
      data[2][`manager_${idx}`] = Number(((wr / maxWR) * 100).toFixed(1));
      data[3][`manager_${idx}`] = Number(((te / maxTE) * 100).toFixed(1));
      data[4][`manager_${idx}`] = Number(((k / maxK) * 100).toFixed(1));
      data[5][`manager_${idx}`] = Number(((idp / maxIDP) * 100).toFixed(1));

      data[0][`raw_${idx}`] = qb;
      data[1][`raw_${idx}`] = rb;
      data[2][`raw_${idx}`] = wr;
      data[3][`raw_${idx}`] = te;
      data[4][`raw_${idx}`] = k;
      data[5][`raw_${idx}`] = idp;
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
      {/* Header */}
      <h1 className="text-3xl text-gradient mt-4 mb-1">
        Draft & Keeper Analytics ({season})
      </h1>
      <p className="text-muted mb-8">
        Draft capital conversion, breakout steals, early-round busts, and round-by-round value efficiency.
      </p>

      {/* Hero Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* KPI 1: Most Productive Drafter */}
        {topDrafter && (
          <div className="glass-card p-4 rounded-xl border border-white/10 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Trophy size={14} className="text-yellow-400" />
                <span>Top Draft Class</span>
              </div>
              <div className="flex items-center gap-3">
                {topDrafter.user?.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${topDrafter.user.avatar}`}
                    alt=""
                    className="w-10 h-10 rounded-full border border-yellow-400/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                    N/A
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm truncate">
                    {topDrafter.user?.display_name || `Team ${topDrafter.roster_id}`}
                  </div>
                  <div className="text-xs font-mono font-bold text-yellow-400 mt-0.5">
                    {topDrafter.draftStarterPoints.toFixed(1)} starter pts
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              Most starter points scored by drafted players
            </div>
          </div>
        )}

        {/* KPI 2: Biggest Steal */}
        {biggestSteal && (
          <div className="glass-card p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Sparkles size={14} className="text-emerald-400" />
                <span>Biggest Steal</span>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={`https://sleepercdn.com/content/nfl/players/thumb/${biggestSteal.playerId}.jpg`}
                  alt=""
                  className="w-10 h-10 rounded-full border border-emerald-500/40 object-cover bg-black/40 shrink-0"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      'https://sleepercdn.com/images/v2/icons/player_default.webp';
                  }}
                />
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                    <span className="truncate">{biggestSteal.playerName}</span>
                    <DraftPositionBadge position={biggestSteal.position} />
                  </div>
                  <div className="text-xs font-mono text-muted mt-0.5 truncate">
                    Rd {biggestSteal.round} • <strong className="text-emerald-400">{biggestSteal.starterPoints.toFixed(1)} pts</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              Top-scoring pick from Round 7 or later
            </div>
          </div>
        )}

        {/* KPI 3: Best Draft ROI */}
        {bestRoiTeam && (
          <div className="glass-card p-4 rounded-xl border border-blue-500/20 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Flame size={14} className="text-blue-400" />
                <span>Highest Draft ROI</span>
              </div>
              <div className="flex items-center gap-3">
                {bestRoiTeam.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${bestRoiTeam.avatar}`}
                    alt=""
                    className="w-10 h-10 rounded-full border border-blue-400/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                    N/A
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm truncate">
                    {bestRoiTeam.name}
                  </div>
                  <div className="text-xs font-mono font-bold text-blue-400 mt-0.5">
                    +{bestRoiTeam.roi}% vs expected
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              Outperformed draft slot capital expectation
            </div>
          </div>
        )}

        {/* KPI 4: Hit Rate Leader */}
        {bestHitRate && (
          <div className="glass-card p-4 rounded-xl border border-purple-500/20 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Target size={14} className="text-purple-400" />
                <span>Hit Rate Leader</span>
              </div>
              <div className="flex items-center gap-3">
                {bestHitRate.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${bestHitRate.avatar}`}
                    alt=""
                    className="w-10 h-10 rounded-full border border-purple-400/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                    N/A
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm truncate">
                    {bestHitRate.name}
                  </div>
                  <div className="text-xs font-mono font-bold text-purple-400 mt-0.5">
                    {bestHitRate.pct.toFixed(0)}% starting picks
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
              Highest % of draft picks that started ≥1 game
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-accent-color text-white shadow-lg shadow-accent-color/20'
              : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'
          }`}
        >
          <LayoutGrid size={16} />
          <span>Overview & Steals</span>
        </button>

        <button
          onClick={() => setActiveTab('matrices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'matrices'
              ? 'bg-accent-color text-white shadow-lg shadow-accent-color/20'
              : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'
          }`}
        >
          <Target size={16} />
          <span>Capital & Yield Matrices</span>
        </button>

        <button
          onClick={() => setActiveTab('strategy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'strategy'
              ? 'bg-accent-color text-white shadow-lg shadow-accent-color/20'
              : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'
          }`}
        >
          <PieChart size={16} />
          <span>Positional Strategy</span>
        </button>

        {allKeepers.length > 0 && (
          <button
            onClick={() => setActiveTab('keepers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'keepers'
                ? 'bg-accent-color text-white shadow-lg shadow-accent-color/20'
                : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'
            }`}
          >
            <Award size={16} />
            <span>Keepers ({allKeepers.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('heatmap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'heatmap'
              ? 'bg-accent-color text-white shadow-lg shadow-accent-color/20'
              : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'
          }`}
        >
          <Grid size={16} />
          <span>Value Heatmap</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & STEALS */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Steals & Busts Spotlight */}
          <DraftStealsAndBusts picks={allDraftPicks} />

          {/* Row 1: Draft Points & Hit Rate Bar Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card title="Draft Points Generated">
              <div className="chart-header">
                <div className="chart-description">
                  Total fantasy points produced by drafted players while rostered, split by starting lineups vs bench.
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={draftPointsData} layout="vertical" margin={{ left: 110, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: '#fff' }}
                      width={105}
                      tickMargin={4}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(15,17,21,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                      }}
                    />
                    <Legend
                      content={() => (
                        <div className="flex justify-center gap-6 mt-2 text-xs">
                          <span className="flex items-center gap-1.5 text-muted">
                            <span className="w-3 h-3 rounded-sm bg-accent-color inline-block" />
                            Starter Pts
                          </span>
                          <span className="flex items-center gap-1.5 text-muted">
                            <span className="w-3 h-3 rounded-sm bg-blue-500/30 inline-block" />
                            Bench Pts
                          </span>
                        </div>
                      )}
                    />
                    <Bar dataKey="Starter Pts" stackId="a" fill="var(--accent-color)" isAnimationActive={false} />
                    <Bar dataKey="Bench Pts" stackId="a" fill="rgba(59, 130, 246, 0.3)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Draft Hit Rate %">
              <div className="chart-header">
                <div className="chart-description">
                  Percentage of draft picks that became viable fantasy starters (started ≥1 game) vs non-contributors.
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={draftHitRateData} layout="vertical" margin={{ left: 110, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: '#fff' }}
                      width={105}
                      tickMargin={4}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(15,17,21,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                      }}
                    />
                    <Legend
                      content={() => (
                        <div className="flex justify-center gap-6 mt-2 text-xs">
                          <span className="flex items-center gap-1.5 text-muted">
                            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                            Hit % (Started ≥1 Game)
                          </span>
                          <span className="flex items-center gap-1.5 text-muted">
                            <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
                            Bust %
                          </span>
                        </div>
                      )}
                    />
                    <Bar dataKey="Hit %" stackId="a" fill="#10b981" isAnimationActive={false} />
                    <Bar dataKey="Bust %" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Top Draft Picks Overall */}
          <Card title="Top Draft Picks Overall">
            <div className="chart-header mb-4">
              <div className="chart-description">
                The highest-scoring individual draft picks on starting lineups during the fantasy season.
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allDraftPicks.slice(0, 18).map((pick, i) => (
                <div
                  key={`${pick.playerId}-${pick.rosterId}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/30 hover:border-accent-color/40 hover:bg-black/40 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-xs font-mono font-bold text-muted/60 w-5 shrink-0 text-right">
                      #{i + 1}
                    </div>
                    <div className="relative shrink-0">
                      <img
                        src={`https://sleepercdn.com/content/nfl/players/thumb/${pick.playerId}.jpg`}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border border-white/10 bg-black/40"
                        onError={e => {
                          (e.target as HTMLImageElement).src =
                            'https://sleepercdn.com/images/v2/icons/player_default.webp';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs sm:text-sm truncate group-hover:text-accent-color transition-colors">
                          {pick.playerName}
                        </span>
                        <DraftPositionBadge position={pick.position} />
                      </div>
                      <div className="text-[11px] text-muted truncate mt-0.5">
                        Rd {pick.round}.{String(pick.pickNo % 12 || 12).padStart(2, '0')} •{' '}
                        <span className="text-gray-300">{pick.managerName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <div className="text-sm font-mono font-bold text-accent-color">
                      {pick.starterPoints.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-muted font-mono">{pick.gamesStartedOnRoster} starts</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: CAPITAL & YIELD MATRICES */}
      {activeTab === 'matrices' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          {/* Scatter 1: Draft Capital vs Yield */}
          <Card title="Draft Capital vs Starter Yield">
            <div className="chart-header">
              <div className="chart-description">
                Total draft capital owned entering the draft (expected points for pick slots) vs actual starter points generated.
              </div>
              <div className="chart-legend-grid">
                <div className="legend-item">
                  <div className="legend-item-header">Top-Right (High Capital & High Yield)</div>
                  <div className="legend-item-desc">Drafted according to premium draft capital</div>
                </div>
                <div className="legend-item">
                  <div className="legend-item-header">Top-Left (Value Extractors)</div>
                  <div className="legend-item-desc">High starter points from modest draft capital</div>
                </div>
              </div>
            </div>
            <MobileTapHint />
            <div style={{ height: 380, marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    type="number"
                    dataKey="expectedTotal"
                    name="Expected Points"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    domain={['auto', 'auto']}
                    label={{
                      value: 'Expected Draft Capital (Points)',
                      position: 'insideBottom',
                      offset: -12,
                      fill: '#64748b',
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="actualTotal"
                    name="Actual Points"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: 'Actual Starter Points',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#64748b',
                      fontSize: 12,
                    }}
                  />
                  <RechartsTooltip content={<CustomScatterTooltip />} />
                  <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={false} />
                  <ReferenceLine x={scatterAvgs.expectedTotal} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <ReferenceLine y={scatterAvgs.actualTotal} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Scatter 2: Draft Efficiency vs Wins */}
          <Card title="Draft ROI vs Season Wins">
            <div className="chart-header">
              <div className="chart-description">
                Correlates draft return on investment (% above/below draft slot expectation) with regular-season wins.
              </div>
              <div className="chart-legend-grid">
                <div className="legend-item">
                  <div className="legend-item-header">Right Side (Positive ROI)</div>
                  <div className="legend-item-desc">Draft outscored expected baseline</div>
                </div>
                <div className="legend-item">
                  <div className="legend-item-header">Top-Left (Waiver / Trade Powered)</div>
                  <div className="legend-item-desc">Won games despite negative draft returns</div>
                </div>
              </div>
            </div>
            <MobileTapHint />
            <div style={{ height: 380, marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    type="number"
                    dataKey="roi"
                    name="Draft ROI"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    unit="%"
                    domain={['auto', 'auto']}
                    label={{
                      value: 'Draft ROI (% vs expected)',
                      position: 'insideBottom',
                      offset: -12,
                      fill: '#64748b',
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="wins"
                    name="Wins"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                    label={{
                      value: 'Regular Season Wins',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#64748b',
                      fontSize: 12,
                    }}
                  />
                  <RechartsTooltip content={<CustomScatterTooltip />} />
                  <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={false} />
                  <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <ReferenceLine y={scatterAvgs.wins} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Scatter 3: Early Capital vs Late Value */}
          <Card title="Early Capital (1–5) vs Late Steals (6+)">
            <div className="chart-header">
              <div className="chart-description">
                Compares value extracted in premium early rounds (1–5) vs late-round discovery (6+).
              </div>
            </div>
            <MobileTapHint />
            <div style={{ height: 380, marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    type="number"
                    dataKey="earlyDiff"
                    name="Early Rd Value"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    domain={['auto', 'auto']}
                    label={{
                      value: 'Early Rounds (1–5) Value (+/- vs Avg)',
                      position: 'insideBottom',
                      offset: -12,
                      fill: '#64748b',
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="lateDiff"
                    name="Late Rd Value"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: 'Late Rounds (6+) Value (+/- vs Avg)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#64748b',
                      fontSize: 12,
                    }}
                  />
                  <RechartsTooltip content={<CustomScatterTooltip />} />
                  <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={false} />
                  <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Scatter 4: Draft Injury Impact */}
          <Card title="Draft Injury Impact (Luck vs Skill)">
            <div className="chart-header">
              <div className="chart-description">
                Correlates draft return on investment (skill) against games lost to injury by drafted starters (luck).
              </div>
            </div>
            <MobileTapHint />
            <div style={{ height: 380, marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    type="number"
                    dataKey="roi"
                    name="Draft ROI"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    unit="%"
                    domain={['auto', 'auto']}
                    label={{
                      value: 'Draft ROI (% vs expected)',
                      position: 'insideBottom',
                      offset: -12,
                      fill: '#64748b',
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="gamesMissed"
                    name="Games Missed"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: 'Starter Games Missed to Injury',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#64748b',
                      fontSize: 12,
                    }}
                  />
                  <RechartsTooltip content={<CustomScatterTooltip />} />
                  <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={false} />
                  <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <ReferenceLine y={scatterAvgs.gamesMissed} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: POSITIONAL STRATEGY */}
      {activeTab === 'strategy' && (
        <div className="space-y-8 animate-fade-in">
          <Card title="Positional Strategy Radar Maps">
            <div className="chart-header">
              <div className="chart-description">
                Concentration of draft picks allocated to each position across different phases of the draft.
              </div>
            </div>
            <MobileTapHint />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4">
              <div className="flex flex-col items-center bg-black/20 p-4 rounded-xl border border-white/5">
                <h3 className="text-sm text-white font-bold mb-2">Early Phase (Rounds 1–4)</h3>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={earlyRadarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(_value: any, name: any, entry: any) => {
                          const rawKey = entry.dataKey?.replace('manager_', 'raw_');
                          const displayVal = entry.payload[rawKey] !== undefined ? entry.payload[rawKey] : _value;
                          return [`${displayVal} picks`, name];
                        }}
                        contentStyle={{
                          backgroundColor: 'rgba(15,17,21,0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                      />
                      {activeRadarProfiles.map((p, i) => (
                        <Radar
                          key={p.roster_id}
                          name={p.user.display_name}
                          dataKey={`manager_${i}`}
                          stroke={CHART_COLORS[i]}
                          fill={CHART_COLORS[i]}
                          fillOpacity={0.2}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex flex-col items-center bg-black/20 p-4 rounded-xl border border-white/5">
                <h3 className="text-sm text-white font-bold mb-2">Middle Phase (Rounds 5–9)</h3>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={midRadarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(_value: any, name: any, entry: any) => {
                          const rawKey = entry.dataKey?.replace('manager_', 'raw_');
                          const displayVal = entry.payload[rawKey] !== undefined ? entry.payload[rawKey] : _value;
                          return [`${displayVal} picks`, name];
                        }}
                        contentStyle={{
                          backgroundColor: 'rgba(15,17,21,0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                      />
                      {activeRadarProfiles.map((p, i) => (
                        <Radar
                          key={p.roster_id}
                          name={p.user.display_name}
                          dataKey={`manager_${i}`}
                          stroke={CHART_COLORS[i]}
                          fill={CHART_COLORS[i]}
                          fillOpacity={0.2}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex flex-col items-center bg-black/20 p-4 rounded-xl border border-white/5">
                <h3 className="text-sm text-white font-bold mb-2">Late Phase (Rounds 10+)</h3>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={lateRadarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(_value: any, name: any, entry: any) => {
                          const rawKey = entry.dataKey?.replace('manager_', 'raw_');
                          const displayVal = entry.payload[rawKey] !== undefined ? entry.payload[rawKey] : _value;
                          return [`${displayVal} picks`, name];
                        }}
                        contentStyle={{
                          backgroundColor: 'rgba(15,17,21,0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                      />
                      {activeRadarProfiles.map((p, i) => (
                        <Radar
                          key={p.roster_id}
                          name={p.user.display_name}
                          dataKey={`manager_${i}`}
                          stroke={CHART_COLORS[i]}
                          fill={CHART_COLORS[i]}
                          fillOpacity={0.2}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Manager Filter Selector */}
            <div className="flex flex-wrap justify-center gap-2 mt-6 border-t border-white/10 pt-4">
              {radarProfiles.map(p => {
                const activeIdx = radarMgrs.indexOf(p.roster_id);
                const isActive = activeIdx !== -1;
                const color = isActive ? CHART_COLORS[activeIdx] : '#64748b';

                return (
                  <button
                    key={p.roster_id}
                    onClick={() => handleToggle(p.roster_id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                      isActive ? 'bg-white/10 text-white shadow' : 'bg-transparent text-muted border-white/5 hover:border-white/20'
                    }`}
                    style={{ borderColor: isActive ? color : undefined }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: color }}
                    />
                    <span>{p.user?.display_name || `Team ${p.roster_id}`}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: KEEPERS */}
      {activeTab === 'keepers' && allKeepers.length > 0 && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card title="Keeper Points Generated">
              <div className="chart-header">
                <div className="chart-description">
                  Total starter vs bench points generated by designated keepers on their original rosters.
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={keeperPointsData} layout="vertical" margin={{ left: 110, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: '#fff' }}
                      width={105}
                      tickMargin={4}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(15,17,21,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                      }}
                    />
                    <Bar dataKey="Starter Pts" stackId="a" fill="#10b981" isAnimationActive={false} />
                    <Bar dataKey="Bench Pts" stackId="a" fill="rgba(16, 185, 129, 0.3)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Top Keepers Leaderboard">
              <div className="chart-header mb-4">
                <div className="chart-description">
                  Most productive retained assets by starter fantasy points scored.
                </div>
              </div>
              <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '350px' }}>
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
                        {pick.starterPoints.toFixed(1)} <span className="text-[10px] text-muted">pts</span>
                      </div>
                      <div className="text-[10px] text-muted font-mono">{pick.gamesPlayedOnRoster} starts</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 5: HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="space-y-8 animate-fade-in">
          <Card title="Draft Value by Round Heatmap">
            <div className="chart-header mb-4">
              <div className="chart-description">
                Average total fantasy points per pick in each round. Green indicates scoring above the round's league-wide average per pick; red indicates scoring below average.
              </div>
            </div>
            <DraftHeatmap draftData={draftData} />
          </Card>
        </div>
      )}
    </div>
  );
};

export default Draft;
