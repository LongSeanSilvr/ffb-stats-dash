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
    netPoints: number; // received points - gave points (positive = won trade)
  }[];
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
  trades: TradeRecord[];
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

              // Construct a pseudo asset representing the pick itself
              const asset: TradeAsset = {
                playerId: finalPlayerInfo ? finalPlayerInfo.playerId : `PICK_${pickItem.season}_${round}_${origRosterId}`,
                playerName: displayName,
                position: finalPlayerInfo?.pos || 'Pick',
                nflTeam: finalPlayerInfo?.team || '??',
                fromRosterId: giverId,
                toRosterId: receiverId,
                week,
                starterPointsAfterTrade: 0,
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
              netPoints: Number((receivedPts - gavePts).toFixed(2))
            });
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
