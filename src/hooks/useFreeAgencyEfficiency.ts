import { useState, useEffect } from 'react';
import { getTransactions, getMatchups, getPlayers } from '../api/sleeper';
import { useLeagueContext } from '../context/LeagueContext';
import type { User } from '../api/sleeper';

export interface FreeAgencyResult {
  roster_id: number;
  user: User;
  totalPickups: number;
  pointsGenerated: number;
  benchPointsGenerated: number;
  pointsPerPickup: number;
  hitRate: number;
  hits: number;
  busts: number;
  positionalVolume: Record<string, number>;
  positionalPoints: Record<string, number>;
  pickupVelocity: number[];
  winPct: number;
  totalWins: number;
  topPickup?: {
    playerName: string;
    points: number;
    position: string;
  };
}

export interface TopAcquisitionLedger {
  playerName: string;
  playerId: string;
  position: string;
  managerName: string;
  managerAvatar?: string;
  starterPoints: number;
  weeksStarted: number;
  weekAcquired: number;
  cost: number;
  acqType: 'faab' | 'street';
}

export interface FreeAgencyViews {
  all: FreeAgencyResult[];
  faab: FreeAgencyResult[];
  street: FreeAgencyResult[];
}

export interface TopAssetViews {
  all: TopAcquisitionLedger[];
  faab: TopAcquisitionLedger[];
  street: TopAcquisitionLedger[];
}

export type AcqFilter = 'all' | 'faab' | 'street';

function makeEmptyRoster(r: any, rosterToUser: any): FreeAgencyResult {
  return {
    roster_id: r.roster_id,
    user: rosterToUser[r.roster_id],
    totalPickups: 0,
    pointsGenerated: 0,
    benchPointsGenerated: 0,
    pointsPerPickup: 0,
    hitRate: 0,
    hits: 0,
    busts: 0,
    positionalVolume: {},
    positionalPoints: {},
    pickupVelocity: Array(18).fill(0),
    totalWins: r.settings.wins || 0,
    winPct: r.settings.wins > 0 ? (r.settings.wins / Math.max(1, r.settings.wins + r.settings.losses)) * 100 : 0
  };
}

