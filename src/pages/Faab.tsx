import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../components/Card';
import { MobileTapHint } from '../components/MobileTapHint';
import { useLeagueContext } from '../context/LeagueContext';
import { useFaabEfficiency } from '../hooks/useFaabEfficiency';
import { useFreeAgencyEfficiency } from '../hooks/useFreeAgencyEfficiency';
import { DraftPositionBadge } from '../components/draft/DraftPositionBadge';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Label,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine
} from 'recharts';
import {
  Trophy,
  Target,
  Flame,
  DollarSign,
  LayoutGrid,
  TrendingUp,
  Sparkles,
  Zap
} from 'lucide-react';

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 28;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;

  if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) return null;

  return (
    <svg x={cx - size / 2} y={cy - size / 2} width={size} height={size}>
      <defs>
        <clipPath id={`clip-faab-${payload.name}`}>
          <circle cx={size / 2} cy={size / 2} r={size / 2} />
        </clipPath>
      </defs>
      {avatarUrl ? (
        <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#clip-faab-${payload.name})`} />
      ) : (
        <circle cx={size / 2} cy={size / 2} r={size / 2} fill="#475569" />
      )}
    </svg>
  );
};

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-3 mb-2">
          {data.avatar ? (
            <img src={`https://sleepercdn.com/avatars/thumbs/${data.avatar}`} alt="avatar" className="avatar" width={24} height={24} />
          ) : (
            <div className="avatar bg-gray-600" style={{ width: 24, height: 24 }}></div>
          )}
          <span className="font-bold text-lg">{data.name}</span>
        </div>
        {data.winPct !== undefined && <div className="text-sm text-muted">Win %: <span className="text-emerald-400 font-bold ml-1">{data.winPct}%</span></div>}
        {data.faabEfficiency !== undefined && <div className="text-sm text-muted">Efficiency: <span className="text-white font-bold ml-1">{data.faabEfficiency} pts/$</span></div>}
        {data.averageBidAmount !== undefined && <div className="text-sm text-muted">Avg Winning Bid: <span className="text-white font-bold ml-1">${data.averageBidAmount}</span></div>}
        {data.averageRunnerUpDelta !== undefined && <div className="text-sm text-muted">Avg Margin of Victory: <span className="text-rose-400 font-bold ml-1">${data.averageRunnerUpDelta}</span></div>}
      </div>
    );
  }
  return null;
};

const CHART_COLORS = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'];

const CustomRadarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <div className="font-bold mb-2 text-white/80 border-b border-white/10 pb-2">{payload[0].payload.subject}</div>
        {payload.map((entry: any, index: number) => {
          const raw = entry.payload[`raw${index}`] || 0;
          return (
            <div key={index} className="flex justify-between gap-4 mb-1 text-sm font-medium" style={{ color: entry.color }}>
              <span>{entry.name}:</span>
              <span>${raw}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const TEAM_COLORS = [
  '#ef4444', '#f97316', '#fde047', '#4ade80', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#a3e635',
  '#4338ca', '#fda4af', '#b45309', '#94a3b8'
];

export const Faab: React.FC = () => {
  const { selectedSeason } = useLeagueContext();
  const { data: faabData, loading: faabLoading, error } = useFaabEfficiency();
  const { topAssets: faabTopAssets, loading: freeAgencyLoading } = useFreeAgencyEfficiency();

  const [activeTab, setActiveTab] = useState<'performance' | 'strategy'>('performance');
  const [pointFilter, setPointFilter] = useState<'all' | 'starters' | 'bench'>('starters');
  const [posFilterPaid, setPosFilterPaid] = useState<string>('ALL');
  const [posFilterFree, setPosFilterFree] = useState<string>('ALL');
  const [hiddenTeams, setHiddenTeams] = useState<string[]>([]);

  // Default to top 2 spenders for radar
  const defaultMgrs = faabData.length >= 2 ? [faabData[0].roster_id, faabData[1].roster_id] : [];
  const [radarMgrs, setRadarMgrs] = useState<number[]>(defaultMgrs);

  useEffect(() => {
    if (faabData.length >= 2 && radarMgrs.length === 0) {
      setRadarMgrs([faabData[0].roster_id, faabData[1].roster_id]);
    }
  }, [faabData, radarMgrs.length]);

  const getMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const scatterAvgs = useMemo(() => {
    if (faabData.length === 0 || !selectedSeason) return { winPct: 0, faabEfficiency: 0, averageBidAmount: 0, averageRunnerUpDelta: 0 };

    const tempWinsData = selectedSeason.rosters.map(r => {
      const wins = r.settings.wins || 0;
      const losses = r.settings.losses || 0;
      const ties = r.settings.ties || 0;
      const totalGames = wins + losses + ties;
      const winPct = totalGames > 0 ? (wins / totalGames) * 100 : 0;
      return { winPct };
    });

    const sumBid = faabData.reduce((acc, d) => acc + d.averageBidAmount, 0);
    const sumDelta = faabData.reduce((acc, d) => acc + d.averageRunnerUpDelta, 0);

    const winPcts = tempWinsData.map(d => d.winPct);
    const effs = faabData.map(d => d.pointsPerDollar);

    const medianWinPct = getMedian(winPcts);
    const medianEff = getMedian(effs);
    const avgBid = faabData.length > 0 ? sumBid / faabData.length : 0;
    const avgDelta = faabData.length > 0 ? sumDelta / faabData.length : 0;

    return {
      winPct: isNaN(medianWinPct) ? 0 : medianWinPct,
      faabEfficiency: isNaN(medianEff) ? 0 : medianEff,
      averageBidAmount: isNaN(avgBid) ? 0 : avgBid,
      averageRunnerUpDelta: isNaN(avgDelta) ? 0 : avgDelta
    };
  }, [faabData, selectedSeason]);

  // Per-pickup FAAB value ledger with position filter
  const ppdLedger = useMemo(() => {
    return faabTopAssets.all
      .filter(a => a.acqType === 'faab' && a.cost > 0 && a.starterPoints > 0)
      .filter(a => posFilterPaid === 'ALL' || a.position === posFilterPaid)
      .map(a => ({ ...a, ppd: Number((a.starterPoints / a.cost).toFixed(2)) }))
      .sort((a, b) => b.ppd - a.ppd)
      .slice(0, 25);
  }, [faabTopAssets, posFilterPaid]);

  // $0 bids and Free Agent Gems (by total starter points) with position filter
  const freeGemsLedger = useMemo(() => {
    return faabTopAssets.all
      .filter(a => a.cost === 0 && a.starterPoints > 0)
      .filter(a => posFilterFree === 'ALL' || a.position === posFilterFree)
      .sort((a, b) => b.starterPoints - a.starterPoints)
      .slice(0, 25);
  }, [faabTopAssets, posFilterFree]);

  // Non-FAAB top waiver additions (by total starter points) with position filter
  const topWaiverPickups = useMemo(() => {
    return faabTopAssets.all
      .filter(a => a.starterPoints > 0)
      .filter(a => posFilterFree === 'ALL' || a.position === posFilterFree)
      .sort((a, b) => b.starterPoints - a.starterPoints)
      .slice(0, 25);
  }, [faabTopAssets, posFilterFree]);

  // Check if FAAB was utilized in this season
  const isFaabActive = useMemo(() => {
    return faabData.some(d => d.totalFaabSpent > 0 || d.totalBidAmount > 0);
  }, [faabData]);

  // Hero KPI Computations (Adapts cleanly to FAAB vs Free Waiver seasons)
  const heroKpis = useMemo(() => {
    if (!faabData.length) return null;

    if (isFaabActive) {
      // 1. Best value pickup
      const bestPickup = ppdLedger.length > 0 ? ppdLedger[0] : null;

      // 2. Best ROI Manager (highest pointsPerDollar)
      const sortedByRoi = [...faabData].sort((a, b) => b.pointsPerDollar - a.pointsPerDollar);
      const bestRoiManager = sortedByRoi[0];

      // 3. Hit Rate Leader (highest hits / total acquisitions)
      const sortedByHitRate = [...faabData]
        .filter(d => d.hits + d.busts > 0)
        .map(d => ({
          ...d,
          rate: (d.hits / (d.hits + d.busts)) * 100
        }))
        .sort((a, b) => b.rate - a.rate);
      const bestHitRate = sortedByHitRate[0];

      // 4. Most Wasted FAAB
      const sortedByWasted = [...faabData].sort((a, b) => b.wastedFaab - a.wastedFaab);
      const mostWasted = sortedByWasted[0];

      return {
        isFaab: true,
        bestPickup,
        bestRoiManager,
        bestHitRate,
        mostWasted
      };
    } else {
      // Standard Free Waiver Season KPIs
      // 1. Hit Rate Leader
      const sortedByHitRate = [...faabData]
        .filter(d => d.hits + d.busts > 0)
        .map(d => ({
          ...d,
          rate: (d.hits / (d.hits + d.busts)) * 100
        }))
        .sort((a, b) => b.rate - a.rate);
      const bestHitRate = sortedByHitRate[0];

      // 2. Top Waiver Producer (Manager with most starter points generated)
      const sortedByPoints = [...faabData].sort((a, b) => b.pointsGenerated - a.pointsGenerated);
      const topProducer = sortedByPoints[0];

      // 3. Most Active Wire Manager (most total waiver acquisitions)
      const sortedByVolume = [...faabData].sort((a, b) => (b.hits + b.busts) - (a.hits + a.busts));
      const mostActive = sortedByVolume[0];

      // 4. Top Free Agent Pickup
      const topPickup = topWaiverPickups.length > 0 ? topWaiverPickups[0] : null;

      return {
        isFaab: false,
        bestHitRate,
        topProducer,
        mostActive,
        topPickup
      };
    }
  }, [faabData, ppdLedger, topWaiverPickups, isFaabActive]);

  const radarProfiles = useMemo(() => {
    return [...faabData].sort((a, b) => (a.user?.display_name || '').localeCompare(b.user?.display_name || ''));
  }, [faabData]);

  const activeRadarProfiles = useMemo(() => {
    return radarMgrs.map(id => radarProfiles.find(p => p.roster_id === id)).filter(p => !!p) as any[];
  }, [radarMgrs, radarProfiles]);

  const buildPosRadarData = () => {
    const data: Record<string, any>[] = [
      { subject: 'QB' },
      { subject: 'RB' },
      { subject: 'WR' },
      { subject: 'TE' },
      { subject: 'K' },
      { subject: 'IDP' }
    ];

    const maxSpend: Record<string, number> = { QB: 1, RB: 1, WR: 1, TE: 1, K: 1, IDP: 1 };

    radarProfiles.forEach(p => {
      Object.entries(p.positionalSpend).forEach(([pos, spend]) => {
        if (pos === 'OTHER') return;
        if ((spend as number) > maxSpend[pos]) maxSpend[pos] = spend as number;
      });
    });

    data.forEach(d => {
      const pos = d.subject;
      activeRadarProfiles.forEach((p, idx) => {
        const spend = p.positionalSpend[pos] || 0;
        const normalized = (spend / maxSpend[pos]) * 100;
        d[`data${idx}`] = normalized;
        d[`raw${idx}`] = spend;
      });
    });

    return data;
  };
  const radarData = buildPosRadarData();

  const handleToggle = (id: number) => {
    setRadarMgrs(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      const next = [...prev, id];
      return next.length > 4 ? next.slice(1) : next;
    });
  };

  const toggleTeam = (teamName: string) => {
    if (hiddenTeams.includes(teamName)) {
      setHiddenTeams(hiddenTeams.filter(t => t !== teamName));
    } else {
      setHiddenTeams([...hiddenTeams, teamName]);
    }
  };

  if (faabLoading || freeAgencyLoading || !selectedSeason) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4">Crunching thousands of historical transactions...</div>
      </div>
    );
  }

  if (error) return <div className="text-danger-color">Error loading FAAB data: {error}</div>;

  // Scatter Chart 1: FAAB ROI vs Win Rate
  const scatterDataWins = selectedSeason.rosters.map(r => {
    const user = selectedSeason.rosterToUser[r.roster_id];
    const faabStats = faabData.find(d => d.roster_id === r.roster_id);
    const wins = r.settings.wins || 0;
    const losses = r.settings.losses || 0;
    const ties = r.settings.ties || 0;
    const totalGames = wins + losses + ties;
    const winPct = totalGames > 0 ? (wins / totalGames) * 100 : 0;
    return {
      name: user?.display_name || `Team ${r.roster_id}`,
      avatar: user?.avatar,
      winPct: Number(winPct.toFixed(1)),
      faabEfficiency: faabStats?.pointsPerDollar || 0
    };
  });

  // Scatter Chart 2: Bid Aggressiveness Matrix
  const scatterDataOverpay = faabData.map(d => ({
    name: d.user?.display_name || `Team ${d.roster_id}`,
    avatar: d.user?.avatar,
    averageBidAmount: typeof d.averageBidAmount === 'number' && !isNaN(d.averageBidAmount) ? d.averageBidAmount : 0,
    averageRunnerUpDelta: typeof d.averageRunnerUpDelta === 'number' && !isNaN(d.averageRunnerUpDelta) ? d.averageRunnerUpDelta : 0
  }));

  // Bar Charts (Efficiency)
  const barData = faabData.map(d => {
    let points = d.pointsGenerated;
    if (pointFilter === 'bench') points = d.benchPointsGenerated;
    if (pointFilter === 'all') points = d.pointsGenerated + d.benchPointsGenerated;
    return {
      name: d.user?.display_name || `Team ${d.roster_id}`,
      points: Number(points.toFixed(2)),
      ppd: d.totalFaabSpent > 0 ? Number((points / d.totalFaabSpent).toFixed(2)) : 0
    };
  });
  const pointsData = [...barData].sort((a, b) => b.points - a.points);
  const ppdData = [...barData].sort((a, b) => b.ppd - a.ppd);

  // Hit Rate Data
  const hitRateData = faabData.map(d => {
    const total = d.hits + d.busts;
    const hitPct = total > 0 ? Number(((d.hits / total) * 100).toFixed(1)) : 0;
    const bustPct = total > 0 ? Number(((d.busts / total) * 100).toFixed(1)) : 0;
    return {
      name: d.user?.display_name || `Team ${d.roster_id}`,
      hits: d.hits,
      busts: d.busts,
      hitPct,
      bustPct
    };
  }).sort((a, b) => b.hitPct - a.hitPct);

  // Wasted FAAB
  const wastedFaabData = [...faabData].sort((a, b) => b.wastedFaab - a.wastedFaab);

  // Spending Velocity Data (Bounded strictly to regular season weeks)
  const lastRegularWeek = selectedSeason.league.settings.playoff_week_start ? selectedSeason.league.settings.playoff_week_start - 1 : 14;
  const velocityData = [];
  for (let week = 0; week < lastRegularWeek; week++) {
    const weekData: any = { week: `Wk ${week + 1}` };
    faabData.forEach(d => {
      const name = d.user?.display_name || `Team ${d.roster_id}`;
      weekData[name] = d.spendingVelocity[week] ?? 0;
    });
    velocityData.push(weekData);
  }

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">
          FAAB & Waiver Analytics ({selectedSeason.league.season})
        </h1>
        <p className="text-muted text-sm sm:text-base">
          Bidding efficiency, hit rates, breakout waiver steals, and budget allocation dynamics.
        </p>
      </div>

      {/* 4 Hero KPI Cards */}
      {heroKpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8 w-full">
          {heroKpis.isFaab ? (
            <>
              {/* 1. Top Value Steal */}
              {heroKpis.bestPickup && (
                <div className="glass-card p-3 sm:p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                      <Sparkles size={14} className="text-emerald-400 shrink-0" />
                      <span className="truncate">Top Waiver Steal</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={`https://sleepercdn.com/content/nfl/players/thumb/${heroKpis.bestPickup.playerId}.jpg`}
                          alt=""
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-emerald-400/40 object-cover bg-black/40"
                          onError={e => {
                            (e.target as HTMLImageElement).src = 'https://sleepercdn.com/images/v2/icons/player_default.webp';
                          }}
                        />
                        {heroKpis.bestPickup.managerAvatar && (
                          <img
                            src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.bestPickup.managerAvatar}`}
                            alt={heroKpis.bestPickup.managerName}
                            className="w-4 h-4 rounded-full border border-black absolute -bottom-0.5 -right-0.5 shadow"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5 leading-snug">
                          <span className="truncate">{heroKpis.bestPickup.playerName}</span>
                          <DraftPositionBadge position={heroKpis.bestPickup.position} />
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-muted mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono leading-snug">
                          <span className="text-emerald-400 font-bold shrink-0">{heroKpis.bestPickup.ppd.toFixed(1)} pts/$</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-300 font-sans shrink-0">${heroKpis.bestPickup.cost} FAAB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                    Highest starter points per FAAB dollar
                  </div>
                </div>
              )}

              {/* 2. FAAB ROI Leader */}
              {heroKpis.bestRoiManager && (
                <div className="glass-card p-3 sm:p-4 rounded-xl border border-blue-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
                  <div>
                    <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                      <Zap size={14} className="text-blue-400 shrink-0" />
                      <span className="truncate">FAAB ROI Leader</span>
                    </div>
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {heroKpis.bestRoiManager.user?.avatar ? (
                        <img
                          src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.bestRoiManager.user.avatar}`}
                          alt=""
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-blue-400/40 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                          N/A
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-xs sm:text-sm truncate">
                          {heroKpis.bestRoiManager.user?.display_name || `Team ${heroKpis.bestRoiManager.roster_id}`}
                        </div>
                        <div className="text-[11px] sm:text-xs font-mono font-bold text-blue-400 mt-0.5 leading-snug">
                          {heroKpis.bestRoiManager.pointsPerDollar.toFixed(1)} pts/$ spent
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                    Total starter fantasy points per FAAB dollar
                  </div>
                </div>
              )}

              {/* 3. Hit Rate Leader */}
              {heroKpis.bestHitRate && (
                <div className="glass-card p-3 sm:p-4 rounded-xl border border-purple-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
                  <div>
                    <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                      <Target size={14} className="text-purple-400 shrink-0" />
                      <span className="truncate">Hit Rate Leader</span>
                    </div>
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {heroKpis.bestHitRate.user?.avatar ? (
                        <img
                          src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.bestHitRate.user.avatar}`}
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
                          {heroKpis.bestHitRate.user?.display_name || `Team ${heroKpis.bestHitRate.roster_id}`}
                        </div>
                        <div className="text-[11px] sm:text-xs font-mono font-bold text-purple-400 mt-0.5 leading-snug">
                          {heroKpis.bestHitRate.rate.toFixed(0)}% starting pickups
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                    Highest % of additions that started ≥1 game
                  </div>
                </div>
              )}

              {/* 4. Most Wasted FAAB */}
              {heroKpis.mostWasted && (
                <div className="glass-card p-3 sm:p-4 rounded-xl border border-rose-500/20 flex flex-col justify-between min-w-0 overflow-hidden">
                  <div>
                    <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 min-w-0">
                      <Flame size={14} className="text-rose-400 shrink-0" />
                      <span className="truncate">Most Wasted FAAB</span>
                    </div>
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {heroKpis.mostWasted.user?.avatar ? (
                        <img
                          src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.mostWasted.user.avatar}`}
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
                          {heroKpis.mostWasted.user?.display_name || `Team ${heroKpis.mostWasted.roster_id}`}
                        </div>
                        <div className="text-[11px] sm:text-xs font-mono font-bold text-rose-400 mt-0.5 leading-snug">
                          ${heroKpis.mostWasted.wastedFaab} burnt on bench
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                    FAAB spent on 0-start benchwarmers
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Non-FAAB Season KPIs */}
              {/* 1. Hit Rate Leader */}
              {heroKpis.bestHitRate && (
                <div className="glass-card p-4 rounded-xl border border-purple-500/20 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Target size={14} className="text-purple-400 shrink-0" />
                      <span className="truncate">Hit Rate Leader</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {heroKpis.bestHitRate.user?.avatar ? (
                        <img
                          src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.bestHitRate.user.avatar}`}
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
                          {heroKpis.bestHitRate.user?.display_name || `Team ${heroKpis.bestHitRate.roster_id}`}
                        </div>
                        <div className="text-xs font-mono font-bold text-purple-400 mt-0.5">
                          {heroKpis.bestHitRate.rate.toFixed(0)}% starting pickups
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                    Highest % of additions that started ≥1 game
                  </div>
                </div>
              )}

              {/* 2. Top Waiver Producer */}
              {heroKpis.topProducer && (
                <div className="glass-card p-4 rounded-xl border border-blue-500/20 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Zap size={14} className="text-blue-400 shrink-0" />
                      <span className="truncate">Top Waiver Producer</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {heroKpis.topProducer.user?.avatar ? (
                        <img
                          src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.topProducer.user.avatar}`}
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
                          {heroKpis.topProducer.user?.display_name || `Team ${heroKpis.topProducer.roster_id}`}
                        </div>
                        <div className="text-xs font-mono font-bold text-blue-400 mt-0.5">
                          {heroKpis.topProducer.pointsGenerated.toFixed(1)} starter pts
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                    Most total starter fantasy points produced
                  </div>
                </div>
              )}

              {/* 3. Most Active Wire Manager */}
              {heroKpis.mostActive && (
                <div className="glass-card p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                      <span className="truncate">Most Active Manager</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {heroKpis.mostActive.user?.avatar ? (
                        <img
                          src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.mostActive.user.avatar}`}
                          alt=""
                          className="w-10 h-10 rounded-full border border-emerald-400/40 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                          N/A
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">
                          {heroKpis.mostActive.user?.display_name || `Team ${heroKpis.mostActive.roster_id}`}
                        </div>
                        <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                          {heroKpis.mostActive.hits + heroKpis.mostActive.busts} total additions
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                    Highest volume of total waiver pickups
                  </div>
                </div>
              )}

              {/* 4. Top Free Agent Pickup */}
              {heroKpis.topPickup && (
                <div className="glass-card p-4 rounded-xl border border-amber-500/20 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Sparkles size={14} className="text-amber-400 shrink-0" />
                      <span className="truncate">Top Waiver Pickup</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <img
                          src={`https://sleepercdn.com/content/nfl/players/thumb/${heroKpis.topPickup.playerId}.jpg`}
                          alt=""
                          className="w-10 h-10 rounded-full border border-amber-400/40 object-cover bg-black/40"
                          onError={e => {
                            (e.target as HTMLImageElement).src = 'https://sleepercdn.com/images/v2/icons/player_default.webp';
                          }}
                        />
                        {heroKpis.topPickup.managerAvatar && (
                          <img
                            src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.topPickup.managerAvatar}`}
                            alt={heroKpis.topPickup.managerName}
                            className="w-4 h-4 rounded-full border border-black absolute -bottom-0.5 -right-0.5 shadow"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5 leading-snug">
                          <span className="truncate">{heroKpis.topPickup.playerName}</span>
                          <DraftPositionBadge position={heroKpis.topPickup.position} />
                        </div>
                        <div className="text-[11px] text-muted truncate mt-0.5 flex items-center gap-1.5 font-mono">
                          <span className="text-amber-400 font-bold">{heroKpis.topPickup.starterPoints.toFixed(1)} pts</span>
                          <span>•</span>
                          <span className="text-gray-300 font-sans">{heroKpis.topPickup.managerName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                    Most starter points scored by a waiver addition
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Non-FAAB Season Banner */}
      {!isFaabActive && (
        <div className="glass-card p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Standard Waiver Priority Season</div>
            <div className="text-xs text-muted mt-0.5">
              FAAB dollar bidding was not active during the {selectedSeason.league.season} season. Waiver claims were awarded via traditional waiver priority and free agency without budget caps.
            </div>
          </div>
        </div>
      )}

      {/* 2-Hub Tab Command Bar (Full Width 2-Column Grid) */}
      <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-2 mb-8 w-full">
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-3.5 px-6 py-3.5 rounded-xl text-sm font-bold transition-all cursor-pointer w-full ${
            activeTab === 'performance'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/30'
              : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${activeTab === 'performance' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'}`}>
            <LayoutGrid size={20} />
          </div>
          <div className="text-left min-w-0">
            <div className="leading-tight text-sm sm:text-base font-bold truncate">FAAB Performance & Steals</div>
            <div className={`text-xs font-normal mt-0.5 truncate ${activeTab === 'performance' ? 'text-emerald-100' : 'text-gray-400'}`}>
              Hit Rates, Breakout Pickups, Wasted FAAB & Value Index
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('strategy')}
          className={`flex items-center gap-3.5 px-6 py-3.5 rounded-xl text-sm font-bold transition-all cursor-pointer w-full ${
            activeTab === 'strategy'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/30'
              : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${activeTab === 'strategy' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'}`}>
            <Target size={20} />
          </div>
          <div className="text-left min-w-0">
            <div className="leading-tight text-sm sm:text-base font-bold truncate">Bidding Strategy & Market Dynamics</div>
            <div className={`text-xs font-normal mt-0.5 truncate ${activeTab === 'strategy' ? 'text-emerald-100' : 'text-gray-400'}`}>
              Bid Aggressiveness, Spending Velocity & Positional Radars
            </div>
          </div>
        </button>
      </div>

      {/* TAB 1: FAAB PERFORMANCE & VALUE */}
      {activeTab === 'performance' && (
        <div className="space-y-8 animate-fade-in">
          {isFaabActive ? (
            <>
              {/* Row 1: Hit Rate & Wasted FAAB */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hit Rate */}
                <Card title="FAAB Hit Rate (Starter Conversion)">
                  <div className="chart-header mb-4">
                    <div className="chart-description">
                      Percentage of FAAB additions that became viable fantasy starters (≥1 start for the manager).
                    </div>
                    <div className="chart-legend-grid pt-3 mt-3 border-t border-white/5">
                      <div className="legend-item">
                        <div className="legend-item-header"><span className="text-emerald-400">🟩</span> Hits</div>
                        <div className="legend-item-desc">Started ≥1 game on roster.</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-item-header"><span className="text-rose-400">🟥</span> Busts</div>
                        <div className="legend-item-desc">0 starts (benched or dropped).</div>
                      </div>
                    </div>
                  </div>
                  <MobileTapHint />
                  <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hitRateData} layout="vertical" margin={{ left: 15, right: 15, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} width={95} tickMargin={4} />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                          formatter={(val: any, name: any, item: any) => {
                            if (name === 'hitPct') return [`${item.payload.hits} hits (${val}%)`, 'Hit Rate'];
                            return [`${item.payload.busts} busts (${val}%)`, 'Bust Rate'];
                          }}
                        />
                        <Bar dataKey="hitPct" stackId="a" fill="#10b981" isAnimationActive={false} name="hitPct" />
                        <Bar dataKey="bustPct" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} isAnimationActive={false} name="bustPct" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Wasted FAAB */}
                <Card title="Wasted FAAB (The Benchwarmers Fund)">
                  <div className="chart-header mb-4">
                    <div className="chart-description">
                      Total FAAB budget spent on players who never contributed a single starter point.
                    </div>
                  </div>
                  <div className="space-y-3 overflow-y-auto pr-1.5 custom-scrollbar" style={{ maxHeight: '480px' }}>
                    {wastedFaabData.map((d, i) => {
                      const maxWasted = Math.max(...wastedFaabData.map(w => w.wastedFaab), 1);
                      const pct = Math.round((d.wastedFaab / maxWasted) * 100);

                      return (
                        <div
                          key={d.roster_id}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-black/30 hover:border-rose-500/30 hover:bg-black/40 transition-all relative overflow-hidden group"
                        >
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors pointer-events-none"
                            style={{ width: `${pct}%` }}
                          />

                          <div className="flex items-center gap-3 min-w-0 relative z-10">
                            <div className="text-xs font-mono font-bold text-muted w-5 text-right shrink-0">
                              #{i + 1}
                            </div>
                            {d.user?.avatar ? (
                              <img
                                src={`https://sleepercdn.com/avatars/thumbs/${d.user.avatar}`}
                                alt=""
                                className="w-9 h-9 rounded-full border border-rose-500/30 object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                                N/A
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-white text-sm truncate group-hover:text-rose-300 transition-colors">
                                {d.user?.display_name || `Team ${d.roster_id}`}
                              </div>
                              <div className="text-xs text-muted truncate mt-0.5">
                                {d.busts} bust{d.busts !== 1 ? 's' : ''} on bench
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-2 relative z-10">
                            <div className="text-base font-mono font-bold text-rose-400 flex items-center justify-end gap-1">
                              {d.wastedFaab > 0 && <span>🔥</span>}
                              <span>${d.wastedFaab}</span>
                            </div>
                            <div className="text-[10px] text-muted font-mono whitespace-nowrap">
                              {d.totalFaabSpent > 0 ? `${((d.wastedFaab / d.totalFaabSpent) * 100).toFixed(0)}% of spend` : '$0 total spend'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Row 2: FAAB Efficiency Bar Charts */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">FAAB Efficiency & Production</h2>
                    <p className="text-sm text-muted mt-0.5">
                      Total fantasy points unlocked through waivers compared against budget efficiency (pts/$).
                    </p>
                  </div>
                  <div className="glass-toggle-container self-start sm:self-auto">
                    <button
                      onClick={() => setPointFilter('starters')}
                      className={`glass-toggle-btn ${pointFilter === 'starters' ? 'active' : ''}`}
                    >
                      Starters Only
                    </button>
                    <button
                      onClick={() => setPointFilter('bench')}
                      className={`glass-toggle-btn ${pointFilter === 'bench' ? 'active' : ''}`}
                    >
                      Bench Only
                    </button>
                    <button
                      onClick={() => setPointFilter('all')}
                      className={`glass-toggle-btn ${pointFilter === 'all' ? 'active' : ''}`}
                    >
                      All Points
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Total Points */}
                  <div>
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Total Points Generated</h3>
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pointsData} layout="vertical" margin={{ left: 15, right: 15, top: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} width={95} tickMargin={4} />
                          <RechartsTooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            formatter={(val: any) => [`${val} pts`, 'Points Generated']}
                          />
                          <Bar dataKey="points" fill="#3b82f6" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Points Per Dollar */}
                  <div>
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Points Per FAAB Dollar (VOC)</h3>
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ppdData} layout="vertical" margin={{ left: 15, right: 15, top: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} width={95} tickMargin={4} />
                          <RechartsTooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            formatter={(val: any) => [`${val} pts/$`, 'Points Per Dollar']}
                          />
                          <Bar dataKey="ppd" fill="#10b981" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Row 3: Side-by-Side Steals & $0 Free Agent Gems */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Top FAAB Value Steals (pts/$) */}
                <Card>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Top FAAB Steals (pts/$)</h2>
                      <p className="text-xs text-muted mt-0.5">
                        Starter points created per dollar spent.
                      </p>
                    </div>
                    {/* Position Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
                      {['ALL', 'QB', 'RB', 'WR', 'TE', 'IDP', 'K'].map(pos => (
                        <button
                          key={pos}
                          onClick={() => setPosFilterPaid(pos)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            posFilterPaid === pos
                              ? 'bg-emerald-500 text-black shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 overflow-y-auto pr-1.5 custom-scrollbar" style={{ maxHeight: '480px' }}>
                    {ppdLedger.map((asset, idx) => {
                      const isTop3 = idx < 3;
                      const rankBadgeClass =
                        idx === 0
                          ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                          : idx === 1
                          ? 'text-slate-300 border-slate-400/40 bg-slate-400/10'
                          : idx === 2
                          ? 'text-amber-600 border-amber-700/40 bg-amber-700/10'
                          : 'text-muted border-white/5 bg-white/5';

                      return (
                        <div
                          key={`ppd-${asset.playerId}-${idx}`}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all hover:bg-white/[0.04] group ${
                            isTop3 ? 'border-emerald-500/30 bg-black/40' : 'border-white/5 bg-black/25'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg border font-mono font-bold text-xs flex items-center justify-center shrink-0 ${rankBadgeClass}`}
                            >
                              #{idx + 1}
                            </div>

                            <img
                              src={`https://sleepercdn.com/content/nfl/players/thumb/${asset.playerId}.jpg`}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-emerald-500/30 bg-black/40 shrink-0"
                              onError={e => {
                                (e.target as HTMLImageElement).src =
                                  'https://sleepercdn.com/images/v2/icons/player_default.webp';
                              }}
                            />

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                                <span className="font-bold text-white text-sm sm:text-base group-hover:text-emerald-400 transition-colors truncate">
                                  {asset.playerName}
                                </span>
                                <DraftPositionBadge position={asset.position} />
                              </div>
                              <div className="text-xs text-muted truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-emerald-400 font-bold font-mono">${asset.cost} FAAB</span>
                                <span>•</span>
                                <span className="text-gray-300 font-medium">{asset.managerName}</span>
                                <span>•</span>
                                <span>Wk {asset.weekAcquired} ({asset.weeksStarted} starts)</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0 sm:ml-3 pl-10 sm:pl-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0 flex sm:flex-col sm:items-end justify-between">
                            <div className="text-base sm:text-lg font-mono font-bold text-emerald-400">
                              {asset.ppd.toFixed(1)}{' '}
                              <span className="text-xs text-muted font-normal">pts/$</span>
                            </div>
                            <div className="text-[11px] text-muted font-mono">
                              {asset.starterPoints.toFixed(1)} starter pts
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {ppdLedger.length === 0 && (
                      <div className="p-12 text-center text-muted italic bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                        No paid FAAB data recorded for this position in this season.
                      </div>
                    )}
                  </div>
                </Card>

                {/* 2. Top $0 & Free Agent Gems (starter pts) */}
                <Card>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Top $0 & Free Wire Gems</h2>
                      <p className="text-xs text-muted mt-0.5">
                        Free pickups ranked by total fantasy starter points.
                      </p>
                    </div>
                    {/* Position Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
                      {['ALL', 'QB', 'RB', 'WR', 'TE', 'IDP', 'K'].map(pos => (
                        <button
                          key={pos}
                          onClick={() => setPosFilterFree(pos)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            posFilterFree === pos
                              ? 'bg-amber-500 text-black shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 overflow-y-auto pr-1.5 custom-scrollbar" style={{ maxHeight: '480px' }}>
                    {freeGemsLedger.map((asset, idx) => {
                      const isTop3 = idx < 3;
                      const rankBadgeClass =
                        idx === 0
                          ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                          : idx === 1
                          ? 'text-slate-300 border-slate-400/40 bg-slate-400/10'
                          : idx === 2
                          ? 'text-amber-600 border-amber-700/40 bg-amber-700/10'
                          : 'text-muted border-white/5 bg-white/5';

                      return (
                        <div
                          key={`free-gem-${asset.playerId}-${idx}`}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all hover:bg-white/[0.04] group ${
                            isTop3 ? 'border-amber-500/30 bg-black/40' : 'border-white/5 bg-black/25'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg border font-mono font-bold text-xs flex items-center justify-center shrink-0 ${rankBadgeClass}`}
                            >
                              #{idx + 1}
                            </div>

                            <img
                              src={`https://sleepercdn.com/content/nfl/players/thumb/${asset.playerId}.jpg`}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-amber-500/30 bg-black/40 shrink-0"
                              onError={e => {
                                (e.target as HTMLImageElement).src =
                                  'https://sleepercdn.com/images/v2/icons/player_default.webp';
                              }}
                            />

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                                <span className="font-bold text-white text-sm sm:text-base group-hover:text-amber-400 transition-colors truncate">
                                  {asset.playerName}
                                </span>
                                <DraftPositionBadge position={asset.position} />
                              </div>
                              <div className="text-xs text-muted truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-amber-400 font-bold font-mono">$0 / Free</span>
                                <span>•</span>
                                <span className="text-gray-300 font-medium">{asset.managerName}</span>
                                <span>•</span>
                                <span>Wk {asset.weekAcquired} ({asset.weeksStarted} starts)</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0 sm:ml-3 pl-10 sm:pl-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0 flex sm:flex-col sm:items-end justify-between">
                            <div className="text-base sm:text-lg font-mono font-bold text-amber-400">
                              {asset.starterPoints.toFixed(1)}{' '}
                              <span className="text-xs text-muted font-normal">pts</span>
                            </div>
                            <div className="text-[11px] text-muted font-mono">
                              {asset.weeksStarted} starts
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {freeGemsLedger.length === 0 && (
                      <div className="p-12 text-center text-muted italic bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                        No $0 or free agent data recorded for this position in this season.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </>
          ) : (
            <>
              {/* Free Waiver Priority Season Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hit Rate */}
                <Card title="Waiver Hit Rate (Starter Conversion)">
                  <div className="chart-header mb-4">
                    <div className="chart-description">
                      Percentage of waiver pickups that started ≥1 matchup on the acquiring manager's roster.
                    </div>
                    <div className="chart-legend-grid pt-3 mt-3 border-t border-white/5">
                      <div className="legend-item">
                        <div className="legend-item-header"><span className="text-emerald-400">🟩</span> Hits</div>
                        <div className="legend-item-desc">Started ≥1 game on roster.</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-item-header"><span className="text-rose-400">🟥</span> Busts</div>
                        <div className="legend-item-desc">0 starts (benched or dropped).</div>
                      </div>
                    </div>
                  </div>
                  <MobileTapHint />
                  <div style={{ height: 360 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hitRateData} layout="vertical" margin={{ left: 110, right: 30, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={100} tickMargin={8} />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          formatter={(val: any, name: any, item: any) => {
                            if (name === 'hitPct') return [`${item.payload.hits} hits (${val}%)`, 'Hit Rate'];
                            return [`${item.payload.busts} busts (${val}%)`, 'Bust Rate'];
                          }}
                        />
                        <Bar dataKey="hitPct" stackId="a" fill="#10b981" isAnimationActive={false} name="hitPct" />
                        <Bar dataKey="bustPct" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} isAnimationActive={false} name="bustPct" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Total Points Generated */}
                <Card>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Waiver Points Generated</h2>
                      <p className="text-sm text-muted mt-0.5">
                        Total fantasy points contributed by all in-season waiver additions.
                      </p>
                    </div>
                    <div className="glass-toggle-container self-start sm:self-auto shrink-0">
                      <button
                        onClick={() => setPointFilter('starters')}
                        className={`glass-toggle-btn ${pointFilter === 'starters' ? 'active' : ''}`}
                      >
                        Starters
                      </button>
                      <button
                        onClick={() => setPointFilter('bench')}
                        className={`glass-toggle-btn ${pointFilter === 'bench' ? 'active' : ''}`}
                      >
                        Bench
                      </button>
                      <button
                        onClick={() => setPointFilter('all')}
                        className={`glass-toggle-btn ${pointFilter === 'all' ? 'active' : ''}`}
                      >
                        All
                      </button>
                    </div>
                  </div>
                  <MobileTapHint />
                  <div style={{ height: 360 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pointsData} layout="vertical" margin={{ left: 110, right: 30, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={100} tickMargin={8} />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          formatter={(val: any) => [`${val} pts`, 'Points Generated']}
                        />
                        <Bar dataKey="points" fill="#3b82f6" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* Top Waiver Additions Leaderboard */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Top Waiver Wire Additions</h2>
                    <p className="text-sm text-muted mt-0.5">
                      Most impactful free agent and waiver pickups ranked by total fantasy starter points produced.
                    </p>
                  </div>
                  {/* Position Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
                    {['ALL', 'QB', 'RB', 'WR', 'TE', 'IDP', 'K'].map(pos => (
                      <button
                        key={pos}
                        onClick={() => setPosFilterFree(pos)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          posFilterFree === pos
                            ? 'bg-amber-500 text-black shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 overflow-y-auto pr-1.5 custom-scrollbar" style={{ maxHeight: '480px' }}>
                  {topWaiverPickups.map((asset, idx) => {
                    const isTop3 = idx < 3;
                    const rankBadgeClass =
                      idx === 0
                        ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                        : idx === 1
                        ? 'text-slate-300 border-slate-400/40 bg-slate-400/10'
                        : idx === 2
                        ? 'text-amber-600 border-amber-700/40 bg-amber-700/10'
                        : 'text-muted border-white/5 bg-white/5';

                    return (
                      <div
                        key={`top-pickup-${asset.playerId}-${idx}`}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all hover:bg-white/[0.04] group ${
                          isTop3 ? 'border-amber-500/30 bg-black/40' : 'border-white/5 bg-black/25'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg border font-mono font-bold text-xs flex items-center justify-center shrink-0 ${rankBadgeClass}`}
                          >
                            #{idx + 1}
                          </div>

                          <img
                            src={`https://sleepercdn.com/content/nfl/players/thumb/${asset.playerId}.jpg`}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-amber-500/30 bg-black/40 shrink-0"
                            onError={e => {
                              (e.target as HTMLImageElement).src =
                                'https://sleepercdn.com/images/v2/icons/player_default.webp';
                            }}
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                              <span className="font-bold text-white text-sm sm:text-base group-hover:text-amber-400 transition-colors">
                                {asset.playerName}
                              </span>
                              <DraftPositionBadge position={asset.position} />
                            </div>
                            <div className="text-xs text-muted truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="text-gray-300 font-medium">{asset.managerName}</span>
                              <span>•</span>
                              <span>Wk {asset.weekAcquired} ({asset.weeksStarted} starts)</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0 sm:ml-3 pl-10 sm:pl-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0 flex sm:flex-col sm:items-end justify-between">
                          <div className="text-base sm:text-lg font-mono font-bold text-amber-400">
                            {asset.starterPoints.toFixed(1)}{' '}
                            <span className="text-xs text-muted font-normal">pts</span>
                          </div>
                          <div className="text-[11px] text-muted font-mono">
                            {asset.weeksStarted} starts
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {topWaiverPickups.length === 0 && (
                    <div className="p-12 text-center text-muted italic bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                      No waiver data recorded for this position in this season.
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 2: BIDDING STRATEGY & MARKET DYNAMICS */}
      {activeTab === 'strategy' && (
        <div className="space-y-8 animate-fade-in">
          {isFaabActive ? (
            <>
              {/* Row 1: Bid Aggressiveness & FAAB ROI Matrices */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bid Aggressiveness Matrix */}
                <Card title="Bid Aggressiveness Matrix">
                  <div className="chart-header">
                    <div className="chart-description">
                      Compares average winning bid against margin of victory (how much more they bid than the runner-up).
                    </div>
                    <div className="chart-legend-grid">
                      <div className="legend-item">
                        <div className="legend-item-header">👻 Uncontested Overpays</div>
                        <div className="legend-item-desc">High margin of victory on moderate bids (bidding against nobody).</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-item-header">💥 Massive Overpays</div>
                        <div className="legend-item-desc">Huge bids that far outpaced all runner-up offers.</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-item-header">🛒 Bargain Hunters</div>
                        <div className="legend-item-desc">Cheap bids with thin margins of victory.</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-item-header">🎯 Market Experts</div>
                        <div className="legend-item-desc">Heavy spending with razor-thin victory margins.</div>
                      </div>
                    </div>
                  </div>
                  <MobileTapHint />
                  <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" dataKey="averageBidAmount" name="Avg Bid" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                          <Label value="Avg Winning Bid ($)" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                        </XAxis>
                        <YAxis type="number" dataKey="averageRunnerUpDelta" name="Margin of Victory" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                          <Label value="Avg Runner-Up Delta ($)" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                        </YAxis>
                        <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                        <ReferenceLine x={scatterAvgs.averageBidAmount} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                        <ReferenceLine y={scatterAvgs.averageRunnerUpDelta} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                        <Scatter name="Teams" data={scatterDataOverpay} shape={<CustomAvatarDot />} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* FAAB ROI vs Win Rate */}
                <Card title="FAAB ROI vs Win Rate">
                  <div className="chart-header">
                    <div className="chart-description">
                      Correlates FAAB Efficiency (Starter points per dollar spent) with regular season win percentage.
                    </div>
                    <div className="chart-legend-grid">
                      <div className="legend-item">
                        <div className="legend-item-header">🏋️ Won Despite Bad Pickups</div>
                        <div className="legend-item-desc">High win % achieved despite low waiver efficiency.</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-item-header">👑 Waiver Wire Masters</div>
                        <div className="legend-item-desc">Elite FAAB efficiency directly powered high win rates.</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-item-header">💀 Complete Whiffs</div>
                        <div className="legend-item-desc">Low FAAB efficiency matched poor overall record.</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-item-header">💎 Great Pickups, Bad Team</div>
                        <div className="legend-item-desc">Outstanding waiver steals sunk by other roster holes.</div>
                      </div>
                    </div>
                  </div>
                  <MobileTapHint />
                  <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" dataKey="faabEfficiency" name="FAAB Efficiency" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                          <Label value="FAAB Efficiency (pts/$)" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                        </XAxis>
                        <YAxis type="number" dataKey="winPct" name="Win %" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                          <Label value="Win %" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                        </YAxis>
                        <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                        <ReferenceLine x={scatterAvgs.faabEfficiency} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                        <ReferenceLine y={scatterAvgs.winPct} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                        <Scatter name="Teams" data={scatterDataWins} shape={<CustomAvatarDot />} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* Row 2: Spending Velocity */}
              <Card title="Spending Velocity">
                <div className="chart-header mb-4">
                  <div className="chart-description">
                    Cumulative FAAB expenditure by week. Click manager pills below the chart to isolate specific spending trajectories.
                  </div>
                </div>
                <MobileTapHint />
                <div style={{ height: 420 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={velocityData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="week" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }}>
                        <Label value="Cumulative Spent ($)" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                      </YAxis>
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                      />
                      {faabData.map((d, i) => {
                        const name = d.user?.display_name || `Team ${d.roster_id}`;
                        return (
                          <Line
                            key={d.roster_id}
                            type="monotone"
                            dataKey={name}
                            stroke={TEAM_COLORS[i % TEAM_COLORS.length]}
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: TEAM_COLORS[i % TEAM_COLORS.length] }}
                            activeDot={{ r: 6 }}
                            connectNulls={true}
                            isAnimationActive={false}
                            hide={hiddenTeams.includes(name)}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-6 border-t border-white/5 pt-4">
                  {faabData.map((d, i) => {
                    const name = d.user?.display_name || `Team ${d.roster_id}`;
                    const isHidden = hiddenTeams.includes(name);
                    return (
                      <button
                        key={d.roster_id}
                        onClick={() => toggleTeam(name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                          isHidden
                            ? 'bg-black/20 text-gray-500 border-white/5'
                            : 'bg-black/40 text-white border-white/15 hover:border-white/30'
                        }`}
                      >
                        <span style={{ color: TEAM_COLORS[i % TEAM_COLORS.length], fontSize: '0.9rem' }}>●</span>
                        <span className="truncate">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Row 3: Positional FAAB Strategy Map */}
              <Card title="Positional FAAB Strategy Map">
                <div className="chart-header mb-4">
                  <div className="chart-description">
                    Distribution of FAAB spending by position. Axes are normalized (0-100%) against the league's maximum spender at each position.
                    <span className="block mt-1 text-[11px] text-muted/80">
                      👆 Click manager pills below to compare spending profiles (showing {activeRadarProfiles.length}/4 selected).
                    </span>
                  </div>
                </div>
                <div style={{ height: 360 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <RechartsTooltip content={<CustomRadarTooltip />} cursor={false} />
                      {activeRadarProfiles.map((p, idx) => (
                        <Radar
                          key={p.roster_id}
                          name={p.user?.display_name || `Team ${p.roster_id}`}
                          dataKey={`data${idx}`}
                          stroke={CHART_COLORS[idx]}
                          fill={CHART_COLORS[idx]}
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap justify-center gap-2 mt-6 border-t border-white/5 pt-4 w-full">
                  {radarProfiles.map(p => {
                    const activeIdx = radarMgrs.indexOf(p.roster_id);
                    const isActive = activeIdx !== -1;
                    const color = isActive ? CHART_COLORS[activeIdx] : '#64748b';

                    return (
                      <button
                        key={p.roster_id}
                        onClick={() => handleToggle(p.roster_id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                          isActive
                            ? 'bg-black/60 text-white shadow-md'
                            : 'bg-black/20 text-gray-400 border-white/5 hover:border-white/15'
                        }`}
                        style={{
                          borderColor: isActive ? color : undefined
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }}></div>
                        <span className="truncate">{p.user?.display_name || `Team ${p.roster_id}`}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <div className="p-12 text-center text-muted">
                <div className="text-3xl mb-3">🏷️</div>
                <div className="font-bold text-white text-base">Bidding Strategy Not Applicable</div>
                <div className="text-xs text-muted max-w-md mx-auto mt-1">
                  FAAB dollar bids and spending velocity metrics are exclusive to seasons with active FAAB waiver budgets. The {selectedSeason.league.season} season used traditional rolling waiver priority.
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
