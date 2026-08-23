import React, { useState } from 'react';
import { Info, Trophy, Crown, Target, Zap, LayoutGrid, Radar as RadarIcon, BarChart3, TrendingUp, Award, User } from 'lucide-react';
import { Card } from '../components/Card';
import { MobileTapHint } from '../components/MobileTapHint';
import { useLeagueContext } from '../context/LeagueContext';
import { useManagerAnalytics } from '../hooks/useManagerAnalytics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ScatterChart, Scatter, ReferenceLine, Label,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899'];

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const baseSize = 24;
  const size = baseSize + (payload.wins || 0) * 1.5;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  if (!cx || !cy) return null;
  return (
    <svg x={cx - size/2} y={cy - size/2} width={size} height={size}>
      <defs>
        <clipPath id={`clip-mgr-${payload.name}`}>
          <circle cx={size/2} cy={size/2} r={size/2} />
        </clipPath>
      </defs>
      {avatarUrl ? (
        <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#clip-mgr-${payload.name})`} />
      ) : (
        <circle cx={size/2} cy={size/2} r={size/2} fill="#475569" />
      )}
    </svg>
  );
};

const CustomHitRateTooltip = ({ active, payload }: any) => {
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
        <div className="text-sm text-muted">Draft Hit Rate: <span className="text-accent-color font-bold ml-1">{data.draftHitRate}%</span></div>
        <div className="text-sm text-muted">FAAB Hit Rate: <span className="text-success-color font-bold ml-1">{data.faabHitRate}%</span></div>
        <div className="text-sm text-muted">Total Wins: <span className="text-white font-bold ml-1">{data.wins}</span></div>
      </div>
    );
  }
  return null;
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
        <div className="text-sm text-muted">Record: <span className="text-white font-bold ml-1">{data.wins}W</span></div>
        <div className="text-sm text-muted">Draft Points: <span className="text-accent-color font-bold ml-1">{data.draftPts?.toFixed(1)}</span></div>
        <div className="text-sm text-muted">FAAB Points: <span className="text-success-color font-bold ml-1">{data.faabPts?.toFixed(1)}</span></div>
        {data.compositeScore !== undefined && <div className="text-sm text-muted">Composite Score: <span className="text-white font-bold ml-1">{data.compositeScore}</span></div>}
      </div>
    );
  }
  return null;
};

