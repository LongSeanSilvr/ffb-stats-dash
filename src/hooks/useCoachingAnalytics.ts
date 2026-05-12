import { useState, useEffect } from 'react';
import { useLeagueContext } from '../context/LeagueContext';
import { getMatchups, getPlayers } from '../api/sleeper';

export interface CoachingStats {
  roster_id: number;
  optimalPoints: number;
  actualPoints: number;
  efficiency: number;
  plob: number; // Points Left On Bench
  allPlayWins: number;
  allPlayLosses: number;
  allPlayTies: number;
  positionalPoints: Record<string, number>;
}

export function useCoachingAnalytics() {
  const { selectedSeason } = useLeagueContext();
  const [data, setData] = useState<CoachingStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSeason) return;
    
    async function fetchCoachingData() {
      setLoading(true);
      try {
        const { league } = selectedSeason!;
        // Determine weeks to fetch (usually 1 to playoff_week_start - 1)
        const currentWeek = league.settings.leg || 17;
        const lastWeek = league.settings.playoff_week_start ? league.settings.playoff_week_start - 1 : currentWeek;
        
        const weeks = Array.from({ length: lastWeek }, (_, i) => i + 1);
        const matchupsPromises = weeks.map(w => getMatchups(league.league_id, w).catch(() => []));
        const matchupsByWeek = await Promise.all(matchupsPromises);
        const playersMetadata = await getPlayers();

        const statsMap: Record<number, CoachingStats> = {};
        
        selectedSeason!.rosters.forEach(r => {
          statsMap[r.roster_id] = {
            roster_id: r.roster_id,
            optimalPoints: 0,
            actualPoints: 0,
            efficiency: 0,
            plob: 0,
            allPlayWins: 0,
            allPlayLosses: 0,
            allPlayTies: 0,
            positionalPoints: { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 }
          };
        });

        matchupsByWeek.forEach(weekMatchups => {
          if (!weekMatchups || weekMatchups.length === 0) return;

          // 1. All-Play Record Calculation
          // Sort rosters by actual points in this week
          const validMatchups = weekMatchups.filter(m => m.points > 0);
          if (validMatchups.length === 0) return;

          validMatchups.sort((a, b) => b.points - a.points);
          
          validMatchups.forEach((m, idx) => {
            if (!statsMap[m.roster_id]) return;
            // Wins = number of teams below them
            const wins = validMatchups.length - 1 - idx;
            // Losses = number of teams above them
            const losses = idx;
            // Handling ties (simplified for all-play, usually rare)
            statsMap[m.roster_id].allPlayWins += wins;
            statsMap[m.roster_id].allPlayLosses += losses;
          });

          // 2. Coaching Efficiency Calculation
          weekMatchups.forEach(m => {
            if (!statsMap[m.roster_id]) return;
            const stats = statsMap[m.roster_id];
            
            // Add to actual points
            stats.actualPoints += m.points;

            // Track positional scoring from starters
            if (m.starters && m.starters_points && m.players_points) {
              m.starters.forEach((playerId, i) => {
                const meta = playersMetadata[playerId];
                const pos = meta?.position || 'FLEX';
                const pts = m.starters_points[i] || 0;
                if (!stats.positionalPoints[pos]) stats.positionalPoints[pos] = 0;
                stats.positionalPoints[pos] += pts;
              });

              // Greedy Optimal Lineup calculation
              const rosterPositions = league.roster_positions.filter(p => p !== 'BN' && p !== 'IR');
              const availablePlayers = Object.entries(m.players_points).map(([id, pts]) => ({
                id,
                pts,
                pos: playersMetadata[id]?.position || 'FLEX'
              })).sort((a, b) => b.pts - a.pts); // Highest scoring first

              let weekOptimalPoints = 0;
              const usedPositions = [...rosterPositions];

              availablePlayers.forEach(player => {
                // Try to fit player into their exact position slot
                let slotIdx = usedPositions.indexOf(player.pos);
                if (slotIdx === -1 && ['RB', 'WR', 'TE'].includes(player.pos)) {
                   // Try FLEX
                   slotIdx = usedPositions.findIndex(p => p === 'FLEX' || p === 'W/R/T');
                }
                if (slotIdx === -1 && ['WR', 'TE'].includes(player.pos)) {
                   // Try W/T
                   slotIdx = usedPositions.findIndex(p => p === 'W/T');
                }
                if (slotIdx === -1 && ['RB', 'WR'].includes(player.pos)) {
                   // Try W/R
                   slotIdx = usedPositions.findIndex(p => p === 'W/R');
                }
                if (slotIdx === -1 && ['QB', 'RB', 'WR', 'TE'].includes(player.pos)) {
                   // Try SUPER_FLEX
                   slotIdx = usedPositions.findIndex(p => p === 'SUPER_FLEX' || p === 'Q/R/W/T');
                }

                if (slotIdx !== -1) {
                  weekOptimalPoints += player.pts;
                  usedPositions.splice(slotIdx, 1); // Consume the slot
                }
              });

              // Ensure optimal is never less than actual (prevents >100% efficiency due to missing metadata)
              stats.optimalPoints += Math.max(weekOptimalPoints, m.points);
            }
          });
        });

        // Finalize efficiencies
        Object.values(statsMap).forEach(stats => {
          if (stats.optimalPoints > 0) {
            stats.efficiency = Number(((stats.actualPoints / stats.optimalPoints) * 100).toFixed(1));
            stats.plob = Number((stats.optimalPoints - stats.actualPoints).toFixed(2));
          }
        });

        setData(Object.values(statsMap));
      } catch (err) {
        console.error("Error fetching coaching data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCoachingData();
  }, [selectedSeason]);

  return { data, loading };
}
