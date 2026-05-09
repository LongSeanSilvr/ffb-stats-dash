import React from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';

export const Players: React.FC = () => {
  const { loading, error, selectedSeason } = useLeagueContext();

  if (loading && !selectedSeason) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !selectedSeason) return null;

  return (
    <div className="animate-fade-in flex flex-col items-center justify-center h-full min-h-[60vh]">
      <h1 className="text-4xl text-gradient mb-4 font-bold tracking-tight">Player Deep Dives</h1>
      <div className="glass-card p-12 text-center max-w-lg mt-8" style={{ borderStyle: 'dashed' }}>
        <h2 className="text-2xl font-semibold mb-2 text-gradient">Coming Soon</h2>
        <p className="text-muted text-lg">We're crunching the numbers! Player-level analytics and historical trends will be available in a future update.</p>
      </div>
    </div>
  );
};
