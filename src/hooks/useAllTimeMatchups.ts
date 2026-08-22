import { useState, useEffect } from 'react';
import { cachedFetch } from './useSessionCache';
import type { SeasonData } from './useLeagueData';

export interface H2HRecord {
  wins: number;
  losses: number;
}

export interface MatchupRecord {
  season: string;
  week: number;
  ownerA: string;
  ownerB: string;
  ptsA: number;
  ptsB: number;
  isPlayoffs: boolean;
}

export interface AllTimeMatchupData {
  h2hMatrix: Record<string, Record<string, H2HRecord>>;
  allPlayRecords: Record<string, { wins: number; losses: number; ties: number }>;
  careerHighWeek: Record<string, { points: number; season: string; week: number }>;
  careerLowWeek: Record<string, { points: number; season: string; week: number }>;
  biggestBlowoutWin: { winnerId: string; loserId: string; margin: number; winnerPts: number; loserPts: number; season: string; week: number } | null;
  biggestBlowoutLoss: { winnerId: string; loserId: string; margin: number; winnerPts: number; loserPts: number; season: string; week: number } | null;
  biggestChoke: { ownerId: string; opponentId: string; points: number; opponentPts: number; season: string; week: number } | null;
  biggestRobbery: { ownerId: string; opponentId: string; points: number; opponentPts: number; season: string; week: number } | null;
  mostLopsidedRivalry: { owner1: string; owner2: string; wins: number; losses: number; diff: number } | null;
  mostCompetitiveRivalry: { owner1: string; owner2: string; wins: number; losses: number } | null;
  longestDominanceStreak: { dominator: string; victim: string; streak: number } | null;
  loading: boolean;
  error: string | null;
  progress: number;
}

