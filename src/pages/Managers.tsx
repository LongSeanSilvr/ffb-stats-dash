import React from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useManagerAnalytics } from '../hooks/useManagerAnalytics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, ReferenceLine, Label
} from 'recharts';

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

  const loading = ctxLoading || analyticsLoading;

  if (loading && !selectedSeason) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4">Building manager profiles across all data sources...</div>
      </div>
    );
  }

  if (error || !selectedSeason) return null;

  // Show standings table while analytics load
  const showAnalytics = profiles.length > 0 && !analyticsLoading;

  // --- Data transformations ---

  // 1. Roster Construction DNA (100% stacked bar)
  const dnaData = showAnalytics
    ? [...profiles].sort((a, b) => b.totalPointsFor - a.totalPointsFor).map(p => ({
        name: p.user?.display_name || `Team ${p.roster_id}`,
        Draft: p.draftPct,
        Keepers: p.keeperPct,
        FAAB: p.faabPct,
        Trades: p.tradePct,
        Other: p.otherPct,
      }))
    : [];

  // 2. Success Matrix scatter (Draft Value vs FAAB Value, bubble = wins)
  const matrixData = showAnalytics
    ? profiles.map(p => ({
        name: p.user?.display_name || `Team ${p.roster_id}`,
        avatar: p.user?.avatar,
        draftPts: p.draftPoints + p.keeperPoints,
        faabPts: p.faabPoints,
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

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mt-4 mb-10">League Managers ({selectedSeason.league.season})</h1>

      {/* Row 0: Standings Table */}
      <Card title="Team Standings" className="stagger-1 mb-8">
        <div className="overflow-hidden rounded-lg mt-6" style={{ border: '1px solid var(--card-border)' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr>
                <th className="p-4 text-muted text-sm text-uppercase">Team</th>
                <th className="p-4 text-muted text-sm text-uppercase">Record</th>
                <th className="p-4 text-muted text-sm text-uppercase">PF</th>
                <th className="p-4 text-muted text-sm text-uppercase">PA</th>
                {showAnalytics && <th className="p-4 text-muted text-sm text-uppercase">Score</th>}
              </tr>
            </thead>
            <tbody>
              {[...selectedSeason.rosters].sort((a,b) => b.settings.wins - a.settings.wins || b.settings.fpts - a.settings.fpts).map((r, i) => {
                const profile = profiles.find(p => p.roster_id === r.roster_id);
                return (
                  <tr key={r.roster_id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td className="p-4 font-semibold flex items-center gap-3">
                      <span className="text-muted text-sm w-4">{i + 1}.</span>
                      {selectedSeason.rosterToUser[r.roster_id]?.display_name || `Team ${r.roster_id}`}
                    </td>
                    <td className="p-4 text-lg">{r.settings.wins}-{r.settings.losses}{r.settings.ties > 0 ? `-${r.settings.ties}` : ''}</td>
                    <td className="p-4 font-mono text-accent-color">{(r.settings.fpts + (r.settings.fpts_decimal/100)).toFixed(2)}</td>
                    <td className="p-4 font-mono text-muted">{(r.settings.fpts_against + (r.settings.fpts_against_decimal/100)).toFixed(2)}</td>
                    {showAnalytics && (
                      <td className="p-4 font-mono font-bold" style={{ color: 'var(--accent-color)' }}>
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
          {/* Row 1: The Success Matrix & Composite Score */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <Card title="The Success Matrix" className="stagger-2">
              <div className="text-sm text-muted mb-4">Draft+Keeper value vs FAAB value. Bubble size = total wins.</div>
              <div style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="draftPts" name="Draft + Keeper Points" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={matrixDraftDomain} allowDecimals={false}>
                      <Label value="Draft + Keeper Points" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                    </XAxis>
                    <YAxis type="number" dataKey="faabPts" name="FAAB Points" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={matrixFaabDomain} allowDecimals={false} width={70}>
                      <Label value="FAAB Points" angle={-90} position="insideLeft" offset={5} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                    </YAxis>
                    <ReferenceLine x={avgDraftPts} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
                    <ReferenceLine y={avgFaabPts} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
                    <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                    <Scatter name="Teams" data={matrixData} shape={<CustomAvatarDot />} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Manager Composite Score" className="stagger-2">
              <div className="text-sm text-muted mb-4">Weighted: Drafting (60%) + FAAB (20%) + Trading (10%) + Free Agency (10%) based on standardized league ranks.</div>
              <div style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compositeData} layout="vertical" margin={{ left: 40, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                    <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Bar dataKey="Score" fill="var(--accent-color)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Row 2: Roster Construction DNA (full width) */}
          <div className="grid grid-cols-1 gap-8 mb-8">
            <Card title="Roster Construction DNA" className="stagger-3">
              <div className="text-sm text-muted mb-4">What percentage of each manager's total points came from Draft, Keepers, FAAB, and Trades?</div>
              <div style={{ height: 420 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dnaData} layout="vertical" margin={{ left: 40, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                    <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Legend
                      content={() => (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                          {[['Draft', '#3b82f6'], ['Keepers', '#8b5cf6'], ['FAAB', '#10b981'], ['Trades', '#f97316'], ['Other', '#475569']].map(([label, color]) => (
                            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ width: 12, height: 12, borderRadius: 2, background: color, display: 'inline-block' }} />
                              <span style={{ color: '#94a3b8' }}>{label}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    />
                    <Bar dataKey="Draft" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Keepers" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="FAAB" stackId="a" fill="#10b981" />
                    <Bar dataKey="Trades" stackId="a" fill="#f97316" />
                    <Bar dataKey="Other" stackId="a" fill="#475569" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Row 3: Hit Rate Comparison Matrix (Draft vs FAAB) */}
          <div className="grid grid-cols-1 gap-8 mb-8">
            <Card title="The Talent Evaluation Matrix" className="stagger-3">
              <div className="text-sm text-muted mb-4 flex justify-between items-end">
                <span>Draft Hit Rate vs FAAB Hit Rate. Dashed lines indicate league averages. Avatar size tracks total wins.</span>
                <div className="flex gap-6 text-xs">
                  <span className="text-accent-color opacity-80">← Draft Strength →</span>
                  <span className="text-success-color opacity-80">↑ FAAB Strength ↓</span>
                </div>
              </div>
              <div style={{ height: 450 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="draftHitRate" name="Draft Hit Rate" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={draftDomain} unit="%" allowDecimals={false}>
                      <Label value="Draft Hit Rate (%)" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.75rem', fontWeight: 500 }} />
                    </XAxis>
                    <YAxis type="number" dataKey="faabHitRate" name="FAAB Hit Rate" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={faabDomain} unit="%" allowDecimals={false} width={70}>
                      <Label value="FAAB Hit Rate (%)" angle={-90} position="insideLeft" offset={5} style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
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
        </>
      )}
    </div>
  );
};
