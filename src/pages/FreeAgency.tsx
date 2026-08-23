import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../components/Card';
import { MobileTapHint } from '../components/MobileTapHint';
import { useLeagueContext } from '../context/LeagueContext';
import { 
  useFreeAgencyEfficiency, 
  type AcqFilter, 
  type FreeAgencyResult,
  type TopAcquisitionLedger 
} from '../hooks/useFreeAgencyEfficiency';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Label, ReferenceLine,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  Crown, 
  Target, 
  Zap, 
  Shield, 
  Sparkles, 
  Layers,
  FileSpreadsheet,
  X,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  Flame,
  CheckCircle2
} from 'lucide-react';

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899'];

// ─── Shared Components ──────────────────────────────────────────────────────

const ChartToggle = ({ value, onChange }: { value: AcqFilter; onChange: (v: AcqFilter) => void }) => (
  <div className="glass-toggle-container" style={{ width: 'fit-content' }}>
    <button onClick={() => onChange('all')} className={`glass-toggle-btn ${value === 'all' ? 'active' : ''}`}>All</button>
    <button onClick={() => onChange('faab')} className={`glass-toggle-btn ${value === 'faab' ? 'active' : ''}`}>FAAB</button>
    <button onClick={() => onChange('street')} className={`glass-toggle-btn ${value === 'street' ? 'active' : ''}`}>$0 Street</button>
  </div>
);

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload, onClick } = props;
  const size = 28;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  if (!cx || !cy) return null;
  const safeName = (payload.name || 'mgr').replace(/[^a-zA-Z0-9]/g, '_');
  const clipId = `clip-fa-${safeName}-${Math.round(cx)}-${Math.round(cy)}`;

  return (
    <g 
      className="cursor-pointer group"
      onClick={() => onClick && onClick(payload.rawResult || payload)}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={size / 2 - 1.5} />
        </clipPath>
      </defs>
      {/* Invisible hit expander */}
      <circle cx={cx} cy={cy} r={size / 2 + 4} fill="transparent" />
      {/* Outer border ring */}
      <circle 
        cx={cx} 
        cy={cy} 
        r={size / 2} 
        fill="#0f1115" 
        stroke="rgba(255,255,255,0.4)" 
        strokeWidth="1.5" 
        className="group-hover:stroke-white group-hover:stroke-[2.5px] transition-all"
      />
      {avatarUrl ? (
        <image 
          href={avatarUrl} 
          x={cx - size / 2 + 1.5} 
          y={cy - size / 2 + 1.5} 
          width={size - 3} 
          height={size - 3} 
          clipPath={`url(#${clipId})`} 
        />
      ) : (
        <circle cx={cx} cy={cy} r={size / 2 - 1.5} fill="#475569" />
      )}
    </g>
  );
};

const RelianceTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <div className="flex items-center gap-3 mb-2">
        {d.avatar
          ? <img src={`https://sleepercdn.com/avatars/thumbs/${d.avatar}`} alt="avatar" className="avatar" width={24} height={24} />
          : <div className="avatar bg-gray-600" style={{ width: 24, height: 24 }} />
        }
        <span className="font-bold text-base text-white">{d.name}</span>
      </div>
      <div className="text-xs text-muted">Waiver Points: <span className="text-success-color font-bold ml-1 font-mono">{d.points.toFixed(1)}</span></div>
      <div className="text-xs text-muted">Roster Reliance: <span className="text-accent-color font-bold ml-1 font-mono">{d.reliance}%</span></div>
      <div className="text-xs text-muted mt-2 border-t border-white/10 pt-2">Win Rate: <span className="text-white font-bold ml-1 font-mono">{d.winPct}%</span></div>
      <div className="text-[10px] text-muted/60 mt-1 italic">Click dot to inspect manager dossier</div>
    </div>
  );
};

const MatrixTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <div className="flex items-center gap-3 mb-2">
        {d.avatar
          ? <img src={`https://sleepercdn.com/avatars/thumbs/${d.avatar}`} alt="avatar" className="avatar" width={24} height={24} />
          : <div className="avatar bg-gray-600" style={{ width: 24, height: 24 }} />
        }
        <span className="font-bold text-base text-white">{d.name}</span>
      </div>
      <div className="text-xs text-muted">Total Pickups: <span className="text-white font-bold ml-1 font-mono">{d.pickups}</span></div>
      <div className="text-xs text-muted">Avg Hold Time: <span className="text-accent-color font-bold ml-1 font-mono">{d.averageWeeksHeld} wks</span></div>
      <div className="text-xs text-muted mt-2 border-t border-white/10 pt-2">Hit Rate: <span className="text-success-color font-bold ml-1 font-mono">{d.hitRate}%</span></div>
      <div className="text-[10px] text-muted/60 mt-1 italic">Click dot to inspect manager dossier</div>
    </div>
  );
};

