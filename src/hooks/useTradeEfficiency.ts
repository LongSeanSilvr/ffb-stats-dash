import { useState, useEffect } from 'react';
import { getTransactions, getMatchups, getPlayers, getDraft, getDraftPicks } from '../api/sleeper';
import { useLeagueContext } from '../context/LeagueContext';
import { calculateFaabMetrics } from './useFaabEfficiency';
import type { User } from '../api/sleeper';

export interface TradeAsset {
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string;
  fromRosterId: number;
  toRosterId: number;
  week: number;
  starterPointsAfterTrade: number;
  avgPointsBeforeTrade?: number;
  avgPointsAfterTrade?: number;
  isPick?: boolean;
  actualProjectedPoints?: number;
}

export interface TradeRecord {
  transactionId: string;
  week: number;
  rosterIds: number[];
  // For each roster, what they gave and received
  sides: {
    rosterId: number;
    gave: TradeAsset[];
    received: TradeAsset[];
    netPoints: number;
    optimalMatchupsFlipped: number;
  }[];
}

export interface FlippedMatchup {
  week: number;
  type: 'added' | 'lost';
  actualMargin: number;
  hypotheticalMargin: number;
  oppRosterId: number;
}

export interface TradeEfficiencyResult {
  roster_id: number;
  user: User;
  totalTrades: number;
  tradesWon: number;
  tradesLost: number;
  tradesTied: number;
  totalNetPoints: number; // cumulative net from all trades
  totalPointsReceived: number;
  totalPointsGiven: number;
  totalAssetsGiven: number;
  totalAssetsReceived: number;
  totalMatchupsFlippedAdded: number;
  totalMatchupsFlippedLost: number;
  flippedMatchups: FlippedMatchup[];
  trades: TradeRecord[];
}

function getOptimalLineupPoints(players: string[], playersPoints: Record<string, number>, rosterPositions: string[], playersData: any): number {
  if (!players || players.length === 0) return 0;
  
  const availablePlayers = players.map(pid => {
    const pData = playersData[pid] || {};
    const fantasyPos = pData.fantasy_positions || [pData.position];
    return {
      id: pid,
      pts: Number(playersPoints[pid]) || 0,
      pos: pData.position || '??',
      fantasyPos: fantasyPos
    };
  }).sort((a, b) => b.pts - a.pts);

  let totalPoints = 0;
  const usedPlayerIds = new Set<string>();

  const useBestPlayer = (validPositions: string[], isIdpFlex = false) => {
    for (const p of availablePlayers) {
      if (!usedPlayerIds.has(p.id)) {
        if (isIdpFlex && p.fantasyPos.some((fp: string) => ['DL', 'LB', 'DB'].includes(fp))) {
          usedPlayerIds.add(p.id);
          totalPoints += p.pts;
          return true;
        }
        if (p.fantasyPos.some((fp: string) => validPositions.includes(fp)) || validPositions.includes(p.pos)) {
          usedPlayerIds.add(p.id);
          totalPoints += p.pts;
          return true;
        }
      }
    }
    return false;
  };

  const standardSlots = rosterPositions.filter(p => !['BN', 'IR', 'TAXI', 'FLEX', 'SUPER_FLEX', 'REC_FLEX', 'WRRB_FLEX', 'IDP_FLEX'].includes(p));
  const flexSlots = rosterPositions.filter(p => ['FLEX', 'SUPER_FLEX', 'REC_FLEX', 'WRRB_FLEX', 'IDP_FLEX'].includes(p));

  const idpSlots = standardSlots.filter(p => p === 'IDP');
  const strictSlots = standardSlots.filter(p => p !== 'IDP');

  strictSlots.forEach(slotPos => {
    useBestPlayer([slotPos]);
  });

  idpSlots.forEach(() => {
    useBestPlayer([], true);
  });

  flexSlots.forEach(flexType => {
    if (flexType === 'FLEX') useBestPlayer(['RB', 'WR', 'TE']);
    else if (flexType === 'SUPER_FLEX') useBestPlayer(['QB', 'RB', 'WR', 'TE']);
    else if (flexType === 'REC_FLEX') useBestPlayer(['WR', 'TE']);
    else if (flexType === 'WRRB_FLEX') useBestPlayer(['WR', 'RB']);
    else if (flexType === 'IDP_FLEX') useBestPlayer([], true);
  });

  return Number(totalPoints.toFixed(2));
}

