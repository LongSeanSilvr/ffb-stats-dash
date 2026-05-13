import { useState, useEffect } from 'react';
import { getWinnersBracket, getLosersBracket, getMatchups, getRosters, getUsers, getTransactions, getPlayers, getDraftPicks } from '../api/sleeper';
import { getOptimalLineupPoints } from '../utils/roster';

export interface PlayoffMVP {
  playerId: string;
  playerName: string;
  totalPoints: number;
  managerName: string;
  managerAvatar: string | null;
  playerAvatar?: string;
  acquisitionType: string;
}

export interface BenchwarmerBlue {
  rosterId: number;
  managerName: string;
  managerAvatar: string | null;
  playerAvatar?: string;
  week: number;
  actualScore: number;
  optimalScore: number;
  opponentScore: number;
  opponentName: string;
  opponentAvatar: string | null;
  pointsLeftOnBench: number;
  lostDueToLineup: boolean;
}

export interface MatchupFlipped {
  rosterId: number;
  managerName: string;
  managerAvatar: string | null;
  playerAvatar?: string;
  week: number;
  playerName: string;
  acquisitionType: string;
  pointsScored: number;
  margin: number;
}

export interface PlayerSplit {
  playerId: string;
  playerName: string;
  managerName: string;
  managerAvatar: string | null;
  playerAvatar?: string;
  regularAvg: number;
  playoffAvg: number;
  diff: number;
  isChoker: boolean;
  isLeagueWinner: boolean;
  acquisitionType: string;
}

export interface LoserBracketTeam {
  rosterId: number;
  managerName: string;
  managerAvatar: string | null;
  playerAvatar?: string;
  totalPoints: number;
  isToiletBowlChamp: boolean;
}

export interface TeamPlayoffPerformance {
  managerName: string;
  managerAvatar: string | null;
  regAvg: number;
  playAvg: number;
  diff: number;
}

export interface PlayoffAnalytics {
  mvps: PlayoffMVP[];
  benchBlues: BenchwarmerBlue[];
  matchupsFlipped: MatchupFlipped[];
  playerSplits: PlayerSplit[];
  teamPerformances: TeamPlayoffPerformance[];
  loserBracketTeams: LoserBracketTeam[];
  champion: { rosterId: number; name: string; avatar: string | null } | null;
  loading: boolean;
  error: string | null;
}

