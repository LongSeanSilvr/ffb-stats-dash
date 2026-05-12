import React from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useDraftEfficiency } from '../hooks/useDraftEfficiency';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, Label
} from 'recharts';

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
      <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-3 mb-2">
          {data.avatar ? (
            <img src={`https://sleepercdn.com/avatars/thumbs/${data.avatar}`} alt="avatar" className="avatar" width={24} height={24} />
          ) : (
             <div className="avatar bg-gray-600" style={{ width: 24, height: 24 }}></div>
          )}
          <span className="font-bold text-lg">{data.name}</span>
        </div>
        {data.draftPoints !== undefined && <div className="text-sm text-muted">Draft Points: <span className="text-accent-color font-bold ml-1">{data.draftPoints.toFixed(1)}</span></div>}
        {data.keeperPoints !== undefined && <div className="text-sm text-muted">Keeper Points: <span className="text-success-color font-bold ml-1">{data.keeperPoints.toFixed(1)}</span></div>}
        {data.wins !== undefined && <div className="text-sm text-muted">Wins: <span className="text-white font-bold ml-1">{data.wins}</span></div>}
         {data.hitRate !== undefined && <div className="text-sm text-muted">Hit Rate: <span className="text-white font-bold ml-1">{data.hitRate}%</span></div>}
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

  // 4. Draft Value vs Pick Position scatter
  const draftValueScatter = [...draftData]
    .map(d => {
      const totalPicks = d.draftPicks.length;
      const totalHits = d.draftHits;
      return {
        name: d.user?.display_name || `Team ${d.roster_id}`,
        avatar: d.user?.avatar,
        draftPoints: d.draftStarterPoints,
        hitRate: totalPicks > 0 ? Number(((totalHits / totalPicks) * 100).toFixed(0)) : 0,
        wins: selectedSeason.rosters.find(r => r.roster_id === d.roster_id)?.settings.wins || 0
      };
    });



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

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mt-4 mb-10">Draft & Keeper Analytics ({selectedSeason.league.season})</h1>

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

      {/* Row 2: Keeper ROI & Draft Value vs Hit Rate Scatter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {keeperPointsData.length > 0 ? (
          <Card title="Keeper Points Generated" className="stagger-2">
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
          <Card title="Keeper Analysis" className="stagger-2">
            <div className="flex flex-col justify-center items-center h-full min-h-[300px]">
              <div className="text-muted text-lg">No keepers found for this season.</div>
              <div className="text-sm text-muted mt-2">Try selecting a different season in the sidebar.</div>
            </div>
          </Card>
        )}

        <Card title="Draft Value vs Hit Rate" className="stagger-2">
          <div className="text-sm text-muted mb-4">Do better drafters generate more total value?</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="hitRate" name="Hit Rate %" stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%">
                  <Label value="Draft Hit Rate (%)" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                </XAxis>
                <YAxis type="number" dataKey="draftPoints" name="Draft Points" stroke="#94a3b8" tick={{ fontSize: 12 }}>
                  <Label value="Draft Starter Points" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                </YAxis>
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter name="Teams" data={draftValueScatter} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3: Top Draft Picks & Top Keepers Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card title="Top Draft Picks (by Starter Points)" className="stagger-3">
          <div className="text-sm text-muted mb-4">The most valuable draft selections this season.</div>
          <div className="flex flex-col gap-3 overflow-y-auto pr-4 mt-2" style={{ height: '400px' }}>
            {allDraftPicks.slice(0, 20).map((pick, i) => (
              <div key={`${pick.playerId}-${pick.rosterId}`} className="flex justify-between items-center p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <div className="flex items-center gap-4">
                  <div className="text-muted font-bold w-6 text-right">{i + 1}.</div>
                  <div>
                    <div className="font-semibold">{pick.playerName}</div>
                    <div className="text-sm text-muted">{pick.position} · {pick.nflTeam} · Rd {pick.round}, Pick {pick.pickNo} · <span style={{ color: 'var(--accent-color)' }}>{pick.managerName}</span></div>
                  </div>
                </div>
                <div className="font-bold text-accent-color text-lg">{pick.starterPoints.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title={allKeepers.length > 0 ? "Top Keepers (by Starter Points)" : "Keeper Leaderboard"} className="stagger-3">
          {allKeepers.length > 0 ? (
            <>
              <div className="text-sm text-muted mb-4">The most valuable keeper selections this season.</div>
              <div className="flex flex-col gap-3 overflow-y-auto pr-4 mt-2" style={{ height: '400px' }}>
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

      {/* Row 4: Round-by-Round Value Heatmap (full width) */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card title="Draft Value by Round" className="stagger-3">
          <div className="text-sm text-muted mb-6">Avg total points per pick in each round — color shows value vs. the round's per-pick average.</div>
          <HeatmapTable draftData={draftData} />
        </Card>
      </div>
    </div>
  );
};
