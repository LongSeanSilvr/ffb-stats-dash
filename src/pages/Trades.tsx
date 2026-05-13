import React, { useState } from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useTradeEfficiency } from '../hooks/useTradeEfficiency';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, Cell, Label, ReferenceLine
} from 'recharts';


const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 28;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  if (!cx || !cy) return null;
  
  const uniqueId = `clip-trade-${payload.name ? payload.name.replace(/[^a-zA-Z0-9]/g, '') : Math.random().toString(36).substring(7)}`;
  return (
    <svg x={cx - size / 2} y={cy - size / 2} width={size} height={size}>
      <defs>
        <clipPath id={uniqueId}>
          <circle cx={size / 2} cy={size / 2} r={size / 2} />
        </clipPath>
      </defs>
      {avatarUrl ? (
        <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#${uniqueId})`} />
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
        {data.managerName && <div className="text-sm text-muted mb-2">Traded to: <span className="text-white font-bold ml-1">{data.managerName}</span></div>}
        {data.given !== undefined && <div className="text-sm text-muted">Assets Given: <span className="text-white font-bold ml-1">{data.given}</span></div>}
        {data.received !== undefined && <div className="text-sm text-muted">Assets Received: <span className="text-white font-bold ml-1">{data.received}</span></div>}
        {data.before !== undefined && <div className="text-sm text-muted">Avg Pts Before: <span className="text-white font-bold ml-1">{data.before.toFixed(1)}</span></div>}
        {data.after !== undefined && <div className="text-sm text-muted">Avg Pts After: <span className="text-white font-bold ml-1">{data.after.toFixed(1)}</span></div>}
      </div>
    );
  }
  return null;
};
const CustomPointsFlowTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const net = data['Pts Received'] - data['Pts Given Away'];
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
        <div className="text-sm text-muted">Pts Received: <span className="text-white font-bold ml-1">{data['Pts Received'].toFixed(1)}</span></div>
        <div className="text-sm text-muted">Pts Given Away: <span className="text-white font-bold ml-1">{data['Pts Given Away'].toFixed(1)}</span></div>
        <div className="text-sm text-muted mt-2 pt-2 border-t border-white/10">Net Points: <span className={`font-bold ml-1 ${net >= 0 ? 'text-success-color' : 'text-danger-color'}`}>{net > 0 ? '+' : ''}{net.toFixed(1)}</span></div>
      </div>
    );
  }
  return null;
};

