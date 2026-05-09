import React from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useManagerAnalytics } from '../hooks/useManagerAnalytics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter
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

  // 4. Hit Rate comparison (Draft vs FAAB)
  const hitRateComparison = showAnalytics
    ? [...profiles].sort((a, b) => b.draftHitRate - a.draftHitRate).map(p => ({
        name: p.user?.display_name || `Team ${p.roster_id}`,
        'Draft Hit Rate': p.draftHitRate,
        'FAAB Hit Rate': p.faabHitRate,
      }))
    : [];

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
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="draftPts" name="Draft + Keeper Points" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis type="number" dataKey="faabPts" name="FAAB Points" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                    <Scatter name="Teams" data={matrixData} shape={<CustomAvatarDot />} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Manager Composite Score" className="stagger-2">
              <div className="text-sm text-muted mb-4">Weighted: Draft Value (40%) + FAAB Efficiency (30%) + Trade Savvy (15%) + Win Rate (15%)</div>
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

          {/* Row 3: Hit Rate Comparison (Draft vs FAAB) */}
          <div className="grid grid-cols-1 gap-8 mb-8">
            <Card title="Talent Evaluation: Draft Hit Rate vs FAAB Hit Rate" className="stagger-3">
              <div className="text-sm text-muted mb-4">Do good drafters also make good waiver wire picks, or are they different skills?</div>
              <div style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hitRateComparison} layout="vertical" margin={{ left: 40, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                    <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="Draft Hit Rate" fill="#3b82f6" />
                    <Bar dataKey="FAAB Hit Rate" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
