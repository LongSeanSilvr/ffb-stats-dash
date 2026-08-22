import React, { useState, useMemo } from 'react';
import { 
  Trophy, Medal, Award, Crown, ArrowUpDown, ArrowUp, ArrowDown, 
  TrendingUp, TrendingDown, Target, Frown, ShieldAlert, Crosshair, 
  Zap, Ghost, Activity, Frown as SadIcon, AlertTriangle
} from 'lucide-react';
import { 
  ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, ZAxis, 
  Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, 
  Pie, Legend, ReferenceLine, Label 
} from 'recharts';
import { Card } from '../components/Card';
import { MobileTapHint } from '../components/MobileTapHint';
import { useLeagueContext } from '../context/LeagueContext';
import { useAllTimeStats } from '../hooks/useAllTimeStats';
import { useAllTimeMatchups } from '../hooks/useAllTimeMatchups';

export const RecordBook: React.FC = () => {
  const { loading: ctxLoading, error: ctxError, seasons } = useLeagueContext();
  const { managers, loading: statsLoading, error: statsError } = useAllTimeStats(seasons);
  const matchups = useAllTimeMatchups(seasons);
  
  const [sortKey, setSortKey] = useState<string>('goatScore');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [bumpChartMetric, setBumpChartMetric] = useState<'finish'|'fpts'|'winPct'>('finish');

  const loading = ctxLoading || statsLoading;
  const error = ctxError || statsError;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4">Aggregating all-time history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error loading record book: {error}</p>
      </div>
    );
  }

  if (!managers || managers.length === 0) {
    return (
      <div className="p-8 text-center text-white">
        <p>No managers found or stats are empty.</p>
      </div>
    );
  }

  // Calculate year range
  const sortedSeasons = [...seasons].sort((a, b) => parseInt(a.league.season) - parseInt(b.league.season));
  const minYear = sortedSeasons.length > 0 ? sortedSeasons[0].league.season : '';
  const maxYear = sortedSeasons.length > 0 ? sortedSeasons[sortedSeasons.length - 1].league.season : '';

  // Find the top champions
  const maxChampionships = Math.max(...managers.map(m => m.championships));
  const topChampions = managers.filter(m => m.championships === maxChampionships && maxChampionships > 0);

  // Compute GOAT Score
  const normalize = (val: number, min: number, max: number, invert = false) => {
    if (max === min) return 50;
    let score = ((val - min) / (max - min)) * 100;
    return invert ? 100 - score : score;
  };

  const minWins = Math.min(...managers.map(m => m.winPercentage));
  const maxWins = Math.max(...managers.map(m => m.winPercentage));
  const minAvgF = Math.min(...managers.map(m => m.averageFinish));
  const maxAvgF = Math.max(...managers.map(m => m.averageFinish));
  const minEff = Math.min(...managers.map(m => m.coachingEfficiency));
  const maxEff = Math.max(...managers.map(m => m.coachingEfficiency));
  const minPoW = Math.min(...managers.map(m => m.playoffAppearances > 0 ? m.playoffWins / (m.playoffWins + m.playoffLosses) : 0));
  const maxPoW = Math.max(...managers.map(m => m.playoffAppearances > 0 ? m.playoffWins / (m.playoffWins + m.playoffLosses) : 0));
  const minPts = Math.min(...managers.map(m => m.totalFpts / Math.max(1, m.seasonsPlayed)));
  const maxPts = Math.max(...managers.map(m => m.totalFpts / Math.max(1, m.seasonsPlayed)));

  const managersWithScores = managers.map(m => {
    const poWinPct = m.playoffAppearances > 0 ? m.playoffWins / (m.playoffWins + m.playoffLosses) : 0;
    const ptsPerSeason = m.totalFpts / Math.max(1, m.seasonsPlayed);

    const score = 
      (normalize(m.championships, 0, maxChampionships) * 0.25) +
      (normalize(m.winPercentage, minWins, maxWins) * 0.20) +
      (normalize(m.averageFinish, minAvgF, maxAvgF, true) * 0.20) +
      (normalize(m.coachingEfficiency, minEff, maxEff) * 0.15) +
      (normalize(poWinPct, minPoW, maxPoW) * 0.10) +
      (normalize(ptsPerSeason, minPts, maxPts) * 0.10);

    return { ...m, goatScore: Number(score.toFixed(1)), poWinPct, ptsPerSeason };
  }).sort((a, b) => b.goatScore - a.goatScore);

  // Sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'averageFinish' || key === 'managerName' ? 'asc' : 'desc');
    }
  };

  const sortedManagersTable = [...managersWithScores].sort((a, b) => {
    let aVal = (a as any)[sortKey];
    let bVal = (b as any)[sortKey];
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <ArrowUpDown size={14} className="inline ml-1 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" />;
    return sortDir === 'asc' ? <ArrowUp size={14} className="inline ml-1 text-accent-color cursor-pointer" /> : <ArrowDown size={14} className="inline ml-1 text-accent-color cursor-pointer" />;
  };

  const CustomAvatarDot = (props: any) => {
    const { cx, cy, payload } = props;
    const size = 28;
    const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
    
    if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) return null;
    
    return (
      <svg x={cx - size/2} y={cy - size/2} width={size} height={size}>
        <defs>
          <clipPath id={`clip-${payload.managerName.replace(/\s+/g, '-')}`}>
            <circle cx={size/2} cy={size/2} r={size/2} />
          </clipPath>
        </defs>
        {avatarUrl ? (
          <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#clip-${payload.managerName.replace(/\s+/g, '-')})`} />
        ) : (
          <circle cx={size/2} cy={size/2} r={size/2} fill="#475569" />
        )}
      </svg>
    );
  };

  const RecordCard = ({ title, value, subtext, icon: Icon, manager, color, isShame = false }: any) => {
    if (!manager) return null;
    return (
      <div className={`flex flex-col justify-between h-full relative overflow-hidden box-border ${isShame ? 'shame-card' : ''}`} style={{ padding: '1.5rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: `1px solid ${color}`, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">{title}</h3>
            <Icon size={20} color={color} className="shrink-0 ml-2" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            {manager.avatar ? (
              <img src={`https://sleepercdn.com/avatars/thumbs/${manager.avatar}`} alt="avatar" className="shrink-0" style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${color}` }} />
            ) : (
              <div className="bg-slate-700 flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: '50%' }}>
                <span className="text-white/50 text-xs">N/A</span>
              </div>
            )}
            <span className="font-bold text-lg text-white truncate">{manager.managerName}</span>
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-gradient" style={{ color: color }}>{value}</div>
          <div className="text-xs text-muted mt-1">{subtext}</div>
        </div>
      </div>
    );
  };

  // Find extremes for records
  const getManager = (id: string) => managersWithScores.find(m => m.ownerId === id);
  
  const mostWins = Math.max(...managers.map(m => m.wins));
  const highestWinPct = Math.max(...managers.map(m => m.winPercentage));
  const mostFpts = Math.max(...managers.map(m => m.totalFpts));
  const highestSingleSeason = Math.max(...managers.map(m => m.bestSingleSeasonFpts));
  const bestAvgFinish = Math.min(...managers.map(m => m.averageFinish).filter(f => f > 0));
  const bestCoachingEff = Math.max(...managers.map(m => m.coachingEfficiency));
  const mostFinalsApps = Math.max(...managers.map(m => m.championshipAppearances));
  const bestClutchRating = Math.max(...managers.map(m => m.playoffAppearances > 1 ? (m.playoffWins / (m.playoffWins + m.playoffLosses)) * 100 : 0));

  const worstSingleSeason = Math.min(...managers.map(m => m.worstSingleSeasonFpts).filter(f => f > 0));
  const worstFinishAny = Math.max(...managers.map(m => m.worstFinish));
  const worstSchedule = Math.max(...managers.map(m => m.ptsAgainstPerGame));

  // Visualizations logic
  const avgPtsMean = managersWithScores.reduce((sum, m) => sum + m.ptsPerSeason, 0) / (managersWithScores.length || 1);
  const winPctMean = managersWithScores.reduce((sum, m) => sum + m.winPercentage, 0) / (managersWithScores.length || 1);
  const avgFinishMean = managersWithScores.reduce((sum, m) => sum + m.averageFinish, 0) / (managersWithScores.length || 1);
  const peakMean = managersWithScores.reduce((sum, m) => sum + m.bestSingleSeasonFpts, 0) / (managersWithScores.length || 1);
  const effMean = managersWithScores.reduce((sum, m) => sum + m.coachingEfficiency, 0) / (managersWithScores.length || 1);

  const champsData = [...managers].filter(m => m.championships > 0).sort((a, b) => b.championships - a.championships);
  const pieColors = ['#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f97316'];
  const lineColors = ['#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f97316', '#ef4444', '#06b6d4', '#14b8a6', '#f43f5e', '#d946ef', '#64748b', '#84cc16'];

  // Bump chart data
  const bumpData: any[] = [];
  sortedSeasons.forEach(season => {
    const sYear = season.league.season;
    const dp: any = { name: sYear };
    managersWithScores.forEach(m => {
      const bk = m.seasonBreakdowns.find(b => b.season === sYear);
      if (bk) dp[m.managerName] = bk[bumpChartMetric];
    });
    bumpData.push(dp);
  });

  // H2H Heatmap Colors
  const getHeatmapColor = (wins: number, losses: number) => {
    const diff = wins - losses;
    if (diff > 3) return 'positive-3';
    if (diff > 1) return 'positive-2';
    if (diff > 0) return 'positive-1';
    if (diff < -3) return 'negative-3';
    if (diff < -1) return 'negative-2';
    if (diff < 0) return 'negative-1';
    return 'neutral';
  };

  return (
    <div className="animate-fade-in pb-12">
      <h1 className="text-3xl text-gradient mt-4 mb-1">Hall of Fame</h1>
      <p className="text-muted mb-8">All-time records and history (Sleeper Era: {minYear}-{maxYear})</p>

      {/* Dynasty Leaders */}
      {topChampions.length > 0 && (
        <Card title="The Dynasty Leaders" className="stagger-1 mb-8" style={{ background: 'linear-gradient(145deg, rgba(251, 191, 36, 0.05) 0%, rgba(15, 17, 21, 0.8) 100%)', borderColor: 'rgba(251, 191, 36, 0.2)' }}>
           <div className="flex flex-wrap gap-6 justify-center py-6">
              {topChampions.map(champ => (
                 <div key={champ.ownerId} className="flex flex-col items-center justify-center">
                    <div className="relative mb-3">
                       <Crown size={48} className="text-yellow-400 absolute -top-8 -left-4 -rotate-12 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                       <img src={`https://sleepercdn.com/avatars/thumbs/${champ.avatar}`} alt="avatar" className="shadow-2xl" style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid rgba(251,191,36,0.6)' }} />
                    </div>
                    <div className="font-bold text-xl">{champ.managerName}</div>
                    <div className="text-yellow-400 font-bold tracking-widest uppercase text-sm mt-1">{champ.championships}x Champion</div>
                 </div>
              ))}
           </div>
        </Card>
      )}

      {/* GOAT Rankings */}
      <h2 className="text-2xl text-white mt-12 mb-4 stagger-1">GOAT Power Rankings</h2>
      <MobileTapHint text="Scroll horizontally to view all rankings" />
      <div className="goat-scroll mb-12 stagger-1">
        {managersWithScores.map((m, i) => (
          <div key={m.ownerId} className={`goat-card ${i < 3 ? `rank-${i+1}` : ''} bg-white/5 border border-white/10`}>
             <div className="absolute top-2 left-2 text-xs font-bold text-muted bg-black/40 px-2 py-1 rounded">#{i+1}</div>
             <div className="flex justify-center mb-3">
               {m.avatar ? <img src={`https://sleepercdn.com/avatars/thumbs/${m.avatar}`} alt="av" className="w-12 h-12 rounded-full border border-white/20" /> : <div className="w-12 h-12 rounded-full bg-slate-700"></div>}
             </div>
             <div className="font-bold text-white mb-1 truncate">{m.managerName}</div>
             <div className="text-2xl font-black text-gradient mb-3">{m.goatScore} <span className="text-[10px] text-muted">PTS</span></div>
             <div className="flex justify-between text-xs text-muted mb-1">
               <span>Rings</span>
               <span className="text-white font-bold">{m.championships}</span>
             </div>
             <div className="flex justify-between text-xs text-muted mb-1">
               <span>Win %</span>
               <span className="text-white font-bold">{m.winPercentage}%</span>
             </div>
             <div className="flex justify-between text-xs text-muted">
               <span>Avg Rank</span>
               <span className="text-white font-bold">{m.averageFinish}</span>
             </div>
          </div>
        ))}
      </div>

      {/* Hall of Records */}
      <h2 className="text-2xl text-white mt-12 mb-6 stagger-2">Hall of Records</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12 stagger-2">
        <RecordCard title="Most Wins" value={`${mostWins}`} subtext="Regular season & playoffs" icon={Medal} color="#10b981" manager={managers.find(m => m.wins === mostWins)} />
        <RecordCard title="Highest Win %" value={`${highestWinPct}%`} subtext="Min 1 season played" icon={Trophy} color="#3b82f6" manager={managers.find(m => m.winPercentage === highestWinPct)} />
        <RecordCard title="Most Points Scored" value={mostFpts.toFixed(1)} subtext="All-time career points" icon={Award} color="#8b5cf6" manager={managers.find(m => m.totalFpts === mostFpts)} />
        <RecordCard title="Best Single Season" value={highestSingleSeason.toFixed(1)} subtext="Most points in a single year" icon={Medal} color="#f97316" manager={managers.find(m => m.bestSingleSeasonFpts === highestSingleSeason)} />
        <RecordCard title="Best Avg Finish" value={`${bestAvgFinish.toFixed(1)}`} subtext="Average final standing" icon={Trophy} color="#fbbf24" manager={managers.find(m => m.averageFinish === bestAvgFinish)} />
        <RecordCard title="Lineup Setter" value={`${bestCoachingEff.toFixed(1)}%`} subtext="Career coaching efficiency" icon={Target} color="#14b8a6" manager={managers.find(m => m.coachingEfficiency === bestCoachingEff)} />
        <RecordCard title="Finals Apps" value={`${mostFinalsApps}`} subtext="Total championship appearances" icon={Crown} color="#ec4899" manager={managers.find(m => m.championshipAppearances === mostFinalsApps)} />
        <RecordCard title="Clutch Rating" value={`${bestClutchRating.toFixed(1)}%`} subtext="Playoff win % (min 2 apps)" icon={Zap} color="#eab308" manager={managers.find(m => m.playoffAppearances > 1 && (m.playoffWins / (m.playoffWins + m.playoffLosses)) * 100 === bestClutchRating)} />
        {!matchups.loading && matchups.careerHighWeek && Object.keys(matchups.careerHighWeek).length > 0 && (
           (() => {
              const highs = Object.entries(matchups.careerHighWeek).map(([ownerId, wk]) => ({ ownerId, ...wk })).sort((a, b) => b.points - a.points);
              const best = highs[0];
              return best ? <RecordCard title="Career High Week" value={best.points.toFixed(1)} subtext={`${best.season} Wk ${best.week}`} icon={TrendingUp} color="#2dd4bf" manager={getManager(best.ownerId)} /> : null;
           })()
        )}
      </div>

      {/* Hall of Shame */}
      <h2 className="text-2xl text-white mt-12 mb-6 stagger-2">Hall of Shame</h2>
      {!matchups.loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 stagger-2">
          <RecordCard title="Worst Season" value={worstSingleSeason.toFixed(1)} subtext="Lowest points in a single year" icon={SadIcon} color="#ef4444" isShame manager={managers.find(m => m.worstSingleSeasonFpts === worstSingleSeason)} />
          <RecordCard title="The Doormat" value={`${worstFinishAny}th`} subtext="Lowest finish standing" icon={Frown} color="#f43f5e" isShame manager={managers.find(m => m.worstFinish === worstFinishAny)} />
          <RecordCard title="Schedule Victim" value={worstSchedule.toFixed(1)} subtext="Highest pts against / game" icon={ShieldAlert} color="#fb7185" isShame manager={managers.find(m => m.ptsAgainstPerGame === worstSchedule)} />
          {matchups.biggestBlowoutLoss && (
            <RecordCard title="Biggest Blowout" value={`-${matchups.biggestBlowoutLoss.margin.toFixed(1)}`} subtext={`${matchups.biggestBlowoutLoss.season} Wk ${matchups.biggestBlowoutLoss.week} vs ${getManager(matchups.biggestBlowoutLoss.winnerId)?.managerName}`} icon={AlertTriangle} color="#dc2626" isShame manager={getManager(matchups.biggestBlowoutLoss.loserId)} />
          )}
          {matchups.biggestChoke && (
            <RecordCard title="Biggest Choke" value={matchups.biggestChoke.points.toFixed(1)} subtext={`Lost to ${matchups.biggestChoke.opponentPts.toFixed(1)} (${matchups.biggestChoke.season} Wk ${matchups.biggestChoke.week})`} icon={Ghost} color="#ea580c" isShame manager={getManager(matchups.biggestChoke.ownerId)} />
          )}
          {matchups.biggestRobbery && (
            <RecordCard title="Biggest Robbery" value={matchups.biggestRobbery.points.toFixed(1)} subtext={`Won over ${matchups.biggestRobbery.opponentPts.toFixed(1)} (${matchups.biggestRobbery.season} Wk ${matchups.biggestRobbery.week})`} icon={Crosshair} color="#9f1239" isShame manager={getManager(matchups.biggestRobbery.ownerId)} />
          )}
        </div>
      ) : (
        <div className="p-8 text-center border border-white/10 rounded-xl bg-white/5 mb-12">
           <div className="loading-spinner mb-3 inline-block"></div>
           <p className="text-muted">Loading weekly matchup history ({matchups.progress}%)...</p>
        </div>
      )}

      {/* Yearbook Awards */}
      <h2 className="text-2xl text-white mt-12 mb-6 stagger-2">Yearbook Awards</h2>
      <div className="yearbook-grid mb-12 stagger-2">
         {(() => {
           // Calculations for awards
           const mostImproved = managersWithScores.reduce((prev, curr) => curr.biggestSeasonJump > prev.biggestSeasonJump ? curr : prev, managersWithScores[0]);
           
           const withStdDev = managersWithScores.filter(m => m.finishes.length > 1).map(m => {
             const avg = m.averageFinish;
             const sqDiffs = m.finishes.map(f => Math.pow(f - avg, 2));
             const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / sqDiffs.length;
             return { ...m, stdDev: Math.sqrt(avgSqDiff) };
           });
           
           const mostConsistent = withStdDev.reduce((prev, curr) => curr.stdDev < prev.stdDev ? curr : prev, withStdDev[0]);
           const boomOrBust = withStdDev.reduce((prev, curr) => curr.stdDev > prev.stdDev ? curr : prev, withStdDev[0]);
           const scheduleGod = managersWithScores.reduce((prev, curr) => curr.ptsAgainstPerGame < prev.ptsAgainstPerGame ? curr : prev, managersWithScores[0]);
           const regSeasonHero = managersWithScores.filter(m => m.playoffAppearances > 0).reduce((prev, curr) => (curr.winPercentage / Math.max(1, curr.poWinPct * 100)) > (prev.winPercentage / Math.max(1, prev.poWinPct * 100)) ? curr : prev, managersWithScores[0]);
           const theCloser = managersWithScores.filter(m => m.playoffAppearances > 0).reduce((prev, curr) => (curr.poWinPct * 100 / curr.winPercentage) > (prev.poWinPct * 100 / prev.winPercentage) ? curr : prev, managersWithScores[0]);

           const AwardItem = ({ title, m, stat, emoji }: any) => {
             if (!m) return null;
             return (
               <div className="yearbook-card flex items-center gap-4">
                 <div className="text-3xl">{emoji}</div>
                 <div>
                   <div className="text-xs font-bold text-accent-color uppercase tracking-wider mb-1">{title}</div>
                   <div className="font-bold text-white text-lg flex items-center gap-2">
                     {m.avatar ? <img src={`https://sleepercdn.com/avatars/thumbs/${m.avatar}`} className="w-5 h-5 rounded-full" alt="av"/> : null}
                     {m.managerName}
                   </div>
                   <div className="text-xs text-muted">{stat}</div>
                 </div>
               </div>
             );
           };

           return (
             <>
               <AwardItem title="Most Improved" m={mostImproved} stat={`Jumped ${mostImproved.biggestSeasonJump} spots in one year`} emoji="📈" />
               <AwardItem title="Most Consistent" m={mostConsistent} stat={`Finish StdDev: ±${mostConsistent?.stdDev?.toFixed(1)}`} emoji="⏱️" />
               <AwardItem title="Boom or Bust" m={boomOrBust} stat={`Finish StdDev: ±${boomOrBust?.stdDev?.toFixed(1)}`} emoji="🎢" />
               <AwardItem title="Schedule God" m={scheduleGod} stat={`Only ${scheduleGod.ptsAgainstPerGame} PA/Game`} emoji="😇" />
               {regSeasonHero && <AwardItem title="Reg. Season Hero" m={regSeasonHero} stat={`${regSeasonHero.winPercentage}% Win vs ${(regSeasonHero.poWinPct*100).toFixed(1)}% Playoff`} emoji="🦸‍♂️" />}
               {theCloser && <AwardItem title="The Closer" m={theCloser} stat={`${(theCloser.poWinPct*100).toFixed(1)}% Playoff Win vs ${theCloser.winPercentage}% Reg`} emoji="🧊" />}
             </>
           );
         })()}
      </div>

      {/* Charts Section */}
      <h2 className="text-2xl text-white mt-12 mb-6 stagger-3">Advanced Visualizations</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 stagger-3">
        
        {/* Bump Chart */}
        <Card title="Season Trajectory" className="col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div className="text-muted text-sm">Manager performance over time.</div>
            <div className="chart-toggle">
              <button className={bumpChartMetric === 'finish' ? 'active' : ''} onClick={() => setBumpChartMetric('finish')}>Finish</button>
              <button className={bumpChartMetric === 'fpts' ? 'active' : ''} onClick={() => setBumpChartMetric('fpts')}>Points</button>
              <button className={bumpChartMetric === 'winPct' ? 'active' : ''} onClick={() => setBumpChartMetric('winPct')}>Win %</button>
            </div>
          </div>
          <div style={{ height: 400 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bumpData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" />
                <YAxis 
                  reversed={bumpChartMetric === 'finish'} 
                  stroke="rgba(255,255,255,0.4)"
                  domain={bumpChartMetric === 'finish' ? [1, 12] : ['auto', 'auto']}
                  tickCount={bumpChartMetric === 'finish' ? 12 : 5}
                />
                <Tooltip contentStyle={{ backgroundColor: '#0f1115', borderColor: 'rgba(255,255,255,0.1)' }} />
                {managersWithScores.map((m, i) => (
                  <Line 
                    key={m.ownerId} 
                    type="monotone" 
                    dataKey={m.managerName} 
                    stroke={lineColors[i % lineColors.length]} 
                    strokeWidth={3} 
                    dot={{ r: 4, strokeWidth: 2 }} 
                    activeDot={{ r: 8 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Existing Scatters */}
        <Card title="Luck vs Skill Matrix">
          <div className="chart-header">
            <div className="chart-description">Compares average points scored per season against overall win percentage.</div>
            <div className="matrix-legend-wrapper">
              <div className="matrix-legend-grid">
                <div className="matrix-quadrant top-left">🍀 Lucky</div>
                <div className="matrix-quadrant top-right">👑 Juggernauts</div>
                <div className="matrix-quadrant bottom-left">📉 Bottom Feeders</div>
                <div className="matrix-quadrant bottom-right">🤕 Unlucky</div>
              </div>
            </div>
          </div>
          <div style={{ height: 350 }} className="mt-2 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="ptsPerSeason" name="Avg Pts" stroke="rgba(255,255,255,0.4)" domain={['dataMin - 50', 'dataMax + 50']} label={{ value: 'Avg Pts', position: 'insideBottom', offset: -10, fill: '#94a3b8' }} />
                <YAxis type="number" dataKey="winPercentage" name="Win %" stroke="rgba(255,255,255,0.4)" domain={['dataMin - 5', 'dataMax + 5']} label={{ value: 'Win %', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <ReferenceLine x={avgPtsMean} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <ReferenceLine y={winPctMean} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <Scatter name="Managers" data={managersWithScores} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Peak vs Consistency Matrix">
          <div className="chart-header">
            <div className="chart-description">Compares average final standing against best single-season points scored.</div>
            <div className="matrix-legend-wrapper">
              <div className="matrix-legend-grid">
                <div className="matrix-quadrant top-left">⚡ One-Hit Wonders</div>
                <div className="matrix-quadrant top-right">🏛️ Dynasty Builders</div>
                <div className="matrix-quadrant bottom-left">📉 Perennial Losers</div>
                <div className="matrix-quadrant bottom-right">🎯 Steady Eddies</div>
              </div>
            </div>
          </div>
          <div style={{ height: 350 }} className="mt-2 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="averageFinish" reversed name="Avg Finish" stroke="rgba(255,255,255,0.4)" domain={[1, 12]} label={{ value: 'Avg Finish (Lower is Better)', position: 'insideBottom', offset: -10, fill: '#94a3b8' }} />
                <YAxis type="number" dataKey="bestSingleSeasonFpts" name="Peak Pts" stroke="rgba(255,255,255,0.4)" domain={['dataMin - 100', 'dataMax + 100']} label={{ value: 'Peak Pts', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <ReferenceLine x={avgFinishMean} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <ReferenceLine y={peakMean} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <Scatter name="Managers" data={managersWithScores} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Coaching Efficiency Matrix">
          <div className="chart-header">
            <div className="chart-description">Compares coaching efficiency (% of max potential points started) against win percentage.</div>
            <div className="matrix-legend-wrapper">
              <div className="matrix-legend-grid">
                <div className="matrix-quadrant top-left">🎰 Lucky but Careless</div>
                <div className="matrix-quadrant top-right">🧠 The Complete Package</div>
                <div className="matrix-quadrant bottom-left">💤 Checked Out</div>
                <div className="matrix-quadrant bottom-right">😤 Wasted Talent</div>
              </div>
            </div>
          </div>
          <div style={{ height: 350 }} className="mt-2 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="coachingEfficiency" name="Efficiency %" stroke="rgba(255,255,255,0.4)" domain={['dataMin - 2', 'dataMax + 2']} label={{ value: 'Efficiency %', position: 'insideBottom', offset: -10, fill: '#94a3b8' }} />
                <YAxis type="number" dataKey="winPercentage" name="Win %" stroke="rgba(255,255,255,0.4)" domain={['dataMin - 5', 'dataMax + 5']} label={{ value: 'Win %', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <ReferenceLine x={effMean} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <ReferenceLine y={winPctMean} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <Scatter name="Managers" data={managersWithScores} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Ring Distribution */}
        <Card title="Championship Distribution">
          <div className="h-[350px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={champsData} cx="50%" cy="50%" innerRadius={80} outerRadius={115} paddingAngle={2} dataKey="championships" nameKey="managerName">
                  {champsData.map((e, i) => <Cell key={`cell-${i}`} fill={pieColors[i % pieColors.length]} />)}
                  <Label value={champsData.reduce((sum, m) => sum + m.championships, 0)} position="center" fill="#ffffff" style={{ fontSize: '32px', fontWeight: 'bold' }} dy={-8} />
                  <Label value="RINGS" position="center" fill="#94a3b8" style={{ fontSize: '10px', letterSpacing: '1px' }} dy={14} />
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>

      {/* Finish Distribution Heatmap */}
      <Card title="Finish Distribution Heatmap" className="mb-12">
        <div className="text-muted text-sm mb-4">Count of final standings by manager, sorted by average finish.</div>
        <div className="heatmap-scroll-container">
          <div className="heatmap-grid" style={{ gridTemplateColumns: `auto repeat(12, 1fr)` }}>
            <div className="heatmap-header heatmap-row-label bg-slate-900 border-b border-white/10 z-10">Manager</div>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(pos => (
              <div key={pos} className="heatmap-header border-b border-white/10 pb-2">{pos}{pos===1?'st':pos===2?'nd':pos===3?'rd':'th'}</div>
            ))}
            
            {[...managersWithScores].sort((a,b)=>a.averageFinish - b.averageFinish).map(m => {
              const counts: Record<number, number> = {};
              m.finishes.forEach(f => { counts[f] = (counts[f] || 0) + 1; });
              const maxCount = Math.max(...Object.values(counts), 1);
              
              return (
                <React.Fragment key={m.ownerId}>
                  <div className="heatmap-row-label flex items-center gap-2 border-b border-white/5 py-1">
                     {m.avatar && <img src={`https://sleepercdn.com/avatars/thumbs/${m.avatar}`} className="w-5 h-5 rounded-full" alt="av" />}
                     <span className="font-medium text-white text-sm truncate w-24">{m.managerName}</span>
                  </div>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(pos => {
                    const count = counts[pos] || 0;
                    let intensity = count === 0 ? 0 : Math.ceil((count / maxCount) * 3);
                    let colorClass = 'neutral';
                    if (intensity > 0) {
                       // top 4 green, middle neutral, bottom red
                       if (pos <= 4) colorClass = `positive-${intensity}`;
                       else if (pos >= 9) colorClass = `negative-${intensity}`;
                       else colorClass = `neutral bg-white/10`; // Mid gets a slight white opacity
                    }
                    return (
                      <div key={pos} className={`heatmap-cell border-b border-white/5 flex items-center justify-center ${colorClass}`}>
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Head-to-Head & Rivalries */}
      <h2 className="text-2xl text-white mt-12 mb-6 stagger-3">Head-to-Head All-Time</h2>
      {!matchups.loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 stagger-3">
             {matchups.mostLopsidedRivalry && (
                <div className="card-base p-5 border border-white/10 rounded-xl bg-white/5">
                   <div className="text-xl mb-2">🏆</div>
                   <div className="text-xs font-bold text-accent-color uppercase mb-2">I Own You</div>
                   <div className="font-bold text-white mb-1">
                      {getManager(matchups.mostLopsidedRivalry.owner1)?.managerName} dominates {getManager(matchups.mostLopsidedRivalry.owner2)?.managerName}
                   </div>
                   <div className="text-2xl font-black text-green-400">
                      {matchups.mostLopsidedRivalry.wins} - {matchups.mostLopsidedRivalry.losses}
                   </div>
                </div>
             )}
             {matchups.mostCompetitiveRivalry && (
                <div className="card-base p-5 border border-white/10 rounded-xl bg-white/5">
                   <div className="text-xl mb-2">⚔️</div>
                   <div className="text-xs font-bold text-accent-color uppercase mb-2">The Blood Feud</div>
                   <div className="font-bold text-white mb-1">
                      {getManager(matchups.mostCompetitiveRivalry.owner1)?.managerName} vs {getManager(matchups.mostCompetitiveRivalry.owner2)?.managerName}
                   </div>
                   <div className="text-2xl font-black text-yellow-400">
                      {matchups.mostCompetitiveRivalry.wins} - {matchups.mostCompetitiveRivalry.losses}
                   </div>
                </div>
             )}
             {matchups.longestDominanceStreak && (
                <div className="card-base p-5 border border-white/10 rounded-xl bg-white/5">
                   <div className="text-xl mb-2">🔥</div>
                   <div className="text-xs font-bold text-accent-color uppercase mb-2">Active Streak</div>
                   <div className="font-bold text-white mb-1">
                      {getManager(matchups.longestDominanceStreak.dominator)?.managerName} vs {getManager(matchups.longestDominanceStreak.victim)?.managerName}
                   </div>
                   <div className="text-2xl font-black text-orange-400">
                      Won {matchups.longestDominanceStreak.streak} in a row
                   </div>
                </div>
             )}
          </div>

          <Card title="H2H Matrix" className="mb-12">
            <div className="heatmap-scroll-container pb-4">
              <div className="heatmap-grid" style={{ gridTemplateColumns: `auto repeat(${managersWithScores.length}, 1fr)` }}>
                <div className="heatmap-header heatmap-row-label bg-slate-900 border-b border-white/10 z-10 text-left">Matchup</div>
                {managersWithScores.map(m => (
                  <div key={m.ownerId} className="heatmap-header border-b border-white/10 pb-2">
                    {m.avatar ? <img src={`https://sleepercdn.com/avatars/thumbs/${m.avatar}`} className="w-6 h-6 rounded-full mx-auto" alt="av" title={m.managerName} /> : <div className="w-6 h-6 rounded-full bg-slate-700 mx-auto" title={m.managerName}></div>}
                  </div>
                ))}
                
                {managersWithScores.map(mRow => (
                  <React.Fragment key={mRow.ownerId}>
                    <div className="heatmap-row-label flex items-center gap-2 border-b border-white/5 py-1">
                       {mRow.avatar && <img src={`https://sleepercdn.com/avatars/thumbs/${mRow.avatar}`} className="w-5 h-5 rounded-full" alt="av" />}
                       <span className="font-medium text-white text-sm truncate w-24">{mRow.managerName}</span>
                    </div>
                    {managersWithScores.map(mCol => {
                      if (mRow.ownerId === mCol.ownerId) {
                        return <div key={mCol.ownerId} className="heatmap-cell diagonal border-b border-white/5">—</div>;
                      }
                      const record = matchups.h2hMatrix[mRow.ownerId]?.[mCol.ownerId] || { wins: 0, losses: 0 };
                      const colorClass = getHeatmapColor(record.wins, record.losses);
                      
                      return (
                        <div key={mCol.ownerId} className={`heatmap-cell border-b border-white/5 flex items-center justify-center ${colorClass}`}>
                          {record.wins}-{record.losses}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </Card>
        </>
      ) : (
        <div className="p-8 text-center border border-white/10 rounded-xl bg-white/5 mb-12">
           <div className="loading-spinner mb-3 inline-block"></div>
           <p className="text-muted">Analyzing thousands of matchups ({matchups.progress}%)...</p>
        </div>
      )}

      {/* Leaderboard Table */}
      <Card title="All-Time Leaderboard" className="stagger-4 mb-12">
        <MobileTapHint text="Scroll horizontally to view all stats" />
        
        <div className="overflow-x-auto mt-4 rounded-lg" style={{ border: '1px solid var(--card-border)' }}>
          <table className="standings-table w-full whitespace-nowrap">
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr>
                <th className="text-left px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('managerName')}>
                  Manager <SortIcon column="managerName" />
                </th>
                <th className="text-center px-4 py-3 text-purple-400 cursor-pointer select-none group" onClick={() => handleSort('goatScore')}>
                  GOAT <SortIcon column="goatScore" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('seasonsPlayed')}>
                  Szn <SortIcon column="seasonsPlayed" />
                </th>
                <th className="text-center px-4 py-3 text-yellow-400 cursor-pointer select-none group" onClick={() => handleSort('championships')}>
                  Rings <SortIcon column="championships" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('wins')}>
                  Record <SortIcon column="wins" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('winPercentage')}>
                  Win % <SortIcon column="winPercentage" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('averageFinish')}>
                  Avg Fin <SortIcon column="averageFinish" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('bestFinish')}>
                  Best/Worst <SortIcon column="bestFinish" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('ptsPerSeason')}>
                  Pts/Szn <SortIcon column="ptsPerSeason" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('coachingEfficiency')}>
                  Eff % <SortIcon column="coachingEfficiency" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('playoffWins')}>
                  Playoffs <SortIcon column="playoffWins" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedManagersTable.map((m, i) => (
                <tr 
                  key={m.ownerId} 
                  className="standings-row hover:bg-white/5 transition-colors"
                  style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                >
                  <td className="team-cell px-4 py-3">
                    <span className="team-rank w-6 inline-block">{i + 1}.</span>
                    {m.avatar ? (
                      <img src={`https://sleepercdn.com/avatars/thumbs/${m.avatar}`} alt="avatar" className="team-avatar inline-block w-8 h-8 rounded-full ml-2 mr-3 border border-white/10" />
                    ) : (
                      <div className="team-avatar-placeholder inline-block w-8 h-8 rounded-full ml-2 mr-3 bg-slate-700"></div>
                    )}
                    <span className="font-medium text-white">{m.managerName}</span>
                  </td>
                  <td className="text-center px-4 py-3 font-bold text-purple-400">{m.goatScore}</td>
                  <td className="text-center px-4 py-3 text-muted">{m.seasonsPlayed}</td>
                  <td className="text-center px-4 py-3 font-bold text-yellow-400">{m.championships}</td>
                  <td className="text-center px-4 py-3 text-gray-300">
                    {m.wins}-{m.losses}{m.ties > 0 ? `-${m.ties}` : ''}
                  </td>
                  <td className="text-center px-4 py-3 font-mono text-accent-color font-bold">{m.winPercentage}%</td>
                  <td className="text-center px-4 py-3 font-mono font-medium text-blue-300">{m.averageFinish}</td>
                  <td className="text-center px-4 py-3 font-mono text-muted text-sm">
                    {m.bestFinish} / {m.worstFinish}
                  </td>
                  <td className="text-center px-4 py-3 font-mono text-white">{m.ptsPerSeason.toFixed(1)}</td>
                  <td className="text-center px-4 py-3 font-mono text-teal-300">{m.coachingEfficiency}%</td>
                  <td className="text-center px-4 py-3 font-mono text-pink-300">
                    {m.playoffAppearances > 0 ? `${m.playoffWins}-${m.playoffLosses}` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
