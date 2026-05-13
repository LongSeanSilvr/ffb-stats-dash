import React from 'react';
import { useLeagueContext } from '../context/LeagueContext';
import { usePlayoffAnalytics } from '../hooks/usePlayoffAnalytics';
import { Card } from '../components/Card';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip as RechartsTooltip, ReferenceLine, ComposedChart, BarChart, Bar } from 'recharts';
import { Trophy, TrendingDown, TrendingUp, AlertCircle, ArrowRightLeft, UserPlus, Shield, User } from 'lucide-react';

const CustomBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-4 mb-2">
          {data.managerAvatar ? (
            <img src={`https://sleepercdn.com/avatars/thumbs/${data.managerAvatar}`} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%' }} />
          ) : (
            <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#475569' }}></div>
          )}
          <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#fff' }}>{data.playerName || data.managerName}</span>
        </div>
        {data.managerName && data.playerName && <div className="text-sm text-muted mb-2">Manager: <span style={{ color: '#fff', fontWeight: 'bold', marginLeft: '0.25rem' }}>{data.managerName}</span></div>}
        <div className="text-sm text-muted">Total Points: <span style={{ color: '#fff', fontWeight: 'bold', marginLeft: '0.25rem' }}>{payload[0].value.toFixed(1)}</span></div>
        {data.acquisitionType && <div className="text-sm text-muted mt-2">Acquired: <span style={{ color: '#fff', fontWeight: 'bold', marginLeft: '0.25rem' }}>{data.acquisitionType}</span></div>}
      </div>
    );
  }
  return null;
};

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload || cx === undefined || cy === undefined) return null;

  return (
    <g transform={`translate(${cx},${cy})`} style={{ cursor: 'pointer' }}>
      {payload.managerAvatar ? (
        <image
          href={`https://sleepercdn.com/avatars/thumbs/${payload.managerAvatar}`}
          x={-16}
          y={-16}
          height={32}
          width={32}
          style={{ clipPath: 'circle(16px at center)' }}
        />
      ) : (
        <circle cx={0} cy={0} r={16} fill="#475569" />
      )}
      <circle cx={0} cy={0} r={16} fill="none" stroke={payload.diff >= 0 ? "var(--success-color)" : "var(--danger-color)"} strokeWidth={2} />
    </g>
  );
};

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-4 mb-2">
          {data.managerAvatar ? (
            <img src={`https://sleepercdn.com/avatars/thumbs/${data.managerAvatar}`} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%' }} />
          ) : (
            <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#475569' }}></div>
          )}
          <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#fff' }}>{data.managerName}</span>
        </div>
        <div className="text-sm text-muted">Regular Season: <span style={{ color: '#fff', fontWeight: 'bold', marginLeft: '0.25rem' }}>{data.regAvg} pts/game</span></div>
        <div className="text-sm text-muted mt-1">Playoffs: <span style={{ color: '#fff', fontWeight: 'bold', marginLeft: '0.25rem' }}>{data.playAvg} pts/game</span></div>
        <div className="text-sm text-muted mt-2 pt-2 border-t border-white/10" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>Net Difference: <span style={{ color: data.diff >= 0 ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 'bold', marginLeft: '0.25rem' }}>{data.diff >= 0 ? '+' : ''}{data.diff} pts</span></div>
      </div>
    );
  }
  return null;
};

