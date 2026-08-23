import React, { useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useTradeEfficiency } from '../hooks/useTradeEfficiency';
import { MobileTapHint } from '../components/MobileTapHint';
import { X, User, ArrowRightLeft, TrendingUp, Sparkles, Trophy, Award, Zap, BarChart3, HelpCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, Cell, Label, ReferenceLine
} from 'recharts';

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 28;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  if (!cx || !cy) return null;
  
  const uniqueId = `clip-mgr-${payload.name ? payload.name.replace(/[^a-zA-Z0-9]/g, '') : Math.random().toString(36).substring(7)}`;
  return (
    <svg x={cx - size / 2} y={cy - size / 2} width={size} height={size}>
      <defs>
        <clipPath id={uniqueId}>
          <circle cx={size / 2} cy={size / 2} r={size / 2} />
        </clipPath>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill="#1e293b" stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
      {avatarUrl ? (
        <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#${uniqueId})`} />
      ) : (
        <circle cx={size / 2} cy={size / 2} r={size / 2} fill="#475569" />
      )}
    </svg>
  );
};

const CustomPlayerScatterDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 30;
  if (!cx || !cy) return null;
  
  const playerImgUrl = payload.playerId && !payload.isPick
    ? `https://sleepercdn.com/content/nfl/players/thumb/${payload.playerId}.jpg`
    : null;
  const managerAvatarUrl = payload.avatar
    ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}`
    : null;
  
  const uniqueId = `clip-player-${payload.playerId || Math.random().toString(36).substring(7)}`;

  return (
    <svg x={cx - size / 2} y={cy - size / 2} width={size} height={size} style={{ overflow: 'visible' }}>
      <defs>
        <clipPath id={uniqueId}>
          <circle cx={size / 2} cy={size / 2} r={size / 2} />
        </clipPath>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill="#0f172a" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
      {playerImgUrl ? (
        <image href={playerImgUrl} x="0" y="0" width={size} height={size} clipPath={`url(#${uniqueId})`} />
      ) : managerAvatarUrl ? (
        <image href={managerAvatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#${uniqueId})`} />
      ) : (
        <circle cx={size / 2} cy={size / 2} r={size / 2} fill="#334155" />
      )}
    </svg>
  );
};

const CustomManagerTimingDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 32;
  if (!cx || !cy) return null;

  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  const uniqueId = `clip-timing-${payload.name ? payload.name.replace(/[^a-zA-Z0-9]/g, '') : Math.random().toString(36).substring(7)}`;

  return (
    <svg x={cx - size / 2} y={cy - size / 2} width={size} height={size} style={{ overflow: 'visible' }}>
      <defs>
        <clipPath id={uniqueId}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} />
        </clipPath>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill="#0f172a" stroke={payload.ringColor || '#64748b'} strokeWidth={2.5} />
      {avatarUrl ? (
        <image href={avatarUrl} x={2} y={2} width={size - 4} height={size - 4} clipPath={`url(#${uniqueId})`} />
      ) : (
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="#334155" />
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
            <img src={`https://sleepercdn.com/avatars/thumbs/${data.avatar}`} alt="avatar" className="w-6 h-6 rounded-full border border-white/20 object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-600"></div>
          )}
          <span className="font-bold text-base text-white">{data.name}</span>
        </div>
        {data.managerName && <div className="text-xs text-muted mb-1.5">Traded to: <span className="text-white font-bold ml-1">{data.managerName}</span></div>}
        {data.given !== undefined && <div className="text-xs text-muted">Assets Given: <span className="text-white font-bold ml-1">{data.given}</span></div>}
        {data.received !== undefined && <div className="text-xs text-muted">Assets Received: <span className="text-white font-bold ml-1">{data.received}</span></div>}
        {data.before !== undefined && <div className="text-xs text-muted">Avg Pts Before: <span className="text-white font-bold ml-1">{data.before.toFixed(1)}</span></div>}
        {data.after !== undefined && <div className="text-xs text-muted">Avg Pts After: <span className="text-white font-bold ml-1">{data.after.toFixed(1)}</span></div>}
      </div>
    );
  }
  return null;
};

const CustomManagerTimingTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isNetPos = data.netTiming > 0;
    const isNetZero = data.netTiming === 0;

    return (
      <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: '230px' }}>
        <div className="flex items-center gap-3 mb-2.5 pb-2 border-b border-white/10">
          {data.avatar ? (
            <img src={`https://sleepercdn.com/avatars/thumbs/${data.avatar}`} alt="avatar" className="w-8 h-8 rounded-full border border-white/20 object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">N/A</div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-sm text-white truncate">{data.name}</div>
            <div className="text-[10px] flex items-center gap-1 font-semibold text-muted mt-0.5">
              <span>{data.archetypeEmoji}</span>
              <span>{data.archetype}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Net Timing Edge:</span>
            <span className={`font-mono font-bold ${isNetPos ? 'text-emerald-400' : isNetZero ? 'text-muted' : 'text-rose-400'}`}>
              {isNetPos ? '+' : ''}{data.netTiming} PPG
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Buy-Low Timing (Acquired):</span>
            <span className={`font-mono font-bold ${data.buyDelta > 0 ? 'text-emerald-400' : data.buyDelta < 0 ? 'text-rose-400' : 'text-muted'}`}>
              {data.buyDelta > 0 ? '+' : ''}{data.buyDelta} PPG
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Sell-High Timing (Surrendered):</span>
            <span className={`font-mono font-bold ${data.sellDelta > 0 ? 'text-emerald-400' : data.sellDelta < 0 ? 'text-rose-400' : 'text-muted'}`}>
              {data.sellDelta > 0 ? '+' : ''}{data.sellDelta} PPG
            </span>
          </div>
        </div>

        {data.bestBuy && data.bestBuy.delta > 0 && (
          <div className="mt-2.5 pt-2 border-t border-white/5 text-[11px] text-muted">
            <span className="text-emerald-400 font-semibold">Top Buy:</span> {data.bestBuy.name} (+{data.bestBuy.delta} PPG)
          </div>
        )}
        {data.bestSell && data.bestSell.delta > 0 && (
          <div className="mt-1 text-[11px] text-muted">
            <span className="text-blue-400 font-semibold">Top Sell:</span> {data.bestSell.name} (avoided {Math.abs(data.bestSell.delta)} PPG dip)
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const Trades: React.FC = () => {
  const [selectedDrilldown, setSelectedDrilldown] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'performance' | 'dynamics'>('performance');
  const { selectedSeason } = useLeagueContext();
  const { data: tradeData, loading, error } = useTradeEfficiency();

  // --- Data transformations ---

  // 1. Trade Typology Matrix (Assets Given vs Received)
  const typologyData = useMemo(() => {
    return tradeData
      .filter(d => d.totalTrades > 0)
      .map(d => ({
        name: d.user?.display_name || `Team ${d.roster_id}`,
        avatar: d.user?.avatar,
        given: d.totalAssetsGiven || 0,
        received: d.totalAssetsReceived || 0
      }));
  }, [tradeData]);

  const maxTypologyVal = useMemo(() => {
    return Math.max(
      ...typologyData.flatMap(d => [d.given, d.received]),
      10
    );
  }, [typologyData]);

  // 2. Matchups Flipped (Wins Added vs Lost)
  const matchupsFlippedData = useMemo(() => {
    return [...tradeData]
      .filter(d => d.totalTrades > 0)
      .sort((a, b) => (b.totalMatchupsFlippedAdded - b.totalMatchupsFlippedLost) - (a.totalMatchupsFlippedAdded - a.totalMatchupsFlippedLost))
      .map(d => ({
        name: d.user?.display_name || `Team ${d.roster_id}`,
        rosterId: d.roster_id,
        avatar: d.user?.avatar,
        Added: d.totalMatchupsFlippedAdded || 0,
        Lost: d.totalMatchupsFlippedLost || 0,
        flippedMatchups: d.flippedMatchups || []
      }));
  }, [tradeData]);

  // 3. The Fleecing Index (Player Trajectory)
  const fleecingData = useMemo(() => {
    return tradeData
      .flatMap(d => d.trades.flatMap(t => t.sides.find(s => s.rosterId === d.roster_id)?.received || []))
      .filter(a => !a.isPick && a.position !== 'FAAB' && (a.avgPointsBeforeTrade! > 0 || a.avgPointsAfterTrade! > 0))
      .filter((v, i, a) => a.findIndex(t => t.playerId === v.playerId) === i)
      .map(a => ({
        playerId: a.playerId,
        name: a.playerName,
        position: a.position,
        before: a.avgPointsBeforeTrade || 0,
        after: a.avgPointsAfterTrade || 0,
        team: a.toRosterId,
        managerName: selectedSeason?.rosterToUser[a.toRosterId]?.display_name || `Team ${a.toRosterId}`,
        avatar: selectedSeason?.rosterToUser[a.toRosterId]?.avatar
      }));
  }, [tradeData, selectedSeason]);

  const maxFleecingVal = useMemo(() => {
    return Math.max(
      ...fleecingData.flatMap(d => [d.before, d.after]),
      20
    );
  }, [fleecingData]);

interface ManagerTimingRecord {
  rosterId: number;
  name: string;
  avatar?: string | null;
  buyDelta: number;
  sellDelta: number;
  netTiming: number;
  buyCount: number;
  sellCount: number;
  archetype: string;
  archetypeColor: string;
  archetypeEmoji: string;
  ringColor: string;
  bestBuy: { name: string; delta: number; before: number; after: number } | null;
  bestSell: { name: string; delta: number; before: number; after: number } | null;
  tradesCount: number;
}

  // 4. Manager Market Timing Matrix & Archetypes
  const managerTimingData = useMemo<ManagerTimingRecord[]>(() => {
    return tradeData
      .filter(d => d.totalTrades > 0)
      .map(d => {
        let buyDeltaTotal = 0;
        let buyCount = 0;
        let sellDeltaTotal = 0;
        let sellCount = 0;

        let bestBuy: { name: string; delta: number; before: number; after: number } | null = null;
        let bestSell: { name: string; delta: number; before: number; after: number } | null = null;

        d.trades.forEach(t => {
          const side = t.sides.find(s => s.rosterId === d.roster_id);
          if (!side) return;

          // Received assets (Buys): Delta = after - before
          side.received.forEach(a => {
            if (!a.isPick && a.position !== 'FAAB' && a.avgPointsBeforeTrade !== undefined && a.avgPointsAfterTrade !== undefined) {
              const delta = Number((a.avgPointsAfterTrade - a.avgPointsBeforeTrade).toFixed(2));
              buyDeltaTotal += delta;
              buyCount++;
              if (!bestBuy || delta > bestBuy.delta) {
                bestBuy = { name: a.playerName, delta, before: a.avgPointsBeforeTrade, after: a.avgPointsAfterTrade };
              }
            }
          });

          // Surrendered assets (Sells): Delta = before - after (positive means avoided a crash)
          side.gave.forEach(a => {
            if (!a.isPick && a.position !== 'FAAB' && a.avgPointsBeforeTrade !== undefined && a.avgPointsAfterTrade !== undefined) {
              const delta = Number((a.avgPointsBeforeTrade - a.avgPointsAfterTrade).toFixed(2));
              sellDeltaTotal += delta;
              sellCount++;
              if (!bestSell || delta > bestSell.delta) {
                bestSell = { name: a.playerName, delta, before: a.avgPointsBeforeTrade, after: a.avgPointsAfterTrade };
              }
            }
          });
        });

        const netTiming = Number((buyDeltaTotal + sellDeltaTotal).toFixed(2));

        let archetype = 'Balanced Exchanger';
        let archetypeColor = 'text-gray-300 bg-white/5 border-white/10';
        let archetypeEmoji = '⚖️';
        let ringColor = '#64748b';

        if (buyDeltaTotal > 0 && sellDeltaTotal > 0) {
          archetype = 'Wall Street Wizard';
          archetypeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
          archetypeEmoji = '🧠';
          ringColor = '#10b981';
        } else if (buyDeltaTotal > 0 && sellDeltaTotal <= 0) {
          archetype = 'Breakout Hunter';
          archetypeColor = 'text-teal-400 bg-teal-500/10 border-teal-500/30';
          archetypeEmoji = '📈';
          ringColor = '#14b8a6';
        } else if (buyDeltaTotal <= 0 && sellDeltaTotal > 0) {
          archetype = 'Sell-High Master';
          archetypeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
          archetypeEmoji = '📉';
          ringColor = '#3b82f6';
        } else if (buyDeltaTotal < 0 && sellDeltaTotal < 0) {
          archetype = 'FOMO Trader';
          archetypeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
          archetypeEmoji = '⚠️';
          ringColor = '#f43f5e';
        }

        return {
          rosterId: d.roster_id,
          name: d.user?.display_name || `Team ${d.roster_id}`,
          avatar: d.user?.avatar,
          buyDelta: Number(buyDeltaTotal.toFixed(2)),
          sellDelta: Number(sellDeltaTotal.toFixed(2)),
          netTiming,
          buyCount,
          sellCount,
          archetype,
          archetypeColor,
          archetypeEmoji,
          ringColor,
          bestBuy,
          bestSell,
          tradesCount: d.totalTrades
        };
      });
  }, [tradeData]);

  const maxTimingDomain = useMemo(() => {
    const vals = managerTimingData.flatMap(d => [Math.abs(d.buyDelta), Math.abs(d.sellDelta)]);
    const maxVal = Math.max(...vals, 5);
    return Math.ceil(maxVal * 1.25);
  }, [managerTimingData]);

  // 4. Trade Ledger: Flattened list of all trades
  const allTradesSorted = useMemo(() => {
    return tradeData
      .flatMap(d => d.trades.map(t => ({
        ...t,
        displayRosterId: d.roster_id,
        managerName: d.user?.display_name || `Team ${d.roster_id}`,
        avatar: d.user?.avatar
      })))
      .filter((t, i, arr) => arr.findIndex(x => x.transactionId === t.transactionId) === i)
      .sort((a, b) => a.week - b.week);
  }, [tradeData]);

  // 5. Hero KPIs Calculation
  const heroKpis = useMemo(() => {
    const validTraders = tradeData.filter(d => d.totalTrades > 0);
    if (!validTraders.length) return null;

    // 1. Top Trade Winner (highest net points)
    const topWinner = [...validTraders].sort((a, b) => b.totalNetPoints - a.totalNetPoints)[0];

    // 2. Most Active Trader (most trades / assets)
    const mostActive = [...validTraders].sort((a, b) => (b.totalTrades * 100 + b.totalAssetsGiven + b.totalAssetsReceived) - (a.totalTrades * 100 + a.totalAssetsGiven + a.totalAssetsReceived))[0];

    // 3. Matchup Flipper Leader (most wins added via trade optimal lineups)
    const bestFlipper = [...validTraders].sort((a, b) => (b.totalMatchupsFlippedAdded - b.totalMatchupsFlippedLost) - (a.totalMatchupsFlippedAdded - a.totalMatchupsFlippedLost))[0];

    // 4. Top Trade Breakout Player (highest post-trade avg scoring surge)
    const breakouts = fleecingData.map(p => ({
      ...p,
      delta: p.after - p.before
    })).sort((a, b) => b.delta - a.delta);
    const topBreakout = breakouts.length > 0 && breakouts[0].delta > 0 ? breakouts[0] : null;

    return {
      topWinner: topWinner && topWinner.totalNetPoints !== 0 ? topWinner : null,
      mostActive,
      bestFlipper: bestFlipper && (bestFlipper.totalMatchupsFlippedAdded > 0 || bestFlipper.totalMatchupsFlippedLost > 0) ? bestFlipper : null,
      topBreakout
    };
  }, [tradeData, fleecingData]);

  if (loading || !selectedSeason) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4 font-medium">Analyzing trade outcomes and post-trade performance...</div>
      </div>
    );
  }

  if (error) return <div className="text-danger-color p-8 text-center">Error loading trade data: {error}</div>;
  if (!tradeData.length) return <div className="text-muted p-8 text-center">No trade data available for this season.</div>;

  const hasTrades = tradeData.some(d => d.totalTrades > 0);

  if (!hasTrades) {
    return (
      <div style={{ animation: "fadeIn 0.5s ease-out" }}>
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gradient">Trade Analytics ({selectedSeason.league.season})</h1>
          <p className="text-muted text-sm mt-1">
            Exchange volume, post-trade scoring impact, market timing, and full transaction history.
          </p>
        </div>
        <Card className="stagger-1 text-center py-16">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-white/40">
            <ArrowRightLeft size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gradient">No Trades This Season</h2>
          <p className="text-muted text-base max-w-md mx-auto">
            No completed trades were executed in {selectedSeason.league.season}. Try selecting another season in the sidebar to view historical trade analytics.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.5s ease-out" }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gradient">Trade Analytics ({selectedSeason.league.season})</h1>
        <p className="text-muted text-sm mt-1">
          Exchange volume, post-trade scoring impact, market timing, and full transaction history.
        </p>
      </div>

      {/* Hero KPI Cards */}
      {heroKpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* 1. Top Trade Winner */}
          {heroKpis.topWinner && (
            <div className="glass-card p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                  <span className="truncate">Top Trade Profit</span>
                </div>
                <div className="flex items-center gap-3">
                  {heroKpis.topWinner.user?.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.topWinner.user.avatar}`}
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
                      {heroKpis.topWinner.user?.display_name || `Team ${heroKpis.topWinner.roster_id}`}
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                      +{heroKpis.topWinner.totalNetPoints.toFixed(1)} net pts
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                Highest net margin from completed trades
              </div>
            </div>
          )}

          {/* 2. Most Active Trader */}
          {heroKpis.mostActive && (
            <div className="glass-card p-4 rounded-xl border border-blue-500/20 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <ArrowRightLeft size={14} className="text-blue-400 shrink-0" />
                  <span className="truncate">Most Active Trader</span>
                </div>
                <div className="flex items-center gap-3">
                  {heroKpis.mostActive.user?.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.mostActive.user.avatar}`}
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
                      {heroKpis.mostActive.user?.display_name || `Team ${heroKpis.mostActive.roster_id}`}
                    </div>
                    <div className="text-xs font-mono font-bold text-blue-400 mt-0.5">
                      {heroKpis.mostActive.totalTrades} trade{heroKpis.mostActive.totalTrades !== 1 ? 's' : ''} • {heroKpis.mostActive.totalAssetsGiven + heroKpis.mostActive.totalAssetsReceived} assets
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                Most trade transactions and assets exchanged
              </div>
            </div>
          )}

          {/* 3. Matchup Flipper Leader */}
          {heroKpis.bestFlipper && (
            <div className="glass-card p-4 rounded-xl border border-amber-500/20 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Trophy size={14} className="text-amber-400 shrink-0" />
                  <span className="truncate">Matchup Flipper</span>
                </div>
                <div className="flex items-center gap-3">
                  {heroKpis.bestFlipper.user?.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.bestFlipper.user.avatar}`}
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
                      {heroKpis.bestFlipper.user?.display_name || `Team ${heroKpis.bestFlipper.roster_id}`}
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                      +{heroKpis.bestFlipper.totalMatchupsFlippedAdded} Wins Added
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight">
                Matchup outcomes flipped directly by trade assets
              </div>
            </div>
          )}

          {/* 4. Top Trade Breakout */}
          {heroKpis.topBreakout && (
            <div className="glass-card p-4 rounded-xl border border-purple-500/20 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Sparkles size={14} className="text-purple-400 shrink-0" />
                  <span className="truncate">Top Trade Breakout</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={`https://sleepercdn.com/content/nfl/players/thumb/${heroKpis.topBreakout.playerId}.jpg`}
                      alt=""
                      className="w-10 h-10 rounded-full border border-purple-400/40 object-cover bg-black/40"
                      onError={e => {
                        (e.target as HTMLImageElement).src = 'https://sleepercdn.com/images/v2/icons/player_default.webp';
                      }}
                    />
                    {heroKpis.topBreakout.avatar && (
                      <img
                        src={`https://sleepercdn.com/avatars/thumbs/${heroKpis.topBreakout.avatar}`}
                        alt=""
                        className="w-4 h-4 rounded-full border border-white/40 absolute -bottom-1 -right-1 bg-black object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm truncate">
                      {heroKpis.topBreakout.name}
                    </div>
                    <div className="text-xs font-mono font-bold text-purple-400 mt-0.5">
                      +{heroKpis.topBreakout.delta.toFixed(1)} pts/gm jump
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted border-t border-white/5 pt-2 mt-3 leading-tight truncate">
                {heroKpis.topBreakout.before > 0
                  ? `${heroKpis.topBreakout.before.toFixed(1)} → ${heroKpis.topBreakout.after.toFixed(1)} pts/gm for ${heroKpis.topBreakout.managerName}`
                  : `${heroKpis.topBreakout.after.toFixed(1)} pts/gm for ${heroKpis.topBreakout.managerName}`}
              </div>
            </div>
          )}
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
          <div className={`p-2 rounded-lg ${activeTab === 'performance' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'}`}>
            <BarChart3 size={18} />
          </div>
          <div className="text-left">
            <div>Trade Performance & Ledger</div>
            <div className={`text-[10px] font-normal ${activeTab === 'performance' ? 'text-white/80' : 'text-muted'}`}>
              Matchups Flipped, Net Margins & Full Transaction History
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('dynamics')}
          className={`flex items-center gap-3.5 px-6 py-3.5 rounded-xl text-sm font-bold transition-all cursor-pointer w-full ${
            activeTab === 'dynamics'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
              : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <div className={`p-2 rounded-lg ${activeTab === 'dynamics' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'}`}>
            <Zap size={18} />
          </div>
          <div className="text-left">
            <div>Market Dynamics & Timing</div>
            <div className={`text-[10px] font-normal ${activeTab === 'dynamics' ? 'text-white/80' : 'text-muted'}`}>
              Trade Typology Matrix & Market Timing Breakdown
            </div>
          </div>
        </button>
      </div>

      {/* Tab 1: Trade Performance & Ledger */}
      {activeTab === 'performance' ? (
        <>
          {/* Row 1: Matchups Flipped & Net Points Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left: Matchups Flipped Chart */}
            <Card title="Matchups Flipped by Trades">
              <div className="chart-header mb-4">
                <div className="chart-description">
                  Calculates if the optimal lineup delta from acquired vs lost players directly altered matchup win/loss outcomes.
                </div>
                <div className="chart-legend-grid pt-3 mt-3 border-t border-white/5">
                  <div className="legend-item">
                    <div className="legend-item-header"><span className="text-emerald-400">🟩</span> Wins Added</div>
                    <div className="legend-item-desc">Won a matchup that would have been lost without the trade.</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-item-header"><span className="text-rose-400">🟥</span> Wins Lost</div>
                    <div className="legend-item-desc">Lost a matchup that would have been won without the trade.</div>
                  </div>
                </div>
              </div>
              <MobileTapHint text="Tap columns for detailed breakdown modal" />
              <div style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={matchupsFlippedData} layout="vertical" margin={{ left: 110, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={100} tickMargin={8} />
                    <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#f8fafc' }} />
                    <Bar dataKey="Added" name="Wins Added" fill="#10b981" radius={[0, 4, 4, 0]} isAnimationActive={false} onClick={(data) => setSelectedDrilldown(data.payload || data)} style={{ cursor: "pointer" }} />
                    <Bar dataKey="Lost" name="Wins Lost" fill="#f43f5e" radius={[0, 4, 4, 0]} isAnimationActive={false} onClick={(data) => setSelectedDrilldown(data.payload || data)} style={{ cursor: "pointer" }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Right: Net Trade Outcomes Leaderboard */}
            <Card title="Trade Net Impact Leaderboard">
              <div className="chart-header mb-4">
                <div className="chart-description">
                  Net starting fantasy points added to lineups vs counterfactual lineups without completed trades.
                </div>
              </div>
              <div className="space-y-3 overflow-y-auto pr-1.5 custom-scrollbar" style={{ maxHeight: '480px' }}>
                {[...tradeData]
                  .filter(d => d.totalTrades > 0)
                  .sort((a, b) => b.totalNetPoints - a.totalNetPoints)
                  .map((d, idx) => {
                    const isPositive = d.totalNetPoints > 0;
                    const isZero = d.totalNetPoints === 0;
                    return (
                      <div
                        key={d.roster_id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all hover:bg-white/[0.04] ${
                          idx === 0
                            ? 'border-emerald-500/30 bg-black/40'
                            : 'border-white/5 bg-black/25'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-6 text-center font-mono font-bold text-xs text-muted">
                            #{idx + 1}
                          </div>
                          {d.user?.avatar ? (
                            <img
                              src={`https://sleepercdn.com/avatars/thumbs/${d.user.avatar}`}
                              alt=""
                              className="w-9 h-9 rounded-full border border-white/10 object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                              N/A
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate">
                              {d.user?.display_name || `Team ${d.roster_id}`}
                            </div>
                            <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span>{d.totalTrades} trade{d.totalTrades !== 1 ? 's' : ''}</span>
                              <span>•</span>
                              <span className="text-white/60">{d.totalAssetsReceived + d.totalAssetsGiven} assets</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <div className={`text-base font-mono font-bold ${
                            isPositive ? 'text-emerald-400' : isZero ? 'text-muted' : 'text-rose-400'
                          }`}>
                            {isPositive ? '+' : ''}{d.totalNetPoints.toFixed(1)}
                            <span className="text-xs text-muted font-normal ml-1">pts</span>
                          </div>
                          <div className="text-[10px] font-mono font-bold">
                            {d.totalMatchupsFlippedAdded > 0 ? (
                              <span className="text-emerald-400">+{d.totalMatchupsFlippedAdded} wins added</span>
                            ) : d.totalMatchupsFlippedLost > 0 ? (
                              <span className="text-rose-400">-{d.totalMatchupsFlippedLost} wins lost</span>
                            ) : (
                              <span className="text-muted">0 flips</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>

          {/* Row 2: The Trade Ledger */}
          <Card title="The Trade Ledger">
            <div className="chart-header mb-6">
              <div className="chart-description">
                Every trade executed in {selectedSeason.league.season}, evaluated by post-trade starter fantasy points produced.
              </div>
              <div className="chart-legend-grid pt-3 mt-3 border-t border-white/5">
                <div className="legend-item">
                  <div className="legend-item-header"><span className="text-base">🏈</span> Active Players</div>
                  <div className="legend-item-desc">Points scored in active starting lineup slots following the trade.</div>
                </div>
                <div className="legend-item">
                  <div className="legend-item-header"><span className="text-base">🎯</span> Draft Picks</div>
                  <div className="legend-item-desc">Points scored by the selected rookie starter; future picks use historical round baselines.</div>
                </div>
                <div className="legend-item">
                  <div className="legend-item-header"><span className="text-base">💰</span> FAAB Dollars</div>
                  <div className="legend-item-desc">Valued using League Average Points generated per FAAB Dollar.</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '640px' }}>
              {allTradesSorted.map((trade) => (
                <div
                  key={trade.transactionId}
                  className="bg-black/40 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white font-bold uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                        Week {trade.week}
                      </span>
                      <span className="text-xs text-muted font-medium">
                        {trade.rosterIds.length}-Team Exchange
                      </span>
                    </div>
                  </div>

                  <div className={`grid gap-5 grid-cols-1 md:grid-cols-${Math.min(trade.sides.length, 4)}`}>
                    {trade.sides.map(side => {
                      const user = selectedSeason.rosterToUser[side.rosterId];
                      const isPositive = side.netPoints > 0;
                      const isZero = side.netPoints === 0;

                      return (
                        <div
                          key={side.rosterId}
                          className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-between"
                        >
                          <div>
                            {/* Manager Info */}
                            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                              {user?.avatar ? (
                                <img
                                  src={`https://sleepercdn.com/avatars/thumbs/${user.avatar}`}
                                  alt=""
                                  className="w-8 h-8 rounded-full border border-white/15 object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                                  N/A
                                </div>
                              )}
                              <span className="font-bold text-white text-sm truncate flex-1">
                                {user?.display_name || `Team ${side.rosterId}`}
                              </span>
                              <span
                                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                                  isPositive
                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                    : isZero
                                    ? 'text-muted bg-white/5 border-white/10'
                                    : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                                }`}
                              >
                                {isPositive ? '+' : ''}{side.netPoints.toFixed(1)} pts
                              </span>
                            </div>

                            {/* Received Assets */}
                            {side.received.length > 0 && (
                              <div className="bg-emerald-500/[0.04] border border-emerald-500/20 rounded-xl p-3 mb-3">
                                <div className="text-[11px] font-bold text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                                  <span>↓ Received</span>
                                </div>
                                <div className="space-y-1.5">
                                  {side.received.map(a => (
                                    <div
                                      key={a.playerId}
                                      className="text-xs flex items-center justify-between gap-2 py-1 border-b border-white/5 last:border-0"
                                    >
                                      <span className="font-medium text-white truncate">
                                        {a.playerName} <span className="text-muted font-normal">({a.position})</span>
                                      </span>
                                      <span className="text-emerald-400 font-mono font-bold shrink-0">
                                        {a.starterPointsAfterTrade.toFixed(1)} pts
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Gave Away Assets */}
                            {side.gave.length > 0 && (
                              <div className="bg-rose-500/[0.04] border border-rose-500/20 rounded-xl p-3">
                                <div className="text-[11px] font-bold text-rose-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                                  <span>↑ Surrendered</span>
                                </div>
                                <div className="space-y-1.5">
                                  {side.gave.map(a => (
                                    <div
                                      key={a.playerId}
                                      className="text-xs flex items-center justify-between gap-2 py-1 border-b border-white/5 last:border-0"
                                    >
                                      <span className="font-medium text-white truncate">
                                        {a.playerName} <span className="text-muted font-normal">({a.position})</span>
                                      </span>
                                      <span className="text-rose-400 font-mono font-bold shrink-0">
                                        {a.starterPointsAfterTrade.toFixed(1)} pts
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* Tab 2: Market Dynamics & Timing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left: Trade Typology Matrix */}
            <Card title="Trade Typology Matrix">
              <div className="chart-header mb-4">
                <div className="chart-description">
                  Categorizes managers by trade volume orientation: Assets Given vs Assets Received.
                </div>
                <div className="chart-legend-grid pt-3 mt-3 border-t border-white/5">
                  <div className="legend-item">
                    <div className="legend-item-header">📦 <strong>Depth Builders</strong> (Above Line)</div>
                    <div className="legend-item-desc">Acquired more total assets than surrendered.</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-item-header">💎 <strong>Consolidators</strong> (Below Line)</div>
                    <div className="legend-item-desc">Surrendered multiple assets for top-end pieces.</div>
                  </div>
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 380 }}>
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
                      isAnimationActive={false}
                    />
                    <Scatter name="Teams" data={typologyData} shape={<CustomAvatarDot />} isAnimationActive={false} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Right: The Market Timing Matrix */}
            <Card title="The Market Timing Matrix">
              <div className="chart-header mb-4">
                <div className="chart-description">
                  Buy-low vs sell-high efficiency: compares a player's fantasy PPG BEFORE trade vs AFTER.
                </div>
                <div className="chart-legend-grid pt-3 mt-3 border-t border-white/5">
                  <div className="legend-item">
                    <div className="legend-item-header">📈 <strong className="text-emerald-400">Breakouts</strong> (Above Line)</div>
                    <div className="legend-item-desc">Acquired right before an upward scoring surge.</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-item-header">📉 <strong className="text-rose-400">Regressions</strong> (Below Line)</div>
                    <div className="legend-item-desc">Traded away before a downward scoring dip.</div>
                  </div>
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 380 }}>
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
                      isAnimationActive={false}
                    />
                    <Scatter name="Players" data={fleecingData} shape={<CustomPlayerScatterDot />} isAnimationActive={false} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Row 2: Manager Market Timing Matrix & Behavioral Archetypes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left: Manager Market Timing Quadrant Scatter */}
            <Card title="Manager Market Timing Matrix">
              <div className="chart-header mb-4">
                <div className="chart-description">
                  Quadrant mapping of manager trading savvy: Buy Timing Edge (X-axis) vs Sell Timing Edge (Y-axis).
                </div>
                <div className="chart-legend-grid pt-3 mt-3 border-t border-white/5">
                  <div className="legend-item">
                    <div className="legend-item-header">🧠 <strong className="text-emerald-400">Wall Street Wizards</strong> (Top-Right)</div>
                    <div className="legend-item-desc">Positive timing on both acquired and surrendered players.</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-item-header">📉 <strong className="text-blue-400">Sell-High Masters</strong> (Top-Left)</div>
                    <div className="legend-item-desc">Excels at selling players before post-trade dropoffs.</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-item-header">📈 <strong className="text-teal-400">Breakout Hunters</strong> (Bottom-Right)</div>
                    <div className="legend-item-desc">Acquired rising talent right before scoring surges.</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-item-header">⚠️ <strong className="text-rose-400">FOMO Traders</strong> (Bottom-Left)</div>
                    <div className="legend-item-desc">Bought at peak prices or sold before breakouts.</div>
                  </div>
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      type="number"
                      dataKey="buyDelta"
                      name="Buy Timing Delta"
                      stroke="#94a3b8"
                      tick={{ fontSize: 12 }}
                      domain={[-maxTimingDomain, maxTimingDomain]}
                    >
                      <Label value="Buy Timing (PPG Surge on Acquired Assets)" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                    </XAxis>
                    <YAxis
                      type="number"
                      dataKey="sellDelta"
                      name="Sell Timing Delta"
                      stroke="#94a3b8"
                      tick={{ fontSize: 12 }}
                      domain={[-maxTimingDomain, maxTimingDomain]}
                    >
                      <Label value="Sell Timing (PPG Dip Avoided on Surrendered)" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                    </YAxis>
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                    <RechartsTooltip content={<CustomManagerTimingTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                    <Scatter name="Managers" data={managerTimingData} shape={<CustomManagerTimingDot />} isAnimationActive={false} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Right: Manager Market Timing Index Leaderboard */}
            <Card title="Market Timing Index Leaderboard">
              <div className="chart-header mb-4">
                <div className="chart-description">
                  Ranked by cumulative PPG delta captured across all buy-low and sell-high transactions.
                </div>
              </div>
              <div className="space-y-3 overflow-y-auto pr-1.5 custom-scrollbar" style={{ maxHeight: '480px' }}>
                {[...managerTimingData]
                  .sort((a, b) => b.netTiming - a.netTiming)
                  .map((mgr, idx) => {
                    const isPositive = mgr.netTiming > 0;
                    const isZero = mgr.netTiming === 0;
                    return (
                      <div
                        key={mgr.rosterId}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all hover:bg-white/[0.04] ${
                          idx === 0
                            ? 'border-emerald-500/30 bg-black/40'
                            : 'border-white/5 bg-black/25'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-6 text-center font-mono font-bold text-xs text-muted">
                            #{idx + 1}
                          </div>
                          {mgr.avatar ? (
                            <img
                              src={`https://sleepercdn.com/avatars/thumbs/${mgr.avatar}`}
                              alt=""
                              className="w-10 h-10 rounded-full border border-white/10 object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                              N/A
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm truncate">
                                {mgr.name}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${mgr.archetypeColor}`}>
                                <span>{mgr.archetypeEmoji}</span>
                                <span>{mgr.archetype}</span>
                              </span>
                            </div>
                            <div className="text-[11px] text-muted flex items-center gap-2 mt-1 flex-wrap font-mono">
                              <span className={mgr.buyDelta >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                {mgr.buyDelta >= 0 ? '+' : ''}{mgr.buyDelta} buy
                              </span>
                              <span>•</span>
                              <span className={mgr.sellDelta >= 0 ? 'text-blue-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                {mgr.sellDelta >= 0 ? '+' : ''}{mgr.sellDelta} sell
                              </span>
                              {mgr.bestBuy && mgr.bestBuy.delta > 0 && (
                                <>
                                  <span className="font-sans text-white/20">•</span>
                                  <span className="text-white/60 font-sans truncate text-[11px]">
                                    Top: {mgr.bestBuy.name} (+{mgr.bestBuy.delta} PPG)
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <div className={`text-base font-mono font-bold ${
                            isPositive ? 'text-emerald-400' : isZero ? 'text-muted' : 'text-rose-400'
                          }`}>
                            {isPositive ? '+' : ''}{mgr.netTiming}
                            <span className="text-xs text-muted font-normal ml-1">PPG</span>
                          </div>
                          <div className="text-[10px] font-mono text-muted">
                            {mgr.tradesCount} trade{mgr.tradesCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>
        </>
      )}

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
                            {/* Color Legend */}
                            <div className="flex flex-wrap items-center justify-center gap-4 py-2 px-3 bg-black/30 rounded-xl border border-white/5 text-[11px] font-medium text-muted mb-4">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                                <span className="text-emerald-300 font-bold">Acquired Player</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0"></span>
                                <span className="text-rose-300 font-bold">Surrendered Player</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-white/60 shrink-0"></span>
                                <span className="text-white/80 font-bold">Other Lineup Adjustment</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                              {/* Actual */}
                              <div>
                                <div className="flex items-center justify-between mb-3 px-1">
                                  <h3 className="font-bold text-white flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                    Actual Lineup (With Trade)
                                  </h3>
                                </div>
                                <div className="space-y-2">
                                  {fm.actualStarters.map((s: any, sIdx: number) => {
                                    const extractPlayerName = (str: string) => {
                                      if (!str) return '';
                                      if (/Rd\s+\d+/i.test(str) && str.includes('(') && str.includes(')')) {
                                        const match = str.match(/\(([^)]+)\)/);
                                        if (match && match[1]) return match[1].trim().toLowerCase();
                                      }
                                      return str.replace(/\s*\([A-Z0-9_]+\)$/i, '').replace(/\s*Pick$/i, '').trim().toLowerCase();
                                    };

                                    const isAcquired = (fm.transactionDetails?.receivedAssetIds && fm.transactionDetails.receivedAssetIds.includes(s.id)) ||
                                      fm.transactionDetails?.received?.some((r: string) => {
                                        const cleanR = extractPlayerName(r);
                                        return cleanR.length > 2 && (s.name.toLowerCase().includes(cleanR) || cleanR.includes(s.name.toLowerCase()));
                                      });
                                    const isBenchedWithoutTrade = !fm.hypotheticalStarters.some((hs: any) => hs.id === s.id);
                                    const displaySlot = (s.rosterSlot || '').replace('SUPER_FLEX', 'SFLX').replace('_FLEX', ' FLX');
                                    
                                    return (
                                      <div
                                        key={sIdx}
                                        className={`flex items-center justify-between p-2.5 md:p-3 rounded-xl border transition-all ${
                                          isAcquired
                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
                                            : isBenchedWithoutTrade
                                            ? 'bg-white/10 border-white/20 text-white shadow-sm shadow-white/5'
                                            : 'bg-white/[0.02] border-white/5 opacity-50 hover:opacity-100'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                          <span className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase w-6 md:w-8 text-center tracking-wider shrink-0">{displaySlot}</span>
                                          <img
                                            src={s.avatar}
                                            alt=""
                                            className={`w-7 h-7 md:w-8 md:h-8 rounded-full shrink-0 bg-black/40 ${isAcquired ? 'ring-2 ring-emerald-400/60' : isBenchedWithoutTrade ? 'ring-2 ring-white/30' : ''}`}
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'; }}
                                          />
                                          <span className={`text-xs md:text-sm font-medium truncate ${isAcquired ? 'text-emerald-300 font-bold' : isBenchedWithoutTrade ? 'text-white font-bold' : 'text-white'}`}>
                                            {s.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                          {isAcquired && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md hidden sm:inline">
                                              Acquired
                                            </span>
                                          )}
                                          {isBenchedWithoutTrade && !isAcquired && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 bg-white/10 border border-white/20 px-2 py-0.5 rounded-md hidden sm:inline">
                                              Promoted
                                            </span>
                                          )}
                                          <span className={`font-mono text-xs font-bold ${isAcquired ? 'text-emerald-400' : isBenchedWithoutTrade ? 'text-white' : 'text-muted'}`}>
                                            {s.pts.toFixed(1)}
                                          </span>
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
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                                    Without Trades (Counterfactual)
                                  </h3>
                                </div>
                                <div className="space-y-2">
                                  {fm.hypotheticalStarters.map((s: any, sIdx: number) => {
                                    const extractPlayerName = (str: string) => {
                                      if (!str) return '';
                                      if (/Rd\s+\d+/i.test(str) && str.includes('(') && str.includes(')')) {
                                        const match = str.match(/\(([^)]+)\)/);
                                        if (match && match[1]) return match[1].trim().toLowerCase();
                                      }
                                      return str.replace(/\s*\([A-Z0-9_]+\)$/i, '').replace(/\s*Pick$/i, '').trim().toLowerCase();
                                    };

                                    const isReplacement = s.id.startsWith('REP_');
                                    const isSurrendered = (fm.transactionDetails?.gaveAssetIds && fm.transactionDetails.gaveAssetIds.includes(s.id)) ||
                                      fm.transactionDetails?.gaveUp?.some((g: string) => {
                                        const cleanG = extractPlayerName(g);
                                        return cleanG.length > 2 && (s.name.toLowerCase().includes(cleanG) || cleanG.includes(s.name.toLowerCase()));
                                      });
                                    const isNew = !fm.actualStarters.some((as: any) => as.id === s.id);
                                    const displaySlot = (s.rosterSlot || '').replace('SUPER_FLEX', 'SFLX').replace('_FLEX', ' FLX');
                                    
                                    return (
                                      <div
                                        key={sIdx}
                                        className={`flex items-center justify-between p-2.5 md:p-3 rounded-xl border transition-all ${
                                          isSurrendered
                                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-sm shadow-rose-500/10'
                                            : (isReplacement || isNew)
                                            ? 'bg-white/10 border-white/20 text-white shadow-sm shadow-white/5'
                                            : 'bg-white/[0.02] border-white/5 opacity-50 hover:opacity-100'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                          <span className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase w-6 md:w-8 text-center tracking-wider shrink-0">{displaySlot}</span>
                                          {!isReplacement ? (
                                            <img
                                              src={s.avatar}
                                              alt=""
                                              className={`w-7 h-7 md:w-8 md:h-8 rounded-full shrink-0 bg-black/40 ${isSurrendered ? 'ring-2 ring-rose-400/60' : isNew ? 'ring-2 ring-white/30' : ''}`}
                                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'; }}
                                            />
                                          ) : (
                                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                                              <User size={12} className="text-white/60" />
                                            </div>
                                          )}
                                          <span className={`text-xs md:text-sm font-medium truncate ${isSurrendered ? 'text-rose-300 font-bold' : (isReplacement || isNew) ? 'text-white font-bold' : 'text-white'}`}>
                                            {isReplacement ? `ERV: ${s.name}` : s.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                          {isSurrendered && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-300 bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded-md hidden sm:inline">
                                              Surrendered
                                            </span>
                                          )}
                                          {isReplacement && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 bg-white/10 border border-white/20 px-2 py-0.5 rounded-md hidden sm:inline">
                                              Replacement
                                            </span>
                                          )}
                                          {isNew && !isReplacement && !isSurrendered && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 bg-white/10 border border-white/20 px-2 py-0.5 rounded-md hidden sm:inline">
                                              Promoted
                                            </span>
                                          )}
                                          <span className={`font-mono text-xs font-bold ${isSurrendered ? 'text-rose-400' : (isReplacement || isNew) ? 'text-white' : 'text-muted'}`}>
                                            {s.pts.toFixed(1)}
                                          </span>
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
