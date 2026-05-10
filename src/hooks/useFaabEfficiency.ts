import { useState, useEffect } from 'react';
import { getTransactions, getMatchups, getPlayers } from '../api/sleeper';
import { useLeagueContext } from '../context/LeagueContext';
import type { User } from '../api/sleeper';

export interface FaabEfficiencyResult {
  roster_id: number;
  user: User;
  totalFaabSpent: number;
  pointsGenerated: number;
  benchPointsGenerated: number;
  pointsPerDollar: number;
  
  // Advanced metrics
  hits: number;
  busts: number;
  wastedFaab: number;
  overpayAmount: number;
  positionalSpend: Record<string, number>;
  spendingVelocity: number[]; // Index 0 is week 1
}

export async function calculateFaabMetrics(selectedSeason: any): Promise<FaabEfficiencyResult[]> {
  const leagueId = selectedSeason.league.league_id;
  
  const weekPromises = [];
  for (let week = 1; week <= 18; week++) {
    weekPromises.push(
      Promise.all([
        getTransactions(leagueId, week).catch(() => []),
        getMatchups(leagueId, week).catch(() => [])
      ])
    );
  }
  
  const [weeksData, playersData] = await Promise.all([
    Promise.all(weekPromises),
    getPlayers()
  ]);
  
  // Data structures
  const rosterData: Record<number, FaabEfficiencyResult> = {};
  selectedSeason.rosters.forEach((r: any) => {
    rosterData[r.roster_id] = {
      roster_id: r.roster_id,
      user: selectedSeason.rosterToUser[r.roster_id],
      totalFaabSpent: r.settings.waiver_budget_used || 0,
      pointsGenerated: 0,
      benchPointsGenerated: 0,
      pointsPerDollar: 0,
      hits: 0,
      busts: 0,
      wastedFaab: 0,
      overpayAmount: 0,
      positionalSpend: {},
      spendingVelocity: Array(18).fill(0)
    };
  });

  // Tenure tracking
  interface Asset {
    rosterId: number;
    playerId: string;
    cost: number;
    startWeek: number;
    endWeek: number | null;
    starterPoints: number;
    benchPoints: number;
    overpay: number;
  }
  const assets: Asset[] = [];
  
  // Process transactions chronologically
  weeksData.forEach((weekData, index) => {
    const weekNum = index + 1;
    const transactions = weekData[0];
    
    // First, log failed transactions to find runner-up bids
    const failedBids: Record<string, number> = {}; // playerId -> max failed bid
    transactions.filter((t: any) => t.status === 'failed' && t.type === 'waiver').forEach((tx: any) => {
      if (tx.adds && tx.settings?.waiver_bid !== undefined) {
        Object.keys(tx.adds).forEach(playerId => {
          const bid = tx.settings!.waiver_bid || 0;
          if (!failedBids[playerId] || bid > failedBids[playerId]) {
            failedBids[playerId] = bid;
          }
        });
      }
    });

    transactions.filter((t: any) => t.status === 'complete').forEach((tx: any) => {
      // Handle drops: close out tenures
      if (tx.drops) {
        Object.entries(tx.drops).forEach(([playerId, rosterId]) => {
          const activeAsset = assets.find(a => a.playerId === playerId && a.rosterId === rosterId && a.endWeek === null);
          if (activeAsset) activeAsset.endWeek = weekNum;
        });
      }
      
      // Handle all waiver-type acquisitions: paid FAAB bids AND $0 waivers AND free agent pickups
      if ((tx.type === 'waiver' || tx.type === 'free_agent') && tx.adds) {
        Object.entries(tx.adds).forEach(([playerId, rosterIdStr]) => {
          const rosterId = Number(rosterIdStr);
          const cost = tx.settings?.waiver_bid || 0;
          const runnerUp = failedBids[playerId] || 0;
          const overpay = cost > runnerUp ? cost - runnerUp : 0;
          
          assets.push({
            rosterId,
            playerId,
            cost,
            startWeek: weekNum,
            endWeek: null,
            starterPoints: 0,
            benchPoints: 0,
            overpay
          });

          // Velocity and Positional Spend update immediately upon acquisition
          let pos = playersData[playerId]?.position || 'OTHER';
          if (['DE', 'DT', 'NT', 'DL', 'ILB', 'OLB', 'LB', 'CB', 'S', 'SAF', 'DB'].includes(pos)) pos = 'IDP';

          if (rosterData[rosterId].positionalSpend[pos] !== undefined) {
            rosterData[rosterId].positionalSpend[pos] += cost;
          } else {
            rosterData[rosterId].positionalSpend[pos] = cost;
          }
          
          // Add to velocity for this week
          rosterData[rosterId].spendingVelocity[weekNum - 1] += cost;
        });
      }
    });
    
    // Cumulative velocity
    Object.values(rosterData).forEach(rd => {
      if (weekNum > 1) {
        rd.spendingVelocity[weekNum - 1] += rd.spendingVelocity[weekNum - 2];
      }
    });
  });
  
  // Calculate points
  weeksData.forEach((weekData, index) => {
    const weekNum = index + 1;
    const matchups = weekData[1];
    
    if (!matchups || matchups.length === 0) return;
    
    matchups.forEach((matchup: any) => {
      const rosterId = matchup.roster_id;
      const playersPoints = (matchup as any).players_points || {};
      const starters = matchup.starters || [];
      
      Object.entries(playersPoints).forEach(([playerId, points]) => {
        const pts = Number(points) || 0;
        if (pts === 0) return;
        
        const activeAsset = assets.find(a => 
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
  
  // Aggregate Assets into Roster Data
  assets.forEach(asset => {
    const rd = rosterData[asset.rosterId];
    if (!rd) return;
    rd.pointsGenerated += asset.starterPoints;
    rd.benchPointsGenerated += asset.benchPoints;
    rd.overpayAmount += asset.overpay;
    
    if (asset.starterPoints > 0) {
      rd.hits += 1;
    } else {
      rd.busts += 1;
      rd.wastedFaab += asset.cost;
    }
  });
  
  // Final formatting
  const result = Object.values(rosterData).map(rd => {
    const totalPts = rd.pointsGenerated + rd.benchPointsGenerated;
    rd.pointsGenerated = Number(rd.pointsGenerated.toFixed(2));
    rd.benchPointsGenerated = Number(rd.benchPointsGenerated.toFixed(2));
    rd.pointsPerDollar = rd.totalFaabSpent > 0 ? Number((totalPts / rd.totalFaabSpent).toFixed(2)) : 0;
    return rd;
  });
  
  return result.sort((a, b) => b.totalFaabSpent - a.totalFaabSpent);
}

export function useFaabEfficiency() {
  const { selectedSeason } = useLeagueContext();
  const [data, setData] = useState<FaabEfficiencyResult[]>([]);
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
          weekPromises.push(
            Promise.all([
              getTransactions(leagueId, week).catch(() => []),
              getMatchups(leagueId, week).catch(() => [])
            ])
          );
        }
        
        const [weeksData, playersData] = await Promise.all([
          Promise.all(weekPromises),
          getPlayers()
        ]);
        
        // Data structures
        const rosterData: Record<number, FaabEfficiencyResult> = {};
        selectedSeason.rosters.forEach(r => {
          rosterData[r.roster_id] = {
            roster_id: r.roster_id,
            user: selectedSeason.rosterToUser[r.roster_id],
            totalFaabSpent: r.settings.waiver_budget_used || 0,
            pointsGenerated: 0,
            benchPointsGenerated: 0,
            pointsPerDollar: 0,
            hits: 0,
            busts: 0,
            wastedFaab: 0,
            overpayAmount: 0,
            positionalSpend: {},
            spendingVelocity: Array(18).fill(0)
          };
        });

        // Tenure tracking
        // For each successful acquisition, track it as an individual "Asset"
        interface Asset {
          rosterId: number;
          playerId: string;
          cost: number;
          startWeek: number;
          endWeek: number | null;
          starterPoints: number;
          benchPoints: number;
          overpay: number;
        }
        const assets: Asset[] = [];
        
        // Process transactions chronologically
        weeksData.forEach((weekData, index) => {
          const weekNum = index + 1;
          const transactions = weekData[0];
          
          // First, log failed transactions to find runner-up bids
          const failedBids: Record<string, number> = {}; // playerId -> max failed bid
          transactions.filter(t => t.status === 'failed' && t.type === 'waiver').forEach(tx => {
            if (tx.adds && tx.settings?.waiver_bid !== undefined) {
              Object.keys(tx.adds).forEach(playerId => {
                const bid = tx.settings!.waiver_bid || 0;
                if (!failedBids[playerId] || bid > failedBids[playerId]) {
                  failedBids[playerId] = bid;
                }
              });
            }
          });

          transactions.filter(t => t.status === 'complete').forEach(tx => {
            // Handle drops: close out tenures
            if (tx.drops) {
              Object.entries(tx.drops).forEach(([playerId, rosterId]) => {
                const activeAsset = assets.find(a => a.playerId === playerId && a.rosterId === rosterId && a.endWeek === null);
                if (activeAsset) activeAsset.endWeek = weekNum;
              });
            }
            
            // Handle all waiver-type acquisitions: paid FAAB bids AND $0 waivers AND free agent pickups
            if ((tx.type === 'waiver' || tx.type === 'free_agent') && tx.adds) {
              Object.entries(tx.adds).forEach(([playerId, rosterId]) => {
                const cost = tx.settings?.waiver_bid || 0;
                const runnerUp = failedBids[playerId] || 0;
                const overpay = cost > runnerUp ? cost - runnerUp : 0;
                
                assets.push({
                  rosterId,
                  playerId,
                  cost,
                  startWeek: weekNum,
                  endWeek: null,
                  starterPoints: 0,
                  benchPoints: 0,
                  overpay
                });

                // Velocity and Positional Spend update immediately upon acquisition
                let pos = playersData[playerId]?.position || 'OTHER';
                // Group defensive positions for IDP leagues into a single category
                if (['DE', 'DT', 'NT', 'DL', 'ILB', 'OLB', 'LB', 'CB', 'S', 'SAF', 'DB'].includes(pos)) pos = 'IDP';

                if (rosterData[rosterId].positionalSpend[pos] !== undefined) {
                  rosterData[rosterId].positionalSpend[pos] += cost;
                } else {
                  rosterData[rosterId].positionalSpend[pos] = cost;
                }
                
                // Add to velocity for this week
                rosterData[rosterId].spendingVelocity[weekNum - 1] += cost;
              });
            }
          });
          
          // Cumulative velocity
          Object.values(rosterData).forEach(rd => {
            if (weekNum > 1) {
              rd.spendingVelocity[weekNum - 1] += rd.spendingVelocity[weekNum - 2];
            }
          });
        });
        
        // Calculate points
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
              
              const activeAsset = assets.find(a => 
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
        
        // Aggregate Assets into Roster Data
        assets.forEach(asset => {
          const rd = rosterData[asset.rosterId];
          rd.pointsGenerated += asset.starterPoints;
          rd.benchPointsGenerated += asset.benchPoints;
          rd.overpayAmount += asset.overpay;
          
          if (asset.starterPoints > 0) {
            rd.hits += 1;
          } else {
            rd.busts += 1;
            rd.wastedFaab += asset.cost;
          }
        });
        
        // Final formatting
        const result = Object.values(rosterData).map(rd => {
          const totalPts = rd.pointsGenerated + rd.benchPointsGenerated;
          rd.pointsGenerated = Number(rd.pointsGenerated.toFixed(2));
          rd.benchPointsGenerated = Number(rd.benchPointsGenerated.toFixed(2));
          rd.pointsPerDollar = rd.totalFaabSpent > 0 ? Number((totalPts / rd.totalFaabSpent).toFixed(2)) : 0;
          return rd;
        });
        
        setData(result.sort((a, b) => b.totalFaabSpent - a.totalFaabSpent));
      } catch (err: any) {
        setError(err.message || 'Error calculating efficiency');
      } finally {
        setLoading(false);
      }
    }
    
    calculateEfficiency();
  }, [selectedSeason]);

  return { data, loading, error };
}
