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
  gamesPlayedOnRoster: number;
  gamesMissed: number;
  draftValueExpected: number;
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
  // Overhaul metrics
  totalGamesMissed: number;
  totalDraftValueExpected: number;
  totalDraftValueActual: number;
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

        // Fetch draft picks, player metadata, and full season stats in parallel
        const [draftPicks, playersData, seasonStats] = await Promise.all([
          getDraftPicks(draftId),
          getPlayers(),
          import('../api/sleeper').then(m => m.getSeasonStats(selectedSeason.league.season))
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
            roundValue: {},
            totalGamesMissed: 0,
            totalDraftValueExpected: 0,
            totalDraftValueActual: 0
          };
        });

        // Pre-calculate rounds designated for keepers based on high explicit frequency
        const keeperRoundTallies: Record<number, { total: number; keepers: number }> = {};
        draftPicks.forEach(p => {
          if (!keeperRoundTallies[p.round]) keeperRoundTallies[p.round] = { total: 0, keepers: 0 };
          keeperRoundTallies[p.round].total++;
          if (p.is_keeper) keeperRoundTallies[p.round].keepers++;
        });
        
        const keeperRounds = new Set<number>();
        Object.entries(keeperRoundTallies).forEach(([rdStr, tally]) => {
          // If > 50% of the round is marked as keepers, it is a dedicated keeper round
          if (tally.total > 0 && (tally.keepers / tally.total) > 0.5) {
            keeperRounds.add(Number(rdStr));
          }
        });

        // Build draft assets: each draft pick becomes an asset with tenure starting at week 1
        const assets: DraftAsset[] = draftPicks.map((pick: DraftPick) => {
          const player = playersData[pick.player_id];
          // Consider a keeper if explicitly marked OR if in a dedicated keeper round
          const isKeeper = pick.is_keeper === true || keeperRounds.has(pick.round);
          
          return {
            playerId: pick.player_id,
            playerName: player
              ? `${player.first_name} ${player.last_name}`
              : `${pick.metadata.first_name} ${pick.metadata.last_name}`,
            position: player?.position || pick.metadata.position || '??',
            nflTeam: player?.team || pick.metadata.team || '??',
            round: pick.round,
            pickNo: pick.pick_no,
            isKeeper,
            rosterId: pick.roster_id,
            startWeek: 1,
            endWeek: null,
            starterPoints: 0,
            benchPoints: 0,
            gamesPlayedOnRoster: 0,
            gamesMissed: 0,
            draftValueExpected: Math.max(0, draftPicks.length - pick.pick_no)
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
            const players = matchup.players || [];
            const playersPoints = (matchup as any).players_points || {};
            const starters = matchup.starters || [];

            players.forEach(playerId => {
              const activeAsset = assets.find(
                a =>
                  a.playerId === playerId &&
                  a.rosterId === rosterId &&
                  a.startWeek <= weekNum &&
                  (a.endWeek === null || a.endWeek >= weekNum)
              );

              if (activeAsset) {
                const pts = Number(playersPoints[playerId]) || 0;
                if (pts > 0) {
                  activeAsset.gamesPlayedOnRoster++;
                  if (starters.includes(playerId)) {
                    activeAsset.starterPoints += pts;
                  } else {
                    activeAsset.benchPoints += pts;
                  }
                }
              }
            });
          });
        });

        // Calculate Games Missed due to Injury/Busts
        assets.forEach(asset => {
           const totalSeasonGp = seasonStats[asset.playerId]?.gp || 0;
           if (asset.gamesPlayedOnRoster === totalSeasonGp && asset.endWeek !== null && asset.endWeek < 18) {
              // Season ending injury / out of NFL drop
              asset.gamesMissed = Math.max(0, 17 - totalSeasonGp);
           } else {
              // Missed games while on roster
              const weeksOnRoster = (asset.endWeek || 18) - asset.startWeek + 1;
              asset.gamesMissed = Math.max(0, weeksOnRoster - asset.gamesPlayedOnRoster - 1); // rough -1 for BYE
           }
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

            // Overhaul metrics
            rd.totalGamesMissed += asset.gamesMissed;
            rd.totalDraftValueExpected += asset.draftValueExpected;
            rd.totalDraftValueActual += asset.starterPoints;
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
