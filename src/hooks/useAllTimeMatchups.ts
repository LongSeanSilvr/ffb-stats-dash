import { useState, useEffect } from 'react';
import { cachedFetch } from './useSessionCache';
import type { SeasonData } from './useLeagueData';

import type { ManagerLuckStats, SingleSeasonLuckExtreme } from '../types/recordBook';

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
  matchupList: MatchupRecord[];
  managerLuckStats: ManagerLuckStats[];
  luckiestSeasons: SingleSeasonLuckExtreme[];
  unluckiestSeasons: SingleSeasonLuckExtreme[];
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
    matchupList: [],
    managerLuckStats: [],
    luckiestSeasons: [],
    unluckiestSeasons: [],
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
        // Season-level all play tracker: season -> ownerId -> { wins, losses, games }
        const seasonAllPlayTracker: Record<string, Record<string, { wins: number; losses: number; games: number }>> = {};

        for (const season of seasons) {
          const leagueId = season.league.league_id;
          const seasonYear = season.league.season;
          const playoffStartWeek = season.league.settings.playoff_week_start || 15;
          const totalWeeks = 17; // Sleeper generally supports up to 17 or 18 weeks now

          if (!seasonAllPlayTracker[seasonYear]) {
            seasonAllPlayTracker[seasonYear] = {};
          }

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
                if (!seasonAllPlayTracker[seasonYear][ownerId]) {
                  seasonAllPlayTracker[seasonYear][ownerId] = { wins: 0, losses: 0, games: 0 };
                }

                const wins = validScores.length - 1 - idx;
                const losses = idx;
                allPlayTracker[ownerId].wins += wins;
                allPlayTracker[ownerId].losses += losses;

                seasonAllPlayTracker[seasonYear][ownerId].wins += wins;
                seasonAllPlayTracker[seasonYear][ownerId].losses += losses;
                seasonAllPlayTracker[seasonYear][ownerId].games += 1;
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
                }

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
                      biggestBlowoutLoss = record;
                    }

                    if (!biggestChoke || loserPts > biggestChoke.points) {
                      biggestChoke = { ownerId: loser, opponentId: winner, points: loserPts, opponentPts: winnerPts, season: seasonYear, week: w };
                    }

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

        // Build User Profile Map from newest to oldest
        const latestUsers = seasons[0]?.users || [];
        const userMap: Record<string, { name: string; avatar: string | null }> = {};
        seasons.forEach(s => {
          s.users.forEach(u => {
            if (!userMap[u.user_id]) {
              const latest = latestUsers.find(lu => lu.user_id === u.user_id);
              userMap[u.user_id] = {
                name: latest?.display_name || u.display_name || `Manager ${u.user_id}`,
                avatar: latest?.avatar || u.avatar || null
              };
            }
          });
        });

        // Compute Comprehensive Schedule Luck Stats per Manager
        const allSeasonLuckExtremes: SingleSeasonLuckExtreme[] = [];
        const managerLuckMap: Record<string, ManagerLuckStats> = {};

        seasons.forEach(season => {
          const seasonYear = season.league.season;
          const seasonAllPlay = seasonAllPlayTracker[seasonYear] || {};

          season.rosters.forEach(r => {
            const ownerId = r.owner_id;
            if (!ownerId) return;

            const uInfo = userMap[ownerId] || { name: `Team ${r.roster_id}`, avatar: null };

            if (!managerLuckMap[ownerId]) {
              managerLuckMap[ownerId] = {
                ownerId,
                managerName: uInfo.name,
                avatar: uInfo.avatar,
                seasonsPlayed: 0,
                actualWins: 0,
                actualLosses: 0,
                actualWinPct: 0,
                allPlayWins: 0,
                allPlayLosses: 0,
                allPlayWinPct: 0,
                expectedWins: 0,
                scheduleLuckWins: 0,
                totalPointsAgainst: 0,
                papg: 0,
                ppg: 0,
                seasonLuckList: []
              };
            }

            const mStats = managerLuckMap[ownerId];
            mStats.seasonsPlayed += 1;

            const w = r.settings.wins || 0;
            const l = r.settings.losses || 0;
            const t = r.settings.ties || 0;
            const regGames = w + l + t || 1;

            const fpts = (r.settings.fpts || 0) + ((r.settings.fpts_decimal || 0) / 100);
            const fptsAgainst = (r.settings.fpts_against || 0) + ((r.settings.fpts_against_decimal || 0) / 100);

            mStats.actualWins += w;
            mStats.actualLosses += l;
            mStats.totalPointsAgainst += fptsAgainst;

            const sAllPlay = seasonAllPlay[ownerId] || { wins: 0, losses: 0, games: regGames };
            const totalSAllPlay = sAllPlay.wins + sAllPlay.losses || 1;
            const sAllPlayWinPct = Number(((sAllPlay.wins / totalSAllPlay) * 100).toFixed(1));
            const sExpectedWins = Number(((sAllPlay.wins / totalSAllPlay) * regGames).toFixed(1));
            const sScheduleLuckWins = Number((w - sExpectedWins).toFixed(1));

            const sPpg = Number((fpts / regGames).toFixed(1));
            const sPapg = Number((fptsAgainst / regGames).toFixed(1));

            mStats.seasonLuckList.push({
              season: seasonYear,
              actualWins: w,
              actualLosses: l,
              allPlayWins: sAllPlay.wins,
              allPlayLosses: sAllPlay.losses,
              allPlayWinPct: sAllPlayWinPct,
              expectedWins: sExpectedWins,
              scheduleLuckWins: sScheduleLuckWins,
              pointsFor: fpts,
              pointsAgainst: fptsAgainst,
              ppg: sPpg,
              papg: sPapg
            });

            if (regGames >= 10) {
              allSeasonLuckExtremes.push({
                ownerId,
                managerName: uInfo.name,
                avatar: uInfo.avatar,
                season: seasonYear,
                actualRecord: `${w}-${l}${t > 0 ? `-${t}` : ''}`,
                expectedWins: sExpectedWins,
                scheduleLuckWins: sScheduleLuckWins,
                allPlayRecord: `${sAllPlay.wins}-${sAllPlay.losses}`,
                ppg: sPpg,
                papg: sPapg
              });
            }
          });
        });

        // Finalize Career Luck Averages
        const managerLuckStats: ManagerLuckStats[] = Object.values(managerLuckMap).map(m => {
          const ap = allPlayTracker[m.ownerId] || { wins: 0, losses: 0, ties: 0 };
          const totalAllPlay = ap.wins + ap.losses || 1;
          const allPlayWinPct = Number(((ap.wins / totalAllPlay) * 100).toFixed(1));
          
          const totalRegGames = m.actualWins + m.actualLosses || 1;
          const actualWinPct = Number(((m.actualWins / totalRegGames) * 100).toFixed(1));

          const expectedWins = Number(((ap.wins / totalAllPlay) * totalRegGames).toFixed(1));
          const scheduleLuckWins = Number((m.actualWins - expectedWins).toFixed(1));
          const papg = Number((m.totalPointsAgainst / totalRegGames).toFixed(1));

          const totalPointsFor = m.seasonLuckList.reduce((acc, s) => acc + s.pointsFor, 0);
          const ppg = Number((totalPointsFor / totalRegGames).toFixed(1));

          // Sort season luck list from newest to oldest
          m.seasonLuckList.sort((a, b) => parseInt(b.season) - parseInt(a.season));

          return {
            ...m,
            allPlayWins: ap.wins,
            allPlayLosses: ap.losses,
            allPlayWinPct,
            actualWinPct,
            expectedWins,
            scheduleLuckWins,
            papg,
            ppg
          };
        }).sort((a, b) => b.scheduleLuckWins - a.scheduleLuckWins);

        // Sort Top 5 Luckiest & Unluckiest Single Seasons
        const luckiestSeasons = [...allSeasonLuckExtremes]
          .sort((a, b) => b.scheduleLuckWins - a.scheduleLuckWins)
          .slice(0, 5);

        const unluckiestSeasons = [...allSeasonLuckExtremes]
          .sort((a, b) => a.scheduleLuckWins - b.scheduleLuckWins)
          .slice(0, 5);

        // Compute Rivalry Spotlights
        let mostLopsided: any = null;
        let mostCompetitive: any = null;
        let longestStreak: any = null;

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
              if (!mostLopsided || diff > mostLopsided.diff) {
                if (record.wins > record.losses) {
                   mostLopsided = { owner1: o1, owner2: o2, wins: record.wins, losses: record.losses, diff };
                }
              }

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
            matchupList: allMatches,
            managerLuckStats,
            luckiestSeasons,
            unluckiestSeasons,
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