export function usePlayoffAnalytics(leagueId: string, league: any) {
  const [data, setData] = useState<PlayoffAnalytics>({
    mvps: [],
    benchBlues: [],
    matchupsFlipped: [],
    playerSplits: [],
    teamPerformances: [],
    loserBracketTeams: [],
    champion: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!leagueId || !league) return;

    const fetchData = async () => {
      try {
        const playoffStartWeek = league.settings.playoff_week_start || 15;
        const totalWeeks = 17; // Playoff ends typically in week 17
        
        // Fetch users, rosters, bracket
        const [users, rosters, bracket, losersBracket, playersMap, draftPicks] = await Promise.all([
          getUsers(leagueId),
          getRosters(leagueId),
          getWinnersBracket(leagueId),
          getLosersBracket(leagueId),
          getPlayers(),
          getDraftPicks(league.draft_id).catch(() => [])
        ]);

        const rosterToUser = rosters.reduce((acc, r) => {
          const user = users.find(u => u.user_id === r.owner_id);
          acc[r.roster_id] = user?.display_name || `Team ${r.roster_id}`;
          return acc;
        }, {} as Record<number, string>);

        const rosterToAvatar = rosters.reduce((acc, r) => {
          const user = users.find(u => u.user_id === r.owner_id);
          acc[r.roster_id] = user?.avatar || null;
          return acc;
        }, {} as Record<number, string | null>);

        // Find Champion
        const championshipGame = bracket.find(m => m.r === 3 && m.t1 && m.t2 && m.w);
        let champion = null;
        if (championshipGame && championshipGame.w) {
          champion = {
            rosterId: championshipGame.w,
            name: rosterToUser[championshipGame.w] || 'Unknown',
            avatar: rosterToAvatar[championshipGame.w] || null
          };
        }
        
        // Find Toilet Bowl Champ (Winner of Losers Bracket)
        const toiletBowlGame = losersBracket.find(m => m.r === 3 && m.t1 && m.t2 && m.w);
        const toiletBowlChampId = toiletBowlGame?.w;

        // Fetch matchups and transactions for the whole season
        const weekPromises = [];
        for (let w = 1; w <= totalWeeks; w++) {
          weekPromises.push(Promise.all([
            getMatchups(leagueId, w).catch(() => []),
            getTransactions(leagueId, w).catch(() => [])
          ]));
        }
        const weekData = await Promise.all(weekPromises);
        
        const allMatchups = weekData.map(d => d[0]);
        const allTransactions = weekData.map(d => d[1]).flat();

        const playoffPlayerPoints: Record<string, { pts: number, rosterId: number }> = {};
        const regularSeasonPlayerPoints: Record<string, { pts: number, games: number }> = {};
        const playoffAverages: Record<string, { pts: number, games: number, rosterId: number, lost: boolean }> = {};
        
        const benchBlues: BenchwarmerBlue[] = [];
        const matchupsFlipped: MatchupFlipped[] = [];
        const losersPoints: Record<number, number> = {};

        const teamScores: Record<number, { regPts: number, regGames: number, playPts: number, playGames: number }> = {};
        rosters.forEach(r => {
           teamScores[r.roster_id] = { regPts: 0, regGames: 0, playPts: 0, playGames: 0 };
        });

        // Helper to find acq type
        const getAcquisitionType = (playerId: string, rosterId: number) => {
          let acqType = 'Draft';
          const draftPick = draftPicks.find((dp: any) => dp.player_id === playerId && dp.roster_id === rosterId);
          if (!draftPick) {
            acqType = 'Free Agency';
            const wasTraded = allTransactions.some(tx => 
              tx.type === 'trade' && 
              tx.status === 'complete' && 
              tx.adds && tx.adds[playerId] === rosterId
            );
            if (wasTraded) acqType = 'Trade';
          }
          return acqType;
        };

        // 1. Process regular season points
        for (let w = 1; w < playoffStartWeek; w++) {
          const matchups = allMatchups[w - 1];
          if (!matchups) continue;
          matchups.forEach(m => {
            if (teamScores[m.roster_id]) {
                teamScores[m.roster_id].regPts += m.points;
                teamScores[m.roster_id].regGames += 1;
            }
            m.starters.forEach((playerId: string, idx: number) => {
              if (playerId !== '0') {
                const pts = m.starters_points[idx] || 0;
                if (!regularSeasonPlayerPoints[playerId]) regularSeasonPlayerPoints[playerId] = { pts: 0, games: 0 };
                regularSeasonPlayerPoints[playerId].pts += pts;
                regularSeasonPlayerPoints[playerId].games += 1;
              }
            });
          });
        }

        // 2. Process playoff weeks
        for (let w = playoffStartWeek; w <= totalWeeks; w++) {
          const weekIdx = w - 1;
          const matchups = allMatchups[weekIdx];
          if (!matchups || matchups.length === 0) continue;

          // Track losers bracket points
          matchups.forEach(m => {
             if (teamScores[m.roster_id]) {
                teamScores[m.roster_id].playPts += m.points;
                teamScores[m.roster_id].playGames += 1;
             }
             const currentRound = w - playoffStartWeek + 1;
             const isLosersBracket = losersBracket.some(b => b.r === currentRound && (b.t1 === m.roster_id || b.t2 === m.roster_id));
             if (isLosersBracket) {
                if (!losersPoints[m.roster_id]) losersPoints[m.roster_id] = 0;
                losersPoints[m.roster_id] += m.points;
             }
          });

          const matchupsById = matchups.reduce((acc, m) => {
            if (!acc[m.matchup_id]) acc[m.matchup_id] = [];
            acc[m.matchup_id].push(m);
            return acc;
          }, {} as Record<number, any[]>);

          Object.values(matchupsById).forEach(pair => {
            if (pair.length === 2) {
              const teamA = pair[0];
              const teamB = pair[1];
              
              const currentRound = w - playoffStartWeek + 1;
              const isWinnersBracket = bracket.some(b => 
                b.r === currentRound && 
                ((b.t1 === teamA.roster_id && b.t2 === teamB.roster_id) || 
                 (b.t1 === teamB.roster_id && b.t2 === teamA.roster_id))
              );

              if (isWinnersBracket) {
                const teamA_starterPts = teamA.points;
                const teamA_optimal = getOptimalLineupPoints(teamA.players || [], teamA.players_points || {}, league.roster_positions || [], playersMap);
                
                const teamB_starterPts = teamB.points;
                const teamB_optimal = getOptimalLineupPoints(teamB.players || [], teamB.players_points || {}, league.roster_positions || [], playersMap);

                // Benchwarmer Blues
                if (teamA_starterPts < teamB_starterPts && teamA_optimal > teamB_starterPts) {
                  benchBlues.push({ rosterId: teamA.roster_id, managerName: rosterToUser[teamA.roster_id],
                    managerAvatar: rosterToAvatar[teamA.roster_id] || null, week: w, actualScore: teamA_starterPts, optimalScore: teamA_optimal, opponentScore: teamB_starterPts, 
                    opponentName: rosterToUser[teamB.roster_id] || 'Unknown', opponentAvatar: rosterToAvatar[teamB.roster_id] || null,
                    pointsLeftOnBench: teamA_optimal - teamA_starterPts, lostDueToLineup: true });
                }
                if (teamB_starterPts < teamA_starterPts && teamB_optimal > teamA_starterPts) {
                  benchBlues.push({ rosterId: teamB.roster_id, managerName: rosterToUser[teamB.roster_id],
                    managerAvatar: rosterToAvatar[teamB.roster_id] || null, week: w, actualScore: teamB_starterPts, optimalScore: teamB_optimal, opponentScore: teamA_starterPts, 
                    opponentName: rosterToUser[teamA.roster_id] || 'Unknown', opponentAvatar: rosterToAvatar[teamA.roster_id] || null,
                    pointsLeftOnBench: teamB_optimal - teamB_starterPts, lostDueToLineup: true });
                }

                // Matchups Flipped
                const checkFlipped = (team: any, oppPts: number) => {
                   if (team.points > oppPts) {
                      team.starters.forEach((playerId: string, idx: number) => {
                         if (playerId !== '0') {
                            const acq = getAcquisitionType(playerId, team.roster_id);
                            if (acq !== 'Draft') {
                               const ptsScored = team.starters_points[idx] || 0;
                               // Calculate ERV (Expected Replacement Value) WITHOUT this player
                               const hypotheticalPlayers = team.players.filter((p: string) => p !== playerId);
                               const retainedStarters = team.starters.filter((p: string) => p !== '0' && p !== playerId);
                               const hypotheticalOptimal = getOptimalLineupPoints(hypotheticalPlayers, team.players_points || {}, league.roster_positions || [], playersMap, retainedStarters);
                               if (hypotheticalOptimal < oppPts) {
                                  matchupsFlipped.push({
                                     rosterId: team.roster_id,
                                     managerName: rosterToUser[team.roster_id],
                                     managerAvatar: rosterToAvatar[team.roster_id] || null,
                                     playerAvatar: `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`,
                                     week: w,
                                     playerName: playersMap[playerId] ? `${playersMap[playerId].first_name} ${playersMap[playerId].last_name}` : playerId,
                                     acquisitionType: acq,
                                     pointsScored: ptsScored,
                                     margin: team.points - oppPts
                                  });
                               }
                            }
                         }
                      });
                   }
                };
                checkFlipped(teamA, teamB_starterPts);
                checkFlipped(teamB, teamA_starterPts);

                // Playoff Chokers / Winners Averages
                const processTeamAvg = (team: any, won: boolean) => {
                   team.starters.forEach((playerId: string, idx: number) => {
                     if (playerId !== '0') {
                       const pts = team.starters_points[idx] || 0;
                       if (!playoffAverages[playerId]) playoffAverages[playerId] = { pts: 0, games: 0, rosterId: team.roster_id, lost: !won };
                       playoffAverages[playerId].pts += pts;
                       playoffAverages[playerId].games += 1;
                       if (!won) playoffAverages[playerId].lost = true;
                     }
                   });
                };
                processTeamAvg(teamA, teamA_starterPts > teamB_starterPts);
                processTeamAvg(teamB, teamB_starterPts > teamA_starterPts);
              }
            }
          });

          // Process Playoff MVPs
          matchups.forEach(m => {
            const currentRound = w - playoffStartWeek + 1;
            const inBracket = bracket.some(b => b.r === currentRound && (b.t1 === m.roster_id || b.t2 === m.roster_id));
            if (inBracket) {
               m.starters.forEach((playerId: string, idx: number) => {
                 if (playerId !== '0') {
                   const pts = m.starters_points[idx] || 0;
                   if (!playoffPlayerPoints[playerId]) playoffPlayerPoints[playerId] = { pts: 0, rosterId: m.roster_id };
                   playoffPlayerPoints[playerId].pts += pts;
                   playoffPlayerPoints[playerId].rosterId = m.roster_id;
                 }
               });
            }
          });
        }

        const mvpList: PlayoffMVP[] = Object.entries(playoffPlayerPoints).map(([playerId, data]) => {
          const p = playersMap[playerId];
          return {
            playerId,
            playerName: p ? `${p.first_name} ${p.last_name}` : playerId,
            totalPoints: Number(data.pts.toFixed(1)),
            managerName: rosterToUser[data.rosterId] || 'Unknown',
            managerAvatar: rosterToAvatar[data.rosterId] || null,
            playerAvatar: `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`,
            acquisitionType: getAcquisitionType(playerId, data.rosterId)
          };
        }).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 20);

        const playerSplits: PlayerSplit[] = [];
        Object.entries(playoffAverages).forEach(([playerId, pData]) => {
           const regData = regularSeasonPlayerPoints[playerId];
           if (regData && regData.games > 5) {
              const regAvg = regData.pts / regData.games;
              const playAvg = pData.pts / pData.games;
              const diff = playAvg - regAvg;
              
              const isChoker = regAvg > 14 && diff < -5;
              const isLeagueWinner = playAvg > 16 && diff > 5;

              if (isChoker || isLeagueWinner) {
                 const p = playersMap[playerId];
                 playerSplits.push({
                    playerId,
                    playerName: p ? `${p.first_name} ${p.last_name}` : playerId,
                    managerName: rosterToUser[pData.rosterId] || 'Unknown',
                    managerAvatar: rosterToAvatar[pData.rosterId] || null,
                    playerAvatar: `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`,
                    regularAvg: regAvg,
                    playoffAvg: playAvg,
                    diff,
                    isChoker,
                    isLeagueWinner,
                    acquisitionType: getAcquisitionType(playerId, pData.rosterId)
                 });
              }
           }
        });


        const teamPerformances: TeamPlayoffPerformance[] = Object.entries(teamScores).map(([rIdStr, stats]) => {
           const rId = parseInt(rIdStr);
           const regAvg = stats.regGames > 0 ? stats.regPts / stats.regGames : 0;
           const playAvg = stats.playGames > 0 ? stats.playPts / stats.playGames : 0;
           return {
              managerName: rosterToUser[rId] || 'Unknown',
              managerAvatar: rosterToAvatar[rId] || null,
              regAvg: Number(regAvg.toFixed(1)),
              playAvg: Number(playAvg.toFixed(1)),
              diff: Number((playAvg - regAvg).toFixed(1))
           };
        });

        const loserBracketTeams: LoserBracketTeam[] = Object.entries(losersPoints).map(([rosterIdStr, totalPoints]) => {
           const rId = parseInt(rosterIdStr);
           return {
              rosterId: rId,
              managerName: rosterToUser[rId] || 'Unknown',
              managerAvatar: rosterToAvatar[rId] || null,
              totalPoints,
              isToiletBowlChamp: rId === toiletBowlChampId
           };
        }).sort((a, b) => b.totalPoints - a.totalPoints);

        setData({
          mvps: mvpList,
          benchBlues: benchBlues.sort((a,b) => b.pointsLeftOnBench - a.pointsLeftOnBench),
          matchupsFlipped: matchupsFlipped.sort((a,b) => b.pointsScored - a.pointsScored),
          playerSplits: playerSplits.sort((a, b) => a.diff - b.diff),
          teamPerformances, // Chokers at top (negative diff), then winners (positive diff)
          loserBracketTeams,
          champion,
          loading: false,
          error: null
        });

      } catch (err: any) {
        setData(prev => ({ ...prev, loading: false, error: err.message }));
      }
    };

    fetchData();
  }, [leagueId, league]);

  return data;
}
