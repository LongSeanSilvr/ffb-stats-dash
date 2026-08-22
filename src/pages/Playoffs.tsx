import React, { useState } from 'react';
import { useLeagueContext } from '../context/LeagueContext';
import { usePlayoffAnalytics } from '../hooks/usePlayoffAnalytics';
import { Card } from '../components/Card';
import { MobileTapHint } from '../components/MobileTapHint';
import { FlippedMatchupModal } from '../components/FlippedMatchupModal';
import { BenchwarmerModal } from '../components/BenchwarmerModal';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
} from 'recharts';
import {
  Trophy,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  ArrowRightLeft,
  UserPlus,
  Shield,
  Crown,
  ArrowRight,
} from 'lucide-react';
import type { MatchupFlipped } from '../types/playoffs';
import type { BenchwarmerBlue } from '../hooks/usePlayoffAnalytics';

const CustomBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: 'rgba(15,17,21,0.95)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          {data.managerAvatar ? (
            <img
              src={`https://sleepercdn.com/avatars/thumbs/${data.managerAvatar}`}
              alt="avatar"
              className="w-7 h-7 rounded-full object-cover border border-white/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60">
              N/A
            </div>
          )}
          <div>
            <span className="font-bold text-base text-white">
              {data.playerName}
            </span>
            <div className="text-xs text-muted">Manager: {data.managerName}</div>
          </div>
        </div>
        <div className="text-sm text-muted">
          Playoff Total:{' '}
          <span className="text-white font-bold font-mono ml-1">
            {payload[0].value.toFixed(1)} pts
          </span>
        </div>
        {data.acquisitionType && (
          <div className="text-xs text-muted mt-1.5 flex items-center gap-1.5">
            <span>Acquired:</span>
            <span className="font-bold text-accent-color">{data.acquisitionType}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload || cx === undefined || cy === undefined) return null;

  const isOverperformed = payload.diff >= 0;
  const strokeColor = isOverperformed ? 'var(--success-color)' : 'var(--danger-color)';

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
      <circle
        cx={0}
        cy={0}
        r={16}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2.5}
      />
    </g>
  );
};

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isOverperformed = data.diff >= 0;

    return (
      <div
        style={{
          background: 'rgba(15,17,21,0.95)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center gap-3 mb-2.5">
          {data.managerAvatar ? (
            <img
              src={`https://sleepercdn.com/avatars/thumbs/${data.managerAvatar}`}
              alt="avatar"
              className="w-7 h-7 rounded-full object-cover border border-white/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60">
              N/A
            </div>
          )}
          <span className="font-bold text-base text-white">{data.managerName}</span>
        </div>
        <div className="text-xs text-muted flex justify-between gap-4">
          <span>Regular Season:</span>
          <span className="text-white font-mono font-bold">{data.regAvg} PPG</span>
        </div>
        <div className="text-xs text-muted flex justify-between gap-4 mt-1">
          <span>Playoffs:</span>
          <span className="text-white font-mono font-bold">{data.playAvg} PPG</span>
        </div>
        <div className="text-xs text-muted mt-2 pt-2 border-t border-white/10 flex justify-between gap-4">
          <span>Scoring Shift:</span>
          <span
            className="font-bold font-mono"
            style={{ color: isOverperformed ? 'var(--success-color)' : 'var(--danger-color)' }}
          >
            {isOverperformed ? '+' : ''}{data.diff} PPG
          </span>
        </div>
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
  const {
    mvps,
    benchBlues,
    matchupsFlipped,
    playerSplits,
    teamPerformances,
    champion,
    loading,
    error,
  } = usePlayoffAnalytics(leagueId || '', league);

  const [selectedMatchup, setSelectedMatchup] = useState<MatchupFlipped | null>(null);
  const [selectedBenchwarmer, setSelectedBenchwarmer] = useState<BenchwarmerBlue | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="loading-spinner"></div>
        <div className="text-muted text-sm font-medium">
          Loading playoff stats and game logs...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <AlertCircle size={32} className="mx-auto mb-2 text-danger-color" />
        <p>{error}</p>
      </div>
    );
  }

  const getAcqIcon = (type: string) => {
    switch (type) {
      case 'Trade':
        return <ArrowRightLeft size={13} className="text-accent-color" />;
      case 'Free Agency':
      case 'Waiver':
        return <UserPlus size={13} className="text-amber-400" />;
      default:
        return <Shield size={13} className="text-success-color" />;
    }
  };

  const winners = playerSplits.filter(p => p.isLeagueWinner).sort((a, b) => b.diff - a.diff);
  const chokers = playerSplits.filter(p => p.isChoker).sort((a, b) => a.diff - b.diff);

  return (
    <div className="animate-fade-in pb-16">
      {/* Header */}
      <h1 className="text-3xl text-gradient mt-4 mb-1">
        The Playoff Run ({season})
      </h1>
      <p className="text-muted mb-8">
        Postseason scoring trends, clutch performers, decisive lineup choices, and championship game logs.
      </p>

      {/* Champion Spotlight Banner */}
      {champion && (
        <div
          className="glass-card flex items-center justify-between gap-6 mb-10 p-6 md:p-8"
          style={{
            background: 'linear-gradient(145deg, rgba(251, 191, 36, 0.08) 0%, rgba(15, 17, 21, 0.9) 100%)',
            borderColor: 'rgba(251, 191, 36, 0.3)',
            boxShadow: '0 8px 32px rgba(251, 191, 36, 0.08)',
          }}
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center shrink-0">
              <Trophy size={32} className="text-yellow-400" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-widest text-yellow-400 mb-1 flex items-center gap-1.5">
                <Crown size={14} className="text-yellow-400" />
                <span>{season} League Champion</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-none">
                {champion.name}
              </h2>
            </div>
          </div>

          <div className="relative shrink-0">
            {champion.avatar ? (
              <img
                src={`https://sleepercdn.com/avatars/thumbs/${champion.avatar}`}
                alt={champion.name}
                className="w-16 h-16 rounded-full object-cover shadow-xl border-2 border-yellow-400"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-700 border-2 border-yellow-400 flex items-center justify-center text-sm text-white/70">
                N/A
              </div>
            )}
            <Crown
              size={18}
              className="text-yellow-400 absolute -top-2.5 -right-1 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            />
          </div>
        </div>
      )}

      <div className="space-y-12">
        {/* TEAM AVERAGES SCATTER PLOT */}
        {(() => {
          const allPoints = teamPerformances
            ? teamPerformances.flatMap((t: any) => [t.regAvg, t.playAvg])
            : [];
          const minAvg = allPoints.length > 0 ? Math.floor(Math.min(...allPoints) - 5) : 0;
          const maxAvg = allPoints.length > 0 ? Math.ceil(Math.max(...allPoints) + 5) : 200;

          return (
            <Card title="Regular Season vs Playoff Performance" className="stagger-1">
              <div className="chart-header">
                <div className="chart-description">
                  Team scoring in the regular season versus the playoffs. Teams <strong>above the diagonal line</strong> scored more points per game in the playoffs than during the regular season; teams <strong>below the line</strong> scored fewer.
                </div>
                <div className="chart-legend-grid">
                  <div className="legend-item">
                    <div className="legend-item-header">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          background: 'var(--success-color)',
                          display: 'inline-block',
                        }}
                      />{' '}
                      Overperformed
                    </div>
                    <div className="legend-item-desc">Playoff PPG &gt; Regular Season PPG</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-item-header">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          background: 'var(--danger-color)',
                          display: 'inline-block',
                        }}
                      />{' '}
                      Underperformed
                    </div>
                    <div className="legend-item-desc">Playoff PPG &lt; Regular Season PPG</div>
                  </div>
                </div>
              </div>
              <MobileTapHint />
              <div style={{ height: 460, width: '100%', marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 25, bottom: 25, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      type="number"
                      dataKey="regAvg"
                      name="Regular Season Avg"
                      stroke="var(--text-secondary)"
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                      domain={[minAvg, maxAvg]}
                      label={{
                        value: 'Regular Season PPG',
                        position: 'insideBottom',
                        offset: -12,
                        fill: 'var(--text-secondary)',
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="playAvg"
                      name="Playoff Avg"
                      stroke="var(--text-secondary)"
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                      domain={[minAvg, maxAvg]}
                      label={{
                        value: 'Playoff PPG',
                        angle: -90,
                        position: 'insideLeft',
                        fill: 'var(--text-secondary)',
                        fontSize: 12,
                      }}
                    />
                    <RechartsTooltip
                      content={<CustomScatterTooltip />}
                      cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }}
                    />

                    {/* Diagonal Expectation Line */}
                    <Scatter
                      data={[
                        { regAvg: minAvg, playAvg: minAvg },
                        { regAvg: maxAvg, playAvg: maxAvg },
                      ]}
                      line={{
                        stroke: 'rgba(255,255,255,0.25)',
                        strokeDasharray: '5 5',
                        strokeWidth: 2,
                      }}
                      shape={() => null}
                      isAnimationActive={false}
                    />

                    <Scatter
                      data={teamPerformances}
                      shape={<CustomAvatarDot />}
                      isAnimationActive={false}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          );
        })()}

        {/* PLAYOFF WINNERS & CHOKERS (Full-width Row) */}
        <Card title="Playoff Winners & Chokers" className="stagger-2 flex flex-col">
          <div className="chart-header">
            <div className="chart-description">
              Starter scoring changes from the regular season to the playoffs.{' '}
              <strong className="text-success-color">League Winners</strong> increased their scoring average significantly during the playoffs, while{' '}
              <strong className="text-danger-color">Playoff Chokers</strong> experienced sharp declines.
            </div>
          </div>

          {playerSplits.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-6 p-8 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
              <TrendingUp size={32} className="text-muted/50 mb-3" />
              <div className="text-muted italic text-center">
                No significant playoff scoring shifts detected for this season.
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 mt-6">
              {/* TROPHY CASE (WINNERS) */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-success-color flex items-center gap-2 border-b border-success-color/20 pb-2.5">
                  <Trophy size={15} className="text-success-color" />
                  <span>League Winners (Largest Scoring Surges)</span>
                </h3>
                {winners.length === 0 ? (
                  <div className="text-sm text-muted italic p-4 text-center bg-white/[0.02] rounded-xl border border-white/5">
                    No starting players met the surge criteria this season.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {winners.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border bg-black/30 hover:bg-black/40 transition-all border-white/10 hover:border-success-color/40 group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={p.playerAvatar}
                              className="w-11 h-11 rounded-full object-cover border-2 border-success-color/40 group-hover:border-success-color transition-all"
                              alt=""
                              onError={e => {
                                (e.target as HTMLImageElement).src =
                                  'https://sleepercdn.com/images/v2/icons/player_default.webp';
                              }}
                            />
                            {p.managerAvatar && (
                              <img
                                src={`https://sleepercdn.com/avatars/thumbs/${p.managerAvatar}`}
                                className="w-5 h-5 rounded-full border border-[#0f1115] absolute -bottom-1 -right-1 shadow-md"
                                alt=""
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate group-hover:text-success-color transition-colors">
                              {p.playerName}
                            </div>
                            <div className="text-xs text-muted truncate mt-0.5">
                              {p.managerName}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <div className="text-sm sm:text-base font-black text-success-color font-mono leading-tight">
                            +{p.diff.toFixed(1)} <span className="text-[10px] uppercase font-bold opacity-75">PPG Surge</span>
                          </div>
                          <div className="text-[11px] text-muted font-mono mt-1 flex items-center justify-end gap-1.5">
                            <span>Reg: <strong className="text-white/80">{p.regularAvg.toFixed(1)}</strong></span>
                            <span className="opacity-40">→</span>
                            <span>Playoff: <strong className="text-success-color font-bold">{p.playoffAvg.toFixed(1)}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* WALL OF SHAME (CHOKERS) */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-danger-color flex items-center gap-2 border-b border-danger-color/20 pb-2.5">
                  <TrendingDown size={15} className="text-danger-color" />
                  <span>Playoff Chokers (Largest Scoring Drops)</span>
                </h3>
                {chokers.length === 0 ? (
                  <div className="text-sm text-muted italic p-4 text-center bg-white/[0.02] rounded-xl border border-white/5">
                    No starting players met the drop criteria this season.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {chokers.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border bg-black/30 hover:bg-black/40 transition-all border-white/10 hover:border-danger-color/40 group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={p.playerAvatar}
                              className="w-11 h-11 rounded-full object-cover border-2 border-danger-color/40 group-hover:border-danger-color transition-all"
                              alt=""
                              onError={e => {
                                (e.target as HTMLImageElement).src =
                                  'https://sleepercdn.com/images/v2/icons/player_default.webp';
                              }}
                            />
                            {p.managerAvatar && (
                              <img
                                src={`https://sleepercdn.com/avatars/thumbs/${p.managerAvatar}`}
                                className="w-5 h-5 rounded-full border border-[#0f1115] absolute -bottom-1 -right-1 shadow-md"
                                alt=""
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate group-hover:text-danger-color transition-colors">
                              {p.playerName}
                            </div>
                            <div className="text-xs text-muted truncate mt-0.5">
                              {p.managerName}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <div className="text-sm sm:text-base font-black text-danger-color font-mono leading-tight">
                            {p.diff.toFixed(1)} <span className="text-[10px] uppercase font-bold opacity-75">PPG Drop</span>
                          </div>
                          <div className="text-[11px] text-muted font-mono mt-1 flex items-center justify-end gap-1.5">
                            <span>Reg: <strong className="text-white/80">{p.regularAvg.toFixed(1)}</strong></span>
                            <span className="opacity-40">→</span>
                            <span>Playoff: <strong className="text-danger-color font-bold">{p.playoffAvg.toFixed(1)}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* SIDE-BY-SIDE MATCHUP NARRATIVES GRID */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* CLUTCH PLAYOFF PICKUPS */}
          <Card title="Clutch Playoff Pickups" className="stagger-3 flex flex-col justify-between">
            <div>
              <div className="chart-header mb-4">
                <div className="chart-description">
                  Playoff games won by in-season trade or waiver acquisitions. Without these additions, the manager's baseline replacement lineup would have lost.
                </div>
              </div>

              {matchupsFlipped.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <Shield size={32} className="text-muted/50 mb-3" />
                  <div className="text-muted italic text-center">
                    No playoff matchups were flipped by in-season acquisitions this season.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchupsFlipped.map((m, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedMatchup(m)}
                      className="p-4 rounded-xl border border-white/10 bg-black/30 hover:border-purple-500/40 hover:bg-black/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {m.managerAvatar ? (
                          <img
                            src={`https://sleepercdn.com/avatars/thumbs/${m.managerAvatar}`}
                            className="w-10 h-10 rounded-full border border-white/20 object-cover shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                            N/A
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate group-hover:text-purple-400 transition-colors">
                            {m.managerName}
                          </div>
                          <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                            <span className="text-gray-300 font-semibold">{m.playerName}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {getAcqIcon(m.acquisitionType)} {m.acquisitionType}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-success-color font-mono">
                          +{m.margin.toFixed(1)} margin
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          Week {m.week} ({m.pointsScored.toFixed(1)} pts)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {matchupsFlipped.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-muted">
                <span>Tap to view counterfactual roster breakdown</span>
                <ArrowRight size={14} className="text-purple-400" />
              </div>
            )}
          </Card>

          {/* BENCHWARMER BLUES */}
          <Card title="The Benchwarmer Blues" className="stagger-3 flex flex-col justify-between">
            <div>
              <div className="chart-header mb-4">
                <div className="chart-description">
                  Playoff eliminations caused by lineup decisions. These managers lost their matchup, but had bench players who would have won the game if started.
                </div>
              </div>

              {benchBlues.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <Trophy size={32} className="text-muted/50 mb-3" />
                  <div className="text-muted italic text-center">
                    Clean managing: no playoff games were lost due to unstarted bench points.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {benchBlues.map((b, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedBenchwarmer(b)}
                      className="p-4 rounded-xl border border-white/10 bg-black/30 hover:border-amber-500/40 hover:bg-black/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {b.managerAvatar ? (
                          <img
                            src={`https://sleepercdn.com/avatars/thumbs/${b.managerAvatar}`}
                            className="w-10 h-10 rounded-full border border-white/20 object-cover shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60 shrink-0">
                            N/A
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate group-hover:text-amber-400 transition-colors">
                            {b.managerName}
                          </div>
                          <div className="text-xs text-muted mt-0.5 truncate">
                            Lost <span className="font-mono text-danger-color font-semibold">{b.actualScore.toFixed(1)}</span> to {b.opponentName} ({b.opponentScore.toFixed(1)})
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-amber-400 font-mono">
                          +{b.pointsLeftOnBench.toFixed(1)} bench pts
                        </div>
                        <div className="text-xs text-success-color font-semibold mt-0.5">
                          Opt: {b.optimalScore.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {benchBlues.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-muted">
                <span>Tap to view optimal lineup comparison</span>
                <ArrowRight size={14} className="text-amber-400" />
              </div>
            )}
          </Card>
        </div>

        {/* MVPS SECTION */}
        <Card title="Playoff MVPs (Weeks 15-17)" className="stagger-4">
          <div className="chart-header">
            <div className="chart-description">
              Top total scorers on active starting rosters during the fantasy playoffs (Weeks 15–17), grouped by how they were acquired.
            </div>
            <div className="chart-legend-grid">
              <div className="legend-item">
                <div className="legend-item-header">
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: 'var(--success-color)',
                      display: 'inline-block',
                    }}
                  />{' '}
                  Drafted
                </div>
                <div className="legend-item-desc">Selected in draft</div>
              </div>
              <div className="legend-item">
                <div className="legend-item-header">
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: 'var(--accent-color)',
                      display: 'inline-block',
                    }}
                  />{' '}
                  Trade
                </div>
                <div className="legend-item-desc">Acquired via trade</div>
              </div>
              <div className="legend-item">
                <div className="legend-item-header">
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: '#f59e0b',
                      display: 'inline-block',
                    }}
                  />{' '}
                  Free Agency
                </div>
                <div className="legend-item-desc">Acquired via FAAB / Waivers</div>
              </div>
            </div>
          </div>
          <MobileTapHint />
          <div style={{ height: 480, width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mvps.slice(0, 15)}
                layout="vertical"
                margin={{ left: 140, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  stroke="var(--text-secondary)"
                  tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="playerName"
                  stroke="var(--text-secondary)"
                  tick={{ fontSize: 12, fill: 'var(--text-primary)', fontWeight: 600 }}
                  width={130}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  content={<CustomBarTooltip />}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar
                  dataKey="totalPoints"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={22}
                  isAnimationActive={false}
                >
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
      </div>

      {/* Modals */}
      {selectedMatchup && (
        <FlippedMatchupModal
          matchup={selectedMatchup}
          onClose={() => setSelectedMatchup(null)}
        />
      )}
      {selectedBenchwarmer && (
        <BenchwarmerModal
          matchup={selectedBenchwarmer}
          onClose={() => setSelectedBenchwarmer(null)}
        />
      )}
    </div>
  );
};

export default Playoffs;