export function useTradeEfficiency() {
  const { selectedSeason } = useLeagueContext();
  const [data, setData] = useState<TradeEfficiencyResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function calculate() {
      if (!selectedSeason) return;

      try {
        setLoading(true);
        setError(null);

        const leagueId = selectedSeason.league.league_id;

        // Fetch all weeks of transactions and matchups
        const weekPromises = [];
        for (let week = 1; week <= 18; week++) {
          weekPromises.push(
            Promise.all([
              getTransactions(leagueId, week).catch(() => []),
              getMatchups(leagueId, week).catch(() => [])
            ])
          );
        }

        const [weeksData, playersData, draftInfo, finalPicks, faabMetrics] = await Promise.all([
          Promise.all(weekPromises),
          getPlayers(),
          getDraft(selectedSeason.league.draft_id).catch(() => null),
          getDraftPicks(selectedSeason.league.draft_id).catch(() => []),
          calculateFaabMetrics(selectedSeason).catch(() => [])
        ]);

        // Calculate League Average FAAB Multiplier
        let totalLeaguePts = 0;
        let totalLeagueFaab = 0;
        faabMetrics.forEach((fm: any) => {
          totalLeaguePts += (fm.pointsGenerated + fm.benchPointsGenerated);
          totalLeagueFaab += fm.totalFaabSpent;
        });
        const leagueAvgPointsPerDollar = totalLeagueFaab > 0 ? totalLeaguePts / totalLeagueFaab : 0;

        // Pre-calculate average points per drafted round to estimate future pick values
        const roundPoints: Record<number, { total: number; count: number }> = {};
        if (finalPicks.length > 0) {
          finalPicks.forEach((p: any) => {
            if (!roundPoints[p.round]) roundPoints[p.round] = { total: 0, count: 0 };
            roundPoints[p.round].count++;
          });
          
          weeksData.forEach(weekData => {
            const matchups = weekData[1];
            if (!matchups) return;
            matchups.forEach((m: any) => {
              const starters = m.starters || [];
              const playersPoints = (m as any).players_points || {};
              finalPicks.forEach((p: any) => {
                if (starters.includes(p.player_id) && playersPoints[p.player_id]) {
                  roundPoints[p.round].total += Number(playersPoints[p.player_id]);
                }
              });
            });
          });
        }
        
        const avgRoundPoints: Record<number, number> = {};
        Object.entries(roundPoints).forEach(([rd, data]) => {
          avgRoundPoints[Number(rd)] = data.count > 0 ? Number((data.total / data.count).toFixed(2)) : 0;
        });

        // Create mapping of (round, original_roster_id) -> drafted player for current season picks
        const draftPickLookup: Record<string, any> = {};
        if (draftInfo && draftInfo.slot_to_roster_id && finalPicks.length > 0) {
          finalPicks.forEach((p: any) => {
            const originalRosterId = draftInfo.slot_to_roster_id[String(p.draft_slot)];
            if (originalRosterId) {
              const key = `${p.round}-${originalRosterId}`;
              draftPickLookup[key] = {
                playerId: p.player_id,
                name: p.metadata ? `${p.metadata.first_name} ${p.metadata.last_name}` : 'Unknown Player',
                pos: p.metadata?.position || '??',
                team: p.metadata?.team || '??'
              };
            }
          });
        }

        // Initialize roster data
        const rosterData: Record<number, TradeEfficiencyResult> = {};
        selectedSeason.rosters.forEach(r => {
          rosterData[r.roster_id] = {
            roster_id: r.roster_id,
            user: selectedSeason.rosterToUser[r.roster_id],
            totalTrades: 0,
            tradesWon: 0,
            tradesLost: 0,
            tradesTied: 0,
            totalNetPoints: 0,
            totalPointsReceived: 0,
            totalPointsGiven: 0,
            totalAssetsGiven: 0,
            totalAssetsReceived: 0,
            totalMatchupsFlippedAdded: 0,
            totalMatchupsFlippedLost: 0,
            flippedMatchups: [],
            trades: []
          };
        });

        // Find all trade transactions
        const allTrades: { tx: any; week: number }[] = [];
        weeksData.forEach((weekData, index) => {
          const weekNum = index + 1;
          const transactions = weekData[0];
          transactions
            .filter((t: any) => {
              const isTrade = t.status === 'complete' && t.type === 'trade';
              const hasAssets = (t.adds && Object.keys(t.adds).length > 0) || 
                                (t.draft_picks && t.draft_picks.length > 0) ||
                                (t.waiver_budget && t.waiver_budget.length > 0);
              return isTrade && hasAssets;
            })
            .forEach((tx: any) => {
              allTrades.push({ tx, week: weekNum });
            });
        });

        // For each traded player, track their starter points on the RECEIVING roster
        // from trade week through end of season
        const tradeRecords: TradeRecord[] = [];

        allTrades.forEach(({ tx, week }) => {
          const record: TradeRecord = {
            transactionId: tx.transaction_id,
            week,
            rosterIds: tx.roster_ids,
            sides: []
          };

          // Build a map of who gave and received what
          const rosterSides: Record<number, { gave: TradeAsset[]; received: TradeAsset[] }> = {};
          tx.roster_ids.forEach((rid: number) => {
            rosterSides[rid] = { gave: [], received: [] };
          });

          // adds = player_id -> roster_id (the receiving roster)
          if (tx.adds) {
            Object.entries(tx.adds).forEach(([playerId, receivingRosterId]) => {
              const rid = receivingRosterId as number;
              const player = playersData[playerId];
              const asset: TradeAsset = {
                playerId,
                playerName: player ? `${player.first_name} ${player.last_name}` : playerId,
                position: player?.position || '??',
                nflTeam: player?.team || '??',
                fromRosterId: 0, // determined below
                toRosterId: rid,
                week,
                starterPointsAfterTrade: 0
              };

              if (rosterSides[rid]) {
                rosterSides[rid].received.push(asset);
              }
            });
          }

          // drops = player_id -> roster_id (the giving roster)
          if (tx.drops) {
            Object.entries(tx.drops).forEach(([playerId, givingRosterId]) => {
              const rid = givingRosterId as number;
              const player = playersData[playerId];
              const asset: TradeAsset = {
                playerId,
                playerName: player ? `${player.first_name} ${player.last_name}` : playerId,
                position: player?.position || '??',
                nflTeam: player?.team || '??',
                fromRosterId: rid,
                toRosterId: 0, // determined from adds
                week,
                starterPointsAfterTrade: 0
              };

              if (rosterSides[rid]) {
                rosterSides[rid].gave.push(asset);
              }
            });
          }

          // NEW: Parse draft picks in trade!
          if (tx.draft_picks && Array.isArray(tx.draft_picks)) {
            const currentSeasonStr = selectedSeason.league.season;
            
            tx.draft_picks.forEach((pickItem: any) => {
              const giverId = pickItem.previous_owner_id;
              const receiverId = pickItem.owner_id;
              const origRosterId = pickItem.roster_id; // original owner of the pick slot
              const round = pickItem.round;
              const isCurrentSeason = String(pickItem.season) === currentSeasonStr;

              let finalPlayerInfo = null;
              if (isCurrentSeason) {
                const lookupKey = `${round}-${origRosterId}`;
                finalPlayerInfo = draftPickLookup[lookupKey];
              }

              const displayName = isCurrentSeason && finalPlayerInfo 
                ? `Rd ${round} Pick (${finalPlayerInfo.name})`
                : `${pickItem.season} Rd ${round} Pick`;

              // If it's a future pick (or current season but somehow un-drafted), estimate its value based on the average points of that round this year
              let estimatedPoints = 0;
              if (!isCurrentSeason || !finalPlayerInfo) {
                estimatedPoints = avgRoundPoints[round] || 0;
              }

              // Construct a pseudo asset representing the pick itself
              const asset: TradeAsset = {
                playerId: finalPlayerInfo ? finalPlayerInfo.playerId : `PICK_${pickItem.season}_${round}_${origRosterId}`,
                playerName: displayName,
                position: finalPlayerInfo?.pos || 'Pick',
                nflTeam: finalPlayerInfo?.team || '??',
                fromRosterId: giverId,
                toRosterId: receiverId,
                week,
                starterPointsAfterTrade: estimatedPoints,
                isPick: true
              };

              if (rosterSides[giverId]) {
                rosterSides[giverId].gave.push({ ...asset });
              }
              if (rosterSides[receiverId]) {
                rosterSides[receiverId].received.push({ ...asset });
              }
            });
          }

          // NEW: Parse FAAB traded
          if (tx.waiver_budget && Array.isArray(tx.waiver_budget)) {
            tx.waiver_budget.forEach((faabItem: any) => {
              const giverId = faabItem.sender;
              const receiverId = faabItem.receiver;
              const amount = faabItem.amount;

              if (amount > 0) {
                // Calculate point values
                const ledgerPts = Number((amount * leagueAvgPointsPerDollar).toFixed(2));
                
                // Actual projected based on receiver
                const receiverFaabInfo = faabMetrics.find((fm: any) => fm.roster_id === receiverId);
                const receiverMultiplier = receiverFaabInfo?.pointsPerDollar || leagueAvgPointsPerDollar;
                const receiverProjected = Number((amount * receiverMultiplier).toFixed(2));

                // Actual projected based on giver
                const giverFaabInfo = faabMetrics.find((fm: any) => fm.roster_id === giverId);
                const giverMultiplier = giverFaabInfo?.pointsPerDollar || leagueAvgPointsPerDollar;
                const giverProjected = Number((amount * giverMultiplier).toFixed(2));

                const baseAsset: Omit<TradeAsset, 'actualProjectedPoints'> = {
                  playerId: `FAAB_${amount}_${giverId}_${receiverId}`,
                  playerName: `$${amount} FAAB`,
                  position: 'FAAB',
                  nflTeam: '---',
                  fromRosterId: giverId,
                  toRosterId: receiverId,
                  week,
                  starterPointsAfterTrade: ledgerPts,
                  isPick: false
                };

                if (rosterSides[giverId]) {
                  rosterSides[giverId].gave.push({ ...baseAsset, actualProjectedPoints: giverProjected });
                }
                if (rosterSides[receiverId]) {
                  rosterSides[receiverId].received.push({ ...baseAsset, actualProjectedPoints: receiverProjected });
                }
              }
            });
          }

          // Deduplicate: If a trade includes a player AND the pick used to keep that player, avoid double counting
          Object.values(rosterSides).forEach(side => {
            const deduplicate = (assets: TradeAsset[]) => {
              const unique: TradeAsset[] = [];
              const seen = new Set<string>();
              // Sort to prefer actual player assets over pick assets if there's a collision
              const sortedAssets = [...assets].sort((a, b) => (a.isPick ? 1 : 0) - (b.isPick ? 1 : 0));
              for (const asset of sortedAssets) {
                if (!seen.has(asset.playerId)) {
                  seen.add(asset.playerId);
                  unique.push(asset);
                }
              }
              return unique;
            };
            side.gave = deduplicate(side.gave);
            side.received = deduplicate(side.received);
          });

          // Cross-reference to fill in fromRosterId on received assets
          Object.values(rosterSides).forEach(side => {
            side.received.forEach(received => {
              const giver = Object.entries(rosterSides).find(([, s]) =>
                s.gave.some(g => g.playerId === received.playerId)
              );
              if (giver) {
                received.fromRosterId = Number(giver[0]);
              }
            });
            side.gave.forEach(gave => {
              const receiver = Object.entries(rosterSides).find(([, s]) =>
                s.received.some(r => r.playerId === gave.playerId)
              );
              if (receiver) {
                gave.toRosterId = Number(receiver[0]);
              }
            });
          });

          // Calculate post-trade points for received players on the RECEIVING roster
          Object.entries(rosterSides).forEach(([rosterIdStr, side]) => {
            const rosterId = Number(rosterIdStr);

            side.received.forEach(asset => {
              // Sum starter points from trade week onwards on this roster

              if (!asset.isPick && asset.position !== 'FAAB') {
                let ptsBefore = 0;
                let weeksBefore = week - 1;
                for (let w = 1; w < week; w++) {
                  const matchups = weeksData[w - 1]?.[1] || [];
                  let foundPts = 0;
                  matchups.forEach((m: any) => {
                    const playersPoints = m.players_points || {};
                    if (playersPoints[asset.playerId] !== undefined) {
                      foundPts = Number(playersPoints[asset.playerId]);
                    }
                  });
                  ptsBefore += foundPts;
                }
                asset.avgPointsBeforeTrade = weeksBefore > 0 ? Number((ptsBefore / weeksBefore).toFixed(2)) : 0;

                let ptsAfter = 0;
                let weeksAfter = 18 - week + 1;
                for (let w = week; w <= 18; w++) {
                  const matchups = weeksData[w - 1]?.[1] || [];
                  let foundPts = 0;
                  matchups.forEach((m: any) => {
                    const playersPoints = m.players_points || {};
                    if (playersPoints[asset.playerId] !== undefined) {
                      foundPts = Number(playersPoints[asset.playerId]);
                    }
                  });
                  ptsAfter += foundPts;
                }
                asset.avgPointsAfterTrade = weeksAfter > 0 ? Number((ptsAfter / weeksAfter).toFixed(2)) : 0;
              }
              for (let w = week; w <= 18; w++) {
                const matchups = weeksData[w - 1]?.[1] || [];
                const matchup = matchups.find((m: any) => m.roster_id === rosterId);
                if (!matchup) continue;

                const starters = matchup.starters || [];
                const playersPoints = (matchup as any).players_points || {};
                const pts = Number(playersPoints[asset.playerId]) || 0;

                if (starters.includes(asset.playerId) && pts > 0) {
                  asset.starterPointsAfterTrade += pts;
                }
              }
              asset.starterPointsAfterTrade = Number(asset.starterPointsAfterTrade.toFixed(2));
            });

            // Calculate post-trade points for GIVEN players on the OTHER roster
            side.gave.forEach(asset => {
              const destRosterId = asset.toRosterId;
              for (let w = week; w <= 18; w++) {
                const matchups = weeksData[w - 1]?.[1] || [];
                const matchup = matchups.find((m: any) => m.roster_id === destRosterId);
                if (!matchup) continue;

                const starters = matchup.starters || [];
                const playersPoints = (matchup as any).players_points || {};
                const pts = Number(playersPoints[asset.playerId]) || 0;

                if (starters.includes(asset.playerId) && pts > 0) {
                  asset.starterPointsAfterTrade += pts;
                }
              }
              asset.starterPointsAfterTrade = Number(asset.starterPointsAfterTrade.toFixed(2));
            });

            const receivedPts = side.received.reduce((sum, a) => sum + a.starterPointsAfterTrade, 0);
            const gavePts = side.gave.reduce((sum, a) => sum + a.starterPointsAfterTrade, 0);

            record.sides.push({
              rosterId,
              gave: side.gave,
              received: side.received,
              netPoints: Number((receivedPts - gavePts).toFixed(2)),
              matchupsFlippedAdded: 0,
              matchupsFlippedLost: 0,
              flippedMatchups: []
            });
          });

          // Calculate Matchups Flipped
          Object.entries(rosterSides).forEach(([rosterIdStr, side]) => {
            const rosterId = Number(rosterIdStr);
            for (let w = week; w <= 18; w++) {
              const matchups = weeksData[w - 1]?.[1] || [];
              const myMatchup = matchups.find((m: any) => m.roster_id === rosterId);
              if (!myMatchup) continue;
              
              const oppMatchup = matchups.find((m: any) => m.matchup_id === myMatchup.matchup_id && m.roster_id !== rosterId);
              if (!oppMatchup) continue;
              
              if (myMatchup.points === 0 && oppMatchup.points === 0) continue;
              
              const actualOptimal = getOptimalLineupPoints(myMatchup.players || [], myMatchup.players_points || {}, selectedSeason.league.roster_positions || [], playersData);
              const oppOptimal = getOptimalLineupPoints(oppMatchup.players || [], oppMatchup.players_points || {}, selectedSeason.league.roster_positions || [], playersData);
              
              const hypotheticalPlayers = [...(myMatchup.players || [])];
              side.received.forEach(asset => {
                const idx = hypotheticalPlayers.indexOf(asset.playerId);
                if (idx > -1) hypotheticalPlayers.splice(idx, 1);
              });
              side.gave.forEach(asset => {
                if (!asset.isPick && asset.position !== 'FAAB' && !hypotheticalPlayers.includes(asset.playerId)) {
                  hypotheticalPlayers.push(asset.playerId);
                }
              });
              
              const hypotheticalPoints = { ...(myMatchup.players_points || {}) };
              side.gave.forEach(asset => {
                let pts = 0;
                matchups.forEach((m: any) => {
                  if (m.players_points && m.players_points[asset.playerId] !== undefined) {
                    pts = m.players_points[asset.playerId];
                  }
                });
                hypotheticalPoints[asset.playerId] = pts;
              });
              
              const hypotheticalOptimal = getOptimalLineupPoints(hypotheticalPlayers, hypotheticalPoints, selectedSeason.league.roster_positions || [], playersData);
              
              const actualMargin = myMatchup.points - oppMatchup.points;
              const optimalDelta = actualOptimal - hypotheticalOptimal;
              const hypotheticalMargin = actualMargin - optimalDelta;
              
              const s = record.sides.find(s => s.rosterId === rosterId);
              if (s) {
                // If we won reality, but would have lost hypothetically -> Trade Added a Win
                if (actualMargin > 0 && hypotheticalMargin <= 0) {
                  s.matchupsFlippedAdded += 1;
                  s.flippedMatchups.push({ week: w, type: 'added', actualMargin, hypotheticalMargin, oppRosterId: oppMatchup.roster_id });
                }
                // If we lost reality, but would have won hypothetically -> Trade Lost a Win
                else if (actualMargin <= 0 && hypotheticalMargin > 0) {
                  s.matchupsFlippedLost += 1;
                  s.flippedMatchups.push({ week: w, type: 'lost', actualMargin, hypotheticalMargin, oppRosterId: oppMatchup.roster_id });
                }
              }
            }
          });
          tradeRecords.push(record);
        });

        // Aggregate trade records into roster data
        tradeRecords.forEach(record => {
          // Check if this trade involves only FAAB for all parties
          const isFaabOnly = record.sides.every(s => 
            s.gave.every(a => a.position === 'FAAB') && 
            s.received.every(a => a.position === 'FAAB')
          );

          record.sides.forEach(side => {
            const rd = rosterData[side.rosterId];
            if (!rd) return;

            // Always add to the ledger view
            rd.trades.push(record);

            if (!isFaabOnly) {
              rd.totalTrades++;

              rd.totalAssetsGiven += side.gave.filter(a => a.position !== 'FAAB').length;
              rd.totalAssetsReceived += side.received.filter(a => a.position !== 'FAAB').length;
              rd.totalMatchupsFlippedAdded += side.matchupsFlippedAdded;
              rd.totalMatchupsFlippedLost += side.matchupsFlippedLost;
              if (side.flippedMatchups) rd.flippedMatchups.push(...side.flippedMatchups);

              const receivedPts = side.received.reduce((sum, a) => sum + a.starterPointsAfterTrade, 0);
              const gavePts = side.gave.reduce((sum, a) => sum + a.starterPointsAfterTrade, 0);

              rd.totalPointsReceived += receivedPts;
              rd.totalPointsGiven += gavePts;
              rd.totalNetPoints += side.netPoints;

              if (side.netPoints > 0) rd.tradesWon++;
              else if (side.netPoints < 0) rd.tradesLost++;
              else rd.tradesTied++;
            }
          });
        });

        // Final formatting
        const result = Object.values(rosterData).map(rd => {
          rd.totalNetPoints = Number(rd.totalNetPoints.toFixed(2));
          rd.totalPointsReceived = Number(rd.totalPointsReceived.toFixed(2));
          rd.totalPointsGiven = Number(rd.totalPointsGiven.toFixed(2));
          return rd;
        });

        setData(result.sort((a, b) => b.totalNetPoints - a.totalNetPoints));
      } catch (err: any) {
        setError(err.message || 'Error calculating trade efficiency');
      } finally {
        setLoading(false);
      }
    }

    calculate();
  }, [selectedSeason]);

  return { data, loading, error };
}