function aggregateViews(
  allAssets: any[],
  positionalThresholds: Record<string, number>,
  rosterIdList: number[],
  baseRosters: Record<number, FreeAgencyResult>
): { data: FreeAgencyResult[]; ledger: TopAcquisitionLedger[] }[] {
  const filters: AcqFilter[] = ['all', 'faab', 'street'];
  return filters.map(filter => {
    // Deep-clone base roster stats
    const rosterData: Record<number, FreeAgencyResult> = {};
    rosterIdList.forEach(id => {
      const base = baseRosters[id];
      rosterData[id] = {
        ...base,
        totalPickups: 0,
        pointsGenerated: 0,
        benchPointsGenerated: 0,
        pointsPerPickup: 0,
        hitRate: 0,
        hits: 0,
        busts: 0,
        positionalVolume: {},
        positionalPoints: {},
        pickupVelocity: Array(18).fill(0),
      };
    });

    const filteredAssets = allAssets.filter(a =>
      filter === 'all' || a.acqType === filter
    );

    // Recount pickups for this view
    filteredAssets.forEach(asset => {
      const rd = rosterData[asset.rosterId];
      if (!rd) return;
      rd.totalPickups += 1;
      rd.positionalVolume[asset.position] = (rd.positionalVolume[asset.position] || 0) + 1;
    });

    // Aggregate points + hits
    filteredAssets.forEach(asset => {
      const rd = rosterData[asset.rosterId];
      if (!rd) return;
      rd.pointsGenerated += asset.starterPoints;
      rd.benchPointsGenerated += asset.benchPoints;

      if (asset.starterPoints > 0) {
        rd.positionalPoints[asset.position] = (rd.positionalPoints[asset.position] || 0) + asset.starterPoints;
      }

      if (asset.weeksStartedCount > 0) {
        const assetAvg = asset.starterPoints / asset.weeksStartedCount;
        const threshold = positionalThresholds[asset.position] || 0;
        if (assetAvg >= threshold && assetAvg > 0) {
          rd.hits += 1;
        } else {
          rd.busts += 1;
        }
      } else {
        rd.busts += 1;
      }
    });

    // Final math
    rosterIdList.forEach(id => {
      const rd = rosterData[id];
      const managerAssets = filteredAssets.filter(a => a.rosterId === id);
      if (managerAssets.length > 0) {
        const best = [...managerAssets].sort((a, b) => b.starterPoints - a.starterPoints)[0];
        if (best && best.starterPoints > 0) {
          rd.topPickup = { playerName: best.playerName, points: Number(best.starterPoints.toFixed(1)), position: best.position };
        }
      }
      rd.pointsGenerated = Number(rd.pointsGenerated.toFixed(1));
      rd.benchPointsGenerated = Number(rd.benchPointsGenerated.toFixed(1));
      rd.pointsPerPickup = rd.totalPickups > 0 ? Number((rd.pointsGenerated / rd.totalPickups).toFixed(1)) : 0;
      rd.hitRate = rd.totalPickups > 0 ? Number(((rd.hits / rd.totalPickups) * 100).toFixed(1)) : 0;
    });

    const ledger: TopAcquisitionLedger[] = filteredAssets
      .filter(a => a.starterPoints > 1)
      .map(a => ({
        playerName: a.playerName,
        playerId: a.playerId,
        position: a.position,
        managerName: rosterData[a.rosterId]?.user?.display_name || `Team ${a.rosterId}`,
        managerAvatar: rosterData[a.rosterId]?.user?.avatar,
        starterPoints: Number(a.starterPoints.toFixed(1)),
        weeksStarted: a.weeksStartedCount,
        weekAcquired: a.startWeek,
        cost: a.cost,
        acqType: a.acqType
      }))
      .sort((a, b) => b.starterPoints - a.starterPoints)
      .slice(0, 30);

    return {
      data: Object.values(rosterData).sort((a, b) => b.pointsGenerated - a.pointsGenerated),
      ledger
    };
  });
}

