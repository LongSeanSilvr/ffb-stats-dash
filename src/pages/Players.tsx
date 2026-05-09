import React from 'react';
import { Card } from '../components/Card';
import { useLeagueData } from '../hooks/useLeagueData';

export const Players: React.FC = () => {
  const LEAGUE_ID = import.meta.env.VITE_LEAGUE_ID as string;
  const { loading, error, seasons } = useLeagueData(LEAGUE_ID);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || seasons.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mb-6">Players Analysis</h1>
      
      <Card className="stagger-1 text-center py-12">
        <div className="text-xl text-muted mb-4">Player-specific deep dives coming soon.</div>
        <p className="text-sm">This page will feature best free-agent pickups and individual player performance across the league history.</p>
      </Card>
    </div>
  );
};
