import { useState, useEffect } from 'react';
import { getWinnersBracket } from '../api/sleeper';
import type { SeasonData } from './useLeagueData';
import type { User } from '../api/sleeper';

export interface ManagerAllTimeStats {
  ownerId: string;
  managerName: string;
  avatar: string | null;
  seasonsPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;
  totalFpts: number;
  totalFptsAgainst: number;
  playoffAppearances: number;
  championships: number;
  bestSingleSeasonFpts: number;
  averageFinish: number;
  finishes: number[]; // Store all finishes to calculate average
}

export interface AllTimeData {
  managers: ManagerAllTimeStats[];
  loading: boolean;
  error: string | null;
}

export function useAllTimeStats(seasons: SeasonData[]) {
  const [data, setData] = useState<AllTimeData>({
    managers: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!seasons || seasons.length === 0) {
      setData({ managers: [], loading: false, error: null });
      return;
    }

    const fetchAllTimeStats = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));
        
        const statsMap: Record<string, ManagerAllTimeStats> = {};
        
        // Find latest user profiles to use the most recent display name/avatar
        const latestUsers = seasons[0].users;
        const getUserInfo = (ownerId: string, seasonUsers: User[]) => {
           const latest = latestUsers.find(u => u.user_id === ownerId);
           if (latest) return latest;
           return seasonUsers.find(u => u.user_id === ownerId);
        };

        for (const season of seasons) {
          const leagueId = season.league.league_id;
          
          // Fetch playoff bracket to determine champions and playoff appearances
          let bracket = await getWinnersBracket(leagueId).catch(() => []);
          if (!Array.isArray(bracket)) bracket = [];
          
          // Identify playoff teams
          const playoffTeams = new Set<number>();
          bracket.forEach(m => {
            if (m.t1) playoffTeams.add(m.t1);
            if (m.t2) playoffTeams.add(m.t2);
          });

          let championRosterId: number | null = null;
          let runnerUpRosterId: number | null = null;
          let thirdPlaceRosterId: number | null = null;
          let fourthPlaceRosterId: number | null = null;

          if (bracket.length > 0) {
            // Usually p: 1 is the championship match and p: 3 is the third place match
            const champMatch = bracket.find(m => m.p === 1);
            if (champMatch) {
              championRosterId = champMatch.w;
              runnerUpRosterId = champMatch.l;
            }
            
            const thirdPlaceMatch = bracket.find(m => m.p === 3);
            if (thirdPlaceMatch) {
               thirdPlaceRosterId = thirdPlaceMatch.w;
               fourthPlaceRosterId = thirdPlaceMatch.l;
            }
          }

          // Sort rosters for regular season standing
          const sortedRosters = [...season.rosters].sort((a, b) => {
            if (a.settings.wins !== b.settings.wins) return b.settings.wins - a.settings.wins;
            if (a.settings.ties !== b.settings.ties) return b.settings.ties - a.settings.ties;
            const aFpts = (a.settings.fpts || 0) + (a.settings.fpts_decimal || 0) / 100;
            const bFpts = (b.settings.fpts || 0) + (b.settings.fpts_decimal || 0) / 100;
            return bFpts - aFpts;
          });

          const regSeasonRank = new Map<number, number>();
          sortedRosters.forEach((r, idx) => regSeasonRank.set(r.roster_id, idx + 1));

          // Process each roster
          season.rosters.forEach(roster => {
            const ownerId = roster.owner_id;
            if (!ownerId) return; // Skip orphan teams

            if (!statsMap[ownerId]) {
              const userInfo = getUserInfo(ownerId, season.users);
              statsMap[ownerId] = {
                ownerId,
                managerName: userInfo?.display_name || `Unknown (${ownerId})`,
                avatar: userInfo?.avatar || null,
                seasonsPlayed: 0,
                wins: 0,
                losses: 0,
                ties: 0,
                winPercentage: 0,
                totalFpts: 0,
                totalFptsAgainst: 0,
                playoffAppearances: 0,
                championships: 0,
                bestSingleSeasonFpts: 0,
                averageFinish: 0,
                finishes: [],
              };
            }

            const stats = statsMap[ownerId];
            stats.seasonsPlayed += 1;
            stats.wins += (roster.settings.wins || 0);
            stats.losses += (roster.settings.losses || 0);
            stats.ties += (roster.settings.ties || 0);
            
            const fpts = (roster.settings.fpts || 0) + (roster.settings.fpts_decimal || 0) / 100;
            stats.totalFpts += fpts;
            if (fpts > stats.bestSingleSeasonFpts) {
               stats.bestSingleSeasonFpts = fpts;
            }
            
            stats.totalFptsAgainst += (roster.settings.fpts_against || 0) + (roster.settings.fpts_against_decimal || 0) / 100;

            if (playoffTeams.has(roster.roster_id)) {
              stats.playoffAppearances += 1;
            }

            if (roster.roster_id === championRosterId) {
              stats.championships += 1;
            }

            // Determine final finish
            let finish = regSeasonRank.get(roster.roster_id) || 12;
            if (roster.roster_id === championRosterId) finish = 1;
            else if (roster.roster_id === runnerUpRosterId) finish = 2;
            else if (roster.roster_id === thirdPlaceRosterId) finish = 3;
            else if (roster.roster_id === fourthPlaceRosterId) finish = 4;
            // Note: teams 5-6 in playoffs might be ranked based on regular season or a 5th place match, we'll fall back to reg season rank for simplicity if they aren't in top 4.
            
            stats.finishes.push(finish);
          });
        }

        // Finalize calculations
        const managersArray = Object.values(statsMap).map(manager => {
          const totalGames = manager.wins + manager.losses + manager.ties;
          manager.winPercentage = totalGames > 0 ? (manager.wins + manager.ties * 0.5) / totalGames : 0;
          
          const sumFinishes = manager.finishes.reduce((sum, val) => sum + val, 0);
          manager.averageFinish = manager.finishes.length > 0 ? sumFinishes / manager.finishes.length : 0;
          
          // Round floating points
          manager.totalFpts = Number(manager.totalFpts.toFixed(2));
          manager.totalFptsAgainst = Number(manager.totalFptsAgainst.toFixed(2));
          manager.bestSingleSeasonFpts = Number(manager.bestSingleSeasonFpts.toFixed(2));
          manager.winPercentage = Number((manager.winPercentage * 100).toFixed(1));
          manager.averageFinish = Number(manager.averageFinish.toFixed(1));
          
          return manager;
        });

        // Sort by Championships, then Win %, then Points
        managersArray.sort((a, b) => {
           if (b.championships !== a.championships) return b.championships - a.championships;
           if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
           return b.totalFpts - a.totalFpts;
        });

        setData({
          managers: managersArray,
          loading: false,
          error: null,
        });

      } catch (err: any) {
        setData(prev => ({ ...prev, loading: false, error: err.message || 'Failed to fetch all-time stats' }));
      }
    };

    fetchAllTimeStats();
  }, [seasons]);

  return data;
}
