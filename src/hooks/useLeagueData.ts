import { useState, useEffect } from 'react';
import { getLeague, getUsers, getRosters } from '../api/sleeper';
import type { League, User, Roster } from '../api/sleeper';

export interface SeasonData {
  league: League;
  users: User[];
  rosters: Roster[];
  // Mapping of roster_id to User
  rosterToUser: Record<number, User>;
}

export interface AppData {
  loading: boolean;
  error: string | null;
  seasons: SeasonData[];
  currentSeasonId: string;
}

export function useLeagueData(initialLeagueId: string) {
  const [data, setData] = useState<AppData>({
    loading: true,
    error: null,
    seasons: [],
    currentSeasonId: initialLeagueId,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));
        let currentId: string | null = initialLeagueId;
        const seasonsFetched: SeasonData[] = [];

        while (currentId && currentId !== '0') {
          const league = await getLeague(currentId);
          const users = await getUsers(currentId);
          const rosters = await getRosters(currentId);

          const userMap = users.reduce((acc, user) => {
            acc[user.user_id] = user;
            return acc;
          }, {} as Record<string, User>);

          const rosterToUser = rosters.reduce((acc, roster) => {
            if (roster.owner_id && userMap[roster.owner_id]) {
              acc[roster.roster_id] = userMap[roster.owner_id];
            }
            return acc;
          }, {} as Record<number, User>);

          seasonsFetched.push({
            league,
            users,
            rosters,
            rosterToUser,
          });

          currentId = league.previous_league_id;
        }

        setData({
          loading: false,
          error: null,
          seasons: seasonsFetched,
          currentSeasonId: initialLeagueId,
        });

      } catch (err: any) {
        setData(prev => ({ ...prev, loading: false, error: err.message || 'Unknown error' }));
      }
    }

    if (initialLeagueId) {
      fetchData();
    }
  }, [initialLeagueId]);

  return data;
}

export interface FaabEfficiency {
  roster_id: number;
  user: User;
  totalFaabSpent: number;
  playersAcquired: string[];
}

// A helper to calculate FAAB spending per team for a given season
export async function calculateFaabEfficiency(_leagueId: string, rosters: Roster[], rosterToUser: Record<number, User>): Promise<FaabEfficiency[]> {
  // To calculate total FAAB spent, we can fetch transactions.
  // A simpler way for total FAAB spent is looking at roster.settings.waiver_budget_used
  // But we need transactions to know *who* they acquired to find points scored.
  
  // For now, let's implement the basic FAAB spent aggregation using roster data
  return rosters.map(roster => ({
    roster_id: roster.roster_id,
    user: rosterToUser[roster.roster_id],
    totalFaabSpent: roster.settings.waiver_budget_used || 0,
    playersAcquired: [], // Full efficiency calculation requires fetching all weeks, which is expensive.
  })).sort((a, b) => b.totalFaabSpent - a.totalFaabSpent);
}
