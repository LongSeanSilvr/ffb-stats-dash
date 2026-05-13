import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useDraftEfficiency } from '../hooks/useDraftEfficiency';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, Label, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

// Reusable scatter dot with avatar
const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 28;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  if (!cx || !cy) return null;
  return (
    <svg x={cx - size/2} y={cy - size/2} width={size} height={size}>
      <defs>
        <clipPath id={`clip-draft-${payload.name}`}>
          <circle cx={size/2} cy={size/2} r={size/2} />
        </clipPath>
      </defs>
      {avatarUrl ? (
        <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#clip-draft-${payload.name})`} />
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
      <div style={{ background: 'rgba(15,17,21,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.85rem 1rem', minWidth: 220, boxShadow: '0 12px 48px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/10">
          {data.avatar ? (
            <img src={`https://sleepercdn.com/avatars/thumbs/${data.avatar}`} alt="avatar" className="avatar" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          ) : (
             <div className="avatar bg-gray-700" style={{ width: 28, height: 28, borderRadius: '50%' }}></div>
          )}
          <span className="font-bold text-md">{data.name}</span>
        </div>
        
        <div className="space-y-1.5 text-xs">
          {data.roi !== undefined && (
            <div className="flex justify-between"><span className="text-muted">Draft ROI:</span> <span className={`font-bold ${data.roi >= 0 ? 'text-success-color' : 'text-danger-color'}`}>{data.roi >= 0 ? '+' : ''}{data.roi}%</span></div>
          )}
          {data.wins !== undefined && (
            <div className="flex justify-between"><span className="text-muted">Season Wins:</span> <span className="text-white font-bold">{data.wins}</span></div>
          )}
          {data.earlyDiff !== undefined && (
            <div className="flex justify-between"><span className="text-muted">Early Rd Value:</span> <span className={`font-bold ${data.earlyDiff >= 0 ? 'text-success-color' : 'text-danger-color'}`}>{data.earlyDiff >= 0 ? '+' : ''}{data.earlyDiff}</span></div>
          )}
          {data.lateDiff !== undefined && (
            <div className="flex justify-between"><span className="text-muted">Late Rd Value:</span> <span className={`font-bold ${data.lateDiff >= 0 ? 'text-success-color' : 'text-danger-color'}`}>{data.lateDiff >= 0 ? '+' : ''}{data.lateDiff}</span></div>
          )}
          {data.gamesMissed !== undefined && (
            <div className="flex justify-between"><span className="text-muted">Games Missed:</span> <span className="text-danger-color font-bold">{data.gamesMissed}</span></div>
          )}
          <div className="pt-1.5 mt-1.5 border-t border-white/5 flex justify-between text-[10px]">
            <span className="text-muted/70">Actual Total:</span>
            <span className="text-muted">{data.actualTotal} pts</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// --- Heatmap Table Component ---
const HeatmapTable: React.FC<{ draftData: any[] }> = ({ draftData }) => {
  const [hovered, setHovered] = React.useState<{ round: number; mgr: string; x: number; y: number } | null>(null);

  const managers = draftData.map((d: any) => ({
    name: d.user?.display_name || `Team ${d.roster_id}`,
    rosterId: d.roster_id
  }));

  const maxRounds = Math.max(...draftData.flatMap((d: any) => Object.keys(d.roundValue).map(Number)));

  // Build per-cell data: accumulate ALL players per round per manager
  const cellData: Record<string, { totalPts: number; avgPts: number; players: { name: string; pts: number }[] }> = {};
  draftData.forEach((d: any) => {
    const mgrName = d.user?.display_name || `Team ${d.roster_id}`;
    d.draftPicks.forEach((pick: any) => {
      const key = `${pick.round}-${mgrName}`;
      if (!cellData[key]) cellData[key] = { totalPts: 0, avgPts: 0, players: [] };
      cellData[key].totalPts += pick.starterPoints + pick.benchPoints;
      cellData[key].players.push({ name: pick.playerName, pts: pick.starterPoints + pick.benchPoints });
    });
  });

  // Compute avg per pick within each cell
  Object.values(cellData).forEach(cell => {
    cell.players.sort((a, b) => b.pts - a.pts);
    cell.avgPts = cell.players.length > 0 ? cell.totalPts / cell.players.length : 0;
  });

  // Compute per-round AVERAGE (per pick, not per manager) for relative-value color scaling
  const roundAvg: Record<number, number> = {};
  for (let round = 1; round <= maxRounds; round++) {
    let totalPts = 0;
    let totalPicks = 0;
    managers.forEach((m: any) => {
      const cell = cellData[`${round}-${m.name}`];
      if (cell) {
        totalPts += cell.totalPts;
        totalPicks += cell.players.length;
      }
    });
    roundAvg[round] = totalPicks > 0 ? totalPts / totalPicks : 0;
  }

  // Diverging color: bright green = far above avg, bright red = far below avg, dim near avg
  const getCellColor = (pts: number, avg: number, hasPicks: boolean) => {
    if (!hasPicks) return 'rgba(255,255,255,0.02)';
    if (avg <= 0) return pts > 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255,255,255,0.02)';
    if (pts <= 0) return 'rgba(239, 68, 68, 0.45)';

    const ratio = pts / avg;
    if (ratio >= 1) {
      // Above avg → green, brighter as ratio grows
      const intensity = Math.min((ratio - 1) / 1.5, 1);
      const r = Math.round(20 * (1 - intensity) + 34 * intensity);
      const g = Math.round(60 * (1 - intensity) + 197 * intensity);
      const b = Math.round(40 * (1 - intensity) + 94 * intensity);
      const alpha = 0.12 + intensity * 0.55;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      // Below avg → red, brighter as ratio drops
      const intensity = Math.min((1 - ratio) / 0.8, 1);
      const r = Math.round(120 * (1 - intensity) + 239 * intensity);
      const g = Math.round(50 * (1 - intensity) + 68 * intensity);
      const b = Math.round(50 * (1 - intensity) + 68 * intensity);
      const alpha = 0.12 + intensity * 0.5;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ overflowX: 'auto' }} className="pb-2">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px', minWidth: '850px' }}>
          <thead>
            <tr>
              <th style={{ width: 55, padding: '0.5rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>Round</th>
              <th style={{ width: 45, padding: '0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.6rem', fontWeight: 500 }}>Avg</th>
              {managers.map((m: any) => (
                <th key={m.rosterId} style={{ padding: '0.4rem 0.2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.6rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRounds }, (_, i) => i + 1).map(round => {
              const avg = roundAvg[round];
              return (
                <tr key={round}>
                  <td style={{ padding: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>Rd {round}</td>
                  <td style={{ padding: '0.4rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem', fontWeight: 500, background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    {avg > 0 ? avg.toFixed(0) : '—'}
                  </td>
                  {managers.map((m: any) => {
                    const key = `${round}-${m.name}`;
                    const cell = cellData[key];
                    const pts = cell ? Number(cell.avgPts.toFixed(1)) : 0;
                    const players = cell?.players || [];
                    const hasPicks = players.length > 0;

                    return (
                      <td
                        key={m.rosterId}
                        onMouseEnter={(e) => {
                          setHovered({ round, mgr: m.name, x: e.clientX, y: e.clientY });
                        }}
                        onMouseMove={(e) => {
                          if (hovered) setHovered({ round, mgr: m.name, x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          background: getCellColor(cell?.avgPts || 0, avg, hasPicks),
                          borderRadius: '6px',
                          padding: '0.35rem 0.2rem',
                          textAlign: 'center',
                          fontSize: '0.7rem',
                          fontWeight: hasPicks ? 600 : 400,
                          color: hasPicks ? '#fff' : 'rgba(255,255,255,0.2)',
                          cursor: hasPicks ? 'pointer' : 'default',
                          transition: 'all 0.15s ease',
                          lineHeight: 1.2,
                        }}
                      >
                        <div>{hasPicks ? pts : '—'}</div>
                        {hasPicks && (
                          <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                            {players.length === 1 ? players[0].name : `${players.length} picks`}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hover tooltip */}
      {hovered && (() => {
        const cell = cellData[`${hovered.round}-${hovered.mgr}`];
        if (!cell || cell.players.length === 0) return null;
        const avg = roundAvg[hovered.round];
        const pctOfAvg = avg > 0 ? ((cell.avgPts / avg) * 100).toFixed(0) : '—';
        return (
          <div
            style={{
              position: 'fixed',
              left: hovered.x,
              top: hovered.y - 12,
              transform: 'translate(-50%, -100%)',
              background: 'rgba(15,17,21,0.97)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              zIndex: 999,
              minWidth: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              pointerEvents: 'none',
            }}
          >
            <div className="font-bold mb-2" style={{ fontSize: '0.85rem' }}>{hovered.mgr} · Rd {hovered.round}</div>
            {cell.players.map((p, i) => (
              <div key={i} className="text-sm flex justify-between gap-4">
                <span className="text-muted">{p.name}</span>
                <span className="font-bold" style={{ color: p.pts > 0 ? '#fff' : 'var(--danger-color)' }}>{p.pts.toFixed(1)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
              {cell.players.length > 1 && (
                <div className="text-sm flex justify-between gap-4">
                  <span className="text-muted">Avg / Pick</span>
                  <span className="font-bold text-white">{cell.avgPts.toFixed(1)}</span>
                </div>
              )}
              <div className="text-sm flex justify-between gap-4">
                <span className="text-muted">Rd Avg / Pick</span>
                <span className="font-bold" style={{ color: '#64748b' }}>{avg.toFixed(1)}</span>
              </div>
              <div className="text-sm flex justify-between gap-4">
                <span className="text-muted">vs Avg</span>
                <span className="font-bold" style={{ color: cell.avgPts >= avg ? 'var(--success-color)' : 'var(--danger-color)' }}>
                  {pctOfAvg}%
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export const Draft: React.FC = () => {
  const { selectedSeason } = useLeagueContext();
  const { data: draftData, loading, error } = useDraftEfficiency();

  const [radarMgrs, setRadarMgrs] = useState<number[]>([]);

  useEffect(() => {
    if (draftData && draftData.length > 0 && radarMgrs.length === 0) {
      setRadarMgrs(draftData.slice(0, 4).map(d => d.roster_id));
    }
  }, [draftData, radarMgrs.length]);

  // --- HOISTED HOOKS: Advanced Analysis Computation ---
  // Calculate global round-by-round league averages dynamically
  const roundAverages = useMemo(() => {
    if (!draftData || draftData.length === 0) return {};
    const allLeaguePicks = draftData.flatMap(d => d.draftPicks || []);
    const aggregates: Record<number, { sum: number; count: number }> = {};
    
    allLeaguePicks.forEach(p => {
      if (!p || !p.round) return;
      if (!aggregates[p.round]) aggregates[p.round] = { sum: 0, count: 0 };
      aggregates[p.round].sum += (p.starterPoints || 0);
      aggregates[p.round].count += 1;
    });

    const avgs: Record<number, number> = {};
    Object.entries(aggregates).forEach(([rd, val]) => {
      avgs[Number(rd)] = val.count > 0 ? val.sum / val.count : 0;
    });
    return avgs;
  }, [draftData]);

  // Build advanced derived scatter data with multi-perspectives
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
          actualEarly += (p.starterPoints || 0);
        } else {
          expectedLate += expected;
          actualLate += (p.starterPoints || 0);
        }
      });

      const actualTotal = d.draftStarterPoints || 0;
      const roi = expectedTotal > 0 ? ((actualTotal / expectedTotal) * 100) - 100 : 0; 
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
        gamesMissed: d.totalGamesMissed || 0
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
      gamesMissed: getMedian(scatterData.map(d => d.gamesMissed))
    };
  }, [scatterData]);
  // --------------------------------------------------

  if (loading || !selectedSeason) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4">Analyzing draft results and player tenures...</div>
      </div>
    );
  }

  if (error) return <div className="text-danger-color">Error loading draft data: {error}</div>;
  if (!draftData.length) return <div className="text-muted">No draft data available for this season.</div>;

  // --- Data transformations ---

  // 1. Draft Points Generated (bar chart)
  const draftPointsData = [...draftData]
    .sort((a, b) => b.draftStarterPoints - a.draftStarterPoints)
    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      'Starter Pts': Number(d.draftStarterPoints.toFixed(1)),
      'Bench Pts': Number(d.draftBenchPoints.toFixed(1)),
    }));

  // 2. Keeper Points Generated (bar chart)
  const keeperPointsData = [...draftData]
    .filter(d => d.keepers.length > 0)
    .sort((a, b) => b.keeperStarterPoints - a.keeperStarterPoints)
    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      'Starter Pts': Number(d.keeperStarterPoints.toFixed(1)),
      'Bench Pts': Number(d.keeperBenchPoints.toFixed(1)),
      keepers: d.keepers
        .map(k => ({
          name: k.playerName,
          pts: Number((k.starterPoints + k.benchPoints).toFixed(1)),
          starterPts: Number(k.starterPoints.toFixed(1)),
          benchPts: Number(k.benchPoints.toFixed(1)),
        }))
        .sort((a, b) => b.pts - a.pts)
    }));

  // 3. Draft Hit Rate — normalized % so pick volume differences (traded picks) don't distort comparisons
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

  const HitRateTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', minWidth: '160px' }}>
          <div className="font-bold mb-2">{d.name}</div>
          <div className="text-sm flex justify-between gap-4"><span className="text-muted">Hit Rate</span><span className="text-success-color font-bold">{d['Hit %']}%</span></div>
          <div className="text-sm flex justify-between gap-4"><span className="text-muted">Total Picks</span><span className="text-white font-bold">{d.totalPicks}</span></div>
          <div className="text-sm flex justify-between gap-4"><span className="text-muted">Hits</span><span className="text-success-color font-bold">{d.hits}</span></div>
          <div className="text-sm flex justify-between gap-4"><span className="text-muted">Busts</span><span className="text-danger-color font-bold">{d.busts}</span></div>
        </div>
      );
    }
    return null;
  };

  const KeeperPointsTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div style={{ 
          background: 'rgba(15,17,21,0.98)', 
          border: '1px solid rgba(255,255,255,0.15)', 
          borderRadius: '14px', 
          padding: '1rem', 
          minWidth: '280px', 
          boxShadow: '0 16px 64px rgba(0,0,0,0.7)' 
        }}>
          {/* Tier 1: Name */}
          <div className="font-bold text-white text-base pb-3.5 border-b border-white/10 mb-4">
            {d.name}
          </div>
          
          {/* Tier 2: Summary (Grid for perfect safety) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-b border-white/10 pb-3.5 mb-4">
            <div className="flex items-center">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0, marginRight: '8px' }} />
              <span className="text-muted mr-1">Starter:</span>
              <span className="text-white font-bold">{d['Starter Pts']}</span>
            </div>
            <div className="flex items-center">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.4)', flexShrink: 0, marginRight: '8px' }} />
              <span className="text-muted mr-1">Bench:</span>
              <span className="text-white/70 font-bold">{d['Bench Pts']}</span>
            </div>
          </div>
          
          {/* Tier 3: List */}
          <div className="space-y-2.5">
            {d.keepers.map((k: any, idx: number) => (
              <div key={idx} className="text-sm flex justify-between items-center gap-8">
                <span className="text-muted truncate max-w-[170px]">{k.name}</span>
                <span className="font-bold text-white tabular-nums">{k.pts.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };





  // 6. Top draft picks leaderboard
  const allDraftPicks = draftData.flatMap(d =>
    d.draftPicks.map(pick => ({
      ...pick,
      managerName: d.user?.display_name || `Team ${d.roster_id}`,
      avatar: d.user?.avatar
    }))
  ).sort((a, b) => b.starterPoints - a.starterPoints);

  // 7. Top keepers leaderboard
  const allKeepers = draftData.flatMap(d =>
    d.keepers.map(k => ({
      ...k,
      managerName: d.user?.display_name || `Team ${d.roster_id}`,
      avatar: d.user?.avatar
    }))
  ).sort((a, b) => b.starterPoints - a.starterPoints);

  // 8. Strategy Radar Data
  const radarProfiles = [...draftData].sort((a, b) => (a.user?.display_name || '').localeCompare(b.user?.display_name || ''));
  const activeRadarProfiles = radarMgrs.map(id => radarProfiles.find(p => p.roster_id === id)).filter(p => !!p) as any[];

  const buildPosRadarData = (minRound: number, maxRound: number, excludeKeepers: boolean) => {
    const data: Record<string, any>[] = [
      { subject: 'QB' },
      { subject: 'RB' },
      { subject: 'WR' },
      { subject: 'TE' },
      { subject: 'K' },
      { subject: 'IDP' }
    ];

    // 1. Calculate raw totals for ALL managers to find the global max for this draft phase
    const allManagerTotals = radarProfiles.map(p => {
      let qb = 0, rb = 0, wr = 0, te = 0, k = 0, idp = 0;
      const picks = p.draftPicks.filter((pick: any) => 
        pick.round >= minRound && pick.round <= maxRound && (!excludeKeepers || !pick.isKeeper)
      );
      picks.forEach((pick: any) => {
        const pos = pick.position || '??';
        if (pos === 'QB') qb++;
        else if (pos === 'RB') rb++;
        else if (pos === 'WR') wr++;
        else if (pos === 'TE') te++;
        else if (pos === 'K') k++;
        else if (['DL', 'LB', 'DB', 'IDP'].includes(pos)) idp++;
      });
      return { qb, rb, wr, te, k, idp };
    });

    const maxQB = Math.max(...allManagerTotals.map(t => t.qb), 1);
    const maxRB = Math.max(...allManagerTotals.map(t => t.rb), 1);
    const maxWR = Math.max(...allManagerTotals.map(t => t.wr), 1);
    const maxTE = Math.max(...allManagerTotals.map(t => t.te), 1);
    const maxK = Math.max(...allManagerTotals.map(t => t.k), 1);
    const maxIDP = Math.max(...allManagerTotals.map(t => t.idp), 1);

    // 2. Map normalized (100-scaled) data for the ACTIVE managers only
    activeRadarProfiles.forEach((p, idx) => {
      let qb = 0, rb = 0, wr = 0, te = 0, k = 0, idp = 0;
      
      const picks = p.draftPicks.filter((pick: any) => 
        pick.round >= minRound && 
        pick.round <= maxRound && 
        (!excludeKeepers || !pick.isKeeper)
      );

      picks.forEach((pick: any) => {
        const pos = pick.position || '??';
        if (pos === 'QB') qb++;
        else if (pos === 'RB') rb++;
        else if (pos === 'WR') wr++;
        else if (pos === 'TE') te++;
        else if (pos === 'K') k++;
        else if (['DL', 'LB', 'DB', 'IDP'].includes(pos)) idp++;
      });

      // Scaled values for rendering
      data[0][`manager_${idx}`] = Number(((qb / maxQB) * 100).toFixed(1));
      data[1][`manager_${idx}`] = Number(((rb / maxRB) * 100).toFixed(1));
      data[2][`manager_${idx}`] = Number(((wr / maxWR) * 100).toFixed(1));
      data[3][`manager_${idx}`] = Number(((te / maxTE) * 100).toFixed(1));
      data[4][`manager_${idx}`] = Number(((k / maxK) * 100).toFixed(1));
      data[5][`manager_${idx}`] = Number(((idp / maxIDP) * 100).toFixed(1));

      // Raw values for tooltip
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

  const handleToggle = (id: number, setFn: React.Dispatch<React.SetStateAction<number[]>>) => {
    setFn(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      const next = [...prev, id];
      return next.length > 4 ? next.slice(1) : next;
    });
  };

  const renderSelector = (currentIds: number[], setter: React.Dispatch<React.SetStateAction<number[]>>) => {
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-6 border-t border-white/5 pt-4 w-full">
        {radarProfiles.map(p => {
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
                opacity: isActive ? 1 : undefined,
                cursor: 'pointer',
                padding: '4px 12px',
                borderRadius: '999px',
                borderWidth: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                background: isActive ? 'rgba(255,255,255,0.03)' : 'transparent'
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

  // 9. Injury & Bust Analyzer Data
  const injuryBustData = allDraftPicks
    .filter(p => p.gamesMissed > 0)
    .sort((a, b) => (b.gamesMissed * b.draftValueExpected) - (a.gamesMissed * a.draftValueExpected))
    .slice(0, 24); // Top 24 most impactful injuries

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mt-4 mb-10">Draft & Keeper Analytics ({selectedSeason.league.season})</h1>

      {/* Row 0: Draft Strategy Radar */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card title="Positional Strategy Maps" className="stagger-0">
          <div className="text-sm text-muted mb-6 text-center">Concentration of picks by position across different phases of the draft.</div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="flex flex-col items-center">
              <h3 className="text-md text-white font-medium mb-2">Early (Rds 1-4)</h3>
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
                      contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                    />
                    {activeRadarProfiles.map((p, i) => (
                      <Radar key={p.roster_id} name={p.user.display_name} dataKey={`manager_${i}`} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.2} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <h3 className="text-md text-white font-medium mb-2">Mid (Rds 5-9)</h3>
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
                      contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                    />
                    {activeRadarProfiles.map((p, i) => (
                      <Radar key={p.roster_id} name={p.user.display_name} dataKey={`manager_${i}`} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.2} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <h3 className="text-md text-white font-medium mb-2">Late (Rds 10+)</h3>
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
                      contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                    />
                    {activeRadarProfiles.map((p, i) => (
                      <Radar key={p.roster_id} name={p.user.display_name} dataKey={`manager_${i}`} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.2} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {renderSelector(radarMgrs, setRadarMgrs)}
        </Card>
      </div>

      {/* Row 1: Draft Points Generated & Draft Hit Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card title="Draft Points Generated" className="stagger-1">
          <div className="text-sm text-muted mb-4">Total starter points scored by drafted players while on your roster.</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={draftPointsData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend
                  content={() => (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--accent-color)', display: 'inline-block' }} />
                        <span style={{ color: '#94a3b8' }}>Starter Pts</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(59, 130, 246, 0.3)', display: 'inline-block' }} />
                        <span style={{ color: '#94a3b8' }}>Bench Pts</span>
                      </span>
                    </div>
                  )}
                />
                <Bar dataKey="Starter Pts" stackId="a" fill="var(--accent-color)" />
                <Bar dataKey="Bench Pts" stackId="a" fill="rgba(59, 130, 246, 0.3)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Draft Hit Rate %" className="stagger-1">
          <div className="text-sm text-muted mb-4">% of draft picks that started ≥1 game.</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={draftHitRateData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip content={<HitRateTooltip />} cursor={false} />
                <Legend
                  content={() => (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--success-color)', display: 'inline-block' }} />
                        <span style={{ color: '#94a3b8' }}>Hit %</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--danger-color)', display: 'inline-block' }} />
                        <span style={{ color: '#94a3b8' }}>Bust %</span>
                      </span>
                    </div>
                  )}
                />
                <Bar dataKey="Hit %" stackId="a" fill="var(--success-color)" />
                <Bar dataKey="Bust %" stackId="a" fill="var(--danger-color)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 2: Advanced Draft Analytics Scatter Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card title="Draft Capital vs Yield" className="stagger-2">
          <div className="text-sm text-muted mb-4 leading-relaxed">
            Compares total draft capital entering the draft (expected avg value for picks a manager owned) against the actual points generated by those picks.
            <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px 0', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '360px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '0 16px 8px 0', borderRight: '2px solid rgba(255,255,255,0.15)', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
                  💎 <strong style={{ color: '#fff', fontWeight: 500 }}>Value Extractors</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '0 0 8px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
                  🎯 <strong style={{ color: '#fff', fontWeight: 500 }}>Expected Studs</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '8px 16px 0 0', borderRight: '2px solid rgba(255,255,255,0.15)' }}>
                  📉 <strong style={{ color: '#fff', fontWeight: 500 }}>Expected Duds</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '8px 0 0 16px' }}>
                  ⚠️ <strong style={{ color: '#fff', fontWeight: 500 }}>Squandered Capital</strong>
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="expectedTotal" name="Expected Points" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={['auto', 'auto']}>
                  <Label value="Total Draft Value (Expected Pts)" position="insideBottom" offset={-20} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                </XAxis>
                <YAxis type="number" dataKey="actualTotal" name="Actual Points" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="Actual Starter Points" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                </YAxis>
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={true} />
                <ReferenceLine x={scatterAvgs.expectedTotal} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                <ReferenceLine y={scatterAvgs.actualTotal} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Draft Efficiency vs Wins" className="stagger-2">
          <div className="text-sm text-muted mb-4 leading-relaxed">
            Compares Draft ROI (performance relative to draft slot expectations) against total season wins.
            <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px 0', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '0 16px 8px 0', borderRight: '2px solid rgba(255,255,255,0.15)', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
                  💼 <strong style={{ color: '#fff', fontWeight: 500 }}>Waiver Gold</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '0 0 8px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
                  🎯 <strong style={{ color: '#fff', fontWeight: 500 }}>Solid Draft</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '8px 16px 0 0', borderRight: '2px solid rgba(255,255,255,0.15)' }}>
                  ⚠️ <strong style={{ color: '#fff', fontWeight: 500 }}>Rebuilding</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '8px 0 0 16px' }}>
                  🍀 <strong style={{ color: '#fff', fontWeight: 500 }}>Unlucky</strong>
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="roi" name="Draft ROI" stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" domain={['auto', 'auto']}>
                  <Label value="Draft ROI (% vs expected)" position="insideBottom" offset={-20} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                </XAxis>
                <YAxis type="number" dataKey="wins" name="Wins" stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false}>
                  <Label value="Season Wins" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                </YAxis>
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={true} />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                <ReferenceLine y={scatterAvgs.wins} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Early Capital vs Late Value" className="stagger-2">
          <div className="chart-header">
            <div className="chart-description">
              Compares points above average in high-capital early rounds (1-5) vs late rounds (6+).
            </div>
            <div className="matrix-legend-wrapper">
              <div className="matrix-legend-grid">
                <div className="matrix-quadrant top-left">
                  💎 <strong style={{ color: '#fff', fontWeight: 500 }}>Late Steals</strong>
                </div>
                <div className="matrix-quadrant top-right">
                  🔥 <strong style={{ color: '#fff', fontWeight: 500 }}>Well Rounded</strong>
                </div>
                <div className="matrix-quadrant bottom-left">
                  📉 <strong style={{ color: '#fff', fontWeight: 500 }}>Below Avg</strong>
                </div>
                <div className="matrix-quadrant bottom-right">
                  ⭐ <strong style={{ color: '#fff', fontWeight: 500 }}>Early Value</strong>
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="earlyDiff" name="Early Rd Value" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={['auto', 'auto']}>
                  <Label value="Early Rounds (1-5) vs Expected Pts" position="insideBottom" offset={-20} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                </XAxis>
                <YAxis type="number" dataKey="lateDiff" name="Late Rd Value" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="Late Rounds (6+) vs Expected Pts" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                </YAxis>
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={true} />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Draft Injury Impact (Luck vs Skill)" className="stagger-2">
          <div className="chart-header">
            <div className="chart-description">
              Correlates Draft ROI (skill) against total drafted games lost to injury (luck).
            </div>
            <div className="matrix-legend-wrapper">
              <div className="matrix-legend-grid">
                <div className="matrix-quadrant top-left">
                  🚑 <strong style={{ color: '#fff', fontWeight: 500 }}>Poor Draft, Bad Luck</strong>
                </div>
                <div className="matrix-quadrant top-right">
                  💪 <strong style={{ color: '#fff', fontWeight: 500 }}>Great Draft, Bad Luck</strong>
                </div>
                <div className="matrix-quadrant bottom-left">
                  📉 <strong style={{ color: '#fff', fontWeight: 500 }}>Poor Draft, Healthy</strong>
                </div>
                <div className="matrix-quadrant bottom-right">
                  🍀 <strong style={{ color: '#fff', fontWeight: 500 }}>Great Draft, Healthy</strong>
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="roi" name="Draft ROI" stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" domain={['auto', 'auto']}>
                  <Label value="Draft ROI (% vs expected)" position="insideBottom" offset={-20} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                </XAxis>
                <YAxis type="number" dataKey="gamesMissed" name="Games Missed" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="Games Lost to Injury" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                </YAxis>
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} isAnimationActive={true} />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                <ReferenceLine y={scatterAvgs.gamesMissed} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3: Consolidated Keeper Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {keeperPointsData.length > 0 ? (
          <Card title="Keeper Points Generated" className="stagger-3">
            <div className="text-sm text-muted mb-4">Total starter points scored by kept players while on your roster.</div>
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={keeperPointsData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                  <RechartsTooltip content={<KeeperPointsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Legend
                    content={() => (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#10b981', display: 'inline-block' }} />
                          <span style={{ color: '#94a3b8' }}>Starter Pts</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(16, 185, 129, 0.3)', display: 'inline-block' }} />
                          <span style={{ color: '#94a3b8' }}>Bench Pts</span>
                        </span>
                      </div>
                    )}
                  />
                  <Bar dataKey="Starter Pts" stackId="a" fill="#10b981" />
                  <Bar dataKey="Bench Pts" stackId="a" fill="rgba(16, 185, 129, 0.3)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <Card title="Keeper Analysis" className="stagger-3">
            <div className="flex flex-col justify-center items-center h-full min-h-[300px]">
              <div className="text-muted text-lg">No keepers found for this season.</div>
              <div className="text-sm text-muted mt-2">Try selecting a different season in the sidebar.</div>
            </div>
          </Card>
        )}

        <Card title={allKeepers.length > 0 ? "Top Keepers (by Starter Points)" : "Keeper Leaderboard"} className="stagger-3">
          {allKeepers.length > 0 ? (
            <>
              <div className="text-sm text-muted mb-4">The most valuable keeper selections this season.</div>
              <div className="flex flex-col gap-3 overflow-y-auto pr-4 mt-2" style={{ height: '350px' }}>
                {allKeepers.slice(0, 20).map((pick, i) => (
                  <div key={`${pick.playerId}-${pick.rosterId}`} className="flex justify-between items-center p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <div className="flex items-center gap-4">
                      <div className="text-muted font-bold w-6 text-right">{i + 1}.</div>
                      <div>
                        <div className="font-semibold">{pick.playerName}</div>
                        <div className="text-sm text-muted">{pick.position} · {pick.nflTeam} · Rd {pick.round}, Pick {pick.pickNo} · <span style={{ color: 'var(--success-color)' }}>{pick.managerName}</span></div>
                      </div>
                    </div>
                    <div className="font-bold text-success-color text-lg">{pick.starterPoints.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col justify-center items-center h-full min-h-[300px]">
              <div className="text-muted text-lg">No keepers found for this season.</div>
            </div>
          )}
        </Card>
      </div>

      {/* Row 4: Top Draft Detail View */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card title="Top Draft Picks (by Starter Points)" className="stagger-3">
          <div className="text-sm text-muted mb-4">The most valuable draft selections this season.</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2" style={{ maxHeight: '500px' }}>
            {allDraftPicks.slice(0, 24).map((pick, i) => (
              <div key={`${pick.playerId}-${pick.rosterId}`} className="flex justify-between items-center p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <div className="flex items-center gap-4">
                  <div className="text-muted font-bold w-6 text-right text-sm">{i + 1}.</div>
                  <div>
                    <div className="font-bold text-white text-base leading-tight">{pick.playerName}</div>
                    <div className="text-xs text-muted mt-0.5">{pick.position} · Rd {pick.round}, Pick {pick.pickNo} · <span style={{ color: 'var(--accent-color)' }} className="font-medium">{pick.managerName}</span></div>
                  </div>
                </div>
                <div className="font-bold text-accent-color text-lg tabular-nums">{pick.starterPoints.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>



      {/* Row 5: Value Heatmap */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card title="Draft Value by Round" className="stagger-3">
          <div className="text-sm text-muted mb-6">Avg total points per pick in each round — color shows value vs. the round's per-pick average.</div>
          <HeatmapTable draftData={draftData} />
        </Card>
      </div>
    </div>
  );
};