export const Trades: React.FC = () => {
  const [selectedDrilldown, setSelectedDrilldown] = useState<any>(null);
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
      <div style={{ animation: "fadeIn 0.5s ease-out" }}>
        <h1 style={{ fontSize: "1.875rem", lineHeight: "2.25rem", marginTop: "1rem", marginBottom: "2.5rem" }} className="text-gradient">Trade Analytics ({selectedSeason.league.season})</h1>
        <Card className="stagger-1 text-center py-12">
          <h2 className="text-2xl font-semibold mb-2 text-gradient">No Trades This Season</h2>
          <p className="text-muted text-lg">No completed trades were found for this season. Try selecting a different season in the sidebar.</p>
        </Card>
      </div>
    );
  }

  
  // --- Data transformations ---

  // 1. Trade Typology Matrix (Assets Given vs Received)
  const typologyData = tradeData
    .filter(d => d.totalTrades > 0)
    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      avatar: d.user?.avatar,
      given: d.totalAssetsGiven || 0,
      received: d.totalAssetsReceived || 0
    }));

  const getMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const medGiven = getMedian(typologyData.map(d => d.given));
  const medReceived = getMedian(typologyData.map(d => d.received));
  
  const maxTypologyVal = Math.max(
    ...typologyData.flatMap(d => [d.given, d.received]),
    10
  );

  // 2. Matchups Flipped (Wins Added vs Lost)
  const matchupsFlippedData = [...tradeData]
    .filter(d => d.totalTrades > 0)
    .sort((a, b) => (b.totalMatchupsFlippedAdded - b.totalMatchupsFlippedLost) - (a.totalMatchupsFlippedAdded - a.totalMatchupsFlippedLost))
    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      rosterId: d.roster_id,
      Added: d.totalMatchupsFlippedAdded || 0,
      Lost: d.totalMatchupsFlippedLost || 0,
      flippedMatchups: d.flippedMatchups || []
    }));

  // 3. The Fleecing Index (Player Trajectory)
  const fleecingData = tradeData
    .flatMap(d => d.trades.flatMap(t => t.sides.find(s => s.rosterId === d.roster_id)?.received || []))
    .filter(a => !a.isPick && a.position !== 'FAAB' && (a.avgPointsBeforeTrade! > 0 || a.avgPointsAfterTrade! > 0))
    // deduplicate by player id
    .filter((v, i, a) => a.findIndex(t => (t.playerId === v.playerId)) === i)
    .map(a => ({
      name: a.playerName,
      before: a.avgPointsBeforeTrade || 0,
      after: a.avgPointsAfterTrade || 0,
      team: a.toRosterId,
      managerName: selectedSeason.rosterToUser[a.toRosterId]?.display_name || `Team ${a.toRosterId}`,
      avatar: selectedSeason.rosterToUser[a.toRosterId]?.avatar
    }));

  const maxFleecingVal = Math.max(
    ...fleecingData.flatMap(d => [d.before, d.after]),
    10
  ) * 1.1;

  // 4. Trade Ledger: Flattened list of all trades
  const allTradesSorted = tradeData
    .flatMap(d => d.trades.map(t => ({
      ...t,
      displayRosterId: d.roster_id,
      managerName: d.user?.display_name || `Team ${d.roster_id}`,
      avatar: d.user?.avatar
    })))
    .filter((t, i, arr) => arr.findIndex(x => x.transactionId === t.transactionId) === i)
    .sort((a, b) => a.week - b.week);

  return (
    <div style={{ animation: "fadeIn 0.5s ease-out" }}>
      <h1 style={{ fontSize: "1.875rem", lineHeight: "2.25rem", marginTop: "1rem", marginBottom: "2.5rem" }} className="text-gradient">Trade Analytics ({selectedSeason.league.season})</h1>

      {/* Row 1: Trade Typology Matrix & Matchups Flipped */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "2rem", marginBottom: "2rem" }}>
        <Card title="Trade Typology Matrix" className="stagger-1">
          <div style={{ fontSize: "0.875rem", marginBottom: "1rem", lineHeight: "1.625" }} className="text-muted">
            Categorizes managers by trade behavior: Assets Given vs Assets Received.
            <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px 0', fontSize: '11px', color: 'rgba(255,255,255,0.7)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📦 <strong style={{ color: '#fff', fontWeight: 500 }}>Depth Builders</strong> (Above Line)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💎 <strong style={{ color: '#fff', fontWeight: 500 }}>Consolidators</strong> (Below Line)
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="given" name="Assets Given" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="Total Assets Given Away" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                </XAxis>
                <YAxis type="number" dataKey="received" name="Assets Received" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="Total Assets Received" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                </YAxis>
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter
                  name="Breakeven"
                  data={[{ given: 0, received: 0 }, { given: maxTypologyVal, received: maxTypologyVal }]}
                  line={{ stroke: 'rgba(255,255,255,0.25)', strokeDasharray: '5 5', strokeWidth: 1.5 }}
                  shape={() => null}
                  legendType="none"
                  tooltipType="none"
                />
                <Scatter name="Teams" data={typologyData} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Matchups Flipped by Trades" className="stagger-1">
          <div style={{ fontSize: "0.875rem", marginBottom: "1rem" }} className="text-muted">Calculates if the optimal lineup delta from acquired vs lost players changed the outcome of a matchup.</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matchupsFlippedData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} itemStyle={{ color: '#f8fafc' }} />
                <Legend
                  content={() => (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                      {[['Wins Added', 'var(--success-color)'], ['Wins Lost', 'var(--danger-color)']].map(([label, color]) => (
                        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: 12, height: 12, borderRadius: 2, background: color, display: 'inline-block' }} />
                          <span style={{ color: '#94a3b8' }}>{label}</span>
                        </span>
                      ))}
                    </div>
                  )}
                />
                <Bar dataKey="Added" fill="var(--success-color)" radius={[0, 4, 4, 0]} onClick={(data) => setSelectedDrilldown(data.payload || data)} style={{ cursor: "pointer" }} />
                <Bar dataKey="Lost" fill="var(--danger-color)" radius={[0, 4, 4, 0]} onClick={(data) => setSelectedDrilldown(data.payload || data)} style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 2: Fleecing Index */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem", marginBottom: "2rem" }}>
        <Card title="The Market Timing Matrix" className="stagger-2">
          <div style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }} className="text-muted">
            <div style={{ marginBottom: "12px", opacity: 0.85, lineHeight: "1.5" }}>
              Did you buy low or sell high? Compares a player's avg production BEFORE the trade vs AFTER.
            </div>
            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--success-color)', fontSize: '1rem' }}>📈</span> <strong style={{ color: '#f8fafc', fontWeight: 500 }}>Above Line (Breakout):</strong> Acquired before an upward trend
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--danger-color)', fontSize: '1rem' }}>📉</span> <strong style={{ color: '#f8fafc', fontWeight: 500 }}>Below Line (Regression):</strong> Traded away before a downward trend
              </div>
            </div>
          </div>
          <div style={{ height: 450 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="before" name="Pts Before Trade" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="Avg Points Before Trade" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                </XAxis>
                <YAxis type="number" dataKey="after" name="Pts After Trade" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="Avg Points After Trade" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                </YAxis>
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter
                  name="Breakeven"
                  data={[{ before: 0, after: 0 }, { before: maxFleecingVal, after: maxFleecingVal }]}
                  line={{ stroke: 'rgba(255,255,255,0.25)', strokeDasharray: '5 5', strokeWidth: 1.5 }}
                  shape={() => null}
                  legendType="none"
                  tooltipType="none"
                />
                <Scatter name="Players" data={fleecingData} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

{/* Row 3: The Trade Ledger (full width) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem", marginBottom: "2rem" }}>
        <Card title="The Trade Ledger" className="stagger-3">
          <div style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }} className="text-muted">
            <div style={{ marginBottom: "16px", opacity: 0.85, lineHeight: "1.5" }}>
              Every trade this season, evaluated by post-trade starter performance.
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>How points are calculated</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1rem' }}>🏈</span> <strong style={{ color: '#f8fafc', fontWeight: 500 }}>Players</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>Points scored in active starting slots after the trade.</div>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1rem' }}>🎯</span> <strong style={{ color: '#f8fafc', fontWeight: 500 }}>Draft Picks</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>Points scored by the drafted player while starting for the receiving manager. Future picks use round averages.</div>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1rem' }}>💰</span> <strong style={{ color: '#f8fafc', fontWeight: 500 }}>FAAB</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>Evaluated using League Average Points per FAAB Dollar. Personal FAAB efficiency is used for projected impact.</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6 overflow-y-auto pr-4" style={{ maxHeight: '600px' }}>
            {allTradesSorted.map((trade) => (
              <div key={trade.transactionId} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted font-bold uppercase tracking-wider">Week {trade.week}</span>
                  <span className="text-sm text-muted">·</span>
                  <span className="text-sm text-muted">{trade.rosterIds.length}-team trade</span>
                </div>
                <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  <div className={`grid gap-6 grid-cols-1 md:grid-cols-${Math.min(trade.sides.length, 4)}`}>
                    {trade.sides.map(side => {
                      const user = selectedSeason.rosterToUser[side.rosterId];
                      return (
                        <div key={side.rosterId} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem' }}>
                          <div className="flex items-center gap-4 mb-4 pb-3 border-b border-white/10">
                            {user?.avatar ? (
                              <img src={`https://sleepercdn.com/avatars/thumbs/${user.avatar}`} alt="avatar" className="avatar flex-shrink-0" width={28} height={28} />
                            ) : (
                              <div className="avatar bg-gray-600 flex-shrink-0" style={{ width: 28, height: 28 }}></div>
                            )}
                            <span className="font-semibold truncate mr-4">{user?.display_name || `Team ${side.rosterId}`}</span>
                            <span className="ml-auto font-bold text-sm whitespace-nowrap flex-shrink-0" style={{
                              backgroundColor: side.netPoints > 0 ? 'rgba(16, 185, 129, 0.15)' : side.netPoints < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                              color: side.netPoints > 0 ? 'var(--success-color)' : side.netPoints < 0 ? 'var(--danger-color)' : 'var(--text-secondary)',
                              borderRadius: '6px',
                              padding: '0.25rem 0.6rem'
                            }}>
                              {side.netPoints > 0 ? '+' : ''}{side.netPoints.toFixed(1)} pts
                            </span>
                          </div>
                          {side.received.length > 0 && (
                            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                              <div className="text-sm text-success-color mb-2 font-medium">↓ Received</div>
                              {side.received.map(a => (
                                <div key={a.playerId} className="text-sm flex justify-between py-1 border-b border-white/5 last:border-0">
                                  <span>{a.playerName} <span className="text-muted">({a.position})</span></span>
                                  <div className="flex items-center gap-2">
                                    {a.position === 'FAAB' && a.actualProjectedPoints !== undefined && (
                                      <span className="text-xs text-muted italic">
                                        (Est. Personal Value: {a.actualProjectedPoints.toFixed(1)} pts)
                                      </span>
                                    )}
                                    <span className="text-success-color font-mono">{a.starterPointsAfterTrade.toFixed(1)} pts</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {side.gave.length > 0 && (
                            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '0.75rem' }}>
                              <div className="text-sm text-danger-color mb-2 font-medium">↑ Gave Away</div>
                              {side.gave.map(a => (
                                <div key={a.playerId} className="text-sm flex justify-between py-1 border-b border-white/5 last:border-0">
                                  <span>{a.playerName} <span className="text-muted">({a.position})</span></span>
                                  <div className="flex items-center gap-2">
                                    {a.position === 'FAAB' && a.actualProjectedPoints !== undefined && (
                                      <span className="text-xs text-muted italic">
                                        (Est. Personal Value: {a.actualProjectedPoints.toFixed(1)} pts)
                                      </span>
                                    )}
                                    <span className="text-danger-color font-mono">{a.starterPointsAfterTrade.toFixed(1)} pts</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      {/* Drill-down Modal */}
      {selectedDrilldown && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '2rem' }} onClick={() => setSelectedDrilldown(null)}>
          <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Flipped Matchups: {selectedDrilldown.name}</h2>
              <button onClick={() => setSelectedDrilldown(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            
            {selectedDrilldown.flippedMatchups && selectedDrilldown.flippedMatchups.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[...selectedDrilldown.flippedMatchups].sort((a, b) => a.week - b.week).map((fm: any, idx: number) => {
                  const oppName = selectedSeason?.rosterToUser[fm.oppRosterId]?.display_name || `Team ${fm.oppRosterId}`;
                  const isAdded = fm.type === 'added';
                  return (
                    <div key={idx} style={{ background: isAdded ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${isAdded ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`, borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isAdded ? 'var(--success-color)' : 'var(--danger-color)', backgroundColor: isAdded ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                            {isAdded ? '+ WIN ADDED' : '- WIN LOST'}
                          </span>
                          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>Week {fm.week}</span>
                        </div>
                        <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>vs <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{oppName}</span></span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                        {isAdded ? (
                          <>You won this matchup by <span style={{ fontWeight: 600 }}>{fm.actualMargin.toFixed(1)} pts</span>. Without your trades, you would have scored <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>{Math.abs(fm.actualMargin - fm.hypotheticalMargin).toFixed(1)} fewer points</span>, resulting in a loss.</>
                        ) : (
                          <>You lost this matchup by <span style={{ fontWeight: 600 }}>{Math.abs(fm.actualMargin).toFixed(1)} pts</span>. Without your trades, you would have scored <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>{Math.abs(fm.actualMargin - fm.hypotheticalMargin).toFixed(1)} more points</span>, resulting in a win.</>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>No flipped matchups found for this manager.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