export function useFreeAgencyEfficiency() {
  const { selectedSeason } = useLeagueContext();
  const [views, setViews] = useState<FreeAgencyViews>({ all: [], faab: [], street: [] });
  const [topAssets, setTopAssets] = useState<TopAssetViews>({ all: [], faab: [], street: [] });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function calculateEfficiency() {
      if (!selectedSeason) return;
      try {
        setLoading(true);
        setError(null);
        const leagueId = selectedSeason.league.league_id;

        const weekPromises = [];
        for (let week = 1; week <= 18; week++) {
          weekPromises.push(Promise.all([
            getTransactions(leagueId, week).catch(() => []),
            getMatchups(leagueId, week).catch(() => [])
          ]));
        }
        const [weeksData, playersData] = await Promise.all([
          Promise.all(weekPromises),
          getPlayers()
        ]);

        // Build base roster stubs (wins etc)
        const baseRosters: Record<number, FreeAgencyResult> = {};
        selectedSeason.rosters.forEach(r => {
          baseRosters[r.roster_id] = makeEmptyRoster(r, selectedSeason.rosterToUser);
        });
        const rosterIdList = selectedSeason.rosters.map(r => r.roster_id);

        // Build all assets (always 'all')
        interface Asset {
          rosterId: number;
          playerId: string;
          playerName: string;
          position: string;
          startWeek: number;
          endWeek: number | null;
          starterPoints: number;
          benchPoints: number;
          weeksStartedCount: number;
          cost: number;
          acqType: 'faab' | 'street';
        }
        const allAssets: Asset[] = [];

        weeksData.forEach((weekData, index) => {
          const weekNum = index + 1;
          const transactions = weekData[0];

          transactions.filter(t => t.status === 'complete').forEach(tx => {
            if (tx.drops) {
              Object.entries(tx.drops).forEach(([playerId, rosterId]) => {
                const activeAsset = allAssets.find(a => a.playerId === playerId && a.rosterId === rosterId && a.endWeek === null);
                if (activeAsset) activeAsset.endWeek = weekNum;
              });
            }

            const isFreeAgency = tx.type === 'free_agent' || tx.type === 'waiver';
            if (tx.adds && isFreeAgency) {
              const bid = tx.settings?.waiver_bid || 0;
              const acqType: 'faab' | 'street' = bid > 0 ? 'faab' : 'street';

              Object.entries(tx.adds).forEach(([playerId, rosterIdRaw]) => {
                const rosterId = Number(rosterIdRaw);
                if (!baseRosters[rosterId]) return;

                const playerMeta = playersData[playerId];
                const name = playerMeta ? `${playerMeta.first_name} ${playerMeta.last_name}` : 'Unknown Player';
                let pos = playerMeta?.position || 'OTHER';
                if (['DE', 'DT', 'NT', 'DL', 'ILB', 'OLB', 'LB', 'CB', 'S', 'SAF', 'DB'].includes(pos)) pos = 'IDP';

                allAssets.push({ rosterId, playerId, playerName: name, position: pos, startWeek: weekNum, endWeek: null, starterPoints: 0, benchPoints: 0, weeksStartedCount: 0, cost: bid, acqType });
              });
            }
          });
        });

        // Attribute matchup points to assets
        const globalPlayerStats: Record<string, { points: number; games: number }> = {};
        weeksData.forEach((weekData, index) => {
          const weekNum = index + 1;
          const matchups = weekData[1];
          if (!matchups?.length) return;

          matchups.forEach(matchup => {
            const rosterId = matchup.roster_id;
            const playersPoints = (matchup as any).players_points || {};
            const starters = matchup.starters || [];

            Object.entries(playersPoints).forEach(([pId, points]) => {
              const pts = Number(points) || 0;
              if (pts > 0) {
                if (!globalPlayerStats[pId]) globalPlayerStats[pId] = { points: 0, games: 0 };
                globalPlayerStats[pId].points += pts;
                globalPlayerStats[pId].games += 1;
              }
              if (pts === 0) return;

              const activeAsset = allAssets.find(a =>
                a.playerId === pId && a.rosterId === rosterId &&
                a.startWeek <= weekNum && (a.endWeek === null || a.endWeek >= weekNum)
              );
              if (activeAsset) {
                if (starters.includes(pId)) { activeAsset.starterPoints += pts; activeAsset.weeksStartedCount += 1; }
                else { activeAsset.benchPoints += pts; }
              }
            });
          });
        });

        // Compute positional 35th percentiles
        const positionalAverages: Record<string, number[]> = {};
        Object.entries(globalPlayerStats).forEach(([pId, stats]) => {
          if (!stats.games) return;
          const avg = stats.points / stats.games;
          let pos = playersData[pId]?.position || 'OTHER';
          if (['DE', 'DT', 'NT', 'DL', 'ILB', 'OLB', 'LB', 'CB', 'S', 'SAF', 'DB'].includes(pos)) pos = 'IDP';
          if (!positionalAverages[pos]) positionalAverages[pos] = [];
          positionalAverages[pos].push(avg);
        });
        const positionalThresholds: Record<string, number> = {};
        Object.entries(positionalAverages).forEach(([pos, avgs]) => {
          avgs.sort((a, b) => a - b);
          positionalThresholds[pos] = avgs[Math.floor(avgs.length * 0.35)];
        });

        // Build all three views in one pass
        const [allView, faabView, streetView] = aggregateViews(allAssets, positionalThresholds, rosterIdList, baseRosters);

        setViews({ all: allView.data, faab: faabView.data, street: streetView.data });
        setTopAssets({ all: allView.ledger, faab: faabView.ledger, street: streetView.ledger });

      } catch (err: any) {
        setError(err.message || 'Error fetching free agency data');
      } finally {
        setLoading(false);
      }
    }
    calculateEfficiency();
  }, [selectedSeason]);

  return { views, topAssets, loading, error };
}
