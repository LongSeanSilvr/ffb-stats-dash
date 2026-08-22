import { useState, useEffect } from 'react';
import { cachedFetch } from './useSessionCache';
import type { SeasonData } from './useLeagueData';
import type { User } from '../api/sleeper';

export interface SeasonBreakdown {
  season: string;
  fpts: number;
  wins: number;
  losses: number;
  finish: number;
  winPct: number;
  ppts: number;
  coachingEff: number;
}

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
  worstSingleSeasonFpts: number;
  averageFinish: number;
  bestFinish: number;
  worstFinish: number;
  finishes: number[]; // Store all finishes to calculate average
  totalPpts: number;
  coachingEfficiency: number;
  playoffWins: number;
  playoffLosses: number;
  championshipAppearances: number;
  biggestSeasonJump: number;
  ptsAgainstPerGame: number;
  seasonBreakdowns: SeasonBreakdown[];
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

        // We iterate over seasons (which are ordered newest to oldest typically, but we should just process them)
        for (const season of seasons) {
          const leagueId = season.league.league_id;
          const seasonYear = season.league.season;
          
          // Fetch playoff bracket to determine champions and playoff appearances
          let bracket = await cachedFetch(`https://api.sleeper.app/v1/league/${leagueId}/winners_bracket`).catch(() => []);
          if (!Array.isArray(bracket)) bracket = [];
          
          // Identify playoff teams and records
          const playoffTeams = new Set<number>();
          const playoffRecords: Record<number, { w: number, l: number }> = {};

          bracket.forEach((m: any) => {
            if (m.t1) playoffTeams.add(m.t1);
            if (m.t2) playoffTeams.add(m.t2);
            
            // Only count matches that have a winner (actual played matches)
            if (m.w) {
              if (!playoffRecords[m.w]) playoffRecords[m.w] = { w: 0, l: 0 };
              playoffRecords[m.w].w += 1;
              if (m.l) {
                if (!playoffRecords[m.l]) playoffRecords[m.l] = { w: 0, l: 0 };
                playoffRecords[m.l].l += 1;
              }
            }
          });

          let championRosterId: number | null = null;
          let runnerUpRosterId: number | null = null;
          let thirdPlaceRosterId: number | null = null;
          let fourthPlaceRosterId: number | null = null;

          if (bracket.length > 0) {
            // p: 1 is the championship match
            const champMatch = bracket.find((m: any) => m.p === 1);
            if (champMatch) {
              championRosterId = champMatch.w;
              runnerUpRosterId = champMatch.l;
            }
            
            // p: 3 is the third place match
            const thirdPlaceMatch = bracket.find((m: any) => m.p === 3);
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
                worstSingleSeasonFpts: 99999,
                averageFinish: 0,
                bestFinish: 99,
                worstFinish: 0,
                finishes: [],
                totalPpts: 0,
                coachingEfficiency: 0,
                playoffWins: 0,
                playoffLosses: 0,
                championshipAppearances: 0,
                biggestSeasonJump: -99,
                ptsAgainstPerGame: 0,
                seasonBreakdowns: []
              };
            }

            const stats = statsMap[ownerId];
            stats.seasonsPlayed += 1;
            
            const wins = roster.settings.wins || 0;
            const losses = roster.settings.losses || 0;
            const ties = roster.settings.ties || 0;
            
            stats.wins += wins;
            stats.losses += losses;
            stats.ties += ties;
            
            const fpts = (roster.settings.fpts || 0) + (roster.settings.fpts_decimal || 0) / 100;
            const ppts = (roster.settings.ppts || 0) + (roster.settings.ppts_decimal || 0) / 100;
            
            stats.totalFpts += fpts;
            stats.totalPpts += ppts;
            
            if (fpts > stats.bestSingleSeasonFpts) stats.bestSingleSeasonFpts = fpts;
            if (fpts < stats.worstSingleSeasonFpts) stats.worstSingleSeasonFpts = fpts;
            
            stats.totalFptsAgainst += (roster.settings.fpts_against || 0) + (roster.settings.fpts_against_decimal || 0) / 100;

            if (playoffTeams.has(roster.roster_id)) {
              stats.playoffAppearances += 1;
            }

            const poRecords = playoffRecords[roster.roster_id] || { w: 0, l: 0 };
            stats.playoffWins += poRecords.w;
            stats.playoffLosses += poRecords.l;

            if (roster.roster_id === championRosterId) {
              stats.championships += 1;
              stats.championshipAppearances += 1;
            } else if (roster.roster_id === runnerUpRosterId) {
              stats.championshipAppearances += 1;
            }

            // Determine final finish
            let finish = regSeasonRank.get(roster.roster_id) || 12;
            if (roster.roster_id === championRosterId) finish = 1;
            else if (roster.roster_id === runnerUpRosterId) finish = 2;
            else if (roster.roster_id === thirdPlaceRosterId) finish = 3;
            else if (roster.roster_id === fourthPlaceRosterId) finish = 4;
            
            stats.finishes.push(finish);
            if (finish < stats.bestFinish) stats.bestFinish = finish;
            if (finish > stats.worstFinish) stats.worstFinish = finish;

            const totalGames = wins + losses + ties;
            const winPct = totalGames > 0 ? (wins + ties * 0.5) / totalGames : 0;
            const coachingEff = ppts > 0 ? (fpts / ppts) * 100 : 0;

            stats.seasonBreakdowns.push({
              season: seasonYear,
              fpts: Number(fpts.toFixed(2)),
              wins,
              losses,
              finish,
              winPct: Number((winPct * 100).toFixed(1)),
              ppts: Number(ppts.toFixed(2)),
              coachingEff: Number(coachingEff.toFixed(1))
            });
          });
        }

        // Finalize calculations
        const managersArray = Object.values(statsMap).map(manager => {
          const totalGames = manager.wins + manager.losses + manager.ties;
          manager.winPercentage = totalGames > 0 ? (manager.wins + manager.ties * 0.5) / totalGames : 0;
          
          const sumFinishes = manager.finishes.reduce((sum, val) => sum + val, 0);
          manager.averageFinish = manager.finishes.length > 0 ? sumFinishes / manager.finishes.length : 0;
          
          manager.ptsAgainstPerGame = totalGames > 0 ? manager.totalFptsAgainst / totalGames : 0;
          manager.coachingEfficiency = manager.totalPpts > 0 ? (manager.totalFpts / manager.totalPpts) * 100 : 0;
          
          // Calculate biggest season jump (best improvement in finish rank)
          // First sort chronologically ascending
          manager.seasonBreakdowns.sort((a, b) => parseInt(a.season) - parseInt(b.season));
          
          let maxJump = -99;
          for (let i = 1; i < manager.seasonBreakdowns.length; i++) {
             // Improvement means previous finish is HIGHER number than current finish
             const jump = manager.seasonBreakdowns[i-1].finish - manager.seasonBreakdowns[i].finish;
             if (jump > maxJump) maxJump = jump;
          }
          manager.biggestSeasonJump = manager.seasonBreakdowns.length > 1 ? maxJump : 0;
          
          if (manager.worstSingleSeasonFpts === 99999) manager.worstSingleSeasonFpts = 0;
          if (manager.bestFinish === 99) manager.bestFinish = 0;

          // Round floating points
          manager.totalFpts = Number(manager.totalFpts.toFixed(2));
          manager.totalFptsAgainst = Number(manager.totalFptsAgainst.toFixed(2));
          manager.bestSingleSeasonFpts = Number(manager.bestSingleSeasonFpts.toFixed(2));
          manager.worstSingleSeasonFpts = Number(manager.worstSingleSeasonFpts.toFixed(2));
          manager.winPercentage = Number((manager.winPercentage * 100).toFixed(1));
          manager.averageFinish = Number(manager.averageFinish.toFixed(1));
          manager.coachingEfficiency = manager.totalPpts > 0 ? Number(((manager.totalFpts / manager.totalPpts) * 100).toFixed(1)) : 0;
          manager.ptsAgainstPerGame = Number(manager.ptsAgainstPerGame.toFixed(2));
          
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
