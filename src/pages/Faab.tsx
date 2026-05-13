import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useFaabEfficiency } from '../hooks/useFaabEfficiency';
import { useFreeAgencyEfficiency } from '../hooks/useFreeAgencyEfficiency';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, Legend, Label, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine } from 'recharts';

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 28;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  
  if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) return null;
  
  return (
    <svg x={cx - size/2} y={cy - size/2} width={size} height={size}>
      <defs>
        <clipPath id={`clip-${payload.name}`}>
          <circle cx={size/2} cy={size/2} r={size/2} />
        </clipPath>
      </defs>
      {avatarUrl ? (
        <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#clip-${payload.name})`} />
      ) : (
        <circle cx={size/2} cy={size/2} r={size/2} fill="#475569" />
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
        {data.winPct !== undefined && <div className="text-sm text-muted">Win %: <span className="text-success-color font-bold ml-1">{data.winPct}%</span></div>}
        {data.faabEfficiency !== undefined && <div className="text-sm text-muted">Efficiency: <span className="text-white font-bold ml-1">{data.faabEfficiency} pts/$</span></div>}
        {data.averageBidAmount !== undefined && <div className="text-sm text-muted">Avg Winning Bid: <span className="text-white font-bold ml-1">${data.averageBidAmount}</span></div>}
        {data.averageRunnerUpDelta !== undefined && <div className="text-sm text-muted">Avg Margin of Victory: <span className="text-danger-color font-bold ml-1">${data.averageRunnerUpDelta}</span></div>}
      </div>
    );
  }
  return null;
};

// Generate an array of 14 strictly distinct colors to prevent visual collisions

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
  '#ef4444', // Red
  '#f97316', // Orange
  '#fde047', // Yellow
  '#4ade80', // Mint Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ffffff', // White
  '#a3e635', // Lime
  '#4338ca', // Deep Indigo
  '#fda4af', // Salmon/Coral
  '#b45309', // Brown
  '#94a3b8', // Silver
];

