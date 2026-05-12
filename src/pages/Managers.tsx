import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { Card } from '../components/Card';
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

  if (loading && !selectedSeason) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4">Building manager profiles across all data sources...</div>
      </div>
    );
  }

  if (error || !selectedSeason) return null;

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

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mt-4 mb-2">League Managers ({selectedSeason.league.season})</h1>
      <p className="text-muted mb-10">Comprehensive overview of all managers in the league.</p>

      {/* Row 0: Standings Table */}
      <Card title="Team Standings" className="stagger-1 mb-12">
        <div className="overflow-hidden rounded-lg mt-6" style={{ border: '1px solid var(--card-border)' }}>
          <table className="standings-table">
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr>
                <th>Team</th>
                <th className="text-center">Record</th>
                {showAnalytics && (
                  <th className="text-center">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span>Vs League</span>
                      <div className="tooltip-container" style={{ marginLeft: '6px' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span>Composite Score</span>
                      <div className="tooltip-container" style={{ marginLeft: '6px' }}>
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
                      <span className="team-rank">{i + 1}.</span>
                      {selectedSeason.rosterToUser[r.roster_id]?.avatar ? (
                        <img src={`https://sleepercdn.com/avatars/thumbs/${selectedSeason.rosterToUser[r.roster_id].avatar}`} alt="avatar" className="team-avatar" />
                      ) : (
                        <div className="team-avatar-placeholder"></div>
                      )}
                      {selectedSeason.rosterToUser[r.roster_id]?.display_name || `Team ${r.roster_id}`}
                    </td>
                    <td className="text-center text-lg">{r.settings.wins}-{r.settings.losses}{r.settings.ties > 0 ? `-${r.settings.ties}` : ''}</td>
                    {showAnalytics && <td className="text-center font-mono text-success-color font-bold">{profile?.allPlayWins}-{profile?.allPlayLosses}</td>}
                    <td className="text-center font-mono text-accent-color">{(r.settings.fpts + (r.settings.fpts_decimal/100)).toFixed(1)}</td>
                    <td className="text-center font-mono text-muted">{(r.settings.fpts_against + (r.settings.fpts_against_decimal/100)).toFixed(1)}</td>
                    {showAnalytics && <td className="text-center font-mono text-white font-bold">{profile?.coachingEfficiency}%</td>}
                    {showAnalytics && (
                      <td className="text-center font-mono font-bold" style={{ color: 'var(--accent-color)' }}>
                        {profile?.compositeScore.toFixed(1)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Loading state for analytics */}
      {analyticsLoading && (
        <Card className="stagger-2 mb-8">
          <div className="flex flex-col justify-center items-center py-12">
            <div className="loading-spinner"></div>
            <div className="text-muted mt-4">Computing the Success Matrix across all data sources...</div>
          </div>
        </Card>
      )}

      {showAnalytics && (
        <>
          {/* 1. Global League Analysis section */}
          <div className="flex items-center gap-4 mb-6 mt-12 stagger-3">
            <h2 className="text-2xl text-white">Global League Analysis</h2>
            <div className="h-[1px] bg-white/10 flex-1 ml-4"></div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 mt-8">
            <Card title="Acquisition Production Matrix" className="stagger-3">
              <div className="text-sm text-muted mb-4">
                Draft+Keeper total pts vs Combined FAAB+Waiver pts generated.
                <div className="flex gap-4 mt-2 text-xs font-medium">
                  <span className="opacity-70">↖ Top Left: Relied heavily on Free Agency</span>
                  <span className="opacity-70">↘ Bottom Right: Draft Dominant</span>
                </div>
              </div>
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
                    <Scatter name="Teams" data={matrixData} shape={<CustomAvatarDot />} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Acquisition Accuracy Matrix" className="stagger-3">
              <div className="text-sm text-muted mb-4">
                Draft Hit Rate vs Combined FAAB & Waiver Hit Rate.
                <div className="flex gap-4 mt-2 text-xs font-medium">
                  <span className="opacity-70">↙ Bottom Left: Lottery Ticket Lovers</span>
                  <span className="opacity-70">↗ Top Right: Surgical Snipers</span>
                </div>
              </div>
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
                    <Scatter name="Teams" data={hitRateComparison} shape={<CustomAvatarDot />} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-8 mb-12">
            <Card title="Manager Composite Strength" className="stagger-3">
              <div className="text-sm text-muted mb-4">
                Weighted percentile ranking evaluating sourcing dominance across 
                <span className="text-white font-medium mx-1">Drafting (40%)</span>, 
                <span className="text-white font-medium mx-1">FAAB + Waivers (40%)</span>, and 
                <span className="text-white font-medium mx-1">Trades (20%)</span>.
              </div>
              <div style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compositeData} layout="vertical" margin={{ left: 40, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                    <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Bar dataKey="Score" fill="var(--accent-color)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* 2. Comparative Analytics section */}
          <div className="flex items-center gap-4 mb-6 mt-12 stagger-2">
            <h2 className="text-2xl text-white">Comparative Analytics</h2>
            <div className="h-[1px] bg-white/10 flex-1 ml-4"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Comparative Radar Chart 1 */}
            <Card title="Manager Skill (League Percentiles)" className="col-span-1 stagger-2">
              <div className="text-sm text-muted mb-2 text-center">How you rank against the league in each discipline.</div>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={comparativeRadarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    {radarProfiles.map((p, i) => (
                      <Radar key={p.roster_id} name={p.user.display_name} dataKey={`manager_${i}`} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.3} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {renderSelector(radarMgrs, setRadarMgrs)}
            </Card>

            {/* Comparative Radar Chart 2: Roster DNA */}
            <Card title="Roster Composition (% of Total Yield)" className="col-span-1 stagger-2">
              <div className="text-sm text-muted mb-2 text-center">Relative points contribution by channel.</div>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={comparativeRosterRadarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <RechartsTooltip 
                      formatter={(_value: any, name: any, entry: any) => {
                        // Dynamically swap manager_ index for raw_ index stored in data record
                        const rawKey = entry.dataKey?.replace('manager_', 'raw_');
                        const displayVal = entry.payload[rawKey] !== undefined ? entry.payload[rawKey] : _value;
                        return [`${displayVal}%`, name];
                      }}
                      contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                    />
                    {dnaProfiles.map((p, i) => (
                      <Radar key={p.roster_id} name={p.user.display_name} dataKey={`manager_${i}`} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.3} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {renderSelector(dnaMgrs, setDnaMgrs)}
            </Card>
          </div>

          <div className="mb-12">
            {/* Comparative Positional */}
            <Card title="Positional Scoring Output" className="stagger-3">
              <div className="text-sm text-muted mb-2 text-center">Total points scored by lineup position (scaled to max).</div>
              <div style={{ width: '100%', height: 320 }}>
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
                      <Radar key={p.roster_id} name={p.user.display_name} dataKey={`manager_${i}`} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.3} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {renderSelector(posMgrs, setPosMgrs)}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
