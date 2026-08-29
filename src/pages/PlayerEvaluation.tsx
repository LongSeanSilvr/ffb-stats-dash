import React, { useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useAuth } from '../context/AuthContext';
import { RestrictedAccessTaunt } from '../components/waivers/RestrictedAccessTaunt';
import { 
  usePlayerEvaluation, 
  type TimeframeScope, 
  type OwnershipFilter, 
  type PositionFilter, 
  type PlayerEvaluationItem 
} from '../hooks/usePlayerEvaluation';
import { PlayerRadarDrawer } from '../components/waivers/PlayerRadarDrawer';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ZAxis,
  Cell
} from 'recharts';
import { 
  Target, 
  Search, 
  Sparkles, 
  Flame, 
  Zap, 
  Layers, 
  TrendingUp, 
  Activity, 
  Filter, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Award,
  ChevronDown,
  ChevronUp,
  BookOpen,
  HelpCircle,
  Info,
  Lock
} from 'lucide-react';

type ViewTab = 'overview' | 'usage' | 'receiving' | 'rushing' | 'special_teams';
type SortField = keyof PlayerEvaluationItem;

type RoleFilter = 'ALL' | 'OFFENSIVE' | 'VELOCITY' | 'RETURNERS';

export const PlayerEvaluation: React.FC = () => {
  const { selectedSeason, selectedSeasonId } = useLeagueContext();
  const { isUnlocked, lock, setIsUnlockModalOpen } = useAuth();
  const currentSeasonYear = selectedSeason?.league.season || '2025';
  const scoringSettings = (selectedSeason?.league as any)?.scoring_settings || selectedSeason?.league.settings;

  // Evaluation Hook
  const { loading, error, getScopedData, completedWeeks } = usePlayerEvaluation(
    selectedSeasonId,
    currentSeasonYear,
    scoringSettings,
    isUnlocked
  );

  // States & Filters
  const [timeframe, setTimeframe] = useState<TimeframeScope>('full');
  const [ownership, setOwnership] = useState<OwnershipFilter>('available');
  const [position, setPosition] = useState<PositionFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [returnersOnly, setReturnersOnly] = useState<boolean>(false);
  const [minSnaps, setMinSnaps] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('mortyEdgeIndex');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Selected Player for Detail Drawer
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerEvaluationItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Scoped Data based on Timeframe
  const rawScopedData = useMemo(() => {
    return getScopedData(timeframe);
  }, [getScopedData, timeframe]);

  // Filtered Data
  const filteredData = useMemo(() => {
    return rawScopedData.filter(p => {
      // Ownership filter
      if (ownership === 'available' && p.isRostered) return false;
      if (ownership === 'rostered' && !p.isRostered) return false;

      // Position filter
      if (position === 'FLEX') {
        if (!['RB', 'WR', 'TE'].includes(p.pos)) return false;
      } else if (position !== 'ALL') {
        if (p.pos !== position) return false;
      }

      // Role Filter
      if (roleFilter === 'OFFENSIVE' && p.snapPct < 25) return false;
      if (roleFilter === 'VELOCITY' && p.snapTrend3Wk <= 0) return false;
      if (roleFilter === 'RETURNERS' && p.totalReturnYd === 0) return false;

      // Returners Only Checkbox
      if (returnersOnly && p.totalReturnYd === 0) return false;

      // Min Snaps
      if (p.totalSnaps < minSnaps) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesTeam = p.team.toLowerCase().includes(q);
        const matchesOwner = p.owner?.display_name?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesTeam && !matchesOwner) return false;
      }

      return true;
    });
  }, [rawScopedData, ownership, position, roleFilter, returnersOnly, minSnaps, searchQuery]);

  // Sorted Data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const valA = (a[sortField] ?? 0) as number | string;
      const valB = (b[sortField] ?? 0) as number | string;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(a[sortField] as string);
      }

      const numA = typeof valA === 'number' ? valA : 0;
      const numB = typeof valB === 'number' ? valB : 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
  }, [filteredData, sortField, sortDirection]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleOpenPlayer = (player: PlayerEvaluationItem) => {
    if (!isUnlocked) {
      setIsUnlockModalOpen(true);
      return;
    }
    setSelectedPlayer(player);
    setIsDrawerOpen(true);
  };

  // Curated Spotlight Recommendations (scoped by ownership filter)
  const spotlights = useMemo(() => {
    const pool = rawScopedData.filter(p => {
      if (p.gamesPlayed === 0) return false;
      if (ownership === 'available') return !p.isRostered;
      if (ownership === 'rostered') return p.isRostered;
      return true;
    });

    // 1. Role Velocity & Breakouts (Snap Surge + Touches) - The Parker Washington / Breakout Profile
    const roleVelocityRisers = [...pool]
      .filter(p => p.snapTrend3Wk >= 5.0 && (p.targets >= 3 || p.carries >= 5 || p.totalTouches >= 8))
      .sort((a, b) => b.snapTrend3Wk - a.snapTrend3Wk)
      .slice(0, 4);

    // 2. High-Value Touch (HVT) RBs
    const hvtWorkhorses = [...pool]
      .filter(p => p.pos === 'RB' && p.totalTouches >= 5)
      .sort((a, b) => b.hvtPerGame - a.hvtPerGame)
      .slice(0, 4);

    // 3. WOPR & Air Yard Risers (Receiving Intent)
    const woprRisers = [...pool]
      .filter(p => ['WR', 'TE'].includes(p.pos) && p.targets >= 4)
      .sort((a, b) => b.wopr - a.wopr)
      .slice(0, 4);

    // 4. Special Teams Return Floor Hacks
    const returnDynamos = [...pool]
      .filter(p => p.totalReturnYd > 80 || p.returnFloorPpg >= 2.5)
      .sort((a, b) => b.returnFloorPpg - a.returnFloorPpg)
      .slice(0, 4);

    return { roleVelocityRisers, hvtWorkhorses, woprRisers, returnDynamos };
  }, [rawScopedData, ownership]);

  // Scatter Chart Data
  const scatterData = useMemo(() => {
    return filteredData.slice(0, 100).map(p => ({
      name: isUnlocked ? p.name : '[CLASSIFIED]',
      pos: p.pos,
      team: isUnlocked ? p.team : '???',
      isRostered: p.isRostered,
      touches: p.totalTouches,
      customPts: Number(p.totalCustomPts.toFixed(1)),
      fdRate: Number(p.fdPerTouch.toFixed(1)),
      raw: p
    }));
  }, [filteredData, isUnlocked]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Header & Page Description */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Target size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Player Evaluation Hub</h1>
          </div>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            {ownership === 'available'
              ? "Uncover high-leverage waiver gems evaluated under our league's unique scoring format (0-PPR, +1.0 PPFD, Dynamic Kickoffs) and advanced predictive metrics."
              : ownership === 'rostered'
              ? "Evaluate rostered player usage, identify trade targets and sell-high candidates, and discover players outperforming their national valuation."
              : "Comprehensive league-wide player evaluation across all NFL assets, combining opportunity velocity and custom league scoring."}
          </p>
        </div>

        {/* Top Controls: Ownership Scope, Timeframe Scope & Lock */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Ownership Scope Toggle (Waivers vs Rostered vs All) */}
          <div className="glass-toggle-container flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/10">
            <button
              onClick={() => { setOwnership('available'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${ownership === 'available' ? 'bg-emerald-500 text-black font-bold shadow' : 'text-muted hover:text-white'}`}
            >
              Available Waivers
            </button>
            <button
              onClick={() => { setOwnership('rostered'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${ownership === 'rostered' ? 'bg-blue-500 text-white font-bold shadow' : 'text-muted hover:text-white'}`}
            >
              Rostered / Trade Targets
            </button>
            <button
              onClick={() => { setOwnership('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${ownership === 'all' ? 'bg-white/15 text-white font-bold shadow' : 'text-muted hover:text-white'}`}
            >
              All Players
            </button>
          </div>

          {/* Timeframe Scope Pills */}
          <div className="glass-toggle-container flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/10">
            <button
              onClick={() => { setTimeframe('full'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeframe === 'full' ? 'bg-cyan-500 text-black font-bold shadow' : 'text-muted hover:text-white'}`}
            >
              Full Season
            </button>
            <button
              onClick={() => { setTimeframe('last1'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeframe === 'last1' ? 'bg-cyan-500 text-black font-bold shadow' : 'text-muted hover:text-white'}`}
            >
              Last 1 Wk
            </button>
            <button
              onClick={() => { setTimeframe('last3'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeframe === 'last3' ? 'bg-cyan-500 text-black font-bold shadow' : 'text-muted hover:text-white'}`}
            >
              Last 3 Wks
            </button>
            <button
              onClick={() => { setTimeframe('last5'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeframe === 'last5' ? 'bg-cyan-500 text-black font-bold shadow' : 'text-muted hover:text-white'}`}
            >
              Last 5 Wks
            </button>
          </div>

          {/* Lock / Unlock Toggle */}
          {isUnlocked ? (
            <button
              onClick={lock}
              title="Lock player names (blur identities)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-rose-500/20 border border-emerald-500/30 hover:border-rose-500/30 text-xs font-semibold text-emerald-300 hover:text-rose-300 transition-all cursor-pointer shadow-sm"
            >
              <ShieldCheck size={13} />
              <span className="hidden sm:inline">Lock Names</span>
            </button>
          ) : (
            <button
              onClick={() => setIsUnlockModalOpen(true)}
              title="Classified Player Identities - Click to unlock"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 transition-all cursor-pointer shadow-sm animate-pulse"
            >
              <Lock size={13} />
              <span className="hidden sm:inline">Classified (Unlock)</span>
            </button>
          )}

        </div>
      </div>

      {loading ? (
        <div className="glass-card flex flex-col items-center justify-center p-12 text-center space-y-3">
          <Activity size={32} className="animate-spin text-cyan-400" />
          <p className="text-sm font-semibold text-white">Aggregating advanced metrics & scoring data across all NFL weeks...</p>
          <p className="text-xs text-muted">Calculating WOPR, aDoT, First-Down rates, and return floors...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-6 border-rose-500/30 text-rose-400 text-center">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : (
        <>
          {/* ─────────────────────────────────────────────────────────────────────────────
              METRICS & STRATEGY CHEAT SHEET (COLLAPSIBLE GLOSSARY)
             ───────────────────────────────────────────────────────────────────────────── */}
          <div className="glass-card rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-r from-cyan-950/20 via-white/[0.01] to-purple-950/20">
            <button
              onClick={() => setShowGuide(prev => !prev)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Metrics & Strategy Cheat Sheet</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 font-mono">
                      How to use WOPR, aDoT, 1D%, HVT, & Return Floor
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Click to {showGuide ? 'collapse' : 'expand'} definitions, math formulas, and actionable waiver thresholds.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted hover:text-white">
                <span className="hidden sm:inline font-medium">{showGuide ? 'Hide Guide' : 'Open Guide'}</span>
                {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showGuide && (
              <div className="p-5 border-t border-white/10 bg-black/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs animate-fade-in">
                
                {/* Core Philosophy Banner */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-2.5">
                  <Sparkles size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-white">Core Waiver Strategy:</strong> <span className="text-cyan-200">Opportunity & Role Growth (Snap Trend Δ, WOPR, and HVT) dictate breakout upside; our unique league scoring (+1.0 PPFD, Return Yards) acts as the value multiplier. Prioritize role surges first, and use return floor as a secondary baseline booster.</span>
                  </div>
                </div>

                {/* Metric 1: WOPR */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <Target size={13} />
                      <span>WOPR (Weighted Opportunity)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">WR / TE</span>
                  </div>
                  <div className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    Formula: 1.5 × Target Share + 0.7 × Air Yards Share
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    The <strong className="text-white">#1 predictive metric</strong> for receiving volume. It measures true receiving intent before fantasy points catch up.
                  </p>
                  <div className="text-[10px] text-emerald-400 font-semibold pt-0.5">
                    ★ Rule of Thumb: &gt; 0.55 is alpha volume, &gt; 0.40 is strong starter.
                  </div>
                </div>

                {/* Metric 2: TPRR */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-cyan-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400 flex items-center gap-1">
                      <Activity size={13} />
                      <span>TPRR (Targets Per Route Run)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">Efficiency Alpha</span>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                    Formula: Total Targets / Estimated Routes Run
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    The <strong className="text-white">gold standard efficiency metric</strong> for identifying part-time breakout wide receivers and tight ends before they earn full-time snaps.
                  </p>
                  <div className="text-[10px] text-cyan-300 font-semibold pt-0.5">
                    ★ Rule of Thumb: &gt; 25% is elite target earner, &gt; 30% is alpha breakout.
                  </div>
                </div>

                {/* Metric 2: aDoT */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-cyan-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400 flex items-center gap-1">
                      <TrendingUp size={13} />
                      <span>aDoT (Average Depth of Target)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">All Pass Catchers</span>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                    Formula: Total Air Yards / Targets
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    How far downfield a player is targeted on average. High-aDoT (&gt;12y) receivers convert catches into <strong className="text-white">+1.0 PPFD first downs</strong> and 40+ yard bonuses at high rates. Low aDoT (&lt;6.5y) dump-off receivers get crushed by 0-PPR.
                  </p>
                </div>

                {/* Metric 3: HVT */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Flame size={13} />
                      <span>HVT (High-Value Touches)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">Running Backs</span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                    Formula: Red Zone Carries (inside the 10) + Targets
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    Isolates the high-yield touches that generate 80%+ of RB fantasy touchdowns. Between-the-20s carries are low-yield grinder touches.
                  </p>
                  <div className="text-[10px] text-emerald-400 font-semibold pt-0.5">
                    ★ Rule of Thumb: Target backup RBs with &gt; 3.0 HVT/game.
                  </div>
                </div>

                {/* Metric 4: 1D% */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Award size={13} />
                      <span>1D% (First Down Conversion)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">Format Edge</span>
                  </div>
                  <div className="text-[10px] font-mono text-amber-200 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    Formula: (Rush 1D + Rec 1D) / Total Touches
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    Our league awards <strong className="text-white">+1.0 pt per first down</strong>. A 15-touch player converting 8 first downs adds +8.0 free fantasy points per game.
                  </p>
                </div>

                {/* Metric 5: Return Floor */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-cyan-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 flex items-center gap-1">
                      <Zap size={13} />
                      <span>Return Floor PPG</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">Special Teams Hack</span>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-200 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                    Formula: (KR/15) + (PR/20) + (Ret TDs × 6) / GP
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    The NFL's dynamic kickoff yields 70%+ return rates. A player with <strong className="text-white">+6.0 return PPG</strong> only needs 6 offensive points to score like a high-end WR2/Flex every single week.
                  </p>
                </div>

                {/* Metric 6: Morty Edge Index */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-purple-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300 flex items-center gap-1">
                      <ShieldCheck size={13} />
                      <span>Morty Edge Index (0–100)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">Composite Rating</span>
                  </div>
                  <div className="text-[10px] font-mono text-purple-200 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                    Formula: Role Trend + WOPR/HVT + 1D% + Return Floor
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    Custom composite rating tuned specifically for our league. Sort by Edge Index to immediately surface the highest-leverage waiver claims.
                  </p>
                </div>

              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────────────────────
              1. AT-A-GLANCE SPOTLIGHT DASHBOARDS (4 DYNAMIC RADAR CARDS)
             ───────────────────────────────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className={ownership === 'rostered' ? 'text-blue-400' : 'text-amber-400'} />
                <span>
                  {ownership === 'available'
                    ? 'Waiver Radar Spotlights (Unrostered Hidden Gems)'
                    : ownership === 'rostered'
                    ? 'Trade Target Spotlights (High-Leverage Rostered Assets)'
                    : 'League-Wide Spotlights (All Players)'}
                </span>
              </h3>
              <span className="text-[11px] text-muted">{completedWeeks.length} Weeks Analyzed</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* Card 1: Role Velocity & Breakout Surges */}
              <div className="glass-card p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-500/[0.04] to-transparent flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase text-purple-400 tracking-wider flex items-center gap-1">
                      <TrendingUp size={13} />
                      <span>Role Velocity Surges</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">Snap Δ</span>
                  </div>
                  <p className="text-[11px] text-muted mb-3">
                    {ownership === 'available'
                      ? 'Unrostered players whose snap share & usage surged over the last 3 weeks.'
                      : ownership === 'rostered'
                      ? 'Rostered assets taking over expanding backfields or receiving roles.'
                      : 'Players whose snap share & usage surged over the last 3 weeks.'}
                  </p>
                  
                  <div className="space-y-2">
                    {spotlights.roleVelocityRisers.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleOpenPlayer(p)}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold truncate ${isUnlocked ? 'text-white group-hover:text-purple-300' : 'text-white/40 filter blur-[5px] select-none pointer-events-none'}`}>
                                {isUnlocked ? p.name : '██████████'}
                              </span>
                              {ownership === 'all' && (
                                <span className={`text-[8px] px-1 py-0.2 rounded font-semibold ${p.isRostered ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                  {p.isRostered ? 'Rostered' : 'Waiver'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted flex items-center gap-1 truncate">
                              <span>{p.pos} • <span className={isUnlocked ? '' : 'filter blur-[4px] select-none text-white/30'}>{isUnlocked ? p.team : '???'}</span></span>
                              {p.isRostered && p.owner && (
                                <span className={`text-blue-300/80 font-medium truncate ${isUnlocked ? '' : 'filter blur-[4px] select-none'}`}>
                                  ({isUnlocked ? p.owner.display_name : '????'})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0 pl-2">
                          <span className="text-xs font-bold text-purple-400 whitespace-nowrap">+{p.snapTrend3Wk.toFixed(0)}% Δ</span>
                          <span className="text-[9px] text-muted block whitespace-nowrap">{p.snapPct.toFixed(0)}% snap • {p.targets + p.carries} tch</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: WOPR & Air Yard Risers */}
              <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.04] to-transparent flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1">
                      <Target size={13} />
                      <span>WOPR / Air Yard Risers</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">Volume</span>
                  </div>
                  <p className="text-[11px] text-muted mb-3">
                    {ownership === 'available'
                      ? 'Available pass-catchers commanding heavy target intent & deep air yards.'
                      : ownership === 'rostered'
                      ? 'Rostered alpha receivers dominating team air yards and targets.'
                      : 'Pass catchers commanding large target intent & deep air yards share.'}
                  </p>
                  
                  <div className="space-y-2">
                    {spotlights.woprRisers.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleOpenPlayer(p)}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold truncate ${isUnlocked ? 'text-white group-hover:text-amber-300' : 'text-white/40 filter blur-[5px] select-none pointer-events-none'}`}>
                                {isUnlocked ? p.name : '██████████'}
                              </span>
                              {ownership === 'all' && (
                                <span className={`text-[8px] px-1 py-0.2 rounded font-semibold ${p.isRostered ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                  {p.isRostered ? 'Rostered' : 'Waiver'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted flex items-center gap-1 truncate">
                              <span>{p.pos} • <span className={isUnlocked ? '' : 'filter blur-[4px] select-none text-white/30'}>{isUnlocked ? p.team : '???'}</span></span>
                              {p.isRostered && p.owner && (
                                <span className={`text-blue-300/80 font-medium truncate ${isUnlocked ? '' : 'filter blur-[4px] select-none'}`}>
                                  ({isUnlocked ? p.owner.display_name : '????'})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0 pl-2">
                          <span className="text-xs font-bold text-amber-400">{p.wopr.toFixed(2)}</span>
                          <span className="text-[9px] text-muted block whitespace-nowrap">
                            WOPR ({p.tprr > 0 ? `${p.tprr.toFixed(0)}% TPRR • ` : ''}{p.aDoT.toFixed(1)} aDoT)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: HVT & Goal-Line Snipers */}
              <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.04] to-transparent flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                      <Flame size={13} />
                      <span>HVT Workhorse RBs</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">RZ + Tgts</span>
                  </div>
                  <p className="text-[11px] text-muted mb-3">
                    {ownership === 'available'
                      ? 'Available running backs seeing high-yield red zone and pass-catching volume.'
                      : ownership === 'rostered'
                      ? 'Rostered workhorses capturing high-yield red zone touches & targets.'
                      : 'Running backs seeing high-yield red zone and pass-catching volume.'}
                  </p>
                  
                  <div className="space-y-2">
                    {spotlights.hvtWorkhorses.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleOpenPlayer(p)}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold truncate ${isUnlocked ? 'text-white group-hover:text-emerald-300' : 'text-white/40 filter blur-[5px] select-none pointer-events-none'}`}>
                                {isUnlocked ? p.name : '██████████'}
                              </span>
                              {ownership === 'all' && (
                                <span className={`text-[8px] px-1 py-0.2 rounded font-semibold ${p.isRostered ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                  {p.isRostered ? 'Rostered' : 'Waiver'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted flex items-center gap-1 truncate">
                              <span>{p.pos} • <span className={isUnlocked ? '' : 'filter blur-[4px] select-none text-white/30'}>{isUnlocked ? p.team : '???'}</span></span>
                              {p.isRostered && p.owner && (
                                <span className={`text-blue-300/80 font-medium truncate ${isUnlocked ? '' : 'filter blur-[4px] select-none'}`}>
                                  ({isUnlocked ? p.owner.display_name : '????'})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0 pl-2">
                          <span className="text-xs font-bold text-emerald-400">{p.hvtPerGame.toFixed(1)}</span>
                          <span className="text-[9px] text-muted block whitespace-nowrap">HVT/g ({p.rushFdRate.toFixed(0)}% 1D)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 4: Special Teams Dynamos */}
              <div className="glass-card p-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.04] to-transparent flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase text-cyan-400 tracking-wider flex items-center gap-1">
                      <Zap size={13} />
                      <span>Return Game Hacks</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono">1pt/15 KR</span>
                  </div>
                  <p className="text-[11px] text-muted mb-3">
                    {ownership === 'available'
                      ? 'Unrostered return dynamos with steady weekly baseline special teams floors.'
                      : ownership === 'rostered'
                      ? 'Rostered players offering massive built-in return yardage floors.'
                      : 'Special teams specialists with steady weekly baseline return points.'}
                  </p>
                  
                  <div className="space-y-2">
                    {spotlights.returnDynamos.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleOpenPlayer(p)}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold truncate ${isUnlocked ? 'text-white group-hover:text-cyan-300' : 'text-white/40 filter blur-[5px] select-none pointer-events-none'}`}>
                                {isUnlocked ? p.name : '██████████'}
                              </span>
                              {ownership === 'all' && (
                                <span className={`text-[8px] px-1 py-0.2 rounded font-semibold ${p.isRostered ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                  {p.isRostered ? 'Rostered' : 'Waiver'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted flex items-center gap-1 truncate">
                              <span>{p.pos} • <span className={isUnlocked ? '' : 'filter blur-[4px] select-none text-white/30'}>{isUnlocked ? p.team : '???'}</span></span>
                              {p.isRostered && p.owner && (
                                <span className={`text-blue-300/80 font-medium truncate ${isUnlocked ? '' : 'filter blur-[4px] select-none'}`}>
                                  ({isUnlocked ? p.owner.display_name : '????'})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0 pl-2">
                          <span className="text-xs font-bold text-cyan-400">+{p.returnFloorPpg.toFixed(1)}</span>
                          <span className="text-[9px] text-muted block whitespace-nowrap">ret ppg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────────────────
              2. INTERACTIVE OPPORTUNITY VS EFFICIENCY MATRIX (SCATTER PLOT)
             ───────────────────────────────────────────────────────────────────────────── */}
          <div className="glass-card p-5 rounded-2xl border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity size={16} className="text-cyan-400" />
                  <span>Opportunity vs. Custom Scoring Matrix</span>
                </h3>
                <p className="text-xs text-muted">
                  Compare total touches against custom fantasy points. Click any player dot to open full drilldown.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-muted">Available Free Agents</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400/60" />
                  <span className="text-muted">Rostered Players</span>
                </div>
              </div>
            </div>

            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    type="number" 
                    dataKey="touches" 
                    name="Total Touches" 
                    stroke="rgba(255,255,255,0.4)" 
                    fontSize={11}
                    unit=" tch"
                  />
                  <YAxis 
                    type="number" 
                    dataKey="customPts" 
                    name="Custom Fantasy Pts" 
                    stroke="rgba(255,255,255,0.4)" 
                    fontSize={11}
                    unit=" pts"
                  />
                  <ZAxis range={[50, 180]} />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0f1115] border border-white/20 p-3 rounded-xl shadow-2xl text-xs font-sans space-y-1">
                          <div className="font-bold text-white flex items-center justify-between gap-3">
                            <span>{d.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10">{d.pos} • {d.team}</span>
                          </div>
                          <div className="text-cyan-400 font-mono font-semibold">{d.customPts} Custom Pts ({d.touches} Touches)</div>
                          <div className="text-amber-400 font-mono text-[11px]">{d.fdRate}% First Down Rate</div>
                          <div className={`text-[10px] font-semibold ${d.isRostered ? 'text-blue-400' : 'text-emerald-400 font-bold'}`}>
                            {d.isRostered ? 'Rostered' : '★ Available on Waivers'}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={scatterData}
                    onClick={(entry: any) => {
                      if (entry && entry.raw) handleOpenPlayer(entry.raw);
                    }}
                    cursor="pointer"
                  >
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isRostered ? '#38bdf8' : '#10b981'}
                        fillOpacity={entry.isRostered ? 0.45 : 0.9}
                        stroke={entry.isRostered ? 'rgba(56,189,248,0.6)' : '#34d399'}
                        strokeWidth={entry.isRostered ? 1 : 2}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────────────────
              3. MASTER PLAYER EVALUATION TABLE & MULTI-FACETED CONTROLS
             ───────────────────────────────────────────────────────────────────────────── */}
          <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
            
            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Left Filters: Position Chips & Role Archetype Chips */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Position Chips */}
                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  {(['ALL', 'FLEX', 'RB', 'WR', 'TE', 'QB', 'K', 'DEF'] as PositionFilter[]).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => { setPosition(pos); setCurrentPage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        position === pos
                          ? 'bg-cyan-500 text-black shadow'
                          : 'bg-white/[0.03] text-muted hover:text-white border border-white/5'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>

                {/* Role Archetype Filter */}
                <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                  <button
                    onClick={() => { setRoleFilter('ALL'); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${roleFilter === 'ALL' ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}
                  >
                    All Roles
                  </button>
                  <button
                    onClick={() => { setRoleFilter('OFFENSIVE'); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${roleFilter === 'OFFENSIVE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-muted hover:text-white'}`}
                    title="Filters for players with >= 25% snap share (isolates offensive contributors from pure returners)"
                  >
                    Offensive Core (≥25% Snaps)
                  </button>
                  <button
                    onClick={() => { setRoleFilter('VELOCITY'); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${roleFilter === 'VELOCITY' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-muted hover:text-white'}`}
                    title="Filters for players with positive 3-week snap growth (Rising roles)"
                  >
                    Velocity Surges (Snap Δ &gt; 0)
                  </button>
                </div>
              </div>

              {/* Right Filters: Search, Returner toggle, Snap filter */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Search Box */}
                <div className="relative min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search player or team..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Returners Checkbox */}
                <label className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-white transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={returnersOnly}
                    onChange={(e) => { setReturnersOnly(e.target.checked); setCurrentPage(1); }}
                    className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Returners Only</span>
                </label>

              </div>
            </div>

            {/* View Dimension Tabs */}
            <div className="border-b border-white/10 flex items-center gap-1 overflow-x-auto pt-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/[0.05]'
                    : 'border-transparent text-muted hover:text-white'
                }`}
              >
                Overview & Scoring
              </button>
              <button
                onClick={() => setActiveTab('usage')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'usage'
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/[0.05]'
                    : 'border-transparent text-muted hover:text-white'
                }`}
              >
                Usage & Opportunity
              </button>
              <button
                onClick={() => setActiveTab('receiving')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'receiving'
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/[0.05]'
                    : 'border-transparent text-muted hover:text-white'
                }`}
              >
                Air Yards & Receiving
              </button>
              <button
                onClick={() => setActiveTab('rushing')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'rushing'
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/[0.05]'
                    : 'border-transparent text-muted hover:text-white'
                }`}
              >
                Rushing & Tackle-Breaking
              </button>
              <button
                onClick={() => setActiveTab('special_teams')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'special_teams'
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/[0.05]'
                    : 'border-transparent text-muted hover:text-white'
                }`}
              >
                Special Teams & Returns
              </button>
            </div>

            {/* Main Data Table */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-muted uppercase text-[10px] font-semibold border-b border-white/10 select-none">
                  <tr>
                    <th className="py-3 px-3.5 cursor-pointer" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">
                        <span>Player</span>
                        {sortField === 'name' && <ArrowUpDown size={12} className="text-cyan-400" />}
                      </div>
                    </th>
                    <th className="py-3 px-2">Status</th>
                    
                    {/* View Specific Columns */}
                    {activeTab === 'overview' && (
                      <>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('mortyEdgeIndex')} title="Morty Edge Index (0-100): Composite breakout rating combining role growth, WOPR/HVT volume, 1D conversion rate, and return floor.">
                          <div className="flex items-center justify-end gap-1">
                            <span>Edge Idx</span>
                            {sortField === 'mortyEdgeIndex' && <ArrowUpDown size={12} className="text-amber-400" />}
                          </div>
                        </th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('totalCustomPts')} title="Total custom fantasy points scored under our exact league rules.">
                          <div className="flex items-center justify-end gap-1">
                            <span>Custom Pts</span>
                            {sortField === 'totalCustomPts' && <ArrowUpDown size={12} className="text-emerald-400" />}
                          </div>
                        </th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('customPpg')} title="Custom Points Per Game played.">
                          <div className="flex items-center justify-end gap-1">
                            <span>PPG</span>
                            {sortField === 'customPpg' && <ArrowUpDown size={12} className="text-cyan-400" />}
                          </div>
                        </th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('deltaVsStd')} title="Custom Pts minus Standard Scoring Pts. Reflects exact bonus points from PPFD First Downs, Return Yards, and Scoring Bonuses in our format.">
                          <div className="flex items-center justify-end gap-1">
                            <span>STD Δ</span>
                            {sortField === 'deltaVsStd' && <ArrowUpDown size={12} className="text-cyan-400" />}
                          </div>
                        </th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('totalFd')} title="Total Rushing + Receiving First Downs (+1.0 pt each in our league).">
                          <div className="flex items-center justify-end gap-1">
                            <span>1D Total</span>
                            {sortField === 'totalFd' && <ArrowUpDown size={12} className="text-cyan-400" />}
                          </div>
                        </th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('fdPerTouch')} title="First Down Conversion Rate: Total first downs divided by total touches.">
                          <div className="flex items-center justify-end gap-1">
                            <span>1D%</span>
                            {sortField === 'fdPerTouch' && <ArrowUpDown size={12} className="text-cyan-400" />}
                          </div>
                        </th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('wopr')} title="Weighted Opportunity Rating: 1.5 * Target Share + 0.7 * Air Yards Share. The #1 predictive metric for WR receiving volume (> 0.50 is elite).">
                          <div className="flex items-center justify-end gap-1">
                            <span>WOPR</span>
                            {sortField === 'wopr' && <ArrowUpDown size={12} className="text-cyan-400" />}
                          </div>
                        </th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('tprr')} title="Targets Per Route Run (TPRR %): Percentage of pass routes where the player earned a target. >25% indicates elite target earning power.">
                          <div className="flex items-center justify-end gap-1">
                            <span>TPRR</span>
                            {sortField === 'tprr' && <ArrowUpDown size={12} className="text-cyan-400" />}
                          </div>
                        </th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('returnFloorPpg')} title="Return Floor PPG: Average weekly points scored purely on special teams kickoff/punt returns.">
                          <div className="flex items-center justify-end gap-1">
                            <span>Ret Floor</span>
                            {sortField === 'returnFloorPpg' && <ArrowUpDown size={12} className="text-cyan-400" />}
                          </div>
                        </th>
                        <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('snapPct')} title="Offensive snap share percentage of team offensive snaps.">
                          <div className="flex items-center justify-end gap-1">
                            <span>Snap%</span>
                            {sortField === 'snapPct' && <ArrowUpDown size={12} className="text-cyan-400" />}
                          </div>
                        </th>
                      </>
                    )}

                    {activeTab === 'usage' && (
                      <>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('snapPct')} title="Offensive snap share percentage.">Snap%</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('snapTrend3Wk')} title="Snap Trend: 3-week change in snap share percentage compared to baseline.">3-Wk Δ</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('totalTouches')} title="Total Carries + Receptions.">Touches</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('targets')} title="Total Pass Targets.">Tgts</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('routesRun')} title="Estimated Pass Routes Run across active games.">Routes</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('tprr')} title="Targets Per Route Run %">TPRR</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('targetSharePct')} title="Target Share: Percentage of team pass attempts targeted to this player.">Tgt%</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('carries')} title="Total Rush Attempts.">Carries</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('rzCarries')} title="Red Zone Rush Attempts (inside the opponent 10).">RZ Rush</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('rzTargets')} title="Red Zone Targets.">RZ Tgts</th>
                        <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('hvt')} title="High-Value Touches: RZ Carries + Targets. Highest correlation to touchdowns & fantasy points.">HVT</th>
                      </>
                    )}

                    {activeTab === 'receiving' && (
                      <>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('targets')} title="Total Pass Targets.">Targets</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('receptions')} title="Total Receptions.">Catches</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('recYards')} title="Total Receiving Yards.">Rec Yds</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('routesRun')} title="Estimated Pass Routes Run across active games.">Routes</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('tprr')} title="Targets Per Route Run % (>25% is elite target earner).">TPRR%</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('airYards')} title="Total Air Yards (downfield throw distance).">Air Yds</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('aDoT')} title="Average Depth of Target: Air Yards / Targets. High aDoT (>12y) yields high 1D conversion rates.">aDoT</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('airYardsSharePct')} title="Air Yards Share: Percentage of team downfield air yards targeted to this player.">Air%</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('wopr')} title="Weighted Opportunity Rating: 1.5 * Target Share + 0.7 * Air Yards Share.">WOPR</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('recFd')} title="Receiving First Downs (+1.0 pt each).">Rec 1D</th>
                        <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('recFdRate')} title="Receiving First Down conversion rate per target.">1D / Tgt</th>
                      </>
                    )}

                    {activeTab === 'rushing' && (
                      <>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('carries')} title="Total Rushing Attempts.">Carries</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('rushYards')} title="Total Rushing Yards.">Rush Yds</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('ypc')} title="Yards Per Carry.">YPC</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('rushTds')} title="Rushing Touchdowns.">Rush TDs</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('rushFd')} title="Rushing First Downs (+1.0 pt each).">Rush 1D</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('rushFdRate')} title="Rushing First Down conversion rate per carry.">1D%</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('rushYacPerAtt')} title="Rushing Yards After Contact Per Attempt.">YAC/att</th>
                        <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('brokenTackleRate')} title="Broken / Missed Tackle Rate per carry.">BTKL%</th>
                      </>
                    )}

                    {activeTab === 'special_teams' && (
                      <>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('krYd')} title="Kickoff Return Yards (1 pt / 15 yds).">KR Yds</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('prYd')} title="Punt Return Yards (1 pt / 20 yds).">PR Yds</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('totalReturnYd')} title="Total Return Yards.">Total Ret</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('returnTds')} title="Return Touchdowns (+6.0 pts).">Ret TDs</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('stSnaps')} title="Special Teams Snaps played.">ST Snaps</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('returnPts')} title="Total fantasy points scored purely on returns.">Ret Pts</th>
                        <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('returnFloorPpg')} title="Return Floor PPG: Average fantasy points per game from special teams returns.">Ret Floor/g</th>
                      </>
                    )}

                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-muted font-sans">
                        No players found matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((p) => {
                      const photoUrl = `https://sleepercdn.com/content/nfl/players/thumb/${p.id}.jpg`;
                      const ownerAvatar = p.owner?.avatar ? `https://sleepercdn.com/avatars/thumbs/${p.owner.avatar}` : null;

                      return (
                        <tr
                          key={p.id}
                          onClick={() => handleOpenPlayer(p)}
                          className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                        >
                          {/* Player Identity */}
                          <td className="py-2.5 px-3.5 font-sans">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={photoUrl}
                                alt={isUnlocked ? p.name : 'player'}
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                className={`w-8 h-8 rounded-lg bg-white/5 border border-white/10 object-cover ${isUnlocked ? '' : 'filter blur-md select-none'}`}
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-bold transition-colors ${isUnlocked ? 'text-white group-hover:text-cyan-300' : 'text-white/40 filter blur-[6px] select-none pointer-events-none'}`}>
                                    {isUnlocked ? p.name : '████████████'}
                                  </span>
                                  {p.totalReturnYd > 100 && (
                                    <span title="Return Game Role">
                                      <Zap size={11} className="text-cyan-400" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted font-medium">
                                  <span className={`font-bold ${
                                    p.pos === 'RB' ? 'text-emerald-400' :
                                    p.pos === 'WR' ? 'text-blue-400' :
                                    p.pos === 'TE' ? 'text-purple-400' : 'text-amber-400'
                                  }`}>
                                    {p.pos}
                                  </span>
                                  <span> • <span className={isUnlocked ? '' : 'filter blur-[4px] select-none text-white/30'}>{isUnlocked ? p.team : '???'}</span></span>
                                  <span> • {p.gamesPlayed} GP</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Status / Ownership */}
                          <td className="py-2.5 px-2 font-sans">
                            {p.isRostered ? (
                              <div className="flex items-center gap-1.5 text-[10px] text-blue-300">
                                {ownerAvatar && isUnlocked ? (
                                  <img src={ownerAvatar} alt="owner" className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                  <ShieldCheck size={12} />
                                )}
                                <span className={`truncate max-w-[80px] ${isUnlocked ? '' : 'filter blur-[4px] select-none text-blue-300/40'}`}>
                                  {isUnlocked ? (p.owner?.display_name || 'Rostered') : 'Rostered'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                Available
                              </span>
                            )}
                          </td>

                          {/* Overview Tab Columns */}
                          {activeTab === 'overview' && (
                            <>
                              <td className="py-2.5 px-2 text-right">
                                <span className="font-black text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  {p.mortyEdgeIndex}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right font-bold text-emerald-400">
                                {p.totalCustomPts.toFixed(1)}
                              </td>
                              <td className="py-2.5 px-2 text-right font-semibold text-white">
                                {p.customPpg.toFixed(1)}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <span className={p.deltaVsStd >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                                  {p.deltaVsStd >= 0 ? `+${p.deltaVsStd.toFixed(1)}` : p.deltaVsStd.toFixed(1)}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right text-amber-300 font-bold">
                                {p.totalFd}
                              </td>
                              <td className="py-2.5 px-2 text-right text-muted">
                                {p.fdPerTouch.toFixed(0)}%
                              </td>
                              <td className="py-2.5 px-2 text-right text-amber-400">
                                {p.wopr > 0 ? p.wopr.toFixed(2) : '-'}
                              </td>
                              <td className="py-2.5 px-2 text-right text-cyan-400 font-semibold">
                                {p.tprr > 0 ? `${p.tprr.toFixed(0)}%` : '-'}
                              </td>
                              <td className="py-2.5 px-2 text-right text-cyan-300 font-semibold">
                                {p.returnFloorPpg > 0 ? `+${p.returnFloorPpg.toFixed(1)}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right text-muted">
                                {p.snapPct.toFixed(0)}%
                              </td>
                            </>
                          )}

                          {/* Usage Tab Columns */}
                          {activeTab === 'usage' && (
                            <>
                              <td className="py-2.5 px-2 text-right text-white font-semibold">{p.snapPct.toFixed(1)}%</td>
                              <td className="py-2.5 px-2 text-right">
                                <span className={p.snapTrend3Wk >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {p.snapTrend3Wk >= 0 ? `+${p.snapTrend3Wk.toFixed(1)}%` : `${p.snapTrend3Wk.toFixed(1)}%`}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right font-bold text-white">{p.totalTouches}</td>
                              <td className="py-2.5 px-2 text-right text-amber-400">{p.targets}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.routesRun > 0 ? p.routesRun : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-cyan-400 font-semibold">{p.tprr > 0 ? `${p.tprr.toFixed(0)}%` : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.targetSharePct > 0 ? `${p.targetSharePct.toFixed(1)}%` : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-emerald-400">{p.carries}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.rzCarries}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.rzTargets}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{p.hvt}</td>
                            </>
                          )}

                          {/* Receiving Tab Columns */}
                          {activeTab === 'receiving' && (
                            <>
                              <td className="py-2.5 px-2 text-right font-bold text-white">{p.targets}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.receptions}</td>
                              <td className="py-2.5 px-2 text-right text-emerald-400 font-semibold">{p.recYards}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.routesRun > 0 ? p.routesRun : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-cyan-400 font-bold">{p.tprr > 0 ? `${p.tprr.toFixed(1)}%` : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.airYards}</td>
                              <td className="py-2.5 px-2 text-right text-cyan-300 font-bold">{p.aDoT > 0 ? `${p.aDoT.toFixed(1)}y` : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.airYardsSharePct > 0 ? `${p.airYardsSharePct.toFixed(1)}%` : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-amber-400 font-bold">{p.wopr > 0 ? p.wopr.toFixed(2) : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-amber-300 font-semibold">{p.recFd}</td>
                              <td className="py-2.5 px-3 text-right text-muted">{p.recFdRate.toFixed(0)}%</td>
                            </>
                          )}

                          {/* Rushing Tab Columns */}
                          {activeTab === 'rushing' && (
                            <>
                              <td className="py-2.5 px-2 text-right font-bold text-white">{p.carries}</td>
                              <td className="py-2.5 px-2 text-right text-emerald-400 font-semibold">{p.rushYards}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.ypc > 0 ? p.ypc.toFixed(1) : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-amber-400 font-bold">{p.rushTds}</td>
                              <td className="py-2.5 px-2 text-right text-amber-300 font-bold">{p.rushFd}</td>
                              <td className="py-2.5 px-2 text-right text-emerald-400">{p.rushFdRate.toFixed(0)}%</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.rushYacPerAtt > 0 ? p.rushYacPerAtt.toFixed(1) : '-'}</td>
                              <td className="py-2.5 px-3 text-right text-cyan-400">{p.brokenTackleRate > 0 ? `${p.brokenTackleRate.toFixed(0)}%` : '-'}</td>
                            </>
                          )}

                          {/* Special Teams Tab Columns */}
                          {activeTab === 'special_teams' && (
                            <>
                              <td className="py-2.5 px-2 text-right text-cyan-400 font-semibold">{p.krYd > 0 ? p.krYd : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-cyan-400 font-semibold">{p.prYd > 0 ? p.prYd : '-'}</td>
                              <td className="py-2.5 px-2 text-right font-bold text-white">{p.totalReturnYd > 0 ? p.totalReturnYd : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-amber-400 font-bold">{p.returnTds > 0 ? p.returnTds : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.stSnaps}</td>
                              <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">{p.returnPts > 0 ? p.returnPts.toFixed(1) : '-'}</td>
                              <td className="py-2.5 px-3 text-right text-cyan-300 font-black">{p.returnFloorPpg > 0 ? `+${p.returnFloorPpg.toFixed(1)}` : '-'}</td>
                            </>
                          )}

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted">
              <div>
                Showing <span className="text-white font-semibold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="text-white font-semibold">{Math.min(currentPage * pageSize, sortedData.length)}</span> of{' '}
                <span className="text-white font-semibold">{sortedData.length}</span> players
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white/[0.04] border border-white/10 text-white rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value={25} className="bg-[#0f1115]">25 / page</option>
                  <option value={50} className="bg-[#0f1115]">50 / page</option>
                  <option value={100} className="bg-[#0f1115]">100 / page</option>
                </select>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2 font-mono text-white">{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </>
      )}

      {/* Sliding Player Detail Drawer */}
      <PlayerRadarDrawer
        player={selectedPlayer}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

    </div>
  );
};
