import React, { useState, useMemo, useEffect } from 'react';
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
  Lock,
  Crosshair,
  Shield,
  Eye,
  RotateCcw,
  X
} from 'lucide-react';

type ViewTab = 
  | 'overview' 
  | 'usage' 
  | 'receiving' 
  | 'rushing' 
  | 'special_teams'
  | 'tackles'
  | 'pass_rush'
  | 'coverage';

type SortField = keyof PlayerEvaluationItem;

type RoleFilter = 'ALL' | 'CORE' | 'VELOCITY' | 'RETURNERS';

export const PlayerEvaluation: React.FC = () => {
  const { selectedSeason, selectedSeasonId } = useLeagueContext();
  const { isUnlocked, lock, setIsUnlockModalOpen } = useAuth();
  const currentSeasonYear = selectedSeason?.league.season || String(new Date().getFullYear());
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

  // Spotlight category toggle when viewing ALL positions
  const [spotlightCategory, setSpotlightCategory] = useState<'offense' | 'idp'>('offense');

  // Is currently viewing an IDP category?
  const isIdpView = ['IDP', 'DL', 'LB', 'DB'].includes(position);

  // Reset or align active tab and spotlight category when switching positions
  useEffect(() => {
    if (isIdpView) {
      setSpotlightCategory('idp');
      if (['usage', 'receiving', 'rushing'].includes(activeTab)) {
        setActiveTab('overview');
      }
    } else if (position !== 'ALL') {
      setSpotlightCategory('offense');
      if (['tackles', 'pass_rush', 'coverage'].includes(activeTab)) {
        setActiveTab('overview');
      }
    }
  }, [position, isIdpView, activeTab]);

  const showIdpSpotlights = spotlightCategory === 'idp';

  // Check if any filters are modified from defaults
  const isFiltered = position !== 'ALL' || roleFilter !== 'ALL' || returnersOnly || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setPosition('ALL');
    setRoleFilter('ALL');
    setReturnersOnly(false);
    setSearchQuery('');
    setCurrentPage(1);
  };

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
      if (position === 'OFFENSE') {
        if (p.isIdp) return false;
      } else if (position === 'IDP') {
        if (!p.isIdp) return false;
      } else if (position === 'FLEX') {
        if (!['RB', 'WR', 'TE'].includes(p.pos)) return false;
      } else if (['DL', 'LB', 'DB'].includes(position)) {
        if (p.idpPos !== position && !p.fantasyPositions?.includes(position)) {
          if (position === 'DL' && !['DE', 'DT', 'NT', 'DL'].includes(p.pos)) return false;
          if (position === 'LB' && !['LB', 'ILB', 'OLB'].includes(p.pos)) return false;
          if (position === 'DB' && !['CB', 'S', 'FS', 'SS', 'DB'].includes(p.pos)) return false;
        }
      } else if (position !== 'ALL') {
        if (p.pos !== position && !p.fantasyPositions?.includes(position)) return false;
      }

      // Role Filter
      if (roleFilter === 'CORE') {
        if (p.isIdp ? p.defSnapPct < 60 : p.snapPct < 25) return false;
      }
      if (roleFilter === 'VELOCITY' && p.snapTrend3Wk <= 0) return false;
      if (roleFilter === 'RETURNERS' && p.totalReturnYd === 0) return false;

      // Returners Only Checkbox
      if (returnersOnly && p.totalReturnYd === 0) return false;

      // Min Snaps (Defensive snaps for IDP, offensive snaps for offense)
      const relevantSnaps = p.isIdp ? p.defSnaps : p.totalSnaps;
      if (relevantSnaps < minSnaps) return false;

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

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const handleOpenPlayer = (player: PlayerEvaluationItem) => {
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

    // 1. Offensive Spotlights
    const offPool = pool.filter(p => !p.isIdp);
    const roleVelocityRisersOff = [...offPool]
      .filter(p => p.snapTrend3Wk >= 5.0 && (p.targets >= 3 || p.carries >= 5 || p.totalTouches >= 8))
      .sort((a, b) => b.snapTrend3Wk - a.snapTrend3Wk)
      .slice(0, 4);

    const hvtWorkhorses = [...offPool]
      .filter(p => p.pos === 'RB' && p.totalTouches >= 5)
      .sort((a, b) => b.hvtPerGame - a.hvtPerGame)
      .slice(0, 4);

    const woprRisers = [...offPool]
      .filter(p => ['WR', 'TE'].includes(p.pos) && p.targets >= 4)
      .sort((a, b) => b.wopr - a.wopr)
      .slice(0, 4);

    const returnDynamos = [...pool]
      .filter(p => p.totalReturnYd > 80 || p.returnFloorPpg >= 2.5)
      .sort((a, b) => b.returnFloorPpg - a.returnFloorPpg)
      .slice(0, 4);

    // 2. IDP Spotlights
    const idpPool = pool.filter(p => p.isIdp);

    const idpVelocityRisers = [...idpPool]
      .filter(p => p.snapTrend3Wk >= 3.0 && p.defSnaps >= 20)
      .sort((a, b) => b.snapTrend3Wk - a.snapTrend3Wk)
      .slice(0, 4);

    const idpTackleMachines = [...idpPool]
      .filter(p => p.totalTkl >= 8)
      .sort((a, b) => (b.totalTkl / b.gamesPlayed) - (a.totalTkl / a.gamesPlayed))
      .slice(0, 4);

    const idpHavocCreators = [...idpPool]
      .filter(p => p.passRushImpact >= 2 || p.sacks >= 1)
      .sort((a, b) => b.passRushImpact - a.passRushImpact)
      .slice(0, 4);

    const idpBallhawks = [...idpPool]
      .filter(p => p.passDef + p.interceptions >= 2)
      .sort((a, b) => ((b.passDef * 3) + (b.interceptions * 3)) - ((a.passDef * 3) + (a.interceptions * 3)))
      .slice(0, 4);

    return { 
      roleVelocityRisersOff, 
      hvtWorkhorses, 
      woprRisers, 
      returnDynamos,
      idpVelocityRisers,
      idpTackleMachines,
      idpHavocCreators,
      idpBallhawks
    };
  }, [rawScopedData, ownership]);

  // Scatter Chart Data
  const scatterData = useMemo(() => {
    return filteredData.slice(0, 100).map(p => ({
      name: isUnlocked ? p.name : '[CLASSIFIED]',
      pos: p.pos,
      idpPos: p.idpPos,
      isIdp: p.isIdp,
      team: isUnlocked ? p.team : '???',
      isRostered: p.isRostered,
      touches: p.totalTouches,
      defSnaps: p.defSnaps,
      tklRate: Number(p.tklRate.toFixed(1)),
      totalTkl: p.totalTkl,
      sacks: p.sacks,
      tfl: p.tfl,
      passDef: p.passDef,
      havocPlays: p.havocPlays,
      customPts: Number(p.totalCustomPts.toFixed(1)),
      fdRate: Number(p.fdPerTouch.toFixed(1)),
      raw: p
    }));
  }, [filteredData, isUnlocked]);

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header & Page Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Target size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Player Evaluation Hub</h1>
          </div>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            {ownership === 'available'
              ? "Uncover high-leverage offensive & IDP waiver gems evaluated under our league's unique scoring format (+1.0 PPFD, +2.0 TFL, +3.0 Pass Defended, Dynamic Returns)."
              : ownership === 'rostered'
              ? "Evaluate rostered player usage, identify trade targets and sell-high candidates, and discover players outperforming their national valuation."
              : "Comprehensive league-wide player evaluation across all NFL assets (Offense & IDP), combining role velocity and custom scoring."}
          </p>
        </div>

        {/* Secret Lock / Unlock Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {isUnlocked ? (
            <button
              onClick={lock}
              title="Lock player names (blur identities)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-rose-500/20 border border-emerald-500/30 hover:border-rose-500/30 text-xs font-semibold text-emerald-300 hover:text-rose-300 transition-all cursor-pointer shadow-sm"
            >
              <ShieldCheck size={14} />
              <span>Lock Names</span>
            </button>
          ) : (
            <button
              onClick={() => setIsUnlockModalOpen(true)}
              title="Classified Player Identities - Click to unlock"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 transition-all cursor-pointer shadow-sm animate-pulse"
            >
              <Lock size={14} />
              <span>Classified (Unlock)</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass-card flex flex-col items-center justify-center p-12 text-center space-y-3">
          <Activity size={32} className="animate-spin text-cyan-400" />
          <p className="text-sm font-semibold text-white">Aggregating advanced metrics & scoring data across all NFL weeks...</p>
          <p className="text-xs text-muted">Calculating WOPR, Tackle Rates, Pass Rush Impact, and custom points...</p>
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
                      Offensive & IDP Predictive Analytics
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
                    <strong className="text-white">Core Evaluation Strategy:</strong> <span className="text-cyan-200">Opportunity and efficiency metrics (TPRR, aDoT, WOPR for receivers; HVT for running backs; Tackle &amp; Havoc Rates for IDP) dictate breakouts before points follow. Use 3-week Role Velocity (Snap Trend Δ) to strike on waivers before the national market catches on.</span>
                  </div>
                </div>

                {/* Metric 1: TPRR */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-cyan-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400 flex items-center gap-1">
                      <Target size={13} />
                      <span>TPRR (Targets Per Route Run %)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">WR / TE</span>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                    Formula: (Targets / Routes Run) × 100
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    The <strong className="text-white">gold standard efficiency metric</strong> for pass catchers. It isolates target-earning ability independent of overall team pass volume or snap count. A part-time receiver earning a high TPRR (&gt;22%) is an elite waiver stash poised to explode if snap share expands.
                  </p>
                  <div className="text-[10px] text-cyan-300 font-semibold pt-0.5">
                    ★ Rule of Thumb: &gt; 25% is elite alpha target-earner; &gt; 20% is strong starter; &lt; 15% is rotational/blocking.
                  </div>
                </div>

                {/* Metric 2: aDoT */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-sky-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400 flex items-center gap-1">
                      <Zap size={13} />
                      <span>aDoT (Average Depth of Target)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">Pass Catchers</span>
                  </div>
                  <div className="text-[10px] font-mono text-sky-300 bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20">
                    Formula: Total Air Yards / Targets
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    Tells you <strong className="text-white">where on the field</strong> a receiver earns opportunities. High aDoT (&gt;12.0 yds) signals deep-threat upside and high-variance splash weeks. Moderate aDoT (8–11 yds) is the ideal sweet spot for consistent chain-moving alphas. Low aDoT (&lt;7.0 yds) indicates slot/screen volume.
                  </p>
                  <div className="text-[10px] text-sky-300 font-semibold pt-0.5">
                    ★ Rule of Thumb: 8–11 yds is optimal for alpha volume; &gt; 12 yds gives boom/bust ceiling.
                  </div>
                </div>

                {/* Metric 3: WOPR */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <TrendingUp size={13} />
                      <span>WOPR (Weighted Opportunity)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">WR / TE</span>
                  </div>
                  <div className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    Formula: 1.5 × Target Share + 0.7 × Air Yards Share
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    Created by Josh Hermsmeyer, WOPR combines immediate target volume (reception and first down floor) with downfield air yards (explosive ceiling). The #1 volume metric for predicting future fantasy production before points catch up.
                  </p>
                  <div className="text-[10px] text-emerald-400 font-semibold pt-0.5">
                    ★ Rule of Thumb: &gt; 0.55 is alpha WR1 volume; &gt; 0.40 is reliable weekly fantasy starter.
                  </div>
                </div>

                {/* Metric 4: HVT & 1D% */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Award size={13} />
                      <span>HVT &amp; 1D% (+1.0 PPFD)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">RB / Flex</span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                    Formula: RZ Carries (Inside 10) + Targets
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    In our 0-PPR format, low-value between-the-20s carries are inefficient. High Value Touches (HVTs) isolate opportunities that produce touchdowns. Combined with our +1.0 pt per First Down (PPFD), explosive and goal-line backs dominate national rankings.
                  </p>
                  <div className="text-[10px] text-emerald-300 font-semibold pt-0.5">
                    ★ Rule of Thumb: &gt; 4.0 HVT/g is workhorse territory; &gt; 25% 1D conversion rate is elite efficiency.
                  </div>
                </div>

                {/* Metric 5: IDP Tackle Efficiency Rate */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-rose-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      <Crosshair size={13} />
                      <span>IDP Tackle Rate (Tkl%)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">LB / Box S</span>
                  </div>
                  <div className="text-[10px] font-mono text-rose-300 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                    Formula: Total Tackles (Solo + Ast) / Defensive Snaps
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    The IDP counterpart to TPRR. Measures a defender's tackle-magnet frequency when on the field. Linebackers with &gt;14% tackle rate in rotational packages will produce instant LB1 numbers as soon as an injury or benching expands their snap count.
                  </p>
                  <div className="text-[10px] text-rose-300 font-semibold pt-0.5">
                    ★ Rule of Thumb: &gt; 12% is starter floor; &gt; 15% is elite tackle magnet.
                  </div>
                </div>

                {/* Metric 6: Pass Rush Impact & Regression */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Flame size={13} />
                      <span>Pass Rush Impact (Sacks + Hits + TFL)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">DL / Edge</span>
                  </div>
                  <div className="text-[10px] font-mono text-amber-200 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    Formula: Sacks + QB Hits + Tackles for Loss (TFL)
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    Sacks are notoriously volatile week-to-week, whereas QB Hits and TFLs are highly sticky indicators of true penetration. Pass rushers with high hits/TFLs but few sacks are prime buy-low candidates due for positive sack regression.
                  </p>
                  <div className="text-[10px] text-amber-300 font-semibold pt-0.5">
                    ★ In our format: Sack (3.0) + TFL (2.0) + Hit (0.5) = 5.5 pt single-play disruption!
                  </div>
                </div>

                {/* Metric 7: Morty Edge Index */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3 p-3.5 rounded-xl bg-white/[0.03] border border-purple-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300 flex items-center gap-1">
                      <ShieldCheck size={13} />
                      <span>Morty Edge Index (0–100 Composite Rating)</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted">Offense &amp; IDP Composite</span>
                  </div>
                  <div className="text-[10px] font-mono text-purple-200 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                    Formula: Role Velocity (Snap Trend Δ) + Predictive Efficiency + Custom Scoring Multipliers
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    Custom composite rating tailored specifically to our league rules (+1.0 PPFD, +2.0 TFL, +3.0 Turnover/Sack). Automatically separates genuine role surges and volume earners from one-off box score flukes across both Offense and IDP.
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
                  {showIdpSpotlights
                    ? ownership === 'available'
                      ? 'IDP Waiver Radar (Defensive Gems & Disruptors)'
                      : ownership === 'rostered'
                      ? 'IDP Trade Radar (High-Impact Defensive Assets)'
                      : 'League-Wide IDP Spotlights'
                    : ownership === 'available'
                    ? 'Waiver Radar Spotlights (Unrostered Hidden Gems)'
                    : ownership === 'rostered'
                    ? 'Trade Target Spotlights (High-Leverage Rostered Assets)'
                    : 'League-Wide Spotlights (All Assets)'}
                </span>
              </h3>
              
              <div className="flex items-center gap-2.5">
                <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                  <button
                    onClick={() => setSpotlightCategory('offense')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      spotlightCategory === 'offense'
                        ? 'bg-cyan-500 text-black font-bold shadow'
                        : 'text-muted hover:text-white'
                    }`}
                  >
                    🏈 Offense Gems
                  </button>
                  <button
                    onClick={() => setSpotlightCategory('idp')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      spotlightCategory === 'idp'
                        ? 'bg-rose-500 text-white font-bold shadow'
                        : 'text-muted hover:text-white'
                    }`}
                  >
                    🛡️ IDP Gems
                  </button>
                </div>
                <span className="text-[11px] text-muted">{completedWeeks.length} Weeks Analyzed</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {showIdpSpotlights ? (
                <>
                  {/* IDP Card 1: Role Velocity Surges */}
                  <div className="glass-card p-4 rounded-2xl border border-rose-500/20 bg-gradient-to-b from-rose-500/[0.04] to-transparent flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase text-rose-400 tracking-wider flex items-center gap-1">
                          <TrendingUp size={13} />
                          <span>IDP Role Velocity</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 font-mono">Snap Δ</span>
                      </div>
                      <p className="text-[11px] text-muted mb-3">
                        Defenders whose defensive snap share surged over the last 3 weeks.
                      </p>
                      
                      <div className="space-y-2">
                        {spotlights.idpVelocityRisers.map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleOpenPlayer(p)}
                            className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-bold truncate ${isUnlocked ? 'text-white group-hover:text-rose-300' : 'text-white/40 filter blur-[5px] select-none pointer-events-none'}`}>
                                    {isUnlocked ? p.name : '██████████'}
                                  </span>
                                  {ownership === 'all' && (
                                    <span className={`text-[8px] px-1 py-0.2 rounded font-semibold ${p.isRostered ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                      {p.isRostered ? 'Rostered' : 'Waiver'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted flex items-center gap-1 truncate">
                                  <span>{p.pos} ({p.idpPos}) • <span className={isUnlocked ? '' : 'filter blur-[4px] select-none text-white/30'}>{isUnlocked ? p.team : '???'}</span></span>
                                  {p.isRostered && p.owner && (
                                    <span className={`text-blue-300/80 font-medium truncate ${isUnlocked ? '' : 'filter blur-[4px] select-none'}`}>
                                      ({isUnlocked ? p.owner.display_name : '????'})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right font-mono shrink-0 pl-2">
                              <span className="text-xs font-bold text-rose-400 whitespace-nowrap">+{p.snapTrend3Wk.toFixed(0)}% Δ</span>
                              <span className="text-[9px] text-muted block whitespace-nowrap">{p.defSnapPct.toFixed(0)}% snap • {p.totalTkl} tkl</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* IDP Card 2: Tackle Machines */}
                  <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.04] to-transparent flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                          <Crosshair size={13} />
                          <span>Tackle Machines</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">Floor</span>
                      </div>
                      <p className="text-[11px] text-muted mb-3">
                        Linebackers &amp; safeties commanding massive weekly tackle floors.
                      </p>
                      
                      <div className="space-y-2">
                        {spotlights.idpTackleMachines.map(p => (
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
                              <span className="text-xs font-bold text-emerald-400">{p.tklPerGame.toFixed(1)} tkl/g</span>
                              <span className="text-[9px] text-muted block whitespace-nowrap">{p.tklRate.toFixed(1)}% rate • {p.soloTkl} solo</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* IDP Card 3: Havoc & Pass Rush Creators */}
                  <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.04] to-transparent flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1">
                          <Flame size={13} />
                          <span>Havoc / Pass Rush</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">Disruption</span>
                      </div>
                      <p className="text-[11px] text-muted mb-3">
                        Dominant edge rushers and linemen generating sacks, hits, and TFLs.
                      </p>
                      
                      <div className="space-y-2">
                        {spotlights.idpHavocCreators.map(p => (
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
                              <span className="text-xs font-bold text-amber-400">{p.sacks} Sk, {p.tfl} TFL</span>
                              <span className="text-[9px] text-muted block whitespace-nowrap">{p.qbHits} hits • {p.passRushImpact} impact</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* IDP Card 4: Ballhawks & Turnover Magnets */}
                  <div className="glass-card p-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/[0.04] to-transparent flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                          <Shield size={13} />
                          <span>Ballhawks &amp; Turnovers</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono">+3.0/PD</span>
                      </div>
                      <p className="text-[11px] text-muted mb-3">
                        Secondary playmakers capitalizing on passes defended &amp; turnovers.
                      </p>
                      
                      <div className="space-y-2">
                        {spotlights.idpBallhawks.map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleOpenPlayer(p)}
                            className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-bold truncate ${isUnlocked ? 'text-white group-hover:text-indigo-300' : 'text-white/40 filter blur-[5px] select-none pointer-events-none'}`}>
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
                              <span className="text-xs font-bold text-indigo-400">{p.passDef} PD • {p.interceptions} INT</span>
                              <span className="text-[9px] text-muted block whitespace-nowrap">
                                +{((p.passDef * 3) + (p.interceptions * 3)).toFixed(0)} playmaking pts
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Offensive Card 1: Role Velocity & Breakout Surges */}
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
                        Players whose snap share &amp; usage surged over the last 3 weeks.
                      </p>
                      
                      <div className="space-y-2">
                        {spotlights.roleVelocityRisersOff.map(p => (
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

                  {/* Offensive Card 2: WOPR & Air Yard Risers */}
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
                        Pass catchers commanding large target intent &amp; deep air yards share.
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

                  {/* Offensive Card 3: HVT Workhorse RBs */}
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
                        Running backs seeing high-yield red zone and pass-catching volume.
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

                  {/* Offensive Card 4: Special Teams Dynamos */}
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
                        Special teams dynamos with steady weekly baseline return points.
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
                </>
              )}

            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────────────────
              UNIFIED EVALUATION COMMAND CENTER (CENTRALIZED CONTROLS)
             ───────────────────────────────────────────────────────────────────────────── */}
          <div 
            className="sticky top-[4.5rem] md:top-4 z-30 p-3.5 sm:p-4 rounded-2xl border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.9)] space-y-3 transition-all"
            style={{ position: 'sticky', backgroundColor: '#0f1117' }}
          >
            
            {/* Top Row: Roster Scope, Timeframe Horizon, Search & Reset */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              
              {/* Left Group: Ownership Scope + Timeframe Horizon */}
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Scope: Waivers vs Rostered vs All */}
                <div className="flex items-center p-1 rounded-xl bg-[#171b24] border border-white/10">
                  <button
                    onClick={() => { setOwnership('available'); setCurrentPage(1); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      ownership === 'available' 
                        ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/25' 
                        : 'text-muted hover:text-white'
                    }`}
                  >
                    <Sparkles size={13} className={ownership === 'available' ? 'text-black' : 'text-emerald-400'} />
                    <span>Available Waivers</span>
                  </button>
                  <button
                    onClick={() => { setOwnership('rostered'); setCurrentPage(1); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      ownership === 'rostered' 
                        ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/25' 
                        : 'text-muted hover:text-white'
                    }`}
                  >
                    <Shield size={13} className={ownership === 'rostered' ? 'text-white' : 'text-blue-400'} />
                    <span>Rostered / Trade</span>
                  </button>
                  <button
                    onClick={() => { setOwnership('all'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      ownership === 'all' 
                        ? 'bg-white/20 text-white font-bold shadow-md' 
                        : 'text-muted hover:text-white'
                    }`}
                  >
                    All Players
                  </button>
                </div>

                <span className="hidden sm:inline text-white/20 select-none">|</span>

                {/* Timeframe Scope Pills */}
                <div className="flex items-center p-1 rounded-xl bg-[#171b24] border border-white/10">
                  {(['full', 'last1', 'last3', 'last5'] as TimeframeScope[]).map((scope) => {
                    const labelMap: Record<TimeframeScope, string> = {
                      full: 'Full Season',
                      last1: 'Last 1 Wk',
                      last3: 'Last 3 Wks',
                      last5: 'Last 5 Wks'
                    };
                    return (
                      <button
                        key={scope}
                        onClick={() => { setTimeframe(scope); setCurrentPage(1); }}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          timeframe === scope 
                            ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/25' 
                            : 'text-muted hover:text-white'
                        }`}
                      >
                        {labelMap[scope]}
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Right Group: Search Box & Reset Filters */}
              <div className="flex items-center gap-2 w-full xl:w-auto">
                <div className="relative flex-1 xl:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search player, team, or owner..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-[#171b24] border border-white/15 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-500/60 focus:bg-[#1c2230]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white text-xs cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {isFiltered && (
                  <button
                    onClick={handleResetFilters}
                    className="px-2.5 py-1.5 rounded-xl bg-[#1f2430] hover:bg-[#262c3b] border border-white/15 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-sm"
                    title="Reset position and role filters"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

            </div>

            {/* Bottom Row: Position Selector, Role Archetypes & Special Modifiers */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-white/10">
              
              {/* Position Selector Group */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider mr-1">Position:</span>
                
                {/* Category Pills (ALL, OFFENSE, IDP) */}
                {(['ALL', 'OFFENSE', 'IDP'] as PositionFilter[]).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => { setPosition(pos); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      position === pos
                        ? pos === 'IDP' 
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-1 ring-rose-400' 
                          : 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30 ring-1 ring-cyan-400'
                        : 'bg-[#171b24] text-muted hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {pos}
                  </button>
                ))}

                <span className="text-white/20 select-none px-1">|</span>

                {/* Offense Specific Pills */}
                {(['FLEX', 'RB', 'WR', 'TE', 'QB', 'K'] as PositionFilter[]).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => { setPosition(pos); setCurrentPage(1); }}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      position === pos
                        ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/25'
                        : 'bg-[#171b24] text-muted hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {pos}
                  </button>
                ))}

                <span className="text-white/20 select-none px-1">|</span>

                {/* IDP Specific Pills */}
                {(['DL', 'LB', 'DB'] as PositionFilter[]).map((pos) => {
                  const activeStyles: Record<string, string> = {
                    DL: 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/30 ring-1 ring-amber-400',
                    LB: 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/30 ring-1 ring-rose-400',
                    DB: 'bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/30 ring-1 ring-indigo-400'
                  };
                  return (
                    <button
                      key={pos}
                      onClick={() => { setPosition(pos); setCurrentPage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        position === pos
                          ? activeStyles[pos]
                          : 'bg-[#1c1822] text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/30'
                      }`}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>

              {/* Right Sub-group: Role Archetypes & Returners Toggle */}
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Role Filter */}
                <div className="flex items-center p-0.5 rounded-xl bg-[#171b24] border border-white/10 text-xs">
                  <button
                    onClick={() => { setRoleFilter('ALL'); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${roleFilter === 'ALL' ? 'bg-white/15 text-white font-semibold' : 'text-muted hover:text-white'}`}
                  >
                    All Roles
                  </button>
                  <button
                    onClick={() => { setRoleFilter('CORE'); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${roleFilter === 'CORE' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold' : 'text-muted hover:text-white'}`}
                    title={isIdpView ? "Filters for every-down IDPs with >= 60% defensive snap share" : "Filters for players with >= 25% snap share (isolates offensive contributors)"}
                  >
                    {isIdpView ? 'Every-Down (≥60%)' : 'Core (≥25%)'}
                  </button>
                  <button
                    onClick={() => { setRoleFilter('VELOCITY'); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${roleFilter === 'VELOCITY' ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 font-bold' : 'text-muted hover:text-white'}`}
                    title="Filters for players with positive 3-week snap growth (Rising roles)"
                  >
                    Velocity Surges
                  </button>
                </div>

                {/* Returners Checkbox */}
                <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer hover:text-white transition-colors select-none px-2.5 py-1 rounded-lg bg-[#171b24] border border-white/10">
                  <input
                    type="checkbox"
                    checked={returnersOnly}
                    onChange={(e) => { setReturnersOnly(e.target.checked); setCurrentPage(1); }}
                    className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Returners</span>
                </label>

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
                  <span>
                    {isIdpView ? 'Defensive Snaps vs. Custom Scoring Matrix' : 'Opportunity vs. Custom Scoring Matrix'}
                  </span>
                </h3>
                <p className="text-xs text-muted">
                  {isIdpView
                    ? 'Compare defensive snaps played against custom fantasy points. Click any dot to open full player breakdown.'
                    : 'Compare total touches against custom fantasy points. Click any player dot to open full drilldown.'}
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
                    dataKey={isIdpView ? 'defSnaps' : 'touches'} 
                    name={isIdpView ? 'Defensive Snaps' : 'Total Touches'} 
                    stroke="rgba(255,255,255,0.4)" 
                    fontSize={11}
                    unit={isIdpView ? ' snp' : ' tch'}
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
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 font-mono">
                              {d.isIdp ? `${d.pos} (${d.idpPos})` : d.pos} • {d.team}
                            </span>
                          </div>
                          <div className="text-cyan-400 font-mono font-semibold">
                            {d.customPts} Custom Pts {d.isIdp ? `(${d.defSnaps} Snaps)` : `(${d.touches} Touches)`}
                          </div>
                          {d.isIdp ? (
                            <div className="text-emerald-400 font-mono text-[11px]">
                              {d.tklRate}% Tackle Rate • {d.totalTkl} Tkl ({d.sacks} Sk, {d.tfl} TFL, {d.passDef} PD)
                            </div>
                          ) : (
                            <div className="text-amber-400 font-mono text-[11px]">{d.fdRate}% First Down Rate</div>
                          )}
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
              3. MASTER PLAYER EVALUATION TABLE
             ───────────────────────────────────────────────────────────────────────────── */}
          <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
            
            {/* Table Control Header: View Dimension Tabs + Results Count & Page Size */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              
              {/* View Dimension Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
                      : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  Overview &amp; Scoring
                </button>

                {isIdpView ? (
                  <>
                    <button
                      onClick={() => setActiveTab('tackles')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'tackles'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                          : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      Tackles &amp; Opportunity
                    </button>
                    <button
                      onClick={() => setActiveTab('pass_rush')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'pass_rush'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow'
                          : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      Pass Rush &amp; Havoc
                    </button>
                    <button
                      onClick={() => setActiveTab('coverage')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'coverage'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow'
                          : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      Coverage &amp; Turnovers
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveTab('usage')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'usage'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
                          : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      Usage &amp; Opportunity
                    </button>
                    <button
                      onClick={() => setActiveTab('receiving')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'receiving'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
                          : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      Air Yards &amp; Receiving
                    </button>
                    <button
                      onClick={() => setActiveTab('rushing')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'rushing'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
                          : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      Rushing &amp; Tackle-Breaking
                    </button>
                  </>
                )}

                <button
                  onClick={() => setActiveTab('special_teams')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'special_teams'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
                      : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  Special Teams &amp; Returns
                </button>
              </div>

              {/* Status Indicator & Results Count */}
              <div className="flex items-center gap-3 text-xs text-muted shrink-0">
                <span className="font-mono text-white/80">
                  <strong className="text-white">{filteredData.length}</strong> players found
                </span>
                <span className="text-white/20">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]">Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                  >
                    <option value={25} className="bg-[#0f1115]">25</option>
                    <option value={50} className="bg-[#0f1115]">50</option>
                    <option value={100} className="bg-[#0f1115]">100</option>
                  </select>
                </div>
              </div>

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
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('mortyEdgeIndex')} title="Morty Edge Index (0-100): Composite breakout rating combining role growth, efficiency, and league format scoring.">
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
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('deltaVsStd')} title="Custom Pts minus Standard Scoring Pts. Reflects exact bonus points from format bonuses (PPFD, TFL, Passes Defended, Return Yards).">
                          <div className="flex items-center justify-end gap-1">
                            <span>STD Δ</span>
                            {sortField === 'deltaVsStd' && <ArrowUpDown size={12} className="text-cyan-400" />}
                          </div>
                        </th>

                        {isIdpView ? (
                          <>
                            <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('soloTkl')} title="Solo Tackles (+1.0 pt each).">
                              <div className="flex items-center justify-end gap-1">
                                <span>Solo</span>
                                {sortField === 'soloTkl' && <ArrowUpDown size={12} className="text-cyan-400" />}
                              </div>
                            </th>
                            <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('astTkl')} title="Assisted Tackles (+0.5 pt each).">
                              <div className="flex items-center justify-end gap-1">
                                <span>Ast</span>
                                {sortField === 'astTkl' && <ArrowUpDown size={12} className="text-cyan-400" />}
                              </div>
                            </th>
                            <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('tfl')} title="Tackles for Loss (+2.0 pts each in our league).">
                              <div className="flex items-center justify-end gap-1">
                                <span>TFL</span>
                                {sortField === 'tfl' && <ArrowUpDown size={12} className="text-cyan-400" />}
                              </div>
                            </th>
                            <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('sacks')} title="Sacks (+3.0 pts each).">
                              <div className="flex items-center justify-end gap-1">
                                <span>Sack</span>
                                {sortField === 'sacks' && <ArrowUpDown size={12} className="text-cyan-400" />}
                              </div>
                            </th>
                            <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('passDef')} title="Passes Defended (+3.0 pts each in our league).">
                              <div className="flex items-center justify-end gap-1">
                                <span>PD</span>
                                {sortField === 'passDef' && <ArrowUpDown size={12} className="text-cyan-400" />}
                              </div>
                            </th>
                            <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('snapPct')} title="Defensive snap share percentage.">
                              <div className="flex items-center justify-end gap-1">
                                <span>Def Snap%</span>
                                {sortField === 'snapPct' && <ArrowUpDown size={12} className="text-cyan-400" />}
                              </div>
                            </th>
                          </>
                        ) : (
                          <>
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
                            <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('wopr')} title="Weighted Opportunity Rating: 1.5 * Target Share + 0.7 * Air Yards Share.">
                              <div className="flex items-center justify-end gap-1">
                                <span>WOPR</span>
                                {sortField === 'wopr' && <ArrowUpDown size={12} className="text-cyan-400" />}
                              </div>
                            </th>
                            <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('tprr')} title="Targets Per Route Run %">
                              <div className="flex items-center justify-end gap-1">
                                <span>TPRR</span>
                                {sortField === 'tprr' && <ArrowUpDown size={12} className="text-cyan-400" />}
                              </div>
                            </th>
                            <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('returnFloorPpg')} title="Return Floor PPG: Average weekly points from kickoff/punt returns.">
                              <div className="flex items-center justify-end gap-1">
                                <span>Ret Floor</span>
                                {sortField === 'returnFloorPpg' && <ArrowUpDown size={12} className="text-cyan-400" />}
                              </div>
                            </th>
                            <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('snapPct')} title="Offensive snap share percentage.">
                              <div className="flex items-center justify-end gap-1">
                                <span>Snap%</span>
                                {sortField === 'snapPct' && <ArrowUpDown size={12} className="text-cyan-400" />}
                              </div>
                            </th>
                          </>
                        )}
                      </>
                    )}

                    {activeTab === 'tackles' && (
                      <>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('defSnaps')} title="Total Defensive Snaps played.">Def Snaps</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('defSnapPct')} title="Defensive snap share percentage.">Def Snap%</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('snapTrend3Wk')} title="Snap Trend: 3-week change in snap share percentage compared to baseline.">3-Wk Δ</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('soloTkl')} title="Solo Tackles (+1.0 pt).">Solo</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('astTkl')} title="Assisted Tackles (+0.5 pt).">Ast</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('totalTkl')} title="Total Tackles (Solo + Ast).">Total Tkl</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('tklPerGame')} title="Average Tackles Per Game.">Tkl / G</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('tklRate')} title="Tackle Rate per Defensive Snap: Total Tackles / Def Snaps. >12% is starter caliber, >15% is elite.">Tkl Rate%</th>
                        <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('tacklePts')} title="Total Fantasy Points scored purely from tackles.">Tkl Pts</th>
                      </>
                    )}

                    {activeTab === 'pass_rush' && (
                      <>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('sacks')} title="Sacks (+3.0 pts).">Sacks</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('sacksPerGame')} title="Sacks Per Game.">Sacks / G</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('tfl')} title="Tackles for Loss (+2.0 pts in our league).">TFL</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('tflPerGame')} title="TFL Per Game.">TFL / G</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('qbHits')} title="Quarterback Hits (+0.5 pt).">QB Hits</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('passRushImpact')} title="Pass Rush Impact: Sacks + QB Hits + TFL. Sticky indicator of true backfield penetration.">Pass Rush Impact</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('passRushRate')} title="Pass Rush Disruption Rate: Pass Rush Impact per Defensive Snap.">Impact / Snap%</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('havocPlays')} title="Total Havoc Plays: TFL + Sacks + QB Hits + PD + INT + FF + FR.">Havoc Plays</th>
                        <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('havocRate')} title="Havoc Rate %: Percentage of snaps resulting in a disruptive play.">Havoc%</th>
                      </>
                    )}

                    {activeTab === 'coverage' && (
                      <>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('passDef')} title="Passes Defended (+3.0 pts each in our league!).">Passes Def (PD)</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('passDefPerGame')} title="Passes Defended Per Game.">PD / G</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('interceptions')} title="Interceptions (+3.0 pts each).">INT</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('ff')} title="Forced Fumbles (+3.0 pts).">FF</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('fumRec')} title="Fumble Recoveries (+3.0 pts).">FR</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('defTd')} title="Defensive Touchdowns (+6.0 pts).">Def TD</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('safeties')} title="Safeties (+2.0 pts).">Safety</th>
                        <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('bigPlayPts')} title="Total Fantasy Points scored from big disruptive plays.">Big Play Pts</th>
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
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('rzCarries')} title="Red Zone Rush Attempts.">RZ Rush</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('rzTargets')} title="Red Zone Targets.">RZ Tgts</th>
                        <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('hvt')} title="High-Value Touches: RZ Carries + Targets.">HVT</th>
                      </>
                    )}

                    {activeTab === 'receiving' && (
                      <>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('targets')} title="Total Pass Targets.">Targets</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('receptions')} title="Total Receptions.">Catches</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('recYards')} title="Total Receiving Yards.">Rec Yds</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('routesRun')} title="Estimated Pass Routes Run.">Routes</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('tprr')} title="Targets Per Route Run %">TPRR%</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('airYards')} title="Total Air Yards.">Air Yds</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('aDoT')} title="Average Depth of Target.">aDoT</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('airYardsSharePct')} title="Air Yards Share.">Air%</th>
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('wopr')} title="Weighted Opportunity Rating.">WOPR</th>
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
                        <th className="py-3 px-2 cursor-pointer text-right" onClick={() => handleSort('rushFdRate')} title="Rushing First Down conversion rate.">1D%</th>
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
                        <th className="py-3 px-3 cursor-pointer text-right" onClick={() => handleSort('returnFloorPpg')} title="Return Floor PPG: Average points per game from returns.">Ret Floor/g</th>
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
                                  <span className={`font-bold transition-colors ${
                                    isUnlocked ? 'text-white group-hover:text-cyan-400' : 'text-white/40 filter blur-[5px] select-none pointer-events-none'
                                  }`}>
                                    {isUnlocked ? p.name : '██████████'}
                                  </span>
                                  {p.returnFloorPpg >= 2.0 && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-300 font-mono" title={`+${p.returnFloorPpg.toFixed(1)} Ret Floor PPG`}>
                                      ⚡RET
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted flex items-center gap-1">
                                  <span className={`px-1 py-0.2 rounded font-bold ${
                                    p.isIdp
                                      ? p.idpPos === 'DL'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : p.idpPos === 'LB'
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                      : 'bg-white/10 text-white'
                                  }`}>
                                    {p.isIdp ? `${p.pos} (${p.idpPos})` : p.pos}
                                  </span>
                                  <span>•</span>
                                  <span className={isUnlocked ? '' : 'filter blur-[4px] select-none text-white/30'}>
                                    {isUnlocked ? p.team : '???'}
                                  </span>
                                  <span>•</span>
                                  <span>{p.gamesPlayed} GP</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Ownership Status */}
                          <td className="py-2.5 px-2 font-sans">
                            {p.isRostered ? (
                              <div className="flex items-center gap-1 text-[11px] text-blue-300">
                                {ownerAvatar ? (
                                  <img src={ownerAvatar} alt="owner" className="w-3.5 h-3.5 rounded-full object-cover" />
                                ) : (
                                  <ShieldCheck size={12} className="text-blue-400 shrink-0" />
                                )}
                                <span className={`truncate max-w-[85px] ${isUnlocked ? '' : 'filter blur-[4px] select-none text-white/30'}`}>
                                  {isUnlocked ? (p.owner?.display_name || 'Rostered') : '????'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                                <Sparkles size={11} className="shrink-0" />
                                <span>Waiver</span>
                              </span>
                            )}
                          </td>

                          {/* Overview Tab Columns */}
                          {activeTab === 'overview' && (
                            <>
                              <td className="py-2.5 px-2 text-right">
                                <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${
                                  p.mortyEdgeIndex >= 70
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black'
                                    : p.mortyEdgeIndex >= 50
                                    ? 'bg-purple-500/10 text-purple-300'
                                    : 'text-muted'
                                }`}>
                                  {p.mortyEdgeIndex}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right font-bold text-white">{p.totalCustomPts.toFixed(1)}</td>
                              <td className="py-2.5 px-2 text-right text-emerald-400 font-semibold">{p.customPpg.toFixed(1)}</td>
                              <td className={`py-2.5 px-2 text-right font-medium ${p.deltaVsStd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {p.deltaVsStd >= 0 ? `+${p.deltaVsStd.toFixed(1)}` : p.deltaVsStd.toFixed(1)}
                              </td>

                              {isIdpView ? (
                                <>
                                  <td className="py-2.5 px-2 text-right text-white">{p.soloTkl}</td>
                                  <td className="py-2.5 px-2 text-right text-muted">{p.astTkl}</td>
                                  <td className="py-2.5 px-2 text-right text-amber-400 font-bold">{p.tfl > 0 ? p.tfl : '-'}</td>
                                  <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">{p.sacks > 0 ? p.sacks : '-'}</td>
                                  <td className="py-2.5 px-2 text-right text-indigo-400 font-bold">{p.passDef > 0 ? p.passDef : '-'}</td>
                                  <td className="py-2.5 px-3 text-right text-white font-medium">{p.defSnapPct.toFixed(0)}%</td>
                                </>
                              ) : (
                                <>
                                  <td className="py-2.5 px-2 text-right text-amber-400 font-semibold">{p.totalFd}</td>
                                  <td className="py-2.5 px-2 text-right text-muted">{p.fdPerTouch > 0 ? `${p.fdPerTouch.toFixed(0)}%` : '-'}</td>
                                  <td className="py-2.5 px-2 text-right text-cyan-400 font-bold">{p.wopr > 0 ? p.wopr.toFixed(2) : '-'}</td>
                                  <td className="py-2.5 px-2 text-right text-muted">{p.tprr > 0 ? `${p.tprr.toFixed(0)}%` : '-'}</td>
                                  <td className="py-2.5 px-2 text-right text-cyan-300 font-medium">{p.returnFloorPpg > 0 ? `+${p.returnFloorPpg.toFixed(1)}` : '-'}</td>
                                  <td className="py-2.5 px-3 text-right text-white font-medium">{p.snapPct.toFixed(0)}%</td>
                                </>
                              )}
                            </>
                          )}

                          {/* Tackles Tab (IDP) */}
                          {activeTab === 'tackles' && (
                            <>
                              <td className="py-2.5 px-2 text-right text-muted">{p.defSnaps}</td>
                              <td className="py-2.5 px-2 text-right font-medium text-white">{p.defSnapPct.toFixed(0)}%</td>
                              <td className={`py-2.5 px-2 text-right font-semibold ${p.snapTrend3Wk >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {p.snapTrend3Wk >= 0 ? `+${p.snapTrend3Wk.toFixed(0)}%` : `${p.snapTrend3Wk.toFixed(0)}%`}
                              </td>
                              <td className="py-2.5 px-2 text-right text-white font-bold">{p.soloTkl}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.astTkl}</td>
                              <td className="py-2.5 px-2 text-right text-emerald-400 font-black">{p.totalTkl}</td>
                              <td className="py-2.5 px-2 text-right text-white">{p.tklPerGame.toFixed(1)}</td>
                              <td className={`py-2.5 px-2 text-right font-bold ${p.tklRate >= 14 ? 'text-amber-400' : p.tklRate >= 10 ? 'text-cyan-300' : 'text-muted'}`}>
                                {p.tklRate.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-300 font-bold">{p.tacklePts.toFixed(1)}</td>
                            </>
                          )}

                          {/* Pass Rush & Havoc Tab (IDP) */}
                          {activeTab === 'pass_rush' && (
                            <>
                              <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">{p.sacks > 0 ? p.sacks : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.sacksPerGame > 0 ? p.sacksPerGame.toFixed(2) : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-amber-400 font-bold">{p.tfl > 0 ? p.tfl : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.tflPerGame > 0 ? p.tflPerGame.toFixed(1) : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-purple-300 font-medium">{p.qbHits > 0 ? p.qbHits : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-white font-bold">{p.passRushImpact > 0 ? p.passRushImpact : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.passRushRate > 0 ? `${p.passRushRate.toFixed(1)}%` : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-cyan-400 font-black">{p.havocPlays > 0 ? p.havocPlays : '-'}</td>
                              <td className="py-2.5 px-3 text-right text-purple-300 font-bold">{p.havocRate > 0 ? `${p.havocRate.toFixed(1)}%` : '-'}</td>
                            </>
                          )}

                          {/* Coverage & Turnovers Tab (IDP) */}
                          {activeTab === 'coverage' && (
                            <>
                              <td className="py-2.5 px-2 text-right text-indigo-400 font-bold">{p.passDef > 0 ? p.passDef : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.passDefPerGame > 0 ? p.passDefPerGame.toFixed(1) : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-cyan-300 font-black">{p.interceptions > 0 ? p.interceptions : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-amber-300">{p.ff > 0 ? p.ff : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-amber-300">{p.fumRec > 0 ? p.fumRec : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">{p.defTd > 0 ? p.defTd : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-rose-300">{p.safeties > 0 ? p.safeties : '-'}</td>
                              <td className="py-2.5 px-3 text-right text-emerald-300 font-black">{p.bigPlayPts > 0 ? p.bigPlayPts.toFixed(1) : '-'}</td>
                            </>
                          )}

                          {/* Usage & Opportunity Tab (Offense) */}
                          {activeTab === 'usage' && (
                            <>
                              <td className="py-2.5 px-2 text-right font-medium text-white">{p.snapPct.toFixed(0)}%</td>
                              <td className={`py-2.5 px-2 text-right font-semibold ${p.snapTrend3Wk >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {p.snapTrend3Wk >= 0 ? `+${p.snapTrend3Wk.toFixed(0)}%` : `${p.snapTrend3Wk.toFixed(0)}%`}
                              </td>
                              <td className="py-2.5 px-2 text-right font-bold text-white">{p.totalTouches}</td>
                              <td className="py-2.5 px-2 text-right text-amber-400">{p.targets}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.routesRun}</td>
                              <td className="py-2.5 px-2 text-right text-cyan-400 font-medium">{p.tprr > 0 ? `${p.tprr.toFixed(0)}%` : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.targetSharePct > 0 ? `${p.targetSharePct.toFixed(0)}%` : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-white">{p.carries}</td>
                              <td className="py-2.5 px-2 text-right text-amber-400 font-semibold">{p.rzCarries > 0 ? p.rzCarries : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-amber-300 font-semibold">{p.rzTargets > 0 ? p.rzTargets : '-'}</td>
                              <td className="py-2.5 px-3 text-right text-emerald-400 font-black">{p.hvt}</td>
                            </>
                          )}

                          {/* Receiving Tab (Offense) */}
                          {activeTab === 'receiving' && (
                            <>
                              <td className="py-2.5 px-2 text-right font-bold text-amber-400">{p.targets}</td>
                              <td className="py-2.5 px-2 text-right text-white">{p.receptions}</td>
                              <td className="py-2.5 px-2 text-right font-bold text-white">{p.recYards}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.routesRun}</td>
                              <td className="py-2.5 px-2 text-right text-cyan-400 font-medium">{p.tprr > 0 ? `${p.tprr.toFixed(0)}%` : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.airYards}</td>
                              <td className="py-2.5 px-2 text-right text-cyan-300 font-medium">{p.aDoT > 0 ? p.aDoT.toFixed(1) : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.airYardsSharePct > 0 ? `${p.airYardsSharePct.toFixed(0)}%` : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-amber-400 font-black">{p.wopr > 0 ? p.wopr.toFixed(2) : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">{p.recFd}</td>
                              <td className="py-2.5 px-3 text-right text-muted">{p.recFdRate > 0 ? `${p.recFdRate.toFixed(0)}%` : '-'}</td>
                            </>
                          )}

                          {/* Rushing Tab (Offense) */}
                          {activeTab === 'rushing' && (
                            <>
                              <td className="py-2.5 px-2 text-right font-bold text-white">{p.carries}</td>
                              <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">{p.rushYards}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.ypc > 0 ? p.ypc.toFixed(1) : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-amber-400 font-black">{p.rushTds > 0 ? p.rushTds : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-amber-300 font-bold">{p.rushFd}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.rushFdRate > 0 ? `${p.rushFdRate.toFixed(0)}%` : '-'}</td>
                              <td className="py-2.5 px-2 text-right text-muted">{p.rushYacPerAtt > 0 ? p.rushYacPerAtt.toFixed(1) : '-'}</td>
                              <td className="py-2.5 px-3 text-right text-cyan-400 font-medium">{p.brokenTackleRate > 0 ? `${p.brokenTackleRate.toFixed(0)}%` : '-'}</td>
                            </>
                          )}

                          {/* Special Teams Tab */}
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
