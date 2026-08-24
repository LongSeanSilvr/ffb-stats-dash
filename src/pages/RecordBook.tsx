import React, { useState, useMemo } from 'react';
import { useLeagueContext } from '../context/LeagueContext';
import { useAllTimeStats } from '../hooks/useAllTimeStats';
import { useAllTimeMatchups } from '../hooks/useAllTimeMatchups';
import type { RecordBookTab } from '../types/recordBook';
import { computePowerScores } from '../utils/goatCalculator';

import { RecordBookNav } from '../components/recordbook/RecordBookNav';
import { RankingsHub } from '../components/recordbook/RankingsHub';
import { ScoringRecordsHub } from '../components/recordbook/ScoringRecordsHub';
import { RivalryHub } from '../components/recordbook/RivalryHub';
import { ScheduleLuckHub } from '../components/recordbook/ScheduleLuckHub';

export const RecordBook: React.FC = () => {
  const { loading: ctxLoading, error: ctxError, seasons } = useLeagueContext();
  const { managers, loading: statsLoading, error: statsError } = useAllTimeStats(seasons);
  const matchups = useAllTimeMatchups(seasons);

  const [activeTab, setActiveTab] = useState<RecordBookTab>('rankings');

  // Compute power scores with pure memoized math
  const scoredManagers = useMemo(() => {
    return computePowerScores(managers);
  }, [managers]);

  const loading = ctxLoading || statsLoading || matchups.loading;
  const error = ctxError || statsError || matchups.error;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4 text-sm font-medium">
          {matchups.progress > 0
            ? `Aggregating all-time league history (${matchups.progress}%)...`
            : 'Aggregating all-time league history...'}
        </div>
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
        <p>No manager records found.</p>
      </div>
    );
  }

  // Calculate year range
  const sortedSeasons = [...seasons].sort(
    (a, b) => parseInt(a.league.season) - parseInt(b.league.season)
  );
  const minYear = sortedSeasons.length > 0 ? sortedSeasons[0].league.season : '';
  const maxYear = sortedSeasons.length > 0 ? sortedSeasons[sortedSeasons.length - 1].league.season : '';

  return (
    <div className="animate-fade-in pb-16">
      {/* Standardized Header */}
      <h1 className="text-3xl text-gradient mt-4 mb-1">Record Book</h1>
      <p className="text-muted mb-8">
        All-time archive and league history (Sleeper Era: {minYear}–{maxYear})
      </p>

      {/* Centered Segmented Navigation */}
      <RecordBookNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Hub Content */}
      <div className="mt-2">
        {activeTab === 'rankings' && (
          <RankingsHub managers={scoredManagers} seasons={seasons} />
        )}
        {activeTab === 'scoring' && (
          <ScoringRecordsHub managers={scoredManagers} matchups={matchups} />
        )}
        {activeTab === 'rivalries' && (
          <RivalryHub managers={scoredManagers} matchups={matchups} />
        )}
        {activeTab === 'luck' && (
          <ScheduleLuckHub managers={scoredManagers} matchups={matchups} />
        )}
      </div>
    </div>
  );
};
