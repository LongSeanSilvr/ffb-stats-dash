import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLeagueData } from '../hooks/useLeagueData';
import type { SeasonData } from '../hooks/useLeagueData';

interface LeagueContextType {
  loading: boolean;
  error: string | null;
  seasons: SeasonData[];
  selectedSeasonId: string | null;
  setSelectedSeasonId: (id: string) => void;
  selectedSeason: SeasonData | null;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export const LeagueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const LEAGUE_ID = import.meta.env.VITE_LEAGUE_ID as string;
  const { loading, error, seasons } = useLeagueData(LEAGUE_ID);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Set the first season as default once data loads
  useEffect(() => {
    if (seasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(seasons[0].league.league_id);
    }
  }, [seasons, selectedSeasonId]);

  const selectedSeason = seasons.find(s => s.league.league_id === selectedSeasonId) || null;

  return (
    <LeagueContext.Provider value={{
      loading,
      error,
      seasons,
      selectedSeasonId,
      setSelectedSeasonId,
      selectedSeason
    }}>
      {children}
    </LeagueContext.Provider>
  );
};

export const useLeagueContext = () => {
  const context = useContext(LeagueContext);
  if (context === undefined) {
    throw new Error('useLeagueContext must be used within a LeagueProvider');
  }
  return context;
};