export const Playoffs = () => {
  const { selectedSeason } = useLeagueContext();
  const season = selectedSeason?.league?.season;
  const league = selectedSeason?.league;
  const leagueId = league?.league_id;
  const { mvps, benchBlues, matchupsFlipped, playerSplits, teamPerformances, loserBracketTeams, champion, loading, error } = usePlayoffAnalytics(leagueId, league);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: '16rem', gap: '1rem' }}>
        <div style={{ width: '2rem', height: '2rem', border: '4px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        <div className="text-muted text-sm" style={{ fontWeight: 500, letterSpacing: '0.025em', textTransform: 'uppercase' }}>Synthesizing Playoff Narratives...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-danger-light" style={{ height: '16rem', gap: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(239,68,68,0.2)', padding: '2rem' }}>
        <AlertCircle size={32} style={{ color: 'var(--danger-color)' }} />
        <div style={{ color: 'var(--danger-color)', fontWeight: 500 }}>{error}</div>
      </div>
    );
  }

  const getAcqIcon = (type: string) => {
    switch(type) {
      case 'Trade': return <ArrowRightLeft size={14} style={{ color: 'var(--accent-color)' }} />;
      case 'Free Agency': return <UserPlus size={14} style={{ color: '#f59e0b' }} />;
      default: return <Shield size={14} style={{ color: 'var(--success-color)' }} />;
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '80rem', margin: '0 auto', paddingBottom: '3rem' }}>
      <header className="mb-8">
        <h1 className="text-3xl text-gradient" style={{ fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '0.75rem' }}>The Playoff Run ({season})</h1>
        <p className="text-muted text-lg" style={{ maxWidth: '48rem', lineHeight: 1.625 }}>
          The regular season is about proficiency. The playoffs are about peaking at exactly the right time. 
          Here is the story of how the championship was truly won.
        </p>
        
        {champion && (
          <div className="mt-8 flex items-center gap-6" style={{ padding: '1.5rem', borderRadius: '0.75rem', background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <Trophy size={48} style={{ color: '#eab308' }} strokeWidth={1} />
            <div className="flex items-center gap-4">
              {champion.avatar ? (
                <img src={`https://sleepercdn.com/avatars/thumbs/${champion.avatar}`} style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid rgba(234, 179, 8, 0.5)', objectFit: 'cover' }} />
              ) : (
                <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', border: '2px solid rgba(234, 179, 8, 0.5)' }}><User size={24} style={{ color: 'rgba(234, 179, 8, 0.5)' }}/></div>
              )}
              <div>
                <div style={{ color: 'rgba(234, 179, 8, 0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>League Champion</div>
                <div className="text-3xl" style={{ fontWeight: 900, color: '#fff' }}>{champion.name}</div>
              </div>
            </div>
          </div>
        )}
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* MVPS SECTION */}
        <Card title="Playoff MVPs (Weeks 15-17)" className="stagger-1">
          <div className="chart-header">
            <div className="chart-description">
              The players who scored the most total points on active starting rosters during the fantasy playoffs. 
              Color-coded to highlight whether they were foundational draft picks or crucial mid-season acquisitions.
            </div>
            <div className="chart-legend-grid">
              <div className="legend-item">
                <div className="legend-item-header"><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--success-color)', display: 'inline-block' }} /> Drafted</div>
                <div className="legend-item-desc">Selected in the draft</div>
              </div>
              <div className="legend-item">
                <div className="legend-item-header"><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--accent-color)', display: 'inline-block' }} /> Trade</div>
                <div className="legend-item-desc">Acquired via trade</div>
              </div>
              <div className="legend-item">
                <div className="legend-item-header"><span style={{ width: 12, height: 12, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} /> Free Agency</div>
                <div className="legend-item-desc">Acquired via FAAB/Waivers</div>
              </div>
            </div>
          </div>
          <div style={{ height: 450, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mvps.slice(0, 15)} layout="vertical" margin={{ left: 130, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="playerName" stroke="var(--text-secondary)" tick={{ fontSize: 12, fill: 'var(--text-primary)', fontWeight: 500 }} width={120} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="totalPoints" radius={[0, 4, 4, 0]} maxBarSize={24} animationDuration={1000}>
                  {mvps.slice(0, 15).map((entry, index) => {
                    let color = 'var(--success-color)';
                    if (entry.acquisitionType === 'Trade') color = 'var(--accent-color)';
                    if (entry.acquisitionType === 'Free Agency') color = '#f59e0b';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* TEAM AVERAGES SCATTER PLOT */}
        {(() => {
          const allPoints = teamPerformances ? teamPerformances.flatMap((t: any) => [t.regAvg, t.playAvg]) : [];
          const minAvg = allPoints.length > 0 ? Math.floor(Math.min(...allPoints) - 5) : 0;
          const maxAvg = allPoints.length > 0 ? Math.ceil(Math.max(...allPoints) + 5) : 200;
          
          return (
            <Card title="Regular Season vs Playoff Performance" className="stagger-1">
              <div className="chart-header">
                <div className="chart-description">
                  Did your team show up when it mattered most? This compares every team's regular season average to their playoff average. Teams <strong>above the diagonal line</strong> overperformed their expectations in the playoffs. Teams <strong>below the line</strong> choked.
                </div>
                <div className="chart-legend-grid">
                  <div className="legend-item">
                    <div className="legend-item-header"><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--success-color)', display: 'inline-block' }} /> Overperformed</div>
                    <div className="legend-item-desc">Playoff Average &gt; Regular Season Average</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-item-header"><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--danger-color)', display: 'inline-block' }} /> Underperformed</div>
                    <div className="legend-item-desc">Playoff Average &lt; Regular Season Average</div>
                  </div>
                </div>
              </div>
              <div style={{ height: 500, width: '100%', marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      type="number" 
                      dataKey="regAvg" 
                      name="Regular Season Avg" 
                      stroke="var(--text-secondary)" 
                      tick={{ fontSize: 12 }} 
                      domain={[minAvg, maxAvg]}
                      label={{ value: "Regular Season Avg", position: "insideBottom", offset: -10, fill: "var(--text-secondary)" }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="playAvg" 
                      name="Playoff Avg" 
                      stroke="var(--text-secondary)" 
                      tick={{ fontSize: 12 }} 
                      domain={[minAvg, maxAvg]}
                      label={{ value: "Playoff Avg", angle: -90, position: "insideLeft", fill: "var(--text-secondary)" }}
                    />
                    <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }} />
                    
                    {/* Diagonal Expectation Line */}
                    <Scatter 
                      data={[{ regAvg: minAvg, playAvg: minAvg }, { regAvg: maxAvg, playAvg: maxAvg }]} 
                      line={{ stroke: "rgba(255,255,255,0.2)", strokeDasharray: "5 5", strokeWidth: 2 }} 
                      shape={() => null} 
                      isAnimationActive={false}
                    />

                    <Scatter data={teamPerformances} shape={<CustomAvatarDot />} animationDuration={1500} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          );
        })()}

        <div className="grid lg:grid-cols-2 gap-8">
           {/* MATCHUPS FLIPPED */}
           <Card title="High Stakes Matchups Flipped" className="stagger-2 flex flex-col">
              <div className="chart-header" style={{ marginBottom: 0 }}>
                 <div className="chart-description">
                    Did a mid-season acquisition literally win a playoff game? These trades and FAAB pickups scored exactly enough points to flip the outcome of a playoff matchup from a loss to a win.
                 </div>
              </div>
              {matchupsFlipped.length === 0 ? (
                 <div className="flex flex-col items-center justify-center mt-6" style={{ flexGrow: 1, padding: '2rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <Shield size={32} style={{ color: 'rgba(148, 163, 184, 0.5)', marginBottom: '0.75rem' }} />
                    <div className="text-muted" style={{ fontStyle: 'italic', textAlign: 'center' }}>No playoff matchups were flipped by mid-season acquisitions this year.</div>
                 </div>
              ) : (
                 <div className="mt-6" style={{ overflow: 'hidden', borderRadius: '0.5rem', border: '1px solid var(--card-border)' }}>
                    <table className="standings-table">
                       <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <tr>
                             <th>Manager</th>
                             <th>Player</th>
                             <th className="text-right">Margin</th>
                          </tr>
                       </thead>
                       <tbody>
                          {matchupsFlipped.map((m, i) => (
                             <tr key={i} className="standings-row" style={{ transition: 'background-color 0.2s' }}>
                                <td>
                                  <div className="flex items-center gap-4">
                                    {m.managerAvatar ? (
                                      <img src={`https://sleepercdn.com/avatars/thumbs/${m.managerAvatar}`} style={{ width: 32, height: 32, borderRadius: '50%' }} alt="" />
                                    ) : (
                                      <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }}><User size={14} className="text-muted"/></div>
                                    )}
                                    <div>
                                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{m.managerName}</div>
                                      <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>Week {m.week}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div className="flex items-center gap-4">
                                    {m.playerAvatar && (
                                      <img src={m.playerAvatar} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', backgroundColor: 'rgba(255,255,255,0.05)' }} alt="" />
                                    )}
                                    <div>
                                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{m.playerName}</div>
                                      <div className="text-muted flex items-center gap-2" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
                                        {getAcqIcon(m.acquisitionType)} {m.acquisitionType}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-right">
                                  <div className="text-success-color" style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.125rem' }}>+{m.margin.toFixed(1)}</div>
                                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Scored {m.pointsScored.toFixed(1)}</div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}
           </Card>

           {/* LEAGUE WINNERS & CHOKERS */}
           <Card title="League Winners & Playoff Chokers" className="stagger-2 flex flex-col">
              <div className="chart-header" style={{ marginBottom: 0 }}>
                 <div className="chart-description">
                    <span className="text-success-color" style={{ fontWeight: 'bold' }}>League Winners</span> peaked at the perfect time. 
                    <span className="text-danger-color" style={{ fontWeight: 'bold', marginLeft: '0.25rem' }}>Playoff Chokers</span> were regular season studs who completely vanished when the playoffs started.
                 </div>
              </div>
              {playerSplits.length === 0 ? (
                 <div className="flex flex-col items-center justify-center mt-6" style={{ flexGrow: 1, padding: '2rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <TrendingUp size={32} style={{ color: 'rgba(148, 163, 184, 0.5)', marginBottom: '0.75rem' }} />
                    <div className="text-muted" style={{ fontStyle: 'italic', textAlign: 'center' }}>No significant playoff outliers detected.</div>
                 </div>
              ) : (
                 <div className="mt-6" style={{ overflow: 'hidden', borderRadius: '0.5rem', border: '1px solid var(--card-border)' }}>
                    <table className="standings-table">
                       <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <tr>
                             <th>Player</th>
                             <th className="text-right">Reg Avg</th>
                             <th className="text-right">Playoff Avg</th>
                             <th className="text-right">Delta</th>
                          </tr>
                       </thead>
                       <tbody>
                          {playerSplits.map((p, i) => (
                             <tr key={i} className="standings-row" style={{ transition: 'background-color 0.2s' }}>
                                <td>
                                  <div className="flex items-center gap-4">
                                    {p.playerAvatar && (
                                      <img src={p.playerAvatar} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', backgroundColor: 'rgba(255,255,255,0.05)' }} alt="" />
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        {p.isLeagueWinner ? <TrendingUp size={14} className="text-success-color" /> : <TrendingDown size={14} className="text-danger-color" />}
                                        <span style={{ fontWeight: 'bold', color: '#fff' }}>{p.playerName}</span>
                                      </div>
                                      <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>Team: {p.managerName}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-right text-muted" style={{ fontFamily: 'monospace' }}>{p.regularAvg.toFixed(1)}</td>
                                <td className="text-right" style={{ fontFamily: 'monospace', color: '#fff', fontWeight: 500 }}>{p.playoffAvg.toFixed(1)}</td>
                                <td className="text-right" style={{ fontFamily: 'monospace' }}>
                                  <span className={p.diff > 0 ? 'bg-success-light text-success-color' : 'bg-danger-light text-danger-color'} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    {p.diff > 0 ? '+' : ''}{p.diff.toFixed(1)}
                                  </span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}
           </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
           {/* BENCHWARMER BLUES */}
           <Card title="The Benchwarmer Blues" className="stagger-3 flex flex-col">
              <div className="chart-header" style={{ marginBottom: 0 }}>
                 <div className="chart-description">
                 Managers who were eliminated from the playoffs because they started the wrong players. These are matchups where the manager LOST, but their optimal lineup would have WON.
                 </div>
              </div>
              {benchBlues.length === 0 ? (
                 <div className="flex flex-col items-center justify-center mt-6" style={{ flexGrow: 1, padding: '2rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <Trophy size={32} style={{ color: 'rgba(148, 163, 184, 0.5)', marginBottom: '0.75rem' }} />
                    <div className="text-muted" style={{ fontStyle: 'italic', textAlign: 'center' }}>Perfect managing! No playoff matchups were lost due to bench points.</div>
                 </div>
              ) : (
                 <div className="mt-6" style={{ overflow: 'hidden', borderRadius: '0.5rem', border: '1px solid var(--card-border)' }}>
                    <table className="standings-table">
                       <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <tr>
                             <th>Manager</th>
                             <th>Matchup Result</th>
                             <th className="text-right">Left on Bench</th>
                          </tr>
                       </thead>
                       <tbody>
                          {benchBlues.map((b, i) => (
                             <tr key={i} className="standings-row" style={{ transition: 'background-color 0.2s' }}>
                                <td>
                                  <div className="flex items-center gap-4">
                                    {b.managerAvatar ? (
                                      <img src={`https://sleepercdn.com/avatars/thumbs/${b.managerAvatar}`} style={{ width: 32, height: 32, borderRadius: '50%' }} alt="" />
                                    ) : (
                                      <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }}><User size={14} className="text-muted"/></div>
                                    )}
                                    <div>
                                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{b.managerName}</div>
                                      <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>Week {b.week}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontSize: '0.875rem' }}>
                                    <div className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
                                      <span className="text-danger-color" style={{ fontWeight: 600 }}>Lost</span>
                                      <span style={{ fontFamily: 'monospace' }}>{b.actualScore.toFixed(1)}</span>
                                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>to</span>
                                      <div className="flex items-center" style={{ gap: '0.375rem', background: 'rgba(255,255,255,0.05)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
                                        {b.opponentAvatar ? (
                                          <img src={`https://sleepercdn.com/avatars/thumbs/${b.opponentAvatar}`} style={{ width: 14, height: 14, borderRadius: '50%' }} alt="" />
                                        ) : (
                                          <div className="flex items-center justify-center" style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)' }}><User size={8} className="text-muted"/></div>
                                        )}
                                        <span style={{ fontWeight: 500, fontSize: '0.75rem', color: '#fff' }}>{b.opponentName}</span>
                                      </div>
                                      <span style={{ fontFamily: 'monospace' }}>{b.opponentScore.toFixed(1)}</span>
                                    </div>
                                    <div className="flex items-center gap-2" style={{ marginTop: '0.375rem', paddingTop: '0.375rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                                      <span className="text-success-color" style={{ fontWeight: 600 }}>Would have won</span>
                                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{b.optimalScore.toFixed(1)}</span>
                                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>to</span>
                                      <span style={{ fontFamily: 'monospace' }}>{b.opponentScore.toFixed(1)}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-right">
                                   <span className="bg-warning-light text-warning-color" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                     +{b.pointsLeftOnBench.toFixed(1)} pts
                                   </span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}
           </Card>

           {/* THE RACE FOR #1 PICK */}
           <Card title="The Race for the #1 Pick" className="stagger-3">
              <div className="chart-header">
                 <div className="chart-description">
                    Since the Consolation Bracket determines the #1 overall pick next year, engagement stays high. Here are the total points scored by teams fighting in the Losers Bracket.
                 </div>
              </div>
              <div style={{ height: 350, width: '100%', marginTop: '1rem' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={loserBracketTeams} margin={{ left: -10, right: 10, top: 20, bottom: 40 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                       <XAxis 
                         dataKey="managerName" 
                         stroke="var(--text-secondary)" 
                         tick={{ fontSize: 11, fill: 'var(--text-primary)' }} 
                         axisLine={false} 
                         tickLine={false}
                         angle={-45}
                         textAnchor="end"
                         interval={0}
                       />
                       <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                       <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                       <Bar dataKey="totalPoints" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={1000}>
                          {loserBracketTeams.map((entry, index) => (
                             <Cell 
                               key={`cell-${index}`} 
                               fill={entry.isToiletBowlChamp ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'} 
                             />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-2" style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                 <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--accent-color)' }}></div>
                 <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500 }}>Secured the 1.01 Draft Pick</span>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default Playoffs;
