import React, { useState } from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useTradeEfficiency } from '../hooks/useTradeEfficiency';
import { MobileTapHint } from '../components/MobileTapHint';
import { X, User, ArrowRightLeft } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, Cell, Label
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
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gradient">Trade Analytics ({selectedSeason.league.season})</h1>
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
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gradient">Trade Analytics ({selectedSeason.league.season})</h1>

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
          <MobileTapHint />
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
          <MobileTapHint text="Tap columns for detailed breakdown" />
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
          <div className="chart-header">
            <div className="chart-description">
              Did you buy low or sell high? Compares a player's avg production BEFORE the trade vs AFTER.
            </div>
            <div className="chart-legend-grid">
              <div className="legend-item">
                <div className="legend-item-header">
                  <span style={{ color: 'var(--success-color)', fontSize: '1.2rem' }}>📈</span> Above Line (Breakout)
                </div>
                <div className="legend-item-desc">Acquired before an upward trend</div>
              </div>
              <div className="legend-item">
                <div className="legend-item-header">
                  <span style={{ color: 'var(--danger-color)', fontSize: '1.2rem' }}>📉</span> Below Line (Regression)
                </div>
                <div className="legend-item-desc">Traded away before a downward trend</div>
              </div>
            </div>
          </div>
          <MobileTapHint />
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
          <div className="chart-header">
            <div className="chart-description">
              Every trade this season, evaluated by post-trade starter performance.
            </div>
            
            <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.75rem', marginBottom: '8px', marginTop: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>How points are calculated</div>
            <div className="chart-legend-grid" style={{ paddingTop: 0, borderTop: 'none' }}>
              <div className="legend-item">
                <div className="legend-item-header">
                  <span style={{ fontSize: '1.2rem' }}>🏈</span> Players
                </div>
                <div className="legend-item-desc">Points scored in active starting slots after the trade.</div>
              </div>
              
              <div className="legend-item">
                <div className="legend-item-header">
                  <span style={{ fontSize: '1.2rem' }}>🎯</span> Draft Picks
                </div>
                <div className="legend-item-desc">Points scored by the drafted player while starting for the receiving manager. Future picks use round averages.</div>
              </div>
              
              <div className="legend-item">
                <div className="legend-item-header">
                  <span style={{ fontSize: '1.2rem' }}>💰</span> FAAB
                </div>
                <div className="legend-item-desc">Evaluated using League Average Points per FAAB Dollar. Personal FAAB efficiency is used for projected impact.</div>
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
                                <div key={a.playerId} className="text-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-white/5 last:border-0">
                                  <span className="font-medium truncate">{a.playerName} <span className="text-muted font-normal">({a.position})</span></span>
                                  <div className="flex items-center justify-start sm:justify-end gap-2 w-full sm:w-auto">
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
                                <div key={a.playerId} className="text-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-white/5 last:border-0">
                                  <span className="font-medium truncate">{a.playerName} <span className="text-muted font-normal">({a.position})</span></span>
                                  <div className="flex items-center justify-start sm:justify-end gap-2 w-full sm:w-auto">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedDrilldown(null)}>
          <div className="bg-surface-color border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-black/40 border-b border-white/5 p-4 md:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 rounded-full bg-accent-color/20 flex items-center justify-center border border-accent-color/30">
                  <ArrowRightLeft size={18} className="text-accent-color" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white leading-none mb-1">Flipped Matchups: {selectedDrilldown.name}</h2>
                  <p className="text-muted text-xs md:text-sm font-medium uppercase tracking-wider">Regular Season Trade Impact</p>
                </div>
              </div>
              <button onClick={() => setSelectedDrilldown(null)} className="p-2 rounded-full hover:bg-white/5 transition-colors text-muted hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8">
              {selectedDrilldown.flippedMatchups && selectedDrilldown.flippedMatchups.length > 0 ? (
                <div className="flex flex-col gap-6 md:gap-8">
                  {[...selectedDrilldown.flippedMatchups].sort((a, b) => a.week - b.week).map((fm: any, idx: number) => {
                    const oppUser = selectedSeason?.rosterToUser[fm.oppRosterId];
                    const oppName = oppUser?.display_name || `Team ${fm.oppRosterId}`;
                    const oppAvatar = oppUser?.avatar || null;
                    const isAdded = fm.type === 'added';
                    const tradeSwing = Math.abs(fm.actualMargin - fm.hypotheticalMargin);
                    
                    return (
                      <div key={idx} className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                        {/* Matchup Header */}
                        <div className="bg-black/40 border-b border-white/5 px-4 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${isAdded ? 'bg-success-color' : 'bg-danger-color'}`} />
                            <span className="text-base font-bold text-white">Week {fm.week}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                              isAdded ? 'text-success-color border-success-color/20 bg-success-color/5' : 'text-danger-color border-danger-color/20 bg-danger-color/5'
                            }`}>
                              {isAdded ? 'Win Added' : 'Win Lost'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted text-sm">
                            <span>vs</span>
                            {oppAvatar ? (
                              <img src={`https://sleepercdn.com/avatars/thumbs/${oppAvatar}`} className="w-5 h-5 rounded-full" alt="" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center"><User size={10} className="text-muted" /></div>
                            )}
                            <span className="text-white font-medium">{oppName}</span>
                          </div>
                        </div>

                        {/* Transaction Details */}
                        {fm.transactionDetails && (
                          <div className="px-5 md:px-6 py-5 md:py-6 border-b border-white/5">
                            <div className="text-[10px] uppercase font-bold text-muted tracking-widest mb-4">Trade in Week {fm.transactionDetails.week}</div>
                            <div className="flex flex-col md:flex-row md:items-stretch gap-4 md:gap-5">
                              <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-4">
                                <div className="text-[10px] uppercase font-bold text-muted tracking-wider mb-3">Gave Up</div>
                                <div className="flex flex-wrap gap-2">
                                  {(fm.transactionDetails.gaveUp || []).map((asset: string, i: number) => (
                                    <span key={i} className="text-sm font-medium text-white/80 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">{asset}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col items-center shrink-0 px-3">
                                <ArrowRightLeft size={14} className="text-white/20 rotate-90 md:rotate-0" />
                                <span className="text-[9px] text-muted mt-1 uppercase">with {fm.transactionDetails.tradedBy}</span>
                              </div>
                              <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-4">
                                <div className="text-[10px] uppercase font-bold text-muted tracking-wider mb-3">Received</div>
                                <div className="flex flex-wrap gap-2">
                                  {(fm.transactionDetails.received || []).map((asset: string, i: number) => (
                                    <span key={i} className="text-sm font-medium text-accent-color bg-accent-color/5 border border-accent-color/10 px-3 py-1.5 rounded-lg">{asset}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Scorecard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 border-b border-white/5" style={{ padding: '2rem 1.5rem' }}>
                          <div className="bg-white/5 border border-white/5 rounded-xl p-3 md:p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-muted text-[10px] uppercase font-bold tracking-widest mb-1">Reality</div>
                            <div className={`font-black text-2xl ${isAdded ? 'text-success-color' : 'text-danger-color'}`}>{isAdded ? 'WIN' : 'LOSS'}</div>
                            <div className="text-muted text-xs">Margin: {isAdded ? `+${fm.actualMargin.toFixed(1)}` : fm.actualMargin.toFixed(1)} pts</div>
                          </div>
                          <div className="flex items-center justify-center py-2 md:py-0">
                            <div className="text-center">
                              <div className="text-muted text-[10px] uppercase font-bold tracking-widest mb-1">Trade Swing</div>
                              <div className={`font-black text-2xl font-mono ${isAdded ? 'text-success-color' : 'text-danger-color'}`}>
                                {isAdded ? '+' : '-'}{tradeSwing.toFixed(1)}
                              </div>
                              <div className="text-muted text-[10px] uppercase tracking-wider">{isAdded ? 'improvement' : 'regression'}</div>
                            </div>
                          </div>
                          <div className="bg-white/5 border border-white/5 rounded-xl p-3 md:p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-muted text-[10px] uppercase font-bold tracking-widest mb-1">Without Trades</div>
                            <div className={`font-black text-2xl ${isAdded ? 'text-white/40' : 'text-white/40'}`}>{isAdded ? 'LOSS' : 'WIN'}</div>
                            <div className="text-muted text-xs">Margin: {isAdded ? fm.hypotheticalMargin.toFixed(1) : `+${fm.hypotheticalMargin.toFixed(1)}`} pts</div>
                          </div>
                        </div>

                        {/* Narrative */}
                        <div className="bg-accent-color/5 border-b border-white/5 text-sm text-white/80 leading-relaxed" style={{ padding: '1.5rem' }}>
                          {isAdded ? (
                            <>Won by <span className="text-white font-semibold">{fm.actualMargin.toFixed(1)} pts</span>. Without trades, would have scored <span className="text-white font-semibold">{tradeSwing.toFixed(1)} fewer points</span> — resulting in a loss.</>
                          ) : (
                            <>Lost by <span className="text-white font-semibold">{Math.abs(fm.actualMargin).toFixed(1)} pts</span>. Without trades, would have scored <span className="text-white font-semibold">{tradeSwing.toFixed(1)} more points</span> — flipping this to a win.</>
                          )}
                        </div>

                        {/* Lineup Comparison */}
                        {fm.actualStarters && fm.hypotheticalStarters && (
                          <div className="px-5 md:px-6 py-5 md:py-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                              {/* Actual */}
                              <div>
                                <div className="flex items-center justify-between mb-3 px-1">
                                  <h3 className="font-bold text-white flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-success-color" />
                                    Actual Lineup
                                  </h3>
                                </div>
                                <div className="space-y-2">
                                  {fm.actualStarters.map((s: any, sIdx: number) => {
                                    const isAcquired = fm.transactionDetails?.received?.some((r: string) => r.includes(s.name) || s.name.includes(r.split(' ')[0]));
                                    const displaySlot = (s.rosterSlot || '').replace('SUPER_FLEX', 'SFLX').replace('_FLEX', ' FLX');
                                    return (
                                      <div key={sIdx} className={`flex items-center justify-between p-2 md:p-3 rounded-lg border ${
                                        isAcquired ? 'bg-accent-color/10 border-accent-color/20' : 'bg-white/[0.02] border-white/5'
                                      }`}>
                                        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                          <span className="text-[9px] md:text-[10px] font-bold text-white/30 uppercase w-6 md:w-8 text-center tracking-wider shrink-0">{displaySlot}</span>
                                          <img src={s.avatar} alt="" className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-black/40 shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'; }} />
                                          <span className={`text-xs md:text-sm font-medium truncate ${isAcquired ? 'text-accent-color font-bold' : 'text-white'}`}>{s.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                          {isAcquired && <span className="text-[10px] uppercase font-bold text-accent-color border border-accent-color/20 px-1 rounded hidden sm:inline">Acquired</span>}
                                          <span className={`font-mono text-xs ${isAcquired ? 'text-accent-color font-bold' : 'text-muted'}`}>{s.pts.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              {/* Hypothetical */}
                              <div>
                                <div className="flex items-center justify-between mb-3 px-1">
                                  <h3 className="font-bold text-white flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-danger-color" />
                                    Without Trades
                                  </h3>
                                </div>
                                <div className="space-y-2">
                                  {fm.hypotheticalStarters.map((s: any, sIdx: number) => {
                                    const isReplacement = s.id.startsWith('REP_');
                                    const isNew = !fm.actualStarters.some((as: any) => as.id === s.id);
                                    const displaySlot = (s.rosterSlot || '').replace('SUPER_FLEX', 'SFLX').replace('_FLEX', ' FLX');
                                    const isChanged = isReplacement || isNew;
                                    return (
                                      <div key={sIdx} className={`flex items-center justify-between p-2 md:p-3 rounded-lg border ${
                                        isReplacement ? 'bg-danger-color/10 border-danger-color/30 border-l-2 border-l-danger-color' : isNew ? 'bg-white/5 border-white/10 border-l-2 border-l-white/30' : 'bg-white/[0.02] border-white/5'
                                      }`}>
                                        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                          <span className="text-[9px] md:text-[10px] font-bold text-white/30 uppercase w-6 md:w-8 text-center tracking-wider shrink-0">{displaySlot}</span>
                                          {!isReplacement ? (
                                            <img src={s.avatar} alt="" className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-black/40 shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'; }} />
                                          ) : (
                                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                              <User size={10} className="text-muted" />
                                            </div>
                                          )}
                                          <span className={`text-xs md:text-sm font-medium truncate ${isReplacement ? 'text-danger-color font-bold' : isNew ? 'text-white font-bold' : 'text-white'}`}>
                                            {isReplacement ? `ERV: ${s.name}` : s.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                          {isReplacement && <span className="text-[10px] uppercase font-bold text-danger-color border border-danger-color/30 px-1 rounded hidden sm:inline">Replacement</span>}
                                          {isNew && !isReplacement && <span className="text-[10px] uppercase font-bold text-muted border border-white/10 px-1 rounded hidden sm:inline">Promoted</span>}
                                          <span className={`font-mono text-xs ${isChanged ? (isReplacement ? 'text-danger-color font-bold' : 'text-muted font-bold') : 'text-muted'}`}>{s.pts.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-muted text-center py-16 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl bg-black/20">
                  <div className="p-4 bg-white/5 rounded-full mb-4">
                    <User size={40} className="text-white/30" />
                  </div>
                  <span className="text-lg font-medium text-white/70 mb-1">No Flipped Matchups</span>
                  <span className="text-sm text-white/40">This manager's trades did not alter the outcome of any matchups.</span>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-5 md:p-6 bg-black/40 border-t border-white/5 text-center text-xs text-muted leading-relaxed font-medium">
              Flipped Matchups analyze the exact post-trade starting performance of all players involved in a manager's trades compared to who they replaced in the starting lineup.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
