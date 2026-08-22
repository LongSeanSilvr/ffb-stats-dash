import { useState, useEffect } from 'react';
import { getWinnersBracket, getLosersBracket, getMatchups, getRosters, getUsers, getTransactions, getPlayers, getDraftPicks } from '../api/sleeper';
import { getOptimalLineupPoints, calculateWeeklyReplacementBaselines } from '../utils/roster';
import type { MatchupFlipped } from '../types/playoffs';

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
  actualStarters: { id: string; pts: number; name: string; avatar: string; rosterSlot?: string }[];
  actualBench?: { id: string; pts: number; name: string; avatar: string; rosterSlot?: string; position?: string }[];
  optimalStarters: { id: string; pts: number; name: string; avatar: string; rosterSlot?: string }[];
  optimalBench?: { id: string; pts: number; name: string; avatar: string; rosterSlot?: string; position?: string }[];
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

        const getTransactionDetails = (playerId: string, rosterId: number) => {
          const tx = allTransactions.find(t => 
            t.status === 'complete' && 
            t.adds && t.adds[playerId] === rosterId
          );
          if (!tx) return undefined;
          
          if (tx.type === 'trade') {
            const drops = tx.drops || {};
            const originalOwnerId = Object.keys(drops).find(pId => pId === playerId && drops[pId] !== rosterId) ? drops[playerId] : null;
            const tradedBy = originalOwnerId ? rosterToUser[originalOwnerId] : 'Another Team';
            
            const gaveUp: string[] = [];
            Object.keys(drops).forEach(pId => {
              if (drops[pId] === rosterId) {
                const p = playersMap[pId];
                gaveUp.push(p ? `${p.first_name} ${p.last_name}` : pId);
              }
            });
            if (tx.draft_picks) {
              tx.draft_picks.forEach((dp: any) => {
                if (dp.previous_owner_id === rosterId) {
                  gaveUp.push(`${dp.season} Rd ${dp.round} Pick`);
                }
              });
            }

            const received: string[] = [];
            Object.keys(tx.adds || {}).forEach(pId => {
              if (tx.adds && tx.adds[pId] === rosterId && pId !== playerId) {
                const p = playersMap[pId];
                received.push(p ? `${p.first_name} ${p.last_name}` : pId);
              }
            });
            if (tx.draft_picks) {
              tx.draft_picks.forEach((dp: any) => {
                if (dp.owner_id === rosterId) {
                  received.push(`${dp.season} Rd ${dp.round} Pick`);
                }
              });
            }

            return {
              type: 'Trade',
              week: tx.leg,
              tradedBy,
              gaveUp,
              received,
              bid: 0
            };
          } else if (tx.type === 'waiver' || tx.type === 'free_agent') {
            const bid = tx.settings?.waiver_bid || 0;
            return {
              type: tx.type === 'waiver' ? 'Waiver' : 'Free Agency',
              week: tx.leg,
              tradedBy: '',
              gaveUp: [],
              received: [],
              bid
            };
          }
          return undefined;
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

          const replacementBaselines = calculateWeeklyReplacementBaselines(matchups, playersMap);

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
                const teamA_optimalRes = getOptimalLineupPoints(teamA.players || [], teamA.players_points || {}, league.roster_positions || [], playersMap, [], replacementBaselines);
                const teamA_optimal = teamA_optimalRes.totalPoints;
                
                const teamB_starterPts = teamB.points;
                const teamB_optimalRes = getOptimalLineupPoints(teamB.players || [], teamB.players_points || {}, league.roster_positions || [], playersMap, [], replacementBaselines);
                const teamB_optimal = teamB_optimalRes.totalPoints;

                const mapStarters = (starters: string[], pointsMap: Record<string, number>) => {
                  return starters.map((pid, idx) => {
                    if (pid === '0') return null;
                    const pData = playersMap[pid];
                    const slot = league.roster_positions[idx] || 'BN';
                    return {
                      id: pid,
                      pts: Number(pointsMap[pid]) || 0,
                      name: pData ? `${pData.first_name} ${pData.last_name}` : pid,
                      avatar: `https://sleepercdn.com/content/nfl/players/thumb/${pid}.jpg`,
                      rosterSlot: slot
                    };
                  }).filter(Boolean) as any[];
                };

                const mapOptimal = (optimalStarters: any[]) => {
                  return optimalStarters.map(s => {
                    const pData = playersMap[s.id];
                    const isReplacement = s.id.startsWith('REP_');
                    return {
                      id: s.id,
                      pts: s.pts,
                      name: isReplacement ? s.id.replace('REP_', '') : (pData ? `${pData.first_name} ${pData.last_name}` : s.id),
                      avatar: isReplacement ? '' : `https://sleepercdn.com/content/nfl/players/thumb/${s.id}.jpg`,
                      rosterSlot: s.rosterSlot || 'BN'
                    };
                  });
                };

                const mapBench = (allPlayers: string[], starterIds: string[], pointsMap: Record<string, number>) => {
                  const benchIds = (allPlayers || []).filter(pid => pid && pid !== '0' && !starterIds.includes(pid));
                  return benchIds
                    .map(pid => {
                      const pData = playersMap[pid];
                      return {
                        id: pid,
                        pts: Number(pointsMap[pid]) || 0,
                        name: pData ? `${pData.first_name} ${pData.last_name}` : pid,
                        avatar: `https://sleepercdn.com/content/nfl/players/thumb/${pid}.jpg`,
                        rosterSlot: 'BN',
                        position: pData?.position || 'BN',
                      };
                    })
                    .sort((a, b) => b.pts - a.pts);
                };

                // Benchwarmer Blues
                if (teamA_starterPts < teamB_starterPts && teamA_optimal > teamB_starterPts) {
                  benchBlues.push({
                    rosterId: teamA.roster_id,
                    managerName: rosterToUser[teamA.roster_id],
                    managerAvatar: rosterToAvatar[teamA.roster_id] || null,
                    week: w,
                    actualScore: teamA_starterPts,
                    optimalScore: teamA_optimal,
                    opponentScore: teamB_starterPts,
                    opponentName: rosterToUser[teamB.roster_id] || 'Unknown',
                    opponentAvatar: rosterToAvatar[teamB.roster_id] || null,
                    pointsLeftOnBench: teamA_optimal - teamA_starterPts,
                    lostDueToLineup: true,
                    actualStarters: mapStarters(teamA.starters || [], teamA.players_points || {}),
                    actualBench: mapBench(teamA.players || [], teamA.starters || [], teamA.players_points || {}),
                    optimalStarters: mapOptimal(teamA_optimalRes.optimalStarters),
                    optimalBench: mapBench(teamA.players || [], teamA_optimalRes.optimalStarters.map((s: any) => s.id), teamA.players_points || {}),
                  });
                }
                if (teamB_starterPts < teamA_starterPts && teamB_optimal > teamA_starterPts) {
                  benchBlues.push({
                    rosterId: teamB.roster_id,
                    managerName: rosterToUser[teamB.roster_id],
                    managerAvatar: rosterToAvatar[teamB.roster_id] || null,
                    week: w,
                    actualScore: teamB_starterPts,
                    optimalScore: teamB_optimal,
                    opponentScore: teamA_starterPts,
                    opponentName: rosterToUser[teamA.roster_id] || 'Unknown',
                    opponentAvatar: rosterToAvatar[teamA.roster_id] || null,
                    pointsLeftOnBench: teamB_optimal - teamB_starterPts,
                    lostDueToLineup: true,
                    actualStarters: mapStarters(teamB.starters || [], teamB.players_points || {}),
                    actualBench: mapBench(teamB.players || [], teamB.starters || [], teamB.players_points || {}),
                    optimalStarters: mapOptimal(teamB_optimalRes.optimalStarters),
                    optimalBench: mapBench(teamB.players || [], teamB_optimalRes.optimalStarters.map((s: any) => s.id), teamB.players_points || {}),
                  });
                }

                // Matchups Flipped
                const checkFlipped = (team: any, opponent: any) => {
                   const oppPts = opponent.points;
                   if (team.points > oppPts) {
                      team.starters.forEach((playerId: string, idx: number) => {
                         if (playerId !== '0') {
                            const acq = getAcquisitionType(playerId, team.roster_id);
                            if (acq !== 'Draft') {
                               const ptsScored = team.starters_points[idx] || 0;
                               // Calculate ERV (Expected Replacement Value) WITHOUT this player
                               const hypotheticalPlayers = team.players.filter((p: string) => p !== playerId);
                               const retainedStarters = team.starters.filter((p: string) => p !== '0' && p !== playerId);
                               const res = getOptimalLineupPoints(hypotheticalPlayers, team.players_points || {}, league.roster_positions || [], playersMap, retainedStarters, replacementBaselines);
                               const hypotheticalOptimal = res.totalPoints;
                               
                               if (hypotheticalOptimal < oppPts) {
                                  const p = playersMap[playerId];
                                  const actualStarters = team.starters.map((id: string, idx: number) => {
                                     if (id === '0') return null;
                                     const sp = playersMap[id];
                                     const slot = league.roster_positions[idx] || 'BN';
                                     return {
                                       id,
                                       pts: team.starters_points[idx] || 0,
                                       name: sp ? `${sp.first_name} ${sp.last_name}` : id,
                                       avatar: `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`,
                                       rosterSlot: slot
                                     };
                                  }).filter(Boolean) as any[];
                                  const hypotheticalStarters = res.optimalStarters.map(s => {
                                     const sp = playersMap[s.id];
                                     const isReplacement = s.id.startsWith('REP_');
                                     return {
                                       id: s.id,
                                       pts: s.pts,
                                       name: isReplacement ? s.id.replace('REP_', '') : (sp ? `${sp.first_name} ${sp.last_name}` : s.id),
                                       avatar: isReplacement ? '' : `https://sleepercdn.com/content/nfl/players/thumb/${s.id}.jpg`,
                                       rosterSlot: s.rosterSlot || 'BN'
                                     };
                                  });

                                  matchupsFlipped.push({
                                     rosterId: team.roster_id,
                                     managerName: rosterToUser[team.roster_id],
                                     managerAvatar: rosterToAvatar[team.roster_id] || null,
                                     playerAvatar: `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`,
                                     week: w,
                                     playerName: p ? `${p.first_name} ${p.last_name}` : playerId,
                                     acquisitionType: acq,
                                     pointsScored: ptsScored,
                                     margin: Number((team.points - oppPts).toFixed(1)),
                                     actualPoints: team.points,
                                     hypotheticalPoints: hypotheticalOptimal,
                                     opponentPoints: oppPts,
                                     opponentName: rosterToUser[opponent.roster_id] || 'Unknown',
                                     opponentAvatar: rosterToAvatar[opponent.roster_id] || null,
                                     actualStarters,
                                     actualBench: mapBench(team.players || [], team.starters || [], team.players_points || {}),
                                     hypotheticalStarters,
                                     hypotheticalBench: mapBench(hypotheticalPlayers || [], res.optimalStarters.map((s: any) => s.id), team.players_points || {}),
                                     transactionDetails: getTransactionDetails(playerId, team.roster_id)
                                  });
                               }
                            }
                         }
                      });
                   }
                };
                checkFlipped(teamA, teamB);
                checkFlipped(teamB, teamA);


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
