import { useState, useEffect } from 'react';
import { getDraftPicks, getTransactions, getMatchups, getPlayers } from '../api/sleeper';
import { useLeagueContext } from '../context/LeagueContext';
import type { User, DraftPick } from '../api/sleeper';

export interface DraftAsset {
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string;
  round: number;
  pickNo: number;
  isKeeper: boolean;
  rosterId: number;
  startWeek: number;
  endWeek: number | null;
  starterPoints: number;
  benchPoints: number;
}

export interface DraftEfficiencyResult {
  roster_id: number;
  user: User;
  // Draft metrics
  draftPicks: DraftAsset[];
  draftStarterPoints: number;
  draftBenchPoints: number;
  draftHits: number;
  draftBusts: number;
  // Keeper metrics
  keepers: DraftAsset[];
  keeperStarterPoints: number;
  keeperBenchPoints: number;
  keeperHits: number;
  keeperBusts: number;
  // Per-round draft value
  roundValue: Record<number, number>;
}

export function useDraftEfficiency() {
  const { selectedSeason } = useLeagueContext();
  const [data, setData] = useState<DraftEfficiencyResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function calculate() {
      if (!selectedSeason) return;

      try {
        setLoading(true);
        setError(null);

        const leagueId = selectedSeason.league.league_id;
        const draftId = selectedSeason.league.draft_id;

        // Fetch draft picks and player metadata in parallel
        const [draftPicks, playersData] = await Promise.all([
          getDraftPicks(draftId),
          getPlayers()
        ]);

        // Fetch all week data for tenure tracking
        const weekPromises = [];
        for (let week = 1; week <= 18; week++) {
          weekPromises.push(
            Promise.all([
              getTransactions(leagueId, week).catch(() => []),
              getMatchups(leagueId, week).catch(() => [])
            ])
          );
        }
        const weeksData = await Promise.all(weekPromises);

        // Initialize roster data
        const rosterData: Record<number, DraftEfficiencyResult> = {};
        selectedSeason.rosters.forEach(r => {
          rosterData[r.roster_id] = {
            roster_id: r.roster_id,
            user: selectedSeason.rosterToUser[r.roster_id],
            draftPicks: [],
            draftStarterPoints: 0,
            draftBenchPoints: 0,
            draftHits: 0,
            draftBusts: 0,
            keepers: [],
            keeperStarterPoints: 0,
            keeperBenchPoints: 0,
            keeperHits: 0,
            keeperBusts: 0,
            roundValue: {}
          };
        });

        // Build draft assets: each draft pick becomes an asset with tenure starting at week 1
        const assets: DraftAsset[] = draftPicks.map((pick: DraftPick) => {
          const player = playersData[pick.player_id];
          return {
            playerId: pick.player_id,
            playerName: player
              ? `${player.first_name} ${player.last_name}`
              : `${pick.metadata.first_name} ${pick.metadata.last_name}`,
            position: player?.position || pick.metadata.position || '??',
            nflTeam: player?.team || pick.metadata.team || '??',
            round: pick.round,
            pickNo: pick.pick_no,
            isKeeper: pick.is_keeper === true,
            rosterId: pick.roster_id,
            startWeek: 1,
            endWeek: null,
            starterPoints: 0,
            benchPoints: 0
          };
        });

        // Track drops via transactions to close out tenures
        weeksData.forEach((weekData, index) => {
          const weekNum = index + 1;
          const transactions = weekData[0];

          transactions.filter(t => t.status === 'complete').forEach(tx => {
            if (tx.drops) {
              Object.entries(tx.drops).forEach(([playerId, rosterId]) => {
                const asset = assets.find(
                  a => a.playerId === playerId && a.rosterId === rosterId && a.endWeek === null
                );
                if (asset) asset.endWeek = weekNum;
              });
            }
            // If a drafted player is traded, the trade adds them to a new roster and drops from old
            // The drop handler above catches the old roster side
          });
        });

        // Accumulate points from matchups
        weeksData.forEach((weekData, index) => {
          const weekNum = index + 1;
          const matchups = weekData[1];
          if (!matchups || matchups.length === 0) return;

          matchups.forEach(matchup => {
            const rosterId = matchup.roster_id;
            const playersPoints = (matchup as any).players_points || {};
            const starters = matchup.starters || [];

            Object.entries(playersPoints).forEach(([playerId, points]) => {
              const pts = Number(points) || 0;
              if (pts === 0) return;

              const activeAsset = assets.find(
                a =>
                  a.playerId === playerId &&
                  a.rosterId === rosterId &&
                  a.startWeek <= weekNum &&
                  (a.endWeek === null || a.endWeek >= weekNum)
              );

              if (activeAsset) {
                if (starters.includes(playerId)) {
                  activeAsset.starterPoints += pts;
                } else {
                  activeAsset.benchPoints += pts;
                }
              }
            });
          });
        });

        // Aggregate assets into roster data
        assets.forEach(asset => {
          const rd = rosterData[asset.rosterId];
          if (!rd) return;

          // Round into the correct category
          asset.starterPoints = Number(asset.starterPoints.toFixed(2));
          asset.benchPoints = Number(asset.benchPoints.toFixed(2));

          if (asset.isKeeper) {
            rd.keepers.push(asset);
            rd.keeperStarterPoints += asset.starterPoints;
            rd.keeperBenchPoints += asset.benchPoints;
            if (asset.starterPoints > 0) {
              rd.keeperHits++;
            } else {
              rd.keeperBusts++;
            }
          } else {
            rd.draftPicks.push(asset);
            rd.draftStarterPoints += asset.starterPoints;
            rd.draftBenchPoints += asset.benchPoints;
            if (asset.starterPoints > 0) {
              rd.draftHits++;
            } else {
              rd.draftBusts++;
            }
            // Per-round value
            if (!rd.roundValue[asset.round]) rd.roundValue[asset.round] = 0;
            rd.roundValue[asset.round] += asset.starterPoints;
          }
        });

        // Final formatting
        const result = Object.values(rosterData).map(rd => {
          rd.draftStarterPoints = Number(rd.draftStarterPoints.toFixed(2));
          rd.draftBenchPoints = Number(rd.draftBenchPoints.toFixed(2));
          rd.keeperStarterPoints = Number(rd.keeperStarterPoints.toFixed(2));
          rd.keeperBenchPoints = Number(rd.keeperBenchPoints.toFixed(2));
          return rd;
        });

        setData(result.sort((a, b) => b.draftStarterPoints - a.draftStarterPoints));
      } catch (err: any) {
        setError(err.message || 'Error calculating draft efficiency');
      } finally {
        setLoading(false);
      }
    }

    calculate();
  }, [selectedSeason]);

  return { data, loading, error };
}
