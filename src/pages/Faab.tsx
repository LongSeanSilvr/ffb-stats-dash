import React, { useState } from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useFaabEfficiency } from '../hooks/useFaabEfficiency';
import { useFreeAgencyEfficiency } from '../hooks/useFreeAgencyEfficiency';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, Legend, Label } from 'recharts';

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 28;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  
  if (!cx || !cy) return null;
  
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
        {data.wins !== undefined && <div className="text-sm text-muted">Wins: <span className="text-success-color font-bold ml-1">{data.wins}</span></div>}
        {data.faabSpent !== undefined && <div className="text-sm text-muted">FAAB Spent: <span className="text-white font-bold ml-1">${data.faabSpent}</span></div>}
        {data.overpay !== undefined && <div className="text-sm text-muted">Total Overpay: <span className="text-danger-color font-bold ml-1">${data.overpay}</span></div>}
        {data.acquisitions !== undefined && <div className="text-sm text-muted">Acquisitions: <span className="text-white font-bold ml-1">{data.acquisitions}</span></div>}
      </div>
    );
  }
  return null;
};

// Generate an array of 14 strictly distinct colors to prevent visual collisions
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

  // Scatter Chart 1: Spent vs Wins
  const scatterDataWins = selectedSeason.rosters.map(r => {
    const user = selectedSeason.rosterToUser[r.roster_id];
    return {
      name: user?.display_name || `Team ${r.roster_id}`,
      avatar: user?.avatar,
      wins: r.settings.wins,
      faabSpent: r.settings.waiver_budget_used || 0
    };
  });

  // Scatter Chart 2: The Overpay Index
  const scatterDataOverpay = faabData.map(d => ({
    name: d.user?.display_name || `Team ${d.roster_id}`,
    avatar: d.user?.avatar,
    acquisitions: d.hits + d.busts,
    overpay: d.overpayAmount
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
  })).sort((a, b) => (b.Hits + b.Busts) - (a.Hits + a.Busts));

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
  const posOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'IDP', 'OTHER'];
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
    DEF: '#64748b',
    IDP: '#06b6d4',
    OTHER: '#a8a29e'
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mt-4 mb-10">Advanced FAAB Analytics ({selectedSeason.league.season})</h1>

      {/* Row 1: Overpay Index & Hit Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card title="The Overpay Index" className="stagger-1">
          <div className="text-sm text-muted mb-4">Total FAAB Overpay vs. Total Successful Claims</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="acquisitions" name="Acquisitions" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="Acquisitions" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                </XAxis>
                <YAxis type="number" dataKey="overpay" name="Overpay Margin" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="Overpay Margin ($)" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                </YAxis>
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter name="Teams" data={scatterDataOverpay} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="FAAB Hit Rate (Starter Conversion)" className="stagger-1">
          <div className="text-sm text-muted mb-4">"Hits" = Started at least 1 game. "Busts" = 0 games started.</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hitRateData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend
                  content={() => (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--success-color)', display: 'inline-block' }} />
                        <span style={{ color: '#94a3b8' }}>Hits</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--danger-color)', display: 'inline-block' }} />
                        <span style={{ color: '#94a3b8' }}>Busts</span>
                      </span>
                    </div>
                  )}
                />
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
          <div className="text-sm text-muted mb-4">FAAB dollars spent on players who never scored a single starter point.</div>
          <div className="flex flex-col gap-4 overflow-y-auto pr-4 mt-2" style={{ height: '350px' }}>
            {wastedFaabData.map((d, i) => (
              <div key={d.roster_id} className="flex justify-between items-center p-4 transition-all" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <div className="flex items-center gap-4">
                  <div className="text-muted font-bold w-6 text-right">{i + 1}.</div>
                  {d.user?.avatar ? (
                    <img src={`https://sleepercdn.com/avatars/thumbs/${d.user.avatar}`} alt="avatar" className="avatar shadow-lg" width={36} height={36} />
                  ) : (
                    <div className="avatar bg-gray-600 shadow-lg" style={{ width: 36, height: 36 }}></div>
                  )}
                  <span className="font-semibold text-lg">{d.user?.display_name || `Team ${d.roster_id}`}</span>
                </div>
                <div className="font-bold text-danger-color text-lg">${d.wastedFaab}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Positional Spending" className="stagger-2">
          <div className="text-sm text-muted mb-4">Total FAAB spent categorized by player position.</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={positionalData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend
                  content={() => (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                      {allPositions.map(pos => (
                        <span key={pos} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: 12, height: 12, borderRadius: 2, background: POS_COLORS[pos] || '#a8a29e', display: 'inline-block' }} />
                          <span style={{ color: '#94a3b8' }}>{pos}</span>
                        </span>
                      ))}
                    </div>
                  )}
                />
                {allPositions.map(pos => (
                  <Bar key={pos} dataKey={pos} stackId="a" fill={POS_COLORS[pos] || '#a8a29e'} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3: Spending Velocity (Full Width) */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card title="Spending Velocity" className="stagger-3">
          <div className="text-sm text-muted mb-4">Cumulative FAAB expenditure by week. Click a team to toggle their line.</div>
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
        <Card title="FAAB Spent vs Wins" className="stagger-4">
          <div className="text-sm text-muted mb-4">Does spending your budget correlate to winning games?</div>
          <div style={{ height: 450 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="faabSpent" name="FAAB Spent" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="FAAB Spent ($)" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                </XAxis>
                <YAxis type="number" dataKey="wins" name="Wins" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="Season Wins" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                </YAxis>
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
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
