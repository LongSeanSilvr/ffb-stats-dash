import { useState, useEffect } from 'react';
import { useLeagueContext } from '../context/LeagueContext';
import { useFaabEfficiency } from './useFaabEfficiency';
import { useDraftEfficiency } from './useDraftEfficiency';
import { useTradeEfficiency } from './useTradeEfficiency';
import type { User } from '../api/sleeper';

export interface ManagerProfile {
  roster_id: number;
  user: User;
  wins: number;
  losses: number;
  totalPointsFor: number;

  // Acquisition channel contributions (starter points)
  draftPoints: number;
  keeperPoints: number;
  faabPoints: number;
  tradeNetPoints: number;
  tradePointsReceived: number;

  // Hit rates
  draftHitRate: number;
  faabHitRate: number;
  tradeWinRate: number;

  // Percentages of total points by source
  draftPct: number;
  keeperPct: number;
  faabPct: number;
  tradePct: number;
  otherPct: number; // free agents, undrafted players, etc.

  // Composite score (higher = better overall manager)
  compositeScore: number;
}

export function useManagerAnalytics() {
  const { selectedSeason } = useLeagueContext();
  const { data: faabData, loading: faabLoading } = useFaabEfficiency();
  const { data: draftData, loading: draftLoading } = useDraftEfficiency();
  const { data: tradeData, loading: tradeLoading } = useTradeEfficiency();

  const [profiles, setProfiles] = useState<ManagerProfile[]>([]);
  const loading = faabLoading || draftLoading || tradeLoading;

  useEffect(() => {
    if (!selectedSeason || loading) return;
    if (!faabData.length || !draftData.length) return;

    const result: ManagerProfile[] = selectedSeason.rosters.map(roster => {
      const rosterId = roster.roster_id;
      const user = selectedSeason.rosterToUser[rosterId];
      const wins = roster.settings.wins;
      const losses = roster.settings.losses;
      const totalPointsFor = roster.settings.fpts + (roster.settings.fpts_decimal / 100);

      // Draft
      const draft = draftData.find(d => d.roster_id === rosterId);
      const draftPoints = draft?.draftStarterPoints || 0;
      const keeperPoints = draft?.keeperStarterPoints || 0;
      const draftHits = draft?.draftHits || 0;
      const draftBusts = draft?.draftBusts || 0;
      const draftHitRate = (draftHits + draftBusts) > 0 ? (draftHits / (draftHits + draftBusts)) * 100 : 0;

      // FAAB
      const faab = faabData.find(d => d.roster_id === rosterId);
      const faabPoints = faab?.pointsGenerated || 0;
      const faabHits = faab?.hits || 0;
      const faabBusts = faab?.busts || 0;
      const faabHitRate = (faabHits + faabBusts) > 0 ? (faabHits / (faabHits + faabBusts)) * 100 : 0;

      // Trades
      const trade = tradeData.find(d => d.roster_id === rosterId);
      const tradePointsReceived = trade?.totalPointsReceived || 0;
      const tradeNetPoints = trade?.totalNetPoints || 0;
      const tradesWon = trade?.tradesWon || 0;
      const totalTrades = trade?.totalTrades || 0;
      const tradeWinRate = totalTrades > 0 ? (tradesWon / totalTrades) * 100 : 0;

      // Calculate percentages — normalize so they always sum to ~100%
      const attributedTotal = draftPoints + keeperPoints + faabPoints + tradePointsReceived;
      const totalBasis = Math.max(totalPointsFor, attributedTotal, 1);

      const draftPct = Number(((draftPoints / totalBasis) * 100).toFixed(1));
      const keeperPct = Number(((keeperPoints / totalBasis) * 100).toFixed(1));
      const faabPct = Number(((faabPoints / totalBasis) * 100).toFixed(1));
      const tradePct = Number(((tradePointsReceived / totalBasis) * 100).toFixed(1));
      const otherPct = Number(Math.max(0, 100 - draftPct - keeperPct - faabPct - tradePct).toFixed(1));

      // Composite score: weighted combination
      // Draft value (40%), FAAB efficiency (30%), Trade savvy (15%), Win rate (15%)
      const maxPts = Math.max(...selectedSeason.rosters.map(r => r.settings.fpts + r.settings.fpts_decimal / 100));
      const winPct = (wins / Math.max(1, wins + losses)) * 100;

      const compositeScore = Number((
        (draftPoints / Math.max(1, maxPts)) * 40 +
        (faabHitRate / 100) * 30 +
        (tradeWinRate / 100) * 15 +
        (winPct / 100) * 15
      ).toFixed(1));

      return {
        roster_id: rosterId,
        user,
        wins,
        losses,
        totalPointsFor: Number(totalPointsFor.toFixed(2)),
        draftPoints: Number(draftPoints.toFixed(2)),
        keeperPoints: Number(keeperPoints.toFixed(2)),
        faabPoints: Number(faabPoints.toFixed(2)),
        tradeNetPoints: Number(tradeNetPoints.toFixed(2)),
        tradePointsReceived: Number(tradePointsReceived.toFixed(2)),
        draftHitRate: Number(draftHitRate.toFixed(1)),
        faabHitRate: Number(faabHitRate.toFixed(1)),
        tradeWinRate: Number(tradeWinRate.toFixed(1)),
        draftPct,
        keeperPct,
        faabPct,
        tradePct,
        otherPct,
        compositeScore
      };
    });

    setProfiles(result.sort((a, b) => b.compositeScore - a.compositeScore));
  }, [selectedSeason, faabData, draftData, tradeData, loading]);

  return { profiles, loading };
}
