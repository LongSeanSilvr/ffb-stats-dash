import React from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useDraftEfficiency } from '../hooks/useDraftEfficiency';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter
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
    }));

  // 3. Draft Hit Rate (stacked bar)
  const draftHitRateData = [...draftData]
    .sort((a, b) => {
      const rateA = (a.draftHits + a.draftBusts) > 0 ? a.draftHits / (a.draftHits + a.draftBusts) : 0;
      const rateB = (b.draftHits + b.draftBusts) > 0 ? b.draftHits / (b.draftHits + b.draftBusts) : 0;
      return rateB - rateA;
    })
    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      Hits: d.draftHits,
      Busts: d.draftBusts
    }));

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

  // 5. Round-by-Round value heatmap data
  const maxRounds = Math.max(...draftData.flatMap(d => Object.keys(d.roundValue).map(Number)));
  const roundValueData = [];
  for (let round = 1; round <= maxRounds; round++) {
    const entry: any = { round: `Rd ${round}` };
    draftData.forEach(d => {
      const name = d.user?.display_name || `Team ${d.roster_id}`;
      entry[name] = Number((d.roundValue[round] || 0).toFixed(1));
    });
    roundValueData.push(entry);
  }

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
      <div className="grid grid-cols-2 gap-8 mb-8">
        <Card title="Draft Points Generated" className="stagger-1">
          <div className="text-sm text-muted mb-4">Total starter points scored by drafted players while on your roster.</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={draftPointsData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="Starter Pts" stackId="a" fill="var(--accent-color)" />
                <Bar dataKey="Bench Pts" stackId="a" fill="rgba(59, 130, 246, 0.3)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Draft Hit Rate" className="stagger-1">
          <div className="text-sm text-muted mb-4">"Hits" = Started ≥1 game. "Busts" = Never started a single game.</div>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={draftHitRateData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="Hits" stackId="a" fill="var(--success-color)" />
                <Bar dataKey="Busts" stackId="a" fill="var(--danger-color)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 2: Keeper ROI & Draft Value vs Hit Rate Scatter */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {keeperPointsData.length > 0 ? (
          <Card title="Keeper Points Generated" className="stagger-2">
            <div className="text-sm text-muted mb-4">Total starter points scored by kept players while on your roster.</div>
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={keeperPointsData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                  <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Legend />
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
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="hitRate" name="Hit Rate %" stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" />
                <YAxis type="number" dataKey="draftPoints" name="Draft Points" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter name="Teams" data={draftValueScatter} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3: Top Draft Picks & Top Keepers Leaderboard */}
      <div className="grid grid-cols-2 gap-8 mb-8">
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

      {/* Row 4: Round-by-Round Value (full width) */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card title="Draft Value by Round" className="stagger-3">
          <div className="text-sm text-muted mb-4">Total starter points generated by each manager's picks per draft round.</div>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roundValueData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="round" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend />
                {draftData.map((d, i) => {
                  const name = d.user?.display_name || `Team ${d.roster_id}`;
                  const colors = ['#ef4444', '#f97316', '#fde047', '#4ade80', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#a3e635', '#4338ca', '#fda4af', '#b45309', '#94a3b8'];
                  return <Bar key={d.roster_id} dataKey={name} fill={colors[i % colors.length]} />;
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