export const Faab: React.FC = () => {
  const { selectedSeason } = useLeagueContext();
  const { data: faabData, loading, error } = useFaabEfficiency();
  
    const [pointFilter, setPointFilter] = useState<'all' | 'starters' | 'bench'>('starters');
  const [hiddenTeams, setHiddenTeams] = useState<string[]>([]);
  
  // Try to default to top 2 spenders
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
    
    // We need to calculate wins avg separately if it's not in faabData
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

  const radarProfiles = [...faabData].sort((a, b) => (a.user?.display_name || '').localeCompare(b.user?.display_name || ''));
  const activeRadarProfiles = radarMgrs.map(id => radarProfiles.find(p => p.roster_id === id)).filter(p => !!p) as any[];

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


  // Per-pickup FAAB value index
  const { topAssets: faabTopAssets } = useFreeAgencyEfficiency();
  const ppdLedger = faabTopAssets.all
    .filter(a => a.acqType === 'faab' && a.cost > 0 && a.starterPoints > 0)
    .map(a => ({ ...a, ppd: Number((a.starterPoints / a.cost).toFixed(2)) }))
    .sort((a, b) => b.ppd - a.ppd)
    .slice(0, 20);

  const toggleTeam = (teamName: string) => {
    if (hiddenTeams.includes(teamName)) {
      setHiddenTeams(hiddenTeams.filter(t => t !== teamName));
    } else {
      setHiddenTeams([...hiddenTeams, teamName]);
    }
  };

  if (loading || !selectedSeason) {
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
  const hitRateData = faabData.map(d => ({
    name: d.user?.display_name || `Team ${d.roster_id}`,
    Hits: d.hits,
    Busts: d.busts
  })).sort((a, b) => b.Hits - a.Hits);

  // Wasted FAAB
  const wastedFaabData = [...faabData].sort((a, b) => b.wastedFaab - a.wastedFaab);

  // Spending Velocity Data
  const velocityData = [];
  for (let week = 0; week < 18; week++) {
    const weekData: any = { week: `Wk ${week + 1}` };
    faabData.forEach(d => {
      const name = d.user?.display_name || `Team ${d.roster_id}`;
      weekData[name] = d.spendingVelocity[week];
    });
    velocityData.push(weekData);
  }

  // Positional Data
  const positionalData = faabData.map(d => {
    const obj: any = { name: d.user?.display_name || `Team ${d.roster_id}` };
    Object.keys(d.positionalSpend).forEach(pos => {
      obj[pos] = d.positionalSpend[pos];
    });
    return obj;
  }).sort((a, b) => {
    const sumA = Object.keys(a).filter(k => k !== 'name').reduce((acc, k) => acc + (a[k] as number), 0);
    const sumB = Object.keys(b).filter(k => k !== 'name').reduce((acc, k) => acc + (b[k] as number), 0);
    return sumB - sumA;
  });

  const allPositions = Array.from(new Set(faabData.flatMap(d => Object.keys(d.positionalSpend))));
  const posOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'IDP', 'OTHER'];
  allPositions.sort((a, b) => {
    const idxA = posOrder.indexOf(a);
    const idxB = posOrder.indexOf(b);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });
  
  const POS_COLORS: Record<string, string> = {
    QB: '#8b5cf6',
    RB: '#3b82f6',
    WR: '#10b981',
    TE: '#f59e0b',
    K: '#ef4444',
    IDP: '#06b6d4',
    OTHER: '#a8a29e'
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mt-4 mb-10">Advanced FAAB Analytics ({selectedSeason.league.season})</h1>

      {/* Row 1: Overpay Index & Hit Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <Card title="Bid Aggressiveness Matrix" className="stagger-1">
          <div className="chart-header">
            <div className="chart-description">
              Compares average FAAB spent per winning bid against the margin of victory (how much more they bid than the runner-up). Identifies who reads the market well and who frequently bids against nobody.
            </div>
            <div className="matrix-legend-wrapper">
              <div className="matrix-legend-grid">
                <div className="matrix-quadrant top-left">
                  👻 <strong style={{ color: '#fff', fontWeight: 500 }}>Uncontested Overpays</strong>
                </div>
                <div className="matrix-quadrant top-right">
                  💥 <strong style={{ color: '#fff', fontWeight: 500 }}>Massive Overpays</strong>
                </div>
                <div className="matrix-quadrant bottom-left">
                  🛒 <strong style={{ color: '#fff', fontWeight: 500 }}>Bargain Hunters</strong>
                </div>
                <div className="matrix-quadrant bottom-right">
                  🎯 <strong style={{ color: '#fff', fontWeight: 500 }}>Market Experts</strong>
                </div>
              </div>
            </div>
          </div>
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

        <Card title="FAAB Hit Rate (Starter Conversion)" className="stagger-1">
          <div className="chart-header">
            <div className="chart-legend-grid" style={{ paddingTop: 0, borderTop: 'none' }}>
              <div className="legend-item">
                <div className="legend-item-header"><span style={{ color: 'var(--success-color)' }}>🟩</span> Hits</div>
                <div className="legend-item-desc">Player started at least 1 game for the manager.</div>
              </div>
              <div className="legend-item">
                <div className="legend-item-header"><span style={{ color: 'var(--danger-color)' }}>🟥</span> Busts</div>
                <div className="legend-item-desc">Player started 0 games for the manager.</div>
              </div>
            </div>
          </div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hitRateData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Bar dataKey="Hits" stackId="a" fill="var(--success-color)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Busts" stackId="a" fill="var(--danger-color)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 2: Wasted FAAB & Positional Spending */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card title="Wasted FAAB (The Benchwarmers Fund)" className="stagger-2">
          <div className="chart-header">
            <div className="chart-description">
              Total FAAB dollars spent on players who never scored a single starter point for the manager.
            </div>
          </div>
          <div className="flex flex-col overflow-y-auto pr-4 mt-2" style={{ height: '350px' }}>
            {(() => {
              const maxWasted = Math.max(...wastedFaabData.map(d => d.wastedFaab));
              return wastedFaabData.map((d, i) => {
                const widthPct = maxWasted > 0 ? (d.wastedFaab / maxWasted) * 100 : 0;
                return (
                  <div key={d.roster_id} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', marginBottom: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <div 
                      style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${widthPct}%`, background: 'linear-gradient(90deg, transparent, var(--danger-color))', zIndex: 0, opacity: 0.2, transition: 'width 1s ease-out' }} 
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 10 }}>
                      <div style={{ color: '#94a3b8', fontWeight: 'bold', width: '24px', textAlign: 'right' }}>{i + 1}.</div>
                      {d.user?.avatar ? (
                        <img src={`https://sleepercdn.com/avatars/thumbs/${d.user.avatar}`} alt="avatar" className="avatar shadow-lg" width={36} height={36} />
                      ) : (
                        <div className="avatar" style={{ width: 36, height: 36, background: '#475569', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}></div>
                      )}
                      <span style={{ fontWeight: 600, fontSize: '1.125rem', color: '#fff' }}>{d.user?.display_name || `Team ${d.roster_id}`}</span>
                    </div>
                    <div style={{ fontWeight: 'bold', color: 'var(--danger-color)', fontSize: '1.125rem', position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {d.wastedFaab > 0 && <span style={{ filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))' }}>🔥</span>}
                      ${d.wastedFaab}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </Card>

                <Card title="Positional FAAB Strategy Map" className="stagger-2">
          <div className="chart-header">
            <div className="chart-description">
              Distribution of FAAB spending by position. Axes are normalized (0-100%) against the league's maximum spender at each position.
            </div>
          </div>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius="75%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} />
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
                <div
                  key={p.roster_id}
                  onClick={() => handleToggle(p.roster_id)}
                  className={`legend-toggle ${!isActive ? 'hidden-team' : ''}`}
                  style={{ 
                    borderColor: isActive ? color : 'rgba(255,255,255,0.05)',
                    opacity: isActive ? 1 : undefined,
                    cursor: 'pointer',
                  }}
                >
                  <div className="legend-color-box" style={{ background: color }}></div>
                  <span style={{ color: isActive ? '#fff' : '#94a3b8' }}>
                    {p.user?.display_name || `Team ${p.roster_id}`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Row 3: Spending Velocity (Full Width) */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card title="Spending Velocity" className="stagger-3">
          <div className="chart-header">
            <div className="chart-description">
              Cumulative FAAB expenditure by week. Click a team name below the chart to toggle their line.
            </div>
          </div>
          <div style={{ height: 450 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }}>
                  <Label value="Cumulative Spent ($)" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                </YAxis>
                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                {faabData.map((d, i) => {
                  const name = d.user?.display_name || `Team ${d.roster_id}`;
                  return (
                    <Line 
                      key={d.roster_id} 
                      type="monotone" 
                      dataKey={name} 
                      stroke={TEAM_COLORS[i % TEAM_COLORS.length]} 
                      strokeWidth={3} 
                      dot={false}
                      hide={hiddenTeams.includes(name)}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {faabData.map((d, i) => {
              const name = d.user?.display_name || `Team ${d.roster_id}`;
              const isHidden = hiddenTeams.includes(name);
              return (
                <div 
                  key={d.roster_id}
                  onClick={() => toggleTeam(name)}
                  className={`legend-toggle ${isHidden ? 'hidden-team' : ''}`}
                >
                  <span style={{ color: TEAM_COLORS[i % TEAM_COLORS.length], fontSize: '0.8rem', pointerEvents: 'none' }}>●</span>
                  <span className={`text-sm ${isHidden ? 'text-gray-500' : 'text-white'}`} style={{ pointerEvents: 'none' }}>{name}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Row 4: Spent vs Wins */}
      <div className="grid grid-cols-1 gap-8 mb-8">
                        <Card title="FAAB ROI vs Win Rate" className="stagger-4">
          <div className="text-sm text-muted mb-4 leading-relaxed">
            Compares FAAB Efficiency (Starter points generated per dollar spent) against Season Win Percentage.
            <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px 0', fontSize: '11px', color: 'rgba(255,255,255,0.7)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '380px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '0 16px 8px 0', borderRight: '2px solid rgba(255,255,255,0.15)', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
                  🏋️‍♂️ <strong style={{ color: '#fff', fontWeight: 500 }}>Won Despite Bad Pickups</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '0 0 8px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
                  👑 <strong style={{ color: '#fff', fontWeight: 500 }}>Waiver Wire Masters</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '8px 16px 0 0', borderRight: '2px solid rgba(255,255,255,0.15)' }}>
                  🗑️ <strong style={{ color: '#fff', fontWeight: 500 }}>Complete Whiffs</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '8px 0 0 16px' }}>
                  💎 <strong style={{ color: '#fff', fontWeight: 500 }}>Great Pickups, Bad Team</strong>
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: 450 }}>
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

      {/* Row 5: Efficiency Engine */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card className="stagger-5 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">FAAB Efficiency: Points Generated</h2>
            <div className="glass-toggle-container">
              <button onClick={() => setPointFilter('starters')} className={`glass-toggle-btn ${pointFilter === 'starters' ? 'active' : ''}`}>Starters Only</button>
              <button onClick={() => setPointFilter('bench')} className={`glass-toggle-btn ${pointFilter === 'bench' ? 'active' : ''}`}>Bench Only</button>
              <button onClick={() => setPointFilter('all')} className={`glass-toggle-btn ${pointFilter === 'all' ? 'active' : ''}`}>All Points</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div style={{ height: 300 }}>
              <h3 className="text-sm text-muted text-center mb-4 uppercase tracking-wider">Total Points</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pointsData} margin={{ bottom: 40 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" />
                  <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Bar dataKey="points" fill="var(--accent-color)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ height: 300 }}>
              <h3 className="text-sm text-muted text-center mb-4 uppercase tracking-wider">Points Per FAAB Dollar (VOC)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ppdData} margin={{ bottom: 40 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" />
                  <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Bar dataKey="ppd" fill="var(--success-color)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
      {/* Row 6: FAAB Value Index (pts/$) */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">FAAB Value Index (pts/$)</h2>
            <div className="text-sm text-muted mt-1">Best return on FAAB investment — starter points generated per dollar spent on a single pickup. Excludes $0 bids.</div>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto pr-2 pb-4" style={{ maxHeight: '520px' }}>
            {ppdLedger.map((asset, idx) => {
              const isTop3 = idx < 3;
              const rankColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : undefined;
              return (
                <div key={`ppd-${asset.playerId}-${idx}`}
                  className="flex justify-between items-center transition-all hover:bg-white/[0.03]"
                  style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isTop3 ? rankColor + '25' : 'rgba(255,255,255,0.05)'}`, borderRadius: '12px', padding: '12px 24px' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-bold text-center shrink-0" style={{ minWidth: '1.25rem', color: rankColor || 'var(--text-secondary)' }}>{idx + 1}</div>
                    {asset.managerAvatar
                      ? <img src={`https://sleepercdn.com/avatars/thumbs/${asset.managerAvatar}`} alt="avatar" className="avatar shrink-0" width={32} height={32} />
                      : <div className="avatar bg-slate-700 shrink-0" style={{ width: 32, height: 32 }} />
                    }
                    <div>
                      <div className="font-semibold">{asset.playerName}</div>
                      <div className="text-sm text-muted mt-0.5">
                        {asset.position} · <span style={{ color: 'var(--accent-color)' }}>{asset.managerName}</span> · <span style={{ color: '#4ade80' }}>${asset.cost} FAAB</span> · Wk {asset.weekAcquired} · {asset.weeksStarted} starts
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="font-bold text-lg font-mono" style={{ color: 'var(--accent-color)' }}>{asset.ppd.toFixed(2)}<span className="text-xs text-muted font-normal ml-1">pts/$</span></div>
                    <div className="text-xs text-muted">{asset.starterPoints.toFixed(1)} pts total</div>
                  </div>
                </div>
              );
            })}
            {ppdLedger.length === 0 && (
              <div className="p-12 text-center text-muted italic bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                No FAAB data available for this season.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