export const Managers: React.FC = () => {
  const { loading: ctxLoading, error, selectedSeason } = useLeagueContext();
  const { profiles, loading: analyticsLoading } = useManagerAnalytics();
  
  const [activeTab, setActiveTab] = useState<'standings' | 'matrices' | 'radars'>('standings');
  const [radarMgrs, setRadarMgrs] = useState<number[]>([]);
  const [dnaMgrs, setDnaMgrs] = useState<number[]>([]);
  const [posMgrs, setPosMgrs] = useState<number[]>([]);

  const loading = ctxLoading || analyticsLoading;

  // Initialize default selections with Top 3
  React.useEffect(() => {
    if (profiles.length > 0 && !analyticsLoading) {
      const top3 = [...profiles].sort((a,b) => b.compositeScore - a.compositeScore).slice(0, 3).map(p => p.roster_id);
      if (radarMgrs.length === 0) setRadarMgrs(top3);
      if (dnaMgrs.length === 0) setDnaMgrs(top3);
      if (posMgrs.length === 0) setPosMgrs(top3);
    }
  }, [profiles.length, analyticsLoading]);

  const handleToggle = (id: number, setFn: React.Dispatch<React.SetStateAction<number[]>>) => {
    setFn(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      const next = [...prev, id];
      return next.length > 4 ? next.slice(1) : next;
    });
  };

  const renderSelector = (currentIds: number[], setter: React.Dispatch<React.SetStateAction<number[]>>) => {
    const sortedProfiles = [...profiles].sort((a, b) => (a.user?.display_name || '').localeCompare(b.user?.display_name || ''));
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-6 border-t border-white/5 pt-4 w-full">
        {sortedProfiles.map(p => {
          const activeIdx = currentIds.indexOf(p.roster_id);
          const isActive = activeIdx !== -1;
          const color = isActive ? CHART_COLORS[activeIdx] : '#64748b';
          
          return (
            <div
              key={p.roster_id}
              onClick={() => handleToggle(p.roster_id, setter)}
              className={`legend-toggle ${!isActive ? 'hidden-team' : ''}`}
              style={{ 
                borderColor: isActive ? color : 'rgba(255,255,255,0.05)',
                opacity: isActive ? 1 : undefined
              }}
            >
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: color, 
                display: 'inline-block',
                opacity: isActive ? 1 : 0.5
              }}></span>
              <span className="text-sm font-medium" style={{ color: isActive ? '#fff' : 'var(--text-secondary)' }}>
                {p.user?.display_name || `Team ${p.roster_id}`}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const showAnalytics = profiles.length > 0 && !analyticsLoading;

  // --- Data transformations ---



  // 2. Success Matrix scatter
  const matrixData = showAnalytics
    ? profiles.map(p => ({
        name: p.user?.display_name || `Team ${p.roster_id}`,
        avatar: p.user?.avatar,
        draftPts: p.draftPoints + p.keeperPoints,
        faabPts: Number((p.faabPoints + p.waiverPoints).toFixed(1)),
        wins: p.wins,
        compositeScore: p.compositeScore,
      }))
    : [];

  // 3. Composite Score ranking
  const compositeData = showAnalytics
    ? [...profiles].sort((a, b) => b.compositeScore - a.compositeScore).map(p => ({
        name: p.user?.display_name || `Team ${p.roster_id}`,
        Score: p.compositeScore,
      }))
    : [];

  // 4. Hit Rate comparison (Draft vs FAAB) matrix
  const hitRateComparison = showAnalytics
    ? profiles.map(p => ({
        name: p.user?.display_name || `Team ${p.roster_id}`,
        avatar: p.user?.avatar,
        draftHitRate: p.draftHitRate,
        faabHitRate: p.faabHitRate,
        wins: p.wins
      }))
    : [];

  const avgDraftHitRate = showAnalytics && profiles.length > 0 ? Number((profiles.reduce((s, p) => s + p.draftHitRate, 0) / profiles.length).toFixed(1)) : 50;
  const avgFaabHitRate = showAnalytics && profiles.length > 0 ? Number((profiles.reduce((s, p) => s + p.faabHitRate, 0) / profiles.length).toFixed(1)) : 50;

  const getCenteredBounds = (data: any[], key: string, avg: number, minPadding = 8) => {
    if (data.length === 0) return [0, 100];
    const maxDev = Math.max(...data.map(d => Math.abs((d[key] || 0) - avg)), minPadding);
    const buffer = maxDev * 1.35;
    return [avg - buffer, avg + buffer];
  };

  const draftDomain = getCenteredBounds(hitRateComparison, 'draftHitRate', avgDraftHitRate);
  const faabDomain = getCenteredBounds(hitRateComparison, 'faabHitRate', avgFaabHitRate);

  const avgDraftPts = showAnalytics && matrixData.length > 0 ? Number((matrixData.reduce((s, p) => s + p.draftPts, 0) / matrixData.length).toFixed(1)) : 0;
  const avgFaabPts = showAnalytics && matrixData.length > 0 ? Number((matrixData.reduce((s, p) => s + p.faabPts, 0) / matrixData.length).toFixed(1)) : 0;

  const matrixDraftDomain = getCenteredBounds(matrixData, 'draftPts', avgDraftPts, 200);
  const matrixFaabDomain = getCenteredBounds(matrixData, 'faabPts', avgFaabPts, 100);

  // --- Comparison Section Data ---
  const radarProfiles = radarMgrs.map(id => profiles.find(p => p.roster_id === id)).filter(p => !!p) as any[];
  const dnaProfiles = dnaMgrs.map(id => profiles.find(p => p.roster_id === id)).filter(p => !!p) as any[];
  const posProfiles = posMgrs.map(id => profiles.find(p => p.roster_id === id)).filter(p => !!p) as any[];

  const getPercentile = (val: number, arr: number[]) => {
    const below = arr.filter(v => v < val).length;
    const tied = arr.filter(v => v === val).length;
    return arr.length > 0 ? ((below + (0.5 * tied)) / arr.length) * 100 : 50;
  };

  // Comparative Radar (Efficiency/Skill Percentiles)
  const comparativeRadarData: Record<string, any>[] = [
    { subject: 'Drafting', fullMark: 100 },
    { subject: 'Trading', fullMark: 100 },
    { subject: 'Coaching', fullMark: 100 },
    { subject: 'Waivers', fullMark: 100 },
    { subject: 'FAAB', fullMark: 100 },
  ];

  // Roster DNA Radar (Raw Point Contribution Distribution)
  const comparativeRosterRadarData: Record<string, any>[] = [
    { subject: 'Draft', fullMark: 100 },
    { subject: 'Keepers', fullMark: 100 },
    { subject: 'FAAB', fullMark: 100 },
    { subject: 'Trades', fullMark: 100 },
    { subject: 'Waivers', fullMark: 100 },
  ];

  if (showAnalytics) {
    // 1. The Skill Radar (Percentiles)
    radarProfiles.forEach((p, idx) => {
      const draftTot = p.draftPoints + p.keeperPoints;
      const faabTot = p.faabPoints;
      const tradeNet = p.tradeNetPoints;
      const waiversTot = p.waiverPoints;

      comparativeRadarData[0][`manager_${idx}`] = Math.max(10, getPercentile(draftTot, profiles.map(m => m.draftPoints + m.keeperPoints)));
      comparativeRadarData[1][`manager_${idx}`] = Math.max(10, getPercentile(tradeNet, profiles.map(m => m.tradeNetPoints)));
      comparativeRadarData[2][`manager_${idx}`] = Math.max(10, getPercentile(p.coachingEfficiency, profiles.map(m => m.coachingEfficiency)));
      comparativeRadarData[3][`manager_${idx}`] = Math.max(10, getPercentile(waiversTot, profiles.map(m => m.waiverPoints)));
      comparativeRadarData[4][`manager_${idx}`] = Math.max(10, getPercentile(faabTot, profiles.map(m => m.faabPoints)));
    });

    // 2. The DNA Radar (% of Total Points - Scaled to absolute peak maxes!)
    // We grab the global maximums across ALL managers so that we normalize to the outer rim correctly.
    const maxDraft = Math.max(...profiles.map(m => m.draftPct), 1);
    const maxKeeper = Math.max(...profiles.map(m => m.keeperPct), 1);
    const maxFaab = Math.max(...profiles.map(m => m.faabPct), 1);
    const maxTrade = Math.max(...profiles.map(m => m.tradePct), 1);
    const maxOther = Math.max(...profiles.map(m => m.otherPct), 1);

    dnaProfiles.forEach((p, idx) => {
      // We compute visual scaling to 100 so polygons expand into the chart container
      comparativeRosterRadarData[0][`manager_${idx}`] = Number(((p.draftPct / maxDraft) * 100).toFixed(1));
      comparativeRosterRadarData[1][`manager_${idx}`] = Number(((p.keeperPct / maxKeeper) * 100).toFixed(1));
      comparativeRosterRadarData[2][`manager_${idx}`] = Number(((p.faabPct / maxFaab) * 100).toFixed(1));
      comparativeRosterRadarData[3][`manager_${idx}`] = Number(((p.tradePct / maxTrade) * 100).toFixed(1));
      comparativeRosterRadarData[4][`manager_${idx}`] = Number(((p.otherPct / maxOther) * 100).toFixed(1));

      // We store the RAW raw literal values in custom metadata keys for the Tooltip so actual % reads perfectly!
      comparativeRosterRadarData[0][`raw_${idx}`] = p.draftPct;
      comparativeRosterRadarData[1][`raw_${idx}`] = p.keeperPct;
      comparativeRosterRadarData[2][`raw_${idx}`] = p.faabPct;
      comparativeRosterRadarData[3][`raw_${idx}`] = p.tradePct;
      comparativeRosterRadarData[4][`raw_${idx}`] = p.otherPct;
    });
  }

  // Comparative Positional (Normalized Radar!)
  const comparativePosData: Record<string, any>[] = [
    { subject: 'QB' },
    { subject: 'RB' },
    { subject: 'WR' },
    { subject: 'TE' },
    { subject: 'K' },
    { subject: 'IDP' }
  ];
  if (showAnalytics) {
    // Prepare raw aggregates across all managers first to discover peak axes
    const allPosRaws = profiles.map(p => {
      const idpTotal = (p.positionalPoints?.['IDP'] || 0) + 
                       (p.positionalPoints?.['DL'] || 0) + 
                       (p.positionalPoints?.['LB'] || 0) + 
                       (p.positionalPoints?.['DB'] || 0);
      return {
        QB: p.positionalPoints?.['QB'] || 0,
        RB: p.positionalPoints?.['RB'] || 0,
        WR: p.positionalPoints?.['WR'] || 0,
        TE: p.positionalPoints?.['TE'] || 0,
        K: p.positionalPoints?.['K'] || 0,
        IDP: idpTotal
      };
    });

    const maxQB = Math.max(...allPosRaws.map(p => p.QB), 1);
    const maxRB = Math.max(...allPosRaws.map(p => p.RB), 1);
    const maxWR = Math.max(...allPosRaws.map(p => p.WR), 1);
    const maxTE = Math.max(...allPosRaws.map(p => p.TE), 1);
    const maxK = Math.max(...allPosRaws.map(p => p.K), 1);
    const maxIDP = Math.max(...allPosRaws.map(p => p.IDP), 1);

    posProfiles.forEach((p, idx) => {
      const qb = Number((p.positionalPoints?.['QB'] || 0).toFixed(1));
      const rb = Number((p.positionalPoints?.['RB'] || 0).toFixed(1));
      const wr = Number((p.positionalPoints?.['WR'] || 0).toFixed(1));
      const te = Number((p.positionalPoints?.['TE'] || 0).toFixed(1));
      const k = Number((p.positionalPoints?.['K'] || 0).toFixed(1));
      const idpTotal = (p.positionalPoints?.['IDP'] || 0) + 
                       (p.positionalPoints?.['DL'] || 0) + 
                       (p.positionalPoints?.['LB'] || 0) + 
                       (p.positionalPoints?.['DB'] || 0);
      const idp = Number(idpTotal.toFixed(1));

      // Scaled to 100
      comparativePosData[0][`manager_${idx}`] = Number(((qb / maxQB) * 100).toFixed(1));
      comparativePosData[1][`manager_${idx}`] = Number(((rb / maxRB) * 100).toFixed(1));
      comparativePosData[2][`manager_${idx}`] = Number(((wr / maxWR) * 100).toFixed(1));
      comparativePosData[3][`manager_${idx}`] = Number(((te / maxTE) * 100).toFixed(1));
      comparativePosData[4][`manager_${idx}`] = Number(((k / maxK) * 100).toFixed(1));
      comparativePosData[5][`manager_${idx}`] = Number(((idp / maxIDP) * 100).toFixed(1));

      // Raw storage
      comparativePosData[0][`raw_${idx}`] = qb;
      comparativePosData[1][`raw_${idx}`] = rb;
      comparativePosData[2][`raw_${idx}`] = wr;
      comparativePosData[3][`raw_${idx}`] = te;
      comparativePosData[4][`raw_${idx}`] = k;
      comparativePosData[5][`raw_${idx}`] = idp;
    });
  }

  // --- Hero KPIs ---
  const heroKpis = React.useMemo(() => {
    if (!selectedSeason || !profiles.length) return null;
    const sortedByStandings = [...selectedSeason.rosters].sort((a, b) => b.settings.wins - a.settings.wins || b.settings.fpts - a.settings.fpts);
    const topSeed = sortedByStandings[0];
    const topSeedUser = topSeed ? selectedSeason.rosterToUser[topSeed.roster_id] : null;

    const topComposite = [...profiles].sort((a, b) => b.compositeScore - a.compositeScore)[0];
    const topCoach = [...profiles].sort((a, b) => b.coachingEfficiency - a.coachingEfficiency)[0];
    
    const sortedByPoints = [...selectedSeason.rosters].sort((a, b) => (b.settings.fpts + b.settings.fpts_decimal/100) - (a.settings.fpts + a.settings.fpts_decimal/100));
    const topScorer = sortedByPoints[0];
    const topScorerUser = topScorer ? selectedSeason.rosterToUser[topScorer.roster_id] : null;

    return {
      topSeed: topSeed ? {
        rosterId: topSeed.roster_id,
        user: topSeedUser,
        wins: topSeed.settings.wins,
        losses: topSeed.settings.losses,
        fpts: (topSeed.settings.fpts + topSeed.settings.fpts_decimal/100).toFixed(1)
      } : null,
      topComposite: topComposite ? {
        user: topComposite.user,
        score: topComposite.compositeScore.toFixed(1),
        rosterId: topComposite.roster_id
      } : null,
      topCoach: topCoach ? {
        user: topCoach.user,
        efficiency: topCoach.coachingEfficiency.toFixed(1),
        rosterId: topCoach.roster_id
      } : null,
      topScorer: topScorer ? {
        user: topScorerUser,
        fpts: (topScorer.settings.fpts + topScorer.settings.fpts_decimal/100).toFixed(1),
        rosterId: topScorer.roster_id
      } : null
    };
  }, [selectedSeason, profiles]);

  if (loading && !selectedSeason) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4">Building manager profiles across all data sources...</div>
      </div>
    );
  }

  if (error || !selectedSeason) return null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gradient">League Managers ({selectedSeason.league.season})</h1>
        <p className="text-muted text-sm mt-1">
          Season standings, sourcing efficiency matrices, composite scores, and comparative multi-discipline radars.
        </p>
      </div>

      {/* Hero KPI Cards */}
      {heroKpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* 1. Regular Season Leader */}
          {heroKpis.topSeed && (
            <div className="glass-card p-4 rounded-xl border border-amber-500/20 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Crown size={14} className="text-amber-400 shrink-0" />
                  <span className="truncate">Regular Season #1 Seed</span>
                </div>
                <div className="flex items-center gap-3">
                  {heroKpis.topSeed.user?.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.topSeed.user.avatar}`}
                      alt=""
                      className="w-10 h-10 rounded-full border border-amber-400/40 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                      N/A
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm truncate">
                      {heroKpis.topSeed.user?.display_name || `Team ${heroKpis.topSeed.rosterId}`}
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                      {heroKpis.topSeed.wins}-{heroKpis.topSeed.losses} ({heroKpis.topSeed.fpts} pts)
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                Top regular season record and standings seed
              </div>
            </div>
          )}

          {/* 2. Top Composite Score */}
          {heroKpis.topComposite && (
            <div className="glass-card p-4 rounded-xl border border-blue-500/20 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Award size={14} className="text-blue-400 shrink-0" />
                  <span className="truncate">Top Composite Index</span>
                </div>
                <div className="flex items-center gap-3">
                  {heroKpis.topComposite.user?.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.topComposite.user.avatar}`}
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
                      {heroKpis.topComposite.user?.display_name || `Team ${heroKpis.topComposite.rosterId}`}
                    </div>
                    <div className="text-xs font-mono font-bold text-blue-400 mt-0.5">
                      {heroKpis.topComposite.score} / 100 Composite
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                Drafting (40%) + Free Agency (40%) + Trades (20%)
              </div>
            </div>
          )}

          {/* 3. Top Lineup Accuracy */}
          {heroKpis.topCoach && (
            <div className="glass-card p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Target size={14} className="text-emerald-400 shrink-0" />
                  <span className="truncate">Lineup Accuracy Leader</span>
                </div>
                <div className="flex items-center gap-3">
                  {heroKpis.topCoach.user?.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.topCoach.user.avatar}`}
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
                      {heroKpis.topCoach.user?.display_name || `Team ${heroKpis.topCoach.rosterId}`}
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                      {heroKpis.topCoach.efficiency}% optimal yield
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                Points scored vs total potential maximum
              </div>
            </div>
          )}

          {/* 4. Top Scoring Offense */}
          {heroKpis.topScorer && (
            <div className="glass-card p-4 rounded-xl border border-purple-500/20 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Zap size={14} className="text-purple-400 shrink-0" />
                  <span className="truncate">Top Scoring Offense</span>
                </div>
                <div className="flex items-center gap-3">
                  {heroKpis.topScorer.user?.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.topScorer.user.avatar}`}
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
                      {heroKpis.topScorer.user?.display_name || `Team ${heroKpis.topScorer.rosterId}`}
                    </div>
                    <div className="text-xs font-mono font-bold text-purple-400 mt-0.5">
                      {heroKpis.topScorer.fpts} total PF
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                Highest raw fantasy points scored
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3-Hub Tab Command Bar */}
      <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-2 mb-8 w-full">
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'standings'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
              : 'text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeTab === 'standings' ? 'bg-white/20' : 'bg-white/5'}`}>
            <Trophy size={16} />
          </div>
          <span>Standings & Composite Index</span>
        </button>

        <button
          onClick={() => setActiveTab('matrices')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'matrices'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/30'
              : 'text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeTab === 'matrices' ? 'bg-white/20' : 'bg-white/5'}`}>
            <LayoutGrid size={16} />
          </div>
          <span>Acquisition & Accuracy Matrices</span>
        </button>

        <button
          onClick={() => setActiveTab('radars')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'radars'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/30'
              : 'text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeTab === 'radars' ? 'bg-white/20' : 'bg-white/5'}`}>
            <RadarIcon size={16} />
          </div>
          <span>Comparative Radars & DNA</span>
        </button>
      </div>

      {/* Loading state for analytics */}
      {analyticsLoading && (
        <Card className="stagger-2 mb-8">
          <div className="flex flex-col justify-center items-center py-12">
            <div className="loading-spinner"></div>
            <div className="text-muted mt-4">Computing the Success Matrix across all data sources...</div>
          </div>
        </Card>
      )}

      {/* Tab 1: Standings & Composite Index */}
      {activeTab === 'standings' && (
        <div className="space-y-8 animate-fade-in">
          {/* Team Standings Card */}
          <Card title="Team Standings" className="stagger-1">
            <MobileTapHint text="Swipe/Scroll for full metrics" />
            
            {/* Mobile View: Card Stack (Fixed Collision Layout) */}
            <div className="md:hidden flex flex-col gap-3 mt-4">
              {[...selectedSeason.rosters].sort((a,b) => b.settings.wins - a.settings.wins || b.settings.fpts - a.settings.fpts).map((r, i) => {
                const profile = profiles.find(p => p.roster_id === r.roster_id);
                const user = selectedSeason.rosterToUser[r.roster_id];
                const pf = (r.settings.fpts + (r.settings.fpts_decimal/100)).toFixed(1);
                const pa = (r.settings.fpts_against + (r.settings.fpts_against_decimal/100)).toFixed(1);
                
                return (
                  <div 
                    key={r.roster_id} 
                    className={`p-4 rounded-xl border transition-all ${
                      i === 0 
                        ? 'bg-amber-500/5 border-amber-500/25 shadow-lg shadow-amber-500/5' 
                        : i === 1 
                        ? 'bg-slate-400/5 border-slate-400/25' 
                        : i === 2 
                        ? 'bg-amber-700/5 border-amber-700/25' 
                        : 'bg-black/30 border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-xs font-bold ${
                          i === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          i === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40' :
                          i === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40' :
                          'bg-white/5 text-muted border border-white/10'
                        }`}>
                          {i + 1}
                        </div>
                        {user?.avatar ? (
                          <img src={`https://sleepercdn.com/avatars/thumbs/${user.avatar}`} alt="" className="w-10 h-10 rounded-full border border-white/15 object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/50 shrink-0">N/A</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-white truncate">{user?.display_name || `Team ${r.roster_id}`}</div>
                          <div className="text-xs text-muted font-medium mt-0.5">{r.settings.wins}-{r.settings.losses}{r.settings.ties > 0 ? `-${r.settings.ties}` : ''}</div>
                        </div>
                      </div>
                      {showAnalytics && profile && (
                        <div className="flex flex-col items-end justify-center shrink-0 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
                          <div className="text-[10px] text-muted uppercase tracking-wider font-semibold">Composite</div>
                          <div className="font-mono font-bold text-base text-accent-color">{profile.compositeScore.toFixed(1)}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">PF</span>
                        <span className="font-mono font-bold text-accent-color">{pf}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">PA</span>
                        <span className="font-mono font-medium text-gray-300">{pa}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Vs League</span>
                        <span className="font-mono font-bold text-success-color">{profile?.allPlayWins}-{profile?.allPlayLosses}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Traditional Table */}
            <div className="hidden md:block table-container mt-4">
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="standings-table">
                  <thead className="bg-white/[0.02]">
                    <tr>
                      <th>Team</th>
                      <th className="text-center">Record</th>
                      {showAnalytics && (
                        <th className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Vs League</span>
                            <div className="tooltip-container">
                              <Info size={12} className="text-muted opacity-50" />
                              <div className="tooltip-text">
                                Standard All-Play Record: Wins and losses aggregated as if you played every league member every week.
                              </div>
                            </div>
                          </div>
                        </th>
                      )}
                      <th className="text-center">PF</th>
                      <th className="text-center">PA</th>
                      {showAnalytics && <th className="text-center">Lineup Acc</th>}
                      {showAnalytics && (
                        <th className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Composite Score</span>
                            <div className="tooltip-container">
                              <Info size={12} className="text-muted opacity-50" />
                              <div className="tooltip-text align-right">
                                Composite Impact: Blended weighting across Drafting (40%), Free Agency/Waivers (40%), and Trading (20%).
                              </div>
                            </div>
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {[...selectedSeason.rosters].sort((a,b) => b.settings.wins - a.settings.wins || b.settings.fpts - a.settings.fpts).map((r, i) => {
                      const profile = profiles.find(p => p.roster_id === r.roster_id);
                      return (
                        <tr 
                          key={r.roster_id} 
                          className="standings-row"
                          style={{ 
                            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                            cursor: 'default'
                          }}
                        >
                          <td className="team-cell">
                            <span className={`font-mono text-xs font-bold mr-2 ${
                              i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-muted'
                            }`}>
                              {i + 1}.
                            </span>
                            {selectedSeason.rosterToUser[r.roster_id]?.avatar ? (
                              <img src={`https://sleepercdn.com/avatars/thumbs/${selectedSeason.rosterToUser[r.roster_id].avatar}`} alt="avatar" className="team-avatar" />
                            ) : (
                              <div className="team-avatar-placeholder"></div>
                            )}
                            <span className="font-semibold text-white">
                              {selectedSeason.rosterToUser[r.roster_id]?.display_name || `Team ${r.roster_id}`}
                            </span>
                          </td>
                          <td className="text-center text-base font-bold font-mono text-white">{r.settings.wins}-{r.settings.losses}{r.settings.ties > 0 ? `-${r.settings.ties}` : ''}</td>
                          {showAnalytics && <td className="text-center font-mono text-success-color font-bold">{profile?.allPlayWins}-{profile?.allPlayLosses}</td>}
                          <td className="text-center font-mono text-accent-color font-semibold">{(r.settings.fpts + (r.settings.fpts_decimal/100)).toFixed(1)}</td>
                          <td className="text-center font-mono text-muted">{(r.settings.fpts_against + (r.settings.fpts_against_decimal/100)).toFixed(1)}</td>
                          {showAnalytics && <td className="text-center font-mono text-white font-bold">{profile?.coachingEfficiency}%</td>}
                          {showAnalytics && (
                            <td className="text-center font-mono font-bold text-accent-color">
                              {profile?.compositeScore.toFixed(1)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Manager Composite Strength Card */}
          {showAnalytics && (
            <Card title="Manager Composite Strength Ranking" className="stagger-2">
              <div className="text-sm text-muted mb-4">
                Weighted percentile ranking evaluating sourcing dominance across 
                <span className="text-white font-medium mx-1">Drafting (40%)</span>, 
                <span className="text-white font-medium mx-1">FAAB + Waivers (40%)</span>, and 
                <span className="text-white font-medium mx-1">Trades (20%)</span>.
              </div>
              <div style={{ height: 420 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compositeData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} width={120} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const profile = profiles.find(p => (p.user?.display_name || `Team ${p.roster_id}`) === data.name);
                          return (
                            <div className="bg-[#0f1115]/95 border border-white/10 rounded-xl p-3.5 shadow-2xl min-w-[220px]">
                              <div className="font-bold text-sm text-white mb-1.5 pb-1 border-b border-white/10 flex items-center justify-between">
                                <span>{data.name}</span>
                                <span className="font-mono text-accent-color font-bold">{data.Score.toFixed(1)}</span>
                              </div>
                              {profile && (
                                <div className="space-y-1 text-xs text-muted">
                                  <div className="flex justify-between">
                                    <span>Draft Points:</span>
                                    <span className="font-mono text-white">{(profile.draftPoints + profile.keeperPoints).toFixed(1)} pts</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Free Agency Points:</span>
                                    <span className="font-mono text-white">{(profile.faabPoints + profile.waiverPoints).toFixed(1)} pts</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Trade Net Points:</span>
                                    <span className="font-mono text-white">{profile.tradeNetPoints > 0 ? '+' : ''}{profile.tradeNetPoints.toFixed(1)} pts</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Lineup Accuracy:</span>
                                    <span className="font-mono text-white">{profile.coachingEfficiency}%</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="Score" fill="var(--accent-color)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Acquisition & Accuracy Matrices */}
      {activeTab === 'matrices' && showAnalytics && (
        <div className="animate-fade-in space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 1. Acquisition Production Matrix */}
            <Card title="Acquisition Production Matrix" className="stagger-1">
              <div className="chart-header mb-4">
                <div className="chart-description">
                  Draft & Keeper total pts vs Combined FAAB & Waiver pts generated.
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs">
                    <span className="text-sm shrink-0">🛒</span>
                    <div className="min-w-0">
                      <span className="font-bold text-blue-400">FAAB Heavy</span>
                      <div className="text-[10px] text-muted truncate">Top-Left • High FAAB/Waivers, Lower Draft</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                    <span className="text-sm shrink-0">👑</span>
                    <div className="min-w-0">
                      <span className="font-bold text-emerald-400">Double Threat</span>
                      <div className="text-[10px] text-muted truncate">Top-Right • Elite Draft + Elite Waivers</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs">
                    <span className="text-sm shrink-0">📉</span>
                    <div className="min-w-0">
                      <span className="font-bold text-rose-400">Struggling Roster</span>
                      <div className="text-[10px] text-muted truncate">Bottom-Left • Below average on both</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs">
                    <span className="text-sm shrink-0">🛡️</span>
                    <div className="min-w-0">
                      <span className="font-bold text-teal-400">Draft Heavy</span>
                      <div className="text-[10px] text-muted truncate">Bottom-Right • High Draft, Lower Waivers</div>
                    </div>
                  </div>
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="draftPts" name="Draft + Keeper Points" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={matrixDraftDomain} allowDecimals={false}>
                      <Label value="Draft + Keeper Points" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                    </XAxis>
                    <YAxis type="number" dataKey="faabPts" name="Free Agency Points" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={matrixFaabDomain} allowDecimals={false} width={70}>
                      <Label value="Free Agency Pts (FAAB+Waiver)" angle={-90} position="insideLeft" offset={5} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                    </YAxis>
                    <ReferenceLine x={avgDraftPts} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
                    <ReferenceLine y={avgFaabPts} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
                    <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                    <Scatter name="Teams" data={matrixData} shape={<CustomAvatarDot />} isAnimationActive={false} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 2. Acquisition Accuracy Matrix */}
            <Card title="Acquisition Accuracy Matrix" className="stagger-1">
              <div className="chart-header mb-4">
                <div className="chart-description">
                  Draft Hit Rate vs Combined FAAB & Waiver Hit Rate.
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs">
                    <span className="text-sm shrink-0">🧪</span>
                    <div className="min-w-0">
                      <span className="font-bold text-blue-400">FAAB Specialists</span>
                      <div className="text-[10px] text-muted truncate">Top-Left • High FAAB %, Low Draft %</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                    <span className="text-sm shrink-0">🎯</span>
                    <div className="min-w-0">
                      <span className="font-bold text-emerald-400">Surgical Snipers</span>
                      <div className="text-[10px] text-muted truncate">Top-Right • Elite accuracy on both channels</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs">
                    <span className="text-sm shrink-0">🎰</span>
                    <div className="min-w-0">
                      <span className="font-bold text-rose-400">Lottery Pickers</span>
                      <div className="text-[10px] text-muted truncate">Bottom-Left • Below average hit rates</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs">
                    <span className="text-sm shrink-0">🛡️</span>
                    <div className="min-w-0">
                      <span className="font-bold text-teal-400">Draft Specialists</span>
                      <div className="text-[10px] text-muted truncate">Bottom-Right • High Draft %, Low FAAB %</div>
                    </div>
                  </div>
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="draftHitRate" name="Draft Hit Rate" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={draftDomain} unit="%" allowDecimals={false}>
                      <Label value="Draft Hit Rate (%)" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                    </XAxis>
                    <YAxis type="number" dataKey="faabHitRate" name="FAAB+Waiver Hit Rate" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={faabDomain} unit="%" allowDecimals={false} width={70}>
                      <Label value="Free Agency Hit Rate (%)" angle={-90} position="insideLeft" offset={5} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                    </YAxis>
                    <ReferenceLine x={avgDraftHitRate} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
                    <ReferenceLine y={avgFaabHitRate} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
                    <RechartsTooltip content={<CustomHitRateTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                    <Scatter name="Teams" data={hitRateComparison} shape={<CustomAvatarDot />} isAnimationActive={false} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 3: Comparative Radars & DNA */}
      {activeTab === 'radars' && showAnalytics && (
        <div className="animate-fade-in space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Comparative Radar Chart 1 */}
            <Card title="Manager Skill (League Percentiles)" className="col-span-1 stagger-1">
              <div className="text-sm text-muted mb-2 text-center">How managers rank against the league in each discipline.</div>
              <MobileTapHint />
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={comparativeRadarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    {radarProfiles.map((p, i) => (
                      <Radar key={p.roster_id} name={p.user?.display_name || `Team ${p.roster_id}`} dataKey={`manager_${i}`} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.25} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {renderSelector(radarMgrs, setRadarMgrs)}
            </Card>

            {/* Comparative Radar Chart 2: Roster DNA */}
            <Card title="Roster Composition (% of Total Yield)" className="col-span-1 stagger-1">
              <div className="text-sm text-muted mb-2 text-center">Relative points contribution by acquisition channel.</div>
              <MobileTapHint />
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={comparativeRosterRadarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <RechartsTooltip 
                      formatter={(_value: any, name: any, entry: any) => {
                        const rawKey = entry.dataKey?.replace('manager_', 'raw_');
                        const displayVal = entry.payload[rawKey] !== undefined ? entry.payload[rawKey] : _value;
                        return [`${displayVal}%`, name];
                      }}
                      contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                    />
                    {dnaProfiles.map((p, i) => (
                      <Radar key={p.roster_id} name={p.user?.display_name || `Team ${p.roster_id}`} dataKey={`manager_${i}`} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.25} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {renderSelector(dnaMgrs, setDnaMgrs)}
            </Card>
          </div>

          {/* Positional Scoring Output */}
          <Card title="Positional Scoring Output" className="stagger-2">
            <div className="text-sm text-muted mb-2 text-center">Total fantasy points scored by lineup position (normalized to peak).</div>
            <MobileTapHint />
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={comparativePosData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <RechartsTooltip 
                    formatter={(_value: any, name: any, entry: any) => {
                      const rawKey = entry.dataKey?.replace('manager_', 'raw_');
                      const displayVal = entry.payload[rawKey] !== undefined ? entry.payload[rawKey] : _value;
                      return [`${displayVal} pts`, name];
                    }}
                    contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                  />
                  {posProfiles.map((p, i) => (
                    <Radar key={p.roster_id} name={p.user?.display_name || `Team ${p.roster_id}`} dataKey={`manager_${i}`} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.25} />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {renderSelector(posMgrs, setPosMgrs)}
          </Card>
        </div>
      )}
    </div>
  );
};
