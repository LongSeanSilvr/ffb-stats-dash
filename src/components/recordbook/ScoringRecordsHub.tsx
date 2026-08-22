import React from 'react';
import {
  TrendingUp, TrendingDown, Medal, Trophy, Target, ShieldCheck,
  ShieldAlert, Activity, Award, Flame, AlertCircle, Sparkles
} from 'lucide-react';
import type { ManagerScore } from '../../types/recordBook';
import type { AllTimeMatchupData } from '../../hooks/useAllTimeMatchups';
import { RecordCard } from './RecordCard';
import { computeSuperlatives } from '../../utils/superlativesCalculator';

interface ScoringRecordsHubProps {
  managers: ManagerScore[];
  matchups: AllTimeMatchupData;
}

export const ScoringRecordsHub: React.FC<ScoringRecordsHubProps> = ({ managers, matchups }) => {
  const getManager = (id?: string) => managers.find(m => m.ownerId === id);

  // High Extremes
  const highestWinPct = Math.max(0, ...managers.map(m => m.winPercentage));
  const mostPoints = Math.max(0, ...managers.map(m => m.totalFpts));
  const bestSeasonPoints = Math.max(0, ...managers.map(m => m.bestSingleSeasonFpts));
  const bestAvgFinish = Math.min(...managers.map(m => m.averageFinish).filter(f => f > 0));
  const bestLineupEfficiency = Math.max(0, ...managers.map(m => m.coachingEfficiency));

  // Single-Game High
  const careerHighs = Object.entries(matchups.careerHighWeek || {}).map(([ownerId, val]) => ({
    ownerId,
    ...val,
  })).sort((a, b) => b.points - a.points);
  const topSingleGame = careerHighs.length > 0 ? careerHighs[0] : null;

  // Single-Game Low & Heartbreaks
  const worstSeason = Math.min(...managers.map(m => m.worstSingleSeasonFpts).filter(f => f > 0));
  const superlatives = computeSuperlatives(managers);

  const getSuperlativeIcon = (name: string) => {
    switch (name) {
      case 'TrendingUp': return TrendingUp;
      case 'Activity': return Activity;
      case 'ShieldCheck': return ShieldCheck;
      case 'ShieldAlert': return ShieldAlert;
      case 'Trophy': return Trophy;
      default: return Award;
    }
  };

  return (
    <div className="space-y-14 animate-fade-in">
      {/* All-Time Scoring Highs & Milestones */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Flame className="text-amber-400" size={24} />
            All-Time Scoring Highs & Milestones
          </h2>
          <p className="text-sm text-muted mt-1">
            Historical single-game records and career milestones
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {topSingleGame && (
            <RecordCard
              title="Highest Single-Week Score"
              value={`${topSingleGame.points.toFixed(1)} pts`}
              subtext={`${topSingleGame.season} Week ${topSingleGame.week}`}
              icon={TrendingUp}
              color="var(--success-color)"
              managerName={getManager(topSingleGame.ownerId)?.managerName}
              avatar={getManager(topSingleGame.ownerId)?.avatar}
            />
          )}

          <RecordCard
            title="Most Points in a Season"
            value={`${bestSeasonPoints.toFixed(1)} pts`}
            subtext="Highest single-year scoring output"
            icon={Medal}
            color="#3b82f6"
            managerName={managers.find(m => m.bestSingleSeasonFpts === bestSeasonPoints)?.managerName}
            avatar={managers.find(m => m.bestSingleSeasonFpts === bestSeasonPoints)?.avatar}
          />

          <RecordCard
            title="Most Career Points"
            value={`${mostPoints.toFixed(1)} pts`}
            subtext="All-time total points scored"
            icon={Trophy}
            color="#8b5cf6"
            managerName={managers.find(m => m.totalFpts === mostPoints)?.managerName}
            avatar={managers.find(m => m.totalFpts === mostPoints)?.avatar}
          />

          <RecordCard
            title="Highest Career Win %"
            value={`${highestWinPct.toFixed(1)}%`}
            subtext={`${managers.find(m => m.winPercentage === highestWinPct)?.wins || 0} career wins`}
            icon={Award}
            color="#eab308"
            managerName={managers.find(m => m.winPercentage === highestWinPct)?.managerName}
            avatar={managers.find(m => m.winPercentage === highestWinPct)?.avatar}
          />

          <RecordCard
            title="Best Average Finish"
            value={`${bestAvgFinish.toFixed(1)} place`}
            subtext="Lowest average final standing"
            icon={Medal}
            color="#06b6d4"
            managerName={managers.find(m => m.averageFinish === bestAvgFinish)?.managerName}
            avatar={managers.find(m => m.averageFinish === bestAvgFinish)?.avatar}
          />

          <RecordCard
            title="Best Lineup Setter"
            value={`${bestLineupEfficiency.toFixed(1)}%`}
            subtext="Highest starting lineup efficiency"
            icon={Target}
            color="#10b981"
            managerName={managers.find(m => m.coachingEfficiency === bestLineupEfficiency)?.managerName}
            avatar={managers.find(m => m.coachingEfficiency === bestLineupEfficiency)?.avatar}
          />
        </div>
      </div>

      {/* All-Time Lows & Heartbreaks */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <AlertCircle className="text-red-400" size={24} />
            All-Time Lows & Matchup Heartbreaks
          </h2>
          <p className="text-sm text-muted mt-1">
            Historical tough breaks, large margins, and unforgettable collapses
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {matchups.biggestBlowoutLoss && (
            <RecordCard
              title="Largest Blowout Margin"
              value={`-${matchups.biggestBlowoutLoss.margin.toFixed(1)} pts`}
              subtext={`${matchups.biggestBlowoutLoss.season} Wk ${matchups.biggestBlowoutLoss.week} vs ${getManager(matchups.biggestBlowoutLoss.winnerId)?.managerName}`}
              icon={TrendingDown}
              color="var(--danger-color)"
              isNegative
              managerName={getManager(matchups.biggestBlowoutLoss.loserId)?.managerName}
              avatar={getManager(matchups.biggestBlowoutLoss.loserId)?.avatar}
            />
          )}

          {matchups.biggestChoke && (
            <RecordCard
              title="High-Scoring Heartbreak"
              value={`${matchups.biggestChoke.points.toFixed(1)} pts`}
              subtext={`Lost despite scoring high (${matchups.biggestChoke.season} Wk ${matchups.biggestChoke.week})`}
              icon={TrendingDown}
              color="#f97316"
              isNegative
              managerName={getManager(matchups.biggestChoke.ownerId)?.managerName}
              avatar={getManager(matchups.biggestChoke.ownerId)?.avatar}
            />
          )}

          {matchups.biggestRobbery && (
            <RecordCard
              title="Low-Scoring Lucky Win"
              value={`${matchups.biggestRobbery.points.toFixed(1)} pts`}
              subtext={`Won despite low output (${matchups.biggestRobbery.season} Wk ${matchups.biggestRobbery.week})`}
              icon={ShieldCheck}
              color="#14b8a6"
              managerName={getManager(matchups.biggestRobbery.ownerId)?.managerName}
              avatar={getManager(matchups.biggestRobbery.ownerId)?.avatar}
            />
          )}

          {worstSeason > 0 && (
            <RecordCard
              title="Lowest Season Points"
              value={`${worstSeason.toFixed(1)} pts`}
              subtext="Lowest single-year points scored"
              icon={TrendingDown}
              color="#f43f5e"
              isNegative
              managerName={managers.find(m => m.worstSingleSeasonFpts === worstSeason)?.managerName}
              avatar={managers.find(m => m.worstSingleSeasonFpts === worstSeason)?.avatar}
            />
          )}
        </div>
      </div>

      {/* Season Trends & Superlatives */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Sparkles className="text-purple-400" size={24} />
            Season Trends & Superlatives
          </h2>
          <p className="text-sm text-muted mt-1">
            Statistical consistency, turnaround jumps, and schedule difficulty
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {superlatives.map(badge => {
            const Icon = getSuperlativeIcon(badge.iconName);
            return (
              <div
                key={badge.id}
                className="glass-card flex items-start gap-4 transition-all duration-300 hover:border-purple-500/30"
                style={{ padding: '1.75rem' }}
              >
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  <Icon size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                    {badge.title}
                  </div>
                  <div className="font-bold text-white text-base truncate mb-1">
                    {badge.managerName}
                  </div>
                  <div className="text-lg font-black text-purple-400">
                    {badge.highlightValue}
                  </div>
                  <div className="text-xs text-muted mt-1 truncate">
                    {badge.subtext}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