export function useAllTimeMatchups(seasons: SeasonData[]) {
  const [data, setData] = useState<AllTimeMatchupData>({
    h2hMatrix: {},
    allPlayRecords: {},
    careerHighWeek: {},
    careerLowWeek: {},
    biggestBlowoutWin: null,
    biggestBlowoutLoss: null,
    biggestChoke: null,
    biggestRobbery: null,
    mostLopsidedRivalry: null,
    mostCompetitiveRivalry: null,
    longestDominanceStreak: null,
    loading: true,
    error: null,
    progress: 0,
  });

  useEffect(() => {
    if (!seasons || seasons.length === 0) return;

    let isMounted = true;

    const fetchMatchups = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null, progress: 0 }));

        const allMatches: MatchupRecord[] = [];
        const allPlayTracker: Record<string, { wins: number; losses: number; ties: number }> = {};
        const h2hMatrix: Record<string, Record<string, H2HRecord>> = {};
        const careerHighWeek: Record<string, { points: number; season: string; week: number }> = {};
        const careerLowWeek: Record<string, { points: number; season: string; week: number }> = {};
        
        let biggestBlowoutWin: any = null;
        let biggestBlowoutLoss: any = null;
        let biggestChoke: any = null;
        let biggestRobbery: any = null;

        let completedSeasons = 0;

        for (const season of seasons) {
          const leagueId = season.league.league_id;
          const seasonYear = season.league.season;
          const playoffStartWeek = season.league.settings.playoff_week_start || 15;
          const totalWeeks = 17; // Sleeper generally supports up to 17 or 18 weeks now

          // Map roster ID to owner ID for this season
          const rosterToOwner: Record<number, string> = {};
          season.rosters.forEach(r => {
            if (r.owner_id) rosterToOwner[r.roster_id] = r.owner_id;
          });

          // Fetch all weeks sequentially for this season to avoid 429
          for (let w = 1; w <= totalWeeks; w++) {
            const url = `https://api.sleeper.app/v1/league/${leagueId}/matchups/${w}`;
            const weekMatchups = await cachedFetch(url).catch(() => []);
            
            if (!weekMatchups || weekMatchups.length === 0) continue;

            const isPlayoffs = w >= playoffStartWeek;
            
            // Group by matchup_id
            const games: Record<number, any[]> = {};
            weekMatchups.forEach((m: any) => {
              if (m.matchup_id) {
                if (!games[m.matchup_id]) games[m.matchup_id] = [];
                games[m.matchup_id].push(m);
              }
            });

            // Process All-Play (Regular season only)
            if (!isPlayoffs) {
              const validScores = weekMatchups
                .filter((m: any) => m.roster_id && rosterToOwner[m.roster_id] && m.points > 0)
                .map((m: any) => ({ owner: rosterToOwner[m.roster_id], pts: m.points }))
                .sort((a: any, b: any) => b.pts - a.pts);

              validScores.forEach((s: any, idx: number) => {
                const ownerId = s.owner;
                if (!allPlayTracker[ownerId]) {
                  allPlayTracker[ownerId] = { wins: 0, losses: 0, ties: 0 };
                }
                const wins = validScores.length - 1 - idx;
                const losses = idx;
                allPlayTracker[ownerId].wins += wins;
                allPlayTracker[ownerId].losses += losses;
                // Ignoring ties for all-play simplicity
              });
            }

            // Process H2H and extremes
            Object.values(games).forEach(game => {
              if (game.length === 2) {
                const [team1, team2] = game;
                const ownerA = rosterToOwner[team1.roster_id];
                const ownerB = rosterToOwner[team2.roster_id];
                const ptsA = team1.points || 0;
                const ptsB = team2.points || 0;

                if (!ownerA || !ownerB) return;
                // Ignore 0-0 ties in playoffs (often consolation byes)
                if (isPlayoffs && ptsA === 0 && ptsB === 0) return;

                allMatches.push({
                  season: seasonYear,
                  week: w,
                  ownerA,
                  ownerB,
                  ptsA,
                  ptsB,
                  isPlayoffs
                });

                // H2H Accumulation
                if (!h2hMatrix[ownerA]) h2hMatrix[ownerA] = {};
                if (!h2hMatrix[ownerB]) h2hMatrix[ownerB] = {};
                if (!h2hMatrix[ownerA][ownerB]) h2hMatrix[ownerA][ownerB] = { wins: 0, losses: 0 };
                if (!h2hMatrix[ownerB][ownerA]) h2hMatrix[ownerB][ownerA] = { wins: 0, losses: 0 };

                if (ptsA > ptsB) {
                  h2hMatrix[ownerA][ownerB].wins += 1;
                  h2hMatrix[ownerB][ownerA].losses += 1;
                } else if (ptsB > ptsA) {
                  h2hMatrix[ownerA][ownerB].losses += 1;
                  h2hMatrix[ownerB][ownerA].wins += 1;
                } // ties ignored for strict H2H for now

                // Regular Season Extremes
                if (!isPlayoffs) {
                  // Highs and Lows
                  [ { owner: ownerA, pts: ptsA }, { owner: ownerB, pts: ptsB } ].forEach(team => {
                     if (team.pts > 0) {
                       if (!careerHighWeek[team.owner] || team.pts > careerHighWeek[team.owner].points) {
                         careerHighWeek[team.owner] = { points: team.pts, season: seasonYear, week: w };
                       }
                       if (!careerLowWeek[team.owner] || team.pts < careerLowWeek[team.owner].points) {
                         careerLowWeek[team.owner] = { points: team.pts, season: seasonYear, week: w };
                       }
                     }
                  });

                  const margin = Math.abs(ptsA - ptsB);
                  const winner = ptsA > ptsB ? ownerA : ownerB;
                  const loser = ptsA > ptsB ? ownerB : ownerA;
                  const winnerPts = Math.max(ptsA, ptsB);
                  const loserPts = Math.min(ptsA, ptsB);

                  if (ptsA !== ptsB && ptsA > 0 && ptsB > 0) {
                    if (!biggestBlowoutWin || margin > biggestBlowoutWin.margin) {
                      const record = { winnerId: winner, loserId: loser, margin, winnerPts, loserPts, season: seasonYear, week: w };
                      biggestBlowoutWin = record;
                      biggestBlowoutLoss = record; // Same game, just viewed from loser perspective
                    }

                    // Biggest choke: highest score in a loss
                    if (!biggestChoke || loserPts > biggestChoke.points) {
                      biggestChoke = { ownerId: loser, opponentId: winner, points: loserPts, opponentPts: winnerPts, season: seasonYear, week: w };
                    }

                    // Biggest robbery: lowest score in a win
                    if (!biggestRobbery || winnerPts < biggestRobbery.points) {
                      biggestRobbery = { ownerId: winner, opponentId: loser, points: winnerPts, opponentPts: loserPts, season: seasonYear, week: w };
                    }
                  }
                }
              }
            });
          }

          completedSeasons += 1;
          if (isMounted) {
            setData(prev => ({ ...prev, progress: Math.round((completedSeasons / seasons.length) * 100) }));
          }
        }

        // Compute Rivalry Spotlights
        let mostLopsided: any = null;
        let mostCompetitive: any = null;
        let longestStreak: any = null;

        // Sort all matches chronologically (oldest to newest) to find streaks
        allMatches.sort((a, b) => {
           if (a.season !== b.season) return parseInt(a.season) - parseInt(b.season);
           return a.week - b.week;
        });

        const pairStreaks: Record<string, { currentWinner: string | null, count: number, max: number, dominator: string | null }> = {};

        Object.keys(h2hMatrix).forEach(o1 => {
          Object.keys(h2hMatrix[o1]).forEach(o2 => {
            const record = h2hMatrix[o1][o2];
            const totalGames = record.wins + record.losses;
            
            if (totalGames >= 3) {
              const diff = Math.abs(record.wins - record.losses);
              // Lopsided: largest win differential (absolute)
              if (!mostLopsided || diff > mostLopsided.diff) {
                // Ensure o1 is the winner for display
                if (record.wins > record.losses) {
                   mostLopsided = { owner1: o1, owner2: o2, wins: record.wins, losses: record.losses, diff };
                }
              }

              // Competitive: closest to 0.500 with most games
              const winPct = record.wins / totalGames;
              const closenessTo500 = Math.abs(0.5 - winPct);
              
              if (!mostCompetitive) {
                mostCompetitive = { owner1: o1, owner2: o2, wins: record.wins, losses: record.losses, closeness: closenessTo500, games: totalGames };
              } else {
                if (closenessTo500 < mostCompetitive.closeness || (closenessTo500 === mostCompetitive.closeness && totalGames > mostCompetitive.games)) {
                  mostCompetitive = { owner1: o1, owner2: o2, wins: record.wins, losses: record.losses, closeness: closenessTo500, games: totalGames };
                }
              }
            }
          });
        });

        // Find longest streak
        allMatches.forEach(m => {
           const pairId = [m.ownerA, m.ownerB].sort().join('-');
           if (!pairStreaks[pairId]) {
             pairStreaks[pairId] = { currentWinner: null, count: 0, max: 0, dominator: null };
           }
           
           if (m.ptsA !== m.ptsB) {
             const winner = m.ptsA > m.ptsB ? m.ownerA : m.ownerB;
             const tracker = pairStreaks[pairId];
             
             if (tracker.currentWinner === winner) {
               tracker.count += 1;
             } else {
               tracker.currentWinner = winner;
               tracker.count = 1;
             }
             
             if (tracker.count > tracker.max) {
               tracker.max = tracker.count;
               tracker.dominator = winner;
             }
           }
        });

        Object.keys(pairStreaks).forEach(pairId => {
           const tracker = pairStreaks[pairId];
           if (tracker.max >= 3) {
             if (!longestStreak || tracker.max > longestStreak.streak) {
                const victim = pairId.split('-').find(id => id !== tracker.dominator);
                longestStreak = { dominator: tracker.dominator, victim, streak: tracker.max };
             }
           }
        });

        if (isMounted) {
          setData({
            h2hMatrix,
            allPlayRecords: allPlayTracker,
            careerHighWeek,
            careerLowWeek,
            biggestBlowoutWin,
            biggestBlowoutLoss,
            biggestChoke,
            biggestRobbery,
            mostLopsidedRivalry: mostLopsided,
            mostCompetitiveRivalry: mostCompetitive,
            longestDominanceStreak: longestStreak,
            loading: false,
            error: null,
            progress: 100
          });
        }

      } catch (err: any) {
        if (isMounted) {
          setData(prev => ({ ...prev, loading: false, error: err.message || 'Failed to fetch matchups' }));
        }
      }
    };

    fetchMatchups();

    return () => { isMounted = false; };
  }, [seasons]);

  return data;
}
