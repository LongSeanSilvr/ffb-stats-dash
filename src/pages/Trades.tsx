import React from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useTradeEfficiency } from '../hooks/useTradeEfficiency';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter
} from 'recharts';

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 28;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  if (!cx || !cy) return null;
  return (
    <svg x={cx - size/2} y={cy - size/2} width={size} height={size}>
      <defs>
        <clipPath id={`clip-trade-${payload.name}`}>
          <circle cx={size/2} cy={size/2} r={size/2} />
        </clipPath>
      </defs>
      {avatarUrl ? (
        <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#clip-trade-${payload.name})`} />
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
        {data.totalTrades !== undefined && <div className="text-sm text-muted">Total Trades: <span className="text-white font-bold ml-1">{data.totalTrades}</span></div>}
        {data.netPoints !== undefined && <div className="text-sm text-muted">Net Points: <span className={`font-bold ml-1 ${data.netPoints >= 0 ? 'text-success-color' : 'text-danger-color'}`}>{data.netPoints > 0 ? '+' : ''}{data.netPoints.toFixed(1)}</span></div>}
        {data.wins !== undefined && <div className="text-sm text-muted">Wins: <span className="text-white font-bold ml-1">{data.wins}</span></div>}
      </div>
    );
  }
  return null;
};

export const Trades: React.FC = () => {
  const { selectedSeason } = useLeagueContext();
  const { data: tradeData, loading, error } = useTradeEfficiency();

  if (loading || !selectedSeason) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4">Analyzing trade outcomes and post-trade performance...</div>
      </div>
    );
  }

  if (error) return <div className="text-danger-color">Error loading trade data: {error}</div>;
  if (!tradeData.length) return <div className="text-muted">No trade data available for this season.</div>;

  const hasTrades = tradeData.some(d => d.totalTrades > 0);

  if (!hasTrades) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-3xl text-gradient mt-4 mb-10">Trade Analytics ({selectedSeason.league.season})</h1>
        <Card className="stagger-1 text-center py-12">
          <h2 className="text-2xl font-semibold mb-2 text-gradient">No Trades This Season</h2>
          <p className="text-muted text-lg">No completed trades were found for this season. Try selecting a different season in the sidebar.</p>
        </Card>
      </div>
    );
  }

  // --- Data transformations ---

  // 1. Trade Net Points (bar chart, sorted by net value)
  const netPointsData = [...tradeData]
    .filter(d => d.totalTrades > 0)
    .sort((a, b) => b.totalNetPoints - a.totalNetPoints)
    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      'Net Points': Number(d.totalNetPoints.toFixed(1)),
    }));

  // 2. Trade Win/Loss Record (stacked bar)
  const tradeRecordData = [...tradeData]
    .filter(d => d.totalTrades > 0)
    .sort((a, b) => b.tradesWon - a.tradesWon)
    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      Won: d.tradesWon,
      Lost: d.tradesLost,
      Tied: d.tradesTied
    }));

  // 3. Trade Volume vs Net Points scatter
  const tradeScatter = tradeData
    .filter(d => d.totalTrades > 0)
    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      avatar: d.user?.avatar,
      totalTrades: d.totalTrades,
      netPoints: d.totalNetPoints,
      wins: selectedSeason.rosters.find(r => r.roster_id === d.roster_id)?.settings.wins || 0
    }));

  // 4. Points Received vs Points Given Away (grouped bar)
  const pointsFlowData = [...tradeData]
    .filter(d => d.totalTrades > 0)
    .sort((a, b) => b.totalNetPoints - a.totalNetPoints)
    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      'Pts Received': Number(d.totalPointsReceived.toFixed(1)),
      'Pts Given Away': Number(d.totalPointsGiven.toFixed(1)),
    }));

  // 5. Trade Ledger: Flattened list of all trades
  const allTradesSorted = tradeData
    .flatMap(d => d.trades.map(t => ({
      ...t,
      displayRosterId: d.roster_id,
      managerName: d.user?.display_name || `Team ${d.roster_id}`,
      avatar: d.user?.avatar
    })))
    // Deduplicate by transaction_id (since each trade shows up for multiple rosters)
    .filter((t, i, arr) => arr.findIndex(x => x.transactionId === t.transactionId) === i)
    .sort((a, b) => a.week - b.week);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mt-4 mb-10">Trade Analytics ({selectedSeason.league.season})</h1>

      {/* Row 1: Trade Net Points & Trade Record */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <Card title="Trade Net Points" className="stagger-1">
          <div className="text-sm text-muted mb-4">Starter points generated by received players minus points generated by given-away players, post-trade.</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={netPointsData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Bar dataKey="Net Points" fill={(entry: any) => entry['Net Points'] >= 0 ? 'var(--success-color)' : 'var(--danger-color)'} radius={[0, 4, 4, 0]}>
                  {netPointsData.map((entry, index) => (
                    <rect key={`cell-${index}`} fill={entry['Net Points'] >= 0 ? 'var(--success-color)' : 'var(--danger-color)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Trade Win/Loss Record" className="stagger-1">
          <div className="text-sm text-muted mb-4">"Won" = Net positive points from trade. "Lost" = Net negative.</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tradeRecordData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="Won" stackId="a" fill="var(--success-color)" />
                <Bar dataKey="Lost" stackId="a" fill="var(--danger-color)" />
                <Bar dataKey="Tied" stackId="a" fill="#64748b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 2: Points Flow & Volume Scatter */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <Card title="Points Flow (Received vs Given)" className="stagger-2">
          <div className="text-sm text-muted mb-4">Post-trade starter points generated by players you received vs players you gave away.</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pointsFlowData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="Pts Received" fill="var(--success-color)" />
                <Bar dataKey="Pts Given Away" fill="var(--danger-color)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Trade Volume vs Net Points" className="stagger-2">
          <div className="text-sm text-muted mb-4">Does making more trades lead to better outcomes?</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="totalTrades" name="Total Trades" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis type="number" dataKey="netPoints" name="Net Points" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter name="Teams" data={tradeScatter} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3: The Trade Ledger (full width) */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card title="The Trade Ledger" className="stagger-3">
          <div className="text-sm text-muted mb-4">Every trade this season, evaluated by post-trade starter performance.</div>
          <div className="flex flex-col gap-6 overflow-y-auto pr-4" style={{ maxHeight: '600px' }}>
            {allTradesSorted.map((trade) => (
              <div key={trade.transactionId} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted font-bold uppercase tracking-wider">Week {trade.week}</span>
                  <span className="text-sm text-muted">·</span>
                  <span className="text-sm text-muted">{trade.rosterIds.length}-team trade</span>
                </div>
                <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${trade.sides.length}, 1fr)` }}>
                  {trade.sides.map(side => {
                    const user = selectedSeason.rosterToUser[side.rosterId];
                    return (
                      <div key={side.rosterId} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem' }}>
                        <div className="flex items-center gap-3 mb-3">
                          {user?.avatar ? (
                            <img src={`https://sleepercdn.com/avatars/thumbs/${user.avatar}`} alt="avatar" className="avatar" width={28} height={28} />
                          ) : (
                            <div className="avatar bg-gray-600" style={{ width: 28, height: 28 }}></div>
                          )}
                          <span className="font-semibold">{user?.display_name || `Team ${side.rosterId}`}</span>
                          <span className={`ml-auto font-bold ${side.netPoints >= 0 ? 'text-success-color' : 'text-danger-color'}`}>
                            {side.netPoints > 0 ? '+' : ''}{side.netPoints.toFixed(1)} pts
                          </span>
                        </div>
                        {side.received.length > 0 && (
                          <div className="mb-2">
                            <div className="text-sm text-success-color mb-1 font-medium">↓ Received</div>
                            {side.received.map(a => (
                              <div key={a.playerId} className="text-sm flex justify-between py-1">
                                <span>{a.playerName} <span className="text-muted">({a.position})</span></span>
                                <span className="text-success-color font-mono">{a.starterPointsAfterTrade.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {side.gave.length > 0 && (
                          <div>
                            <div className="text-sm text-danger-color mb-1 font-medium">↑ Gave Away</div>
                            {side.gave.map(a => (
                              <div key={a.playerId} className="text-sm flex justify-between py-1">
                                <span>{a.playerName} <span className="text-muted">({a.position})</span></span>
                                <span className="text-danger-color font-mono">{a.starterPointsAfterTrade.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