// ─── Data helpers ────────────────────────────────────────────────────────────

const getCenteredBounds = (values: number[], avg: number) => {
  if (!values.length) return [0, 100];
  const maxDev = Math.max(...values.map(v => Math.abs(v - avg)), avg * 0.1);
  return [Math.max(0, avg - maxDev * 1.3), avg + maxDev * 1.3];
};

const toScatter = (data: FreeAgencyResult[]) =>
  [...data].sort((a, b) => a.roster_id - b.roster_id).map(d => ({
    name: d.user?.display_name || `Team ${d.roster_id}`,
    avatar: d.user?.avatar,
    pickups: d.totalPickups,
    points: d.pointsGenerated,
    reliance: Number(((d.pointsGenerated / Math.max(1, d.totalRosterPoints)) * 100).toFixed(1)),
    hitRate: d.hitRate,
    winPct: Number(d.winPct.toFixed(1)),
    averageWeeksHeld: d.averageWeeksHeld,
    waiverWins: d.waiverWins,
    transactionsByDay: d.transactionsByDay,
    rawResult: d
  }));

// ─── Page ────────────────────────────────────────────────────────────────────

export const FreeAgency: React.FC = () => {
  const { selectedSeason } = useLeagueContext();
  const { views, topAssets, loading, error } = useFreeAgencyEfficiency();

  // Navigation Hub State
  const [activeTab, setActiveTab] = useState<'matrices' | 'positional' | 'ledger'>('matrices');

  // Interactive Modal States
  const [selectedPlayer, setSelectedPlayer] = useState<TopAcquisitionLedger | null>(null);
  const [selectedManager, setSelectedManager] = useState<FreeAgencyResult | null>(null);

  // Per-chart filter states — toggling never re-fetches
  const [macroFilter, setMacroFilter]   = useState<AcqFilter>('all');
  const [matrixFilter, setMatrixFilter] = useState<AcqFilter>('all');
  const [posFilter, setPosFilter]       = useState<AcqFilter>('all');
  const [hitFilter, setHitFilter]       = useState<AcqFilter>('all');
  const [timingFilter, setTimingFilter] = useState<AcqFilter>('all');
  const [ledgerFilter, setLedgerFilter] = useState<AcqFilter>('all');

  const [radarMgrs, setRadarMgrs]       = useState<number[]>([]);

  // Body scroll locking and Escape key dismiss when modals are open
  useEffect(() => {
    if (selectedPlayer || selectedManager) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setSelectedPlayer(null);
          setSelectedManager(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [selectedPlayer, selectedManager]);

  // Initialize Radar select to top performers
  useEffect(() => {
    if (views.all.length > 0 && !loading) {
      const top3 = [...views.all].sort((a,b) => b.pointsGenerated - a.pointsGenerated).slice(0, 3).map(v => v.roster_id);
      if (radarMgrs.length === 0) setRadarMgrs(top3);
    }
  }, [views.all.length, loading]);

  const handleToggle = (id: number, setFn: React.Dispatch<React.SetStateAction<number[]>>) => {
    setFn(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      const next = [...prev, id];
      return next.length > 4 ? next.slice(1) : next; 
    });
  };

  const renderSelector = (currentIds: number[], setter: React.Dispatch<React.SetStateAction<number[]>>, label: string = 'Select Managers (Max 4)') => {
    const sorted = [...views.all].sort((a, b) => (a.user?.display_name || '').localeCompare(b.user?.display_name || ''));
    const top3Ids = [...views.all].sort((a, b) => b.pointsGenerated - a.pointsGenerated).slice(0, 3).map(v => v.roster_id);

    return (
      <div className="mt-4 border-t border-white/5 pt-4 w-full">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <span>{label}</span>
            <span className="text-white/40 font-mono text-[10px]">({currentIds.length}/4)</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setter(top3Ids)}
              className="text-[10px] text-accent-color hover:text-white transition-colors px-2 py-0.5 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/10"
            >
              Top 3 by Points
            </button>
            <button
              onClick={() => setter([])}
              className="text-[10px] text-muted hover:text-white transition-colors px-1.5 py-0.5 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/10"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {sorted.map(v => {
            const activeIdx = currentIds.indexOf(v.roster_id);
            const isActive = activeIdx !== -1;
            const color = isActive ? CHART_COLORS[activeIdx] : 'transparent';
            const avatarUrl = v.user?.avatar ? `https://sleepercdn.com/avatars/thumbs/${v.user.avatar}` : null;
            return (
              <button
                key={v.roster_id}
                onClick={() => handleToggle(v.roster_id, setter)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border ${
                  isActive 
                    ? 'bg-white/[0.08] text-white shadow-sm' 
                    : 'bg-white/[0.02] text-muted hover:text-white hover:bg-white/[0.04] border-white/5 opacity-60 hover:opacity-100'
                }`}
                style={{ 
                  borderColor: isActive ? color : undefined,
                  boxShadow: isActive ? `0 0 10px ${color}30` : undefined
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-600 shrink-0" />
                )}
                <span className="truncate max-w-[90px]">{v.user?.display_name || `Team ${v.roster_id}`}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4">Analyzing the waiver wire...</div>
      </div>
    );
  }

  if (error || !selectedSeason) {
    return <div className="text-danger-color text-center p-10">Failed to load free agency data.</div>;
  }

  // Derived chart data — instant, no fetch
  const macroData  = toScatter(views[macroFilter]);
  const matrixData = toScatter(views[matrixFilter]);
  const hitData    = toScatter(views[hitFilter]).sort((a, b) => b.waiverWins - a.waiverWins);
  const timingData = toScatter(views[timingFilter]).sort((a, b) => b.pickups - a.pickups);
  const ledger     = topAssets[ledgerFilter];

  const getMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const avgRelianceMacro = getMedian(macroData.map(d => d.reliance));
  const avgWinPct       = getMedian(macroData.map(d => d.winPct));
  const avgPickups      = getMedian(matrixData.map(d => d.pickups));

  // Construct Radar data: Normalized 0-100 visually, preserving raw for tooltips
  const radarProfiles = radarMgrs.map(id => views[posFilter].find(v => v.roster_id === id)).filter(p => !!p) as FreeAgencyResult[];
  
  const radarSubjects = [
    { label: 'QB',  keys: ['QB'] },
    { label: 'RB',  keys: ['RB'] },
    { label: 'WR',  keys: ['WR'] },
    { label: 'TE',  keys: ['TE'] },
    { label: 'K',   keys: ['K'] },
    { label: 'IDP', keys: ['IDP', 'DL', 'LB', 'DB'] }
  ];

  const radarChartData = radarSubjects.map(s => {
    const node: any = { subject: s.label };
    
    const getVal = (p: FreeAgencyResult) => s.keys.reduce((tot, k) => tot + (p.positionalPoints[k] || 0), 0);
    const maxRaw = Math.max(...views[posFilter].map(v => getVal(v)), 10);

    radarProfiles.forEach((p, i) => {
      const raw = getVal(p);
      node[`manager_${i}`] = Math.max(5, (raw / maxRaw) * 100); 
      node[`raw_${i}`] = Number(raw.toFixed(1));
    });
    return node;
  });

  // Top KPIs computation
  const waiverMvp = topAssets.all[0];
  const highestReliance = [...views.all].sort((a, b) => (b.pointsGenerated / Math.max(1, b.totalRosterPoints)) - (a.pointsGenerated / Math.max(1, a.totalRosterPoints)))[0];
  const topHitRate = [...views.all].filter(v => v.totalPickups >= 3).sort((a, b) => b.hitRate - a.hitRate || b.hits - a.hits)[0] || views.all[0];
  const topWinsCreated = [...views.all].sort((a, b) => b.waiverWins - a.waiverWins || b.pointsGenerated - a.pointsGenerated)[0];

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Free Agency & Waiver Wire ({selectedSeason.league.season})
        </h1>
        <p className="text-sm text-muted">
          In-season talent acquisition analytics, roster reliance matrices, hold duration profiles, and positional yield.
        </p>
      </header>

      {/* ─── Hero KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
        {/* KPI 1: Waiver Wire MVP */}
        <div 
          onClick={() => waiverMvp && setSelectedPlayer(waiverMvp)}
          className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-500/40 hover:bg-white/[0.04] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
            <Crown size={15} />
            <span>Waiver Wire MVP</span>
          </div>
          {waiverMvp ? (
            <div className="flex items-center gap-3">
              {waiverMvp.managerAvatar ? (
                <img 
                  src={`https://sleepercdn.com/avatars/thumbs/${waiverMvp.managerAvatar}`} 
                  alt="" 
                  className="w-10 h-10 rounded-full border border-amber-400/30 object-cover shrink-0" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-bold text-base text-white truncate group-hover:text-amber-300 transition-colors">
                  {waiverMvp.playerName}
                </div>
                <div className="text-xs text-amber-300 font-mono font-semibold">
                  +{waiverMvp.starterPoints.toFixed(1)} pts <span className="text-muted font-normal">· {waiverMvp.managerName}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted">No data available</div>
          )}
          <div className="text-[11px] text-muted mt-3 pt-2 border-t border-white/5 truncate flex items-center justify-between">
            <span>Top starter contribution</span>
            <span className="text-amber-400/80 text-[10px]">Inspect ↗</span>
          </div>
        </div>

        {/* KPI 2: Highest Roster Reliance */}
        <div 
          onClick={() => highestReliance && setSelectedManager(highestReliance)}
          className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/40 hover:bg-white/[0.04] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
            <Shield size={15} />
            <span>Top Roster Reliance</span>
          </div>
          {highestReliance ? (
            <div className="flex items-center gap-3">
              {highestReliance.user?.avatar ? (
                <img 
                  src={`https://sleepercdn.com/avatars/thumbs/${highestReliance.user.avatar}`} 
                  alt="" 
                  className="w-10 h-10 rounded-full border border-emerald-400/30 object-cover shrink-0" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-bold text-base text-white truncate group-hover:text-emerald-300 transition-colors">
                  {highestReliance.user?.display_name || `Team ${highestReliance.roster_id}`}
                </div>
                <div className="text-xs text-emerald-300 font-mono font-semibold">
                  {((highestReliance.pointsGenerated / Math.max(1, highestReliance.totalRosterPoints)) * 100).toFixed(1)}% of PF
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted">No data available</div>
          )}
          <div className="text-[11px] text-muted mt-3 pt-2 border-t border-white/5 truncate flex items-center justify-between">
            <span>{highestReliance ? `${highestReliance.pointsGenerated.toFixed(1)} waiver pts` : 'Waiver dependency'}</span>
            <span className="text-emerald-400/80 text-[10px]">Inspect ↗</span>
          </div>
        </div>

        {/* KPI 3: Top Hit Rate Specialist */}
        <div 
          onClick={() => topHitRate && setSelectedManager(topHitRate)}
          className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/40 hover:bg-white/[0.04] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
            <Target size={15} />
            <span>Hit Rate Leader</span>
          </div>
          {topHitRate ? (
            <div className="flex items-center gap-3">
              {topHitRate.user?.avatar ? (
                <img 
                  src={`https://sleepercdn.com/avatars/thumbs/${topHitRate.user.avatar}`} 
                  alt="" 
                  className="w-10 h-10 rounded-full border border-cyan-400/30 object-cover shrink-0" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-bold text-base text-white truncate group-hover:text-cyan-300 transition-colors">
                  {topHitRate.user?.display_name || `Team ${topHitRate.roster_id}`}
                </div>
                <div className="text-xs text-cyan-300 font-mono font-semibold">
                  {topHitRate.hitRate}% Hit Rate
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted">No data available</div>
          )}
          <div className="text-[11px] text-muted mt-3 pt-2 border-t border-white/5 truncate flex items-center justify-between">
            <span>{topHitRate ? `${topHitRate.hits}/${topHitRate.totalPickups} hits` : 'Pickup accuracy'}</span>
            <span className="text-cyan-400/80 text-[10px]">Inspect ↗</span>
          </div>
        </div>

        {/* KPI 4: Waiver Matchup Decider */}
        <div 
          onClick={() => topWinsCreated && setSelectedManager(topWinsCreated)}
          className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/40 hover:bg-white/[0.04] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
            <Zap size={15} />
            <span>Matchups Decided</span>
          </div>
          {topWinsCreated ? (
            <div className="flex items-center gap-3">
              {topWinsCreated.user?.avatar ? (
                <img 
                  src={`https://sleepercdn.com/avatars/thumbs/${topWinsCreated.user.avatar}`} 
                  alt="" 
                  className="w-10 h-10 rounded-full border border-purple-400/30 object-cover shrink-0" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-bold text-base text-white truncate group-hover:text-purple-300 transition-colors">
                  {topWinsCreated.user?.display_name || `Team ${topWinsCreated.roster_id}`}
                </div>
                <div className="text-xs text-purple-300 font-mono font-semibold">
                  {topWinsCreated.waiverWins} Matchup Wins
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted">No data available</div>
          )}
          <div className="text-[11px] text-muted mt-3 pt-2 border-t border-white/5 truncate flex items-center justify-between">
            <span>Decided by waiver points</span>
            <span className="text-purple-400/80 text-[10px]">Inspect ↗</span>
          </div>
        </div>
      </div>

      {/* ─── 3-Hub Navigation Bar ─── */}
      <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-2 mb-8 w-full">
        <button
          onClick={() => setActiveTab('matrices')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer w-full ${
            activeTab === 'matrices'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
              : 'text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeTab === 'matrices' ? 'bg-white/20' : 'bg-white/5'}`}>
            <Sparkles size={16} />
          </div>
          <span>Reliance & Strategy Matrices</span>
        </button>

        <button
          onClick={() => setActiveTab('positional')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer w-full ${
            activeTab === 'positional'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/30'
              : 'text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeTab === 'positional' ? 'bg-white/20' : 'bg-white/5'}`}>
            <Layers size={16} />
          </div>
          <span>Positional Overlays & Timing</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer w-full ${
            activeTab === 'ledger'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/30'
              : 'text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeTab === 'ledger' ? 'bg-white/20' : 'bg-white/5'}`}>
            <FileSpreadsheet size={16} />
          </div>
          <span>Acquisition Ledger & Impact</span>
        </button>
      </div>

      {/* ─── TAB 1: RELIANCE & STRATEGY MATRICES ─── */}
      {activeTab === 'matrices' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Scatter 1: Roster Reliance vs Win Rate */}
          <Card className="stagger-1">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-semibold text-white">Roster Reliance vs. Win Rate</h2>
              <ChartToggle value={macroFilter} onChange={setMacroFilter} />
            </div>
            <p className="text-xs text-muted mb-4">
              Measures dependency on free agency by charting % of total team points contributed by waivers against regular season win rate.
            </p>

            {/* Modern Cartesian Quadrant Badges */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="font-semibold text-blue-400">🛡️ Draft Dominant</div>
                <div className="text-muted text-[10px] mt-0.5">Top-Left • Low Waiver %, High Win %</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="font-semibold text-emerald-400">🛟 Waiver Rescued</div>
                <div className="text-muted text-[10px] mt-0.5">Top-Right • High Waiver %, High Win %</div>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="font-semibold text-rose-400">🛑 Stagnant Core</div>
                <div className="text-muted text-[10px] mt-0.5">Bottom-Left • Low Waiver %, Low Win %</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="font-semibold text-amber-400">🌊 Empty Churn</div>
                <div className="text-muted text-[10px] mt-0.5">Bottom-Right • High Waiver %, Low Win %</div>
              </div>
            </div>

            <MobileTapHint />
            <div style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    type="number" 
                    dataKey="reliance" 
                    name="Reliance" 
                    stroke="#94a3b8" 
                    unit="%"
                    domain={getCenteredBounds(macroData.map(d => d.reliance), avgRelianceMacro)} 
                    tick={{ fontSize: 12 }} 
                    allowDecimals={false}
                  >
                    <Label value="Waiver Reliance (% of total points)" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.8rem' }} />
                  </XAxis>
                  <YAxis 
                    type="number" 
                    dataKey="winPct" 
                    name="Win %" 
                    stroke="#94a3b8"
                    domain={getCenteredBounds(macroData.map(d => d.winPct), avgWinPct)} 
                    tick={{ fontSize: 12 }} 
                    width={55} 
                    allowDecimals={false}
                  >
                    <Label value="Win %" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.8rem' }} offset={10} />
                  </YAxis>
                  <ReferenceLine x={avgRelianceMacro} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <ReferenceLine y={avgWinPct} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <RechartsTooltip content={<RelianceTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter 
                    name="Managers" 
                    data={macroData} 
                    shape={<CustomAvatarDot onClick={(r: FreeAgencyResult) => setSelectedManager(r)} />} 
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Scatter 2: Streamer vs Stasher Matrix */}
          <Card className="stagger-1">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-semibold text-white">Streamer vs. Stasher Matrix</h2>
              <ChartToggle value={matrixFilter} onChange={setMatrixFilter} />
            </div>
            <p className="text-xs text-muted mb-4">
              Total pickups vs. average hold duration (weeks). Identifies patient roster developers vs rotational churn streamers.
            </p>

            {/* Modern Cartesian Quadrant Badges */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <div className="font-semibold text-indigo-400">🎯 Targeted Stashers</div>
                <div className="text-muted text-[10px] mt-0.5">Top-Left • Low Volume, Long Hold Duration</div>
              </div>
              <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                <div className="font-semibold text-teal-400">🏗️ Active Builders</div>
                <div className="text-muted text-[10px] mt-0.5">Top-Right • High Volume, Long Hold Duration</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-500/10 border border-slate-500/20">
                <div className="font-semibold text-slate-300">🩹 Emergency Fill-Ins</div>
                <div className="text-muted text-[10px] mt-0.5">Bottom-Left • Low Volume, Short Hold Duration</div>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="font-semibold text-purple-400">🔄 Weekly Streamers</div>
                <div className="text-muted text-[10px] mt-0.5">Bottom-Right • High Volume, Short Hold Duration</div>
              </div>
            </div>

            <MobileTapHint />
            <div style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    type="number" 
                    dataKey="pickups" 
                    name="Pickups" 
                    stroke="#94a3b8"
                    domain={getCenteredBounds(matrixData.map(d => d.pickups), avgPickups)} 
                    tick={{ fontSize: 12 }} 
                    allowDecimals={false}
                  >
                    <Label value="Total Pickups" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.8rem' }} />
                  </XAxis>
                  <YAxis 
                    type="number" 
                    dataKey="averageWeeksHeld" 
                    name="Avg Hold" 
                    stroke="#94a3b8"
                    domain={getCenteredBounds(matrixData.map(d => d.averageWeeksHeld), getMedian(matrixData.map(d => d.averageWeeksHeld)))} 
                    tick={{ fontSize: 12 }} 
                    width={55} 
                    allowDecimals={false}
                  >
                    <Label value="Avg Weeks Held" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.8rem' }} offset={10} />
                  </YAxis>
                  <ReferenceLine x={avgPickups} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <ReferenceLine y={getMedian(matrixData.map(d => d.averageWeeksHeld))} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <RechartsTooltip content={<MatrixTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter 
                    name="Managers" 
                    data={matrixData} 
                    shape={<CustomAvatarDot onClick={(r: FreeAgencyResult) => setSelectedManager(r)} />} 
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 2: POSITIONAL OVERLAYS & TIMING ─── */}
      {activeTab === 'positional' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Positional Radar */}
          <Card className="stagger-2">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-semibold text-white">Positional Strategy Overlay</h2>
              <ChartToggle value={posFilter} onChange={setPosFilter} />
            </div>
            <p className="text-xs text-muted mb-4">
              Compares acquisition points per position (normalized 0-100 against positional peak output).
            </p>
            <MobileTapHint />
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarChartData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <RechartsTooltip 
                    formatter={(_value: any, name: any, entry: any) => {
                      const rawKey = entry.dataKey?.replace('manager_', 'raw_');
                      const displayVal = entry.payload[rawKey] !== undefined ? entry.payload[rawKey] : _value;
                      return [`${displayVal} pts`, name];
                    }}
                    contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} 
                  />
                  {radarProfiles.map((p, i) => (
                    <Radar 
                      key={p.roster_id} 
                      name={p.user?.display_name || `Team ${p.roster_id}`} 
                      dataKey={`manager_${i}`} 
                      stroke={CHART_COLORS[i]} 
                      fill={CHART_COLORS[i]} 
                      fillOpacity={0.25} 
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {renderSelector(radarMgrs, setRadarMgrs, 'Positional Yield Comparison')}
          </Card>

          {/* Transaction Timing Heatmap */}
          <Card className="stagger-2">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">Transaction Timing Heatmap</h2>
                <p className="text-xs text-muted">Density of waiver claims and free agent adds by day of week.</p>
              </div>
              <ChartToggle value={timingFilter} onChange={setTimingFilter} />
            </div>

            <div className="md:hidden text-xs text-muted mb-2 italic">Swipe horizontally for all days</div>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse min-w-[440px]">
                <thead>
                  <tr>
                    <th className="py-2.5 px-2 text-xs font-semibold text-muted border-b border-white/10 w-32">Manager</th>
                    {['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'].map(d => (
                      <th key={d} className="py-2.5 px-1 text-xs font-semibold text-muted text-center border-b border-white/10">{d}</th>
                    ))}
                    <th className="py-2.5 px-2 text-xs font-semibold text-muted text-right border-b border-white/10 w-14">Tot</th>
                  </tr>
                </thead>
                <tbody>
                  {timingData.map(mgr => {
                    const maxVal = Math.max(...Object.values(mgr.transactionsByDay || {}), 1);
                    return (
                      <tr 
                        key={mgr.name} 
                        onClick={() => mgr.rawResult && setSelectedManager(mgr.rawResult)}
                        className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.04] cursor-pointer group"
                      >
                        <td className="py-2 px-2">
                          <div className="flex items-center text-sm font-medium">
                            {mgr.avatar ? (
                              <img 
                                src={`https://sleepercdn.com/avatars/thumbs/${mgr.avatar}`} 
                                className="w-5 h-5 rounded-full object-cover shrink-0 mr-2 border border-white/10" 
                                alt=""
                              /> 
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-700 shrink-0 mr-2" />
                            )}
                            <span className="truncate text-white text-xs group-hover:text-emerald-300 transition-colors">
                              {mgr.name}
                            </span>
                          </div>
                        </td>
                        {['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'].map(d => {
                          const val = (mgr.transactionsByDay || {})[d] || 0;
                          const opacity = val > 0 ? 0.2 + (val / maxVal) * 0.8 : 0.05;
                          return (
                            <td key={d} className="py-1.5 px-0.5">
                              <div 
                                className="w-full h-6 rounded flex items-center justify-center mx-auto transition-all" 
                                style={{ 
                                  backgroundColor: val > 0 ? `rgba(16, 185, 129, ${opacity})` : 'rgba(255,255,255,0.02)',
                                  border: val > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.02)'
                                }} 
                                title={`${val} transactions on ${d}`}
                              >
                                {val > 0 && (
                                  <span className="text-[10px] text-white font-mono font-bold">{val}</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="py-2 px-2 text-right">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {mgr.pickups}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 3: ACQUISITION LEDGER & IMPACT ─── */}
      {activeTab === 'ledger' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left: Top Pickups Acquisition Ledger */}
          <Card className="stagger-3">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">Top Pickups by Starter Points</h2>
                <p className="text-xs text-muted">Highest single-season starter point producers acquired via waivers / free agency.</p>
              </div>
              <ChartToggle value={ledgerFilter} onChange={setLedgerFilter} />
            </div>
            
            <div className="flex flex-col gap-2 overflow-y-auto pr-1 pb-4" style={{ maxHeight: '540px' }}>
              {ledger.map((asset, idx) => {
                const isTop3 = idx < 3;
                const rankColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : undefined;
                return (
                  <div 
                    key={`${asset.playerId}-${idx}`}
                    onClick={() => setSelectedPlayer(asset)}
                    className="flex justify-between items-center transition-all hover:bg-white/[0.04] p-3 rounded-xl border border-white/5 bg-white/[0.01] cursor-pointer group"
                    style={{ 
                      borderColor: isTop3 ? rankColor + '40' : undefined,
                      boxShadow: isTop3 ? `0 0 15px ${rankColor}10` : undefined
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="text-xs font-mono font-bold text-center shrink-0 w-5" 
                        style={{ color: rankColor || 'var(--text-secondary)' }}
                      >
                        {idx + 1}
                      </div>
                      {asset.managerAvatar ? (
                        <img 
                          src={`https://sleepercdn.com/avatars/thumbs/${asset.managerAvatar}`} 
                          alt="" 
                          className="w-8 h-8 rounded-full border border-white/10 object-cover shrink-0" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white truncate flex items-center gap-2 group-hover:text-accent-color transition-colors">
                          <span className="truncate">{asset.playerName}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-slate-300 shrink-0">
                            {asset.position}
                          </span>
                        </div>
                        <div className="text-xs text-muted mt-0.5 truncate">
                          <span className="text-accent-color font-medium">{asset.managerName}</span> · Wk {asset.weekAcquired} · {asset.weeksStarted} starts ·{' '}
                          {asset.acqType === 'faab' ? (
                            <span className="text-emerald-400 font-semibold">${asset.cost} FAAB</span>
                          ) : (
                            <span className="opacity-70 text-slate-300">$0 Street</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-mono font-bold text-base text-success-color">
                        +{asset.starterPoints.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-muted font-mono">
                        {asset.ppg} PPG
                      </div>
                    </div>
                  </div>
                );
              })}
              {ledger.length === 0 && (
                <div className="p-12 text-center text-muted italic bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                  No significant acquisition output recorded for this filter.
                </div>
              )}
            </div>
          </Card>

          {/* Right: Wins Created Bar Chart */}
          <Card className="stagger-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-semibold text-white">Waiver Matchup Wins Created</h2>
              <ChartToggle value={hitFilter} onChange={setHitFilter} />
            </div>
            <p className="text-xs text-muted mb-4">
              Matchups won where the margin of victory was less than the fantasy points supplied by waiver starters.
            </p>
            <MobileTapHint />
            <div style={{ height: 480 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hitData} layout="vertical" margin={{ left: 20, right: 20, bottom: 20, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false}>
                    <Label value="Matchups Won via Waivers" position="insideBottom" offset={-10} fill="#64748b" style={{ fontSize: '0.8rem' }} />
                  </XAxis>
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={85} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
                    contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    formatter={(value: any) => [`${value} Matchup(s)`, 'Wins Decided by Waivers']} 
                  />
                  <Bar dataKey="waiverWins" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ─── MODAL 1: PLAYER ACQUISITION DOSSIER ─── */}
      {selectedPlayer && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setSelectedPlayer(null)}
        >
          <div 
            className="relative w-full max-w-md bg-[#0f1115] border border-white/15 rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[90dvh] flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <Flame size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">{selectedPlayer.playerName}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-slate-200">
                      {selectedPlayer.position}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Acquired by <span className="text-accent-color font-semibold">{selectedPlayer.managerName}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Stats */}
            <div className="py-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-emerald-400" />
                    <span>Starter Yield</span>
                  </div>
                  <div className="text-xl font-mono font-bold text-success-color">
                    +{selectedPlayer.starterPoints.toFixed(1)} <span className="text-xs text-muted">pts</span>
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">{selectedPlayer.ppg} pts per start</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                    <DollarSign size={12} className="text-accent-color" />
                    <span>Acquisition Method</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-white">
                    {selectedPlayer.acqType === 'faab' ? `$${selectedPlayer.cost} FAAB` : '$0 Free Agent'}
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">Claimed in Week {selectedPlayer.weekAcquired}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted">
                  <span>Lineup Starts</span>
                  <span className="font-mono font-bold text-white">{selectedPlayer.weeksStarted} Matchups</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Bench Output</span>
                  <span className="font-mono font-bold text-slate-300">{selectedPlayer.benchPoints.toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between items-center text-muted pt-2 border-t border-white/5">
                  <span>Total Contribution</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{(selectedPlayer.starterPoints + selectedPlayer.benchPoints).toFixed(1)} pts
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL 2: MANAGER WAIVER DOSSIER ─── */}
      {selectedManager && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setSelectedManager(null)}
        >
          <div 
            className="relative w-full max-w-lg bg-[#0f1115] border border-white/15 rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[90dvh] flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {selectedManager.user?.avatar ? (
                  <img 
                    src={`https://sleepercdn.com/avatars/thumbs/${selectedManager.user.avatar}`} 
                    alt="" 
                    className="w-12 h-12 rounded-full border border-emerald-400/40 object-cover shrink-0 shadow-lg shadow-emerald-500/10" 
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-700 shrink-0" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {selectedManager.user?.display_name || `Team ${selectedManager.roster_id}`}
                  </h3>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
                    <span>Record: <strong className="text-white font-mono">{selectedManager.totalWins} Wins ({selectedManager.winPct.toFixed(1)}%)</strong></span>
                    <span>·</span>
                    <span>Waiver Reliance: <strong className="text-accent-color font-mono">{((selectedManager.pointsGenerated / Math.max(1, selectedManager.totalRosterPoints)) * 100).toFixed(1)}%</strong></span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedManager(null)}
                className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Stats */}
            <div className="py-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-0.5">Starter Points</div>
                  <div className="text-lg font-mono font-bold text-success-color">+{selectedManager.pointsGenerated.toFixed(1)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-0.5">Hit Rate</div>
                  <div className="text-lg font-mono font-bold text-cyan-400">{selectedManager.hitRate}%</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-0.5">Avg Hold</div>
                  <div className="text-lg font-mono font-bold text-amber-400">{selectedManager.averageWeeksHeld} wks</div>
                </div>
              </div>

              {selectedManager.topPickup && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Crown size={16} className="text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">{selectedManager.topPickup.playerName}</div>
                      <div className="text-[10px] text-muted">Best In-Season Addition ({selectedManager.topPickup.position})</div>
                    </div>
                  </div>
                  <div className="text-sm font-mono font-bold text-emerald-300">
                    +{selectedManager.topPickup.points.toFixed(1)} pts
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted">
                  <span>Total In-Season Pickups</span>
                  <span className="font-mono font-bold text-white">{selectedManager.totalPickups} Players</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Starting Hits / Busts</span>
                  <span className="font-mono font-bold text-slate-300">{selectedManager.hits} Hits · {selectedManager.busts} Busts</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Bench Points Stashed</span>
                  <span className="font-mono font-bold text-slate-300">{selectedManager.benchPointsGenerated.toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between items-center text-muted pt-2 border-t border-white/5">
                  <span>Matchup Wins Decided by Waivers</span>
                  <span className="font-mono font-bold text-purple-400">{selectedManager.waiverWins} Matchups</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setSelectedManager(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
