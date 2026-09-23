import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Flame, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShieldCheck, 
  Target, 
  Zap, 
  Layers, 
  Calendar,
  Crosshair,
  Shield,
  Eye
} from 'lucide-react';
import type { PlayerEvaluationItem } from '../../hooks/usePlayerEvaluation';
import { useAuth } from '../../context/AuthContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend
} from 'recharts';

interface PlayerRadarDrawerProps {
  player: PlayerEvaluationItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerRadarDrawer: React.FC<PlayerRadarDrawerProps> = ({ player, isOpen, onClose }) => {
  const { isUnlocked } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  if (!isOpen || !player) return null;

  const playerPhoto = `https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`;
  const ownerAvatar = player.owner?.avatar ? `https://sleepercdn.com/avatars/thumbs/${player.owner.avatar}` : null;

  // Chart data for weekly scores
  const weeklyChartData = player.gameLogs.filter(l => l.gp).map(l => ({
    week: `Wk ${l.week}`,
    customPts: Number(l.customPts.toFixed(1)),
    stdPts: Number(l.stdPts.toFixed(1)),
    fdPts: Number((l.rushFd + l.recFd).toFixed(1)),
    tklPts: Number(((l.soloTkl * 1.0) + (l.astTkl * 0.5)).toFixed(1)),
    retPts: Number(((l.krYd * (1/15)) + (l.prYd * (1/20)) + ((l.krTd + l.prTd) * 6)).toFixed(1))
  }));

  // Scoring points decomposition
  const totalCustomScore = Math.max(player.totalCustomPts, 0.1);

  // Offensive decomposition
  const totalStandardPoints = player.totalStdPts;
  const totalFdPoints = player.totalFd * 1.0;
  const totalReturnPoints = player.returnPts;

  const pctStandard = Math.max(0, Math.min(100, Math.round((totalStandardPoints / totalCustomScore) * 100)));
  const pctFd = Math.max(0, Math.min(100, Math.round((totalFdPoints / totalCustomScore) * 100)));
  const pctReturn = Math.max(0, Math.min(100, Math.round((totalReturnPoints / totalCustomScore) * 100)));

  // IDP decomposition
  const idpTacklePts = player.tacklePts || 0;
  const idpHavocPts = (player.sacks * 3.0) + (player.tfl * 2.0) + (player.qbHits * 0.5);
  const idpTurnoverCoveragePts = Math.max(0, player.totalCustomPts - idpTacklePts - idpHavocPts - player.returnPts);

  const pctIdpTackle = Math.max(0, Math.min(100, Math.round((idpTacklePts / totalCustomScore) * 100)));
  const pctIdpHavoc = Math.max(0, Math.min(100, Math.round((idpHavocPts / totalCustomScore) * 100)));
  const pctIdpTurnover = Math.max(0, Math.min(100, Math.round((idpTurnoverCoveragePts / totalCustomScore) * 100)));
  const pctIdpReturn = Math.max(0, Math.min(100, Math.round((totalReturnPoints / totalCustomScore) * 100)));

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-card border border-white/15 w-full max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-[#0f1115]/95 animate-fade-in my-auto text-left"
        style={{ padding: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="bg-black/40 border-b border-white/10 p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={playerPhoto}
                alt={isUnlocked ? player.name : 'player'}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
                className={`w-16 h-16 rounded-2xl bg-white/5 border border-white/10 object-cover shadow-inner ${isUnlocked ? '' : 'filter blur-md select-none'}`}
              />
              <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                player.isIdp
                  ? player.idpPos === 'DL'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : player.idpPos === 'LB'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : player.pos === 'RB' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  player.pos === 'WR' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  player.pos === 'TE' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                  'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {player.isIdp ? `${player.idpPos || player.pos}` : player.pos}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-bold tracking-tight ${isUnlocked ? 'text-white' : 'text-white/40 filter blur-[6px] select-none pointer-events-none'}`}>
                  {isUnlocked ? player.name : '████████████'}
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 font-semibold ${isUnlocked ? '' : 'filter blur-[4px] select-none text-white/30'}`}>
                  {isUnlocked ? player.team : '???'}
                </span>
                {player.isIdp && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 font-mono font-bold border border-rose-500/20">
                    IDP • {player.pos}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                {player.isRostered ? (
                  <div className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    {ownerAvatar ? (
                      <img src={ownerAvatar} alt="owner" className="w-3.5 h-3.5 rounded-full object-cover" />
                    ) : (
                      <ShieldCheck size={12} />
                    )}
                    <span>Rostered by {player.owner?.display_name || 'Manager'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-semibold animate-pulse">
                    <Sparkles size={12} />
                    <span>Available on Waivers</span>
                  </div>
                )}
                <span>•</span>
                <span>{player.gamesPlayed} GP</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* Top Score Matrix & Morty Edge Index */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Custom Total</div>
              <div className="text-xl font-black text-white mt-1">{player.totalCustomPts.toFixed(1)}</div>
              <div className="text-[11px] text-emerald-400 font-medium">{player.customPpg.toFixed(1)} PPG</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Standard Delta</div>
              <div className={`text-xl font-black mt-1 ${player.deltaVsStd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {player.deltaVsStd >= 0 ? `+${player.deltaVsStd.toFixed(1)}` : player.deltaVsStd.toFixed(1)}
              </div>
              <div className="text-[11px] text-muted">vs Standard Baseline</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                {player.isIdp ? 'Tackle Efficiency' : 'Return Floor'}
              </div>
              {player.isIdp ? (
                <>
                  <div className="text-xl font-black text-cyan-400 mt-1">{player.tklRate.toFixed(1)}%</div>
                  <div className="text-[11px] text-muted">{player.totalTkl} tackles ({player.tklPerGame.toFixed(1)}/g)</div>
                </>
              ) : (
                <>
                  <div className="text-xl font-black text-cyan-400 mt-1">+{player.returnFloorPpg.toFixed(1)}</div>
                  <div className="text-[11px] text-muted">{player.totalReturnYd} ret yds ({player.returnTds} TD)</div>
                </>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 relative overflow-hidden">
              <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={13} />
                <span>Morty Edge</span>
              </div>
              <div className="text-xl font-black text-white mt-1">{player.mortyEdgeIndex} <span className="text-xs text-muted font-normal">/ 100</span></div>
              <div className="text-[11px] text-amber-400/80">Waiver Breakout Score</div>
            </div>
          </div>

          {/* Points Decomposition Progress Bar */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Scoring Decomposition</span>
              <span className="text-[11px] text-muted">{player.totalCustomPts.toFixed(1)} Total Custom Pts</span>
            </div>

            {/* Segmented Progress Bar */}
            {player.isIdp ? (
              <>
                <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden flex">
                  <div style={{ width: `${pctIdpTackle}%` }} className="bg-emerald-500 h-full transition-all" title={`Tackles: ${idpTacklePts.toFixed(1)} pts (${pctIdpTackle}%)`} />
                  <div style={{ width: `${pctIdpHavoc}%` }} className="bg-amber-500 h-full transition-all" title={`Pass Rush & Havoc: ${idpHavocPts.toFixed(1)} pts (${pctIdpHavoc}%)`} />
                  <div style={{ width: `${pctIdpTurnover}%` }} className="bg-indigo-500 h-full transition-all" title={`Coverage & Turnovers: ${idpTurnoverCoveragePts.toFixed(1)} pts (${pctIdpTurnover}%)`} />
                  {pctIdpReturn > 0 && (
                    <div style={{ width: `${pctIdpReturn}%` }} className="bg-cyan-400 h-full transition-all" title={`Special Teams Returns: ${totalReturnPoints.toFixed(1)} pts (${pctIdpReturn}%)`} />
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-400 font-semibold">Tackles</div>
                    <div className="text-sm font-bold text-white mt-0.5">{idpTacklePts.toFixed(1)} pts</div>
                    <div className="text-[10px] text-muted">{pctIdpTackle}% ({player.totalTkl} Tkl)</div>
                  </div>

                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[10px] text-amber-400 font-semibold">Pass Rush / Havoc</div>
                    <div className="text-sm font-bold text-white mt-0.5">{idpHavocPts.toFixed(1)} pts</div>
                    <div className="text-[10px] text-muted">{pctIdpHavoc}% ({player.sacks} Sk, {player.tfl} TFL)</div>
                  </div>

                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <div className="text-[10px] text-indigo-400 font-semibold">Coverage & Turnovers</div>
                    <div className="text-sm font-bold text-white mt-0.5">{idpTurnoverCoveragePts.toFixed(1)} pts</div>
                    <div className="text-[10px] text-muted">{pctIdpTurnover}% ({player.passDef} PD, {player.interceptions} INT)</div>
                  </div>

                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <div className="text-[10px] text-cyan-400 font-semibold">Special Teams</div>
                    <div className="text-sm font-bold text-white mt-0.5">{totalReturnPoints.toFixed(1)} pts</div>
                    <div className="text-[10px] text-muted">{pctIdpReturn}% ({player.stSnaps} snaps)</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden flex">
                  <div style={{ width: `${pctStandard}%` }} className="bg-blue-500 h-full transition-all" title={`Standard Offense: ${totalStandardPoints.toFixed(1)} pts (${pctStandard}%)`} />
                  <div style={{ width: `${pctFd}%` }} className="bg-amber-500 h-full transition-all" title={`PPFD First Downs: ${totalFdPoints.toFixed(1)} pts (${pctFd}%)`} />
                  <div style={{ width: `${pctReturn}%` }} className="bg-cyan-400 h-full transition-all" title={`Special Teams Returns: ${totalReturnPoints.toFixed(1)} pts (${pctReturn}%)`} />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="text-[10px] text-blue-400 font-semibold">Standard Offense</div>
                    <div className="text-sm font-bold text-white mt-0.5">{totalStandardPoints.toFixed(1)} pts</div>
                    <div className="text-[10px] text-muted">{pctStandard}% of total</div>
                  </div>

                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[10px] text-amber-400 font-semibold">PPFD 1st Downs</div>
                    <div className="text-sm font-bold text-white mt-0.5">{totalFdPoints.toFixed(1)} pts</div>
                    <div className="text-[10px] text-muted">{pctFd}% of total ({player.totalFd} FD)</div>
                  </div>

                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <div className="text-[10px] text-cyan-400 font-semibold">Special Teams</div>
                    <div className="text-sm font-bold text-white mt-0.5">{totalReturnPoints.toFixed(1)} pts</div>
                    <div className="text-[10px] text-muted">{pctReturn}% of total</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Advanced Analytics Deep-Dive Grid */}
          <div>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Advanced Opportunity & Efficiency
            </h4>
            {player.isIdp ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">Defensive Snap Share</div>
                  <div className="text-base font-bold text-white mt-0.5">{player.defSnapPct.toFixed(1)}%</div>
                  <div className={`text-[10px] flex items-center gap-0.5 ${player.snapTrend3Wk >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {player.snapTrend3Wk >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    <span>{player.snapTrend3Wk >= 0 ? `+${player.snapTrend3Wk.toFixed(1)}%` : `${player.snapTrend3Wk.toFixed(1)}%`} (3-wk Δ)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">Tackle Efficiency Rate</div>
                  <div className="text-base font-bold text-cyan-400 mt-0.5">{player.tklRate.toFixed(1)}%</div>
                  <div className="text-[10px] text-muted">{player.soloTkl} Solo / {player.astTkl} Ast ({player.tklPerGame.toFixed(1)}/g)</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">Pass Rush Impact</div>
                  <div className="text-base font-bold text-amber-400 mt-0.5">{player.passRushImpact} Plays</div>
                  <div className="text-[10px] text-muted">{player.sacks} Sacks, {player.qbHits} QB Hits, {player.tfl} TFL</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">Havoc Rate (Disruption)</div>
                  <div className="text-base font-bold text-purple-400 mt-0.5">{player.havocRate.toFixed(1)}%</div>
                  <div className="text-[10px] text-muted">{player.havocPlays} total havoc plays</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">Coverage Impact (PD + INT)</div>
                  <div className="text-base font-bold text-indigo-400 mt-0.5">{player.passDef + player.interceptions}</div>
                  <div className="text-[10px] text-muted">{player.passDef} Passes Defended (3.0 pts) • {player.interceptions} INT</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">Big Play Fantasy Points</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">{player.bigPlayPts.toFixed(1)} pts</div>
                  <div className="text-[10px] text-muted">
                    {totalCustomScore > 0 ? `${((player.bigPlayPts / totalCustomScore) * 100).toFixed(0)}%` : '0%'} of custom points
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">Snap Share</div>
                  <div className="text-base font-bold text-white mt-0.5">{player.snapPct.toFixed(1)}%</div>
                  <div className={`text-[10px] flex items-center gap-0.5 ${player.snapTrend3Wk >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {player.snapTrend3Wk >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    <span>{player.snapTrend3Wk >= 0 ? `+${player.snapTrend3Wk.toFixed(1)}%` : `${player.snapTrend3Wk.toFixed(1)}%`} (3-wk Δ)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">WOPR / Volume</div>
                  <div className="text-base font-bold text-amber-400 mt-0.5">{player.wopr.toFixed(2)}</div>
                  <div className="text-[10px] text-muted">{player.targetSharePct.toFixed(1)}% Tgt / {player.airYardsSharePct.toFixed(1)}% Air</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">Target Depth (aDoT)</div>
                  <div className="text-base font-bold text-white mt-0.5">{player.aDoT.toFixed(1)} yds</div>
                  <div className="text-[10px] text-muted">{player.airYards} total air yds</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">TPRR (Targets / Route)</div>
                  <div className="text-base font-bold text-cyan-400 mt-0.5">{player.tprr > 0 ? `${player.tprr.toFixed(1)}%` : '-'}</div>
                  <div className="text-[10px] text-muted">{player.routesRun} routes ({player.routesPerGame.toFixed(1)}/g)</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">1st Down Efficiency</div>
                  <div className="text-base font-bold text-amber-400 mt-0.5">{player.fdPerTouch.toFixed(1)}%</div>
                  <div className="text-[10px] text-muted">{player.totalFd} 1Ds ({player.fdPerGame.toFixed(1)}/g)</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted font-medium">High-Value Touches</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">{player.hvt} HVT</div>
                  <div className="text-[10px] text-muted">{player.rzCarries} RZ Carries, {player.targets} Tgts</div>
                </div>
              </div>
            )}
          </div>

          {/* Weekly Fantasy Points Chart: Custom vs Standard */}
          <div>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Weekly Points: Custom Scoring vs Standard
            </h4>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <RechartsTooltip
                    contentStyle={{
                      background: 'rgba(15,17,21,0.95)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="customPts" name="Custom League Score" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stdPts" name="Standard Scoring" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full Weekly Game Logs Table */}
          <div>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar size={14} />
              <span>Full Season Game Log</span>
            </h4>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-muted uppercase text-[10px] font-semibold border-b border-white/10 select-none">
                  <tr>
                    <th className="py-2.5 px-3">Wk</th>
                    <th className="py-2.5 px-2">Opp</th>
                    {player.isIdp ? (
                      <>
                        <th className="py-2.5 px-2 text-right">Def Snaps</th>
                        <th className="py-2.5 px-2 text-right">Snap %</th>
                        <th className="py-2.5 px-2 text-right">Solo</th>
                        <th className="py-2.5 px-2 text-right">Ast</th>
                        <th className="py-2.5 px-2 text-right">TFL</th>
                        <th className="py-2.5 px-2 text-right">Sack</th>
                        <th className="py-2.5 px-2 text-right">QB Hit</th>
                        <th className="py-2.5 px-2 text-right">PD</th>
                        <th className="py-2.5 px-2 text-right">INT</th>
                        <th className="py-2.5 px-2 text-right">FF/FR</th>
                        <th className="py-2.5 px-2 text-right">TD</th>
                      </>
                    ) : player.pos === 'QB' ? (
                      <>
                        <th className="py-2.5 px-2 text-right">Snaps</th>
                        <th className="py-2.5 px-2 text-right">Snap %</th>
                        <th className="py-2.5 px-2 text-right">Pass Yds</th>
                        <th className="py-2.5 px-2 text-right">Pass TD</th>
                        <th className="py-2.5 px-2 text-right">Int</th>
                        <th className="py-2.5 px-2 text-right">Rush Att</th>
                        <th className="py-2.5 px-2 text-right">Rush Yds</th>
                        <th className="py-2.5 px-2 text-right">Rush TD</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2.5 px-2 text-right">Snaps</th>
                        <th className="py-2.5 px-2 text-right">Snap %</th>
                        <th className="py-2.5 px-2 text-right">Carries</th>
                        <th className="py-2.5 px-2 text-right">Rush Yds</th>
                        <th className="py-2.5 px-2 text-right">Rush TD</th>
                        <th className="py-2.5 px-2 text-right">Tgts</th>
                        <th className="py-2.5 px-2 text-right">Rec</th>
                        <th className="py-2.5 px-2 text-right">Rec Yds</th>
                        <th className="py-2.5 px-2 text-right">Rec TD</th>
                        <th className="py-2.5 px-2 text-right">Routes</th>
                        <th className="py-2.5 px-2 text-right">TPRR</th>
                      </>
                    )}
                    <th className="py-2.5 px-2 text-right">Custom Pts</th>
                    <th className="py-2.5 px-3 text-right">Std Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {player.gameLogs.filter(l => l.gp).map((log) => (
                    <tr key={log.week} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 px-3 font-sans font-bold text-white">{log.week}</td>
                      <td className="py-2 px-2 text-cyan-300 font-semibold">{log.opp || '-'}</td>
                      {player.isIdp ? (
                        <>
                          <td className="py-2 px-2 text-right text-muted">{log.defSnaps}</td>
                          <td className="py-2 px-2 text-right text-white font-medium">{Math.round(log.defSnapPct)}%</td>
                          <td className="py-2 px-2 text-right text-white">{log.soloTkl}</td>
                          <td className="py-2 px-2 text-right text-muted">{log.astTkl}</td>
                          <td className="py-2 px-2 text-right text-amber-400 font-bold">{log.tfl > 0 ? log.tfl : '-'}</td>
                          <td className="py-2 px-2 text-right text-emerald-400 font-bold">{log.sacks > 0 ? log.sacks : '-'}</td>
                          <td className="py-2 px-2 text-right text-purple-300">{log.qbHits > 0 ? log.qbHits : '-'}</td>
                          <td className="py-2 px-2 text-right text-indigo-400 font-bold">{log.passDef > 0 ? log.passDef : '-'}</td>
                          <td className="py-2 px-2 text-right text-cyan-300 font-bold">{log.interceptions > 0 ? log.interceptions : '-'}</td>
                          <td className="py-2 px-2 text-right text-amber-300">{log.ff + log.fumRec > 0 ? log.ff + log.fumRec : '-'}</td>
                          <td className="py-2 px-2 text-right text-emerald-300 font-bold">{log.defTd > 0 ? log.defTd : '-'}</td>
                        </>
                      ) : player.pos === 'QB' ? (
                        <>
                          <td className="py-2 px-2 text-right text-muted">{log.snaps}</td>
                          <td className="py-2 px-2 text-right text-white font-medium">{Math.round(log.snapPct)}%</td>
                          <td className="py-2 px-2 text-right text-white">{log.passYd}</td>
                          <td className="py-2 px-2 text-right text-amber-400 font-bold">{log.passTd > 0 ? log.passTd : '-'}</td>
                          <td className="py-2 px-2 text-right text-rose-400">{log.passInt > 0 ? log.passInt : '-'}</td>
                          <td className="py-2 px-2 text-right text-muted">{log.rushAtt}</td>
                          <td className="py-2 px-2 text-right text-emerald-400">{log.rushYd}</td>
                          <td className="py-2 px-2 text-right text-amber-400 font-bold">{log.rushTd > 0 ? log.rushTd : '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-2 text-right text-muted">{log.snaps}</td>
                          <td className="py-2 px-2 text-right text-white font-medium">{Math.round(log.snapPct)}%</td>
                          <td className="py-2 px-2 text-right text-muted">{log.rushAtt}</td>
                          <td className="py-2 px-2 text-right text-emerald-400 font-medium">{log.rushYd}</td>
                          <td className="py-2 px-2 text-right text-amber-400 font-bold">{log.rushTd > 0 ? log.rushTd : '-'}</td>
                          <td className="py-2 px-2 text-right text-amber-300 font-semibold">{log.recTgt}</td>
                          <td className="py-2 px-2 text-right text-muted">{log.rec}</td>
                          <td className="py-2 px-2 text-right text-emerald-400 font-medium">{log.recYd}</td>
                          <td className="py-2 px-2 text-right text-amber-400 font-bold">{log.recTd > 0 ? log.recTd : '-'}</td>
                          <td className="py-2 px-2 text-right text-muted">{log.routes}</td>
                          <td className="py-2 px-2 text-right text-cyan-400 font-semibold">{log.tprr > 0 ? `${log.tprr.toFixed(0)}%` : '-'}</td>
                        </>
                      )}
                      <td className="py-2 px-2 text-right text-emerald-400 font-bold">{log.customPts.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right text-muted">{log.stdPts.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};
