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
    if (!draftData.length) return; // Draft data is our mandatory floor for generating analytics

    // Pass 1: Collect raw attribution stats across all active managers
    const intermediate = selectedSeason.rosters.map(roster => {
      const rosterId = roster.roster_id;
      const user = selectedSeason.rosterToUser[rosterId];
      const wins = roster.settings.wins;
      const losses = roster.settings.losses;
      const totalPointsFor = roster.settings.fpts + (roster.settings.fpts_decimal / 100);

      // 1. Draft / Keeper Sourcing
      const draft = draftData.find(d => d.roster_id === rosterId);
      const draftPoints = draft?.draftStarterPoints || 0;
      const keeperPoints = draft?.keeperStarterPoints || 0;
      const draftHits = draft?.draftHits || 0;
      const draftBusts = draft?.draftBusts || 0;
      const draftHitRate = (draftHits + draftBusts) > 0 ? (draftHits / (draftHits + draftBusts)) * 100 : 0;

      // 2. FAAB Sourcing (Transactions specifically with bids > 0)
      const faab = faabData.find(d => d.roster_id === rosterId);
      const faabPoints = faab?.pointsGenerated || 0;
      const faabHits = faab?.hits || 0;
      const faabBusts = faab?.busts || 0;
      const faabHitRate = (faabHits + faabBusts) > 0 ? (faabHits / (faabHits + faabBusts)) * 100 : 0;

      // 3. Trade Sourcing
      const trade = tradeData.find(d => d.roster_id === rosterId);
      const tradePointsReceived = trade?.totalPointsReceived || 0;
      const tradeNetPoints = trade?.totalNetPoints || 0;
      const tradesWon = trade?.tradesWon || 0;
      const totalTrades = trade?.totalTrades || 0;
      const tradeWinRate = totalTrades > 0 ? (tradesWon / totalTrades) * 100 : 0;

      // 4. Free Agency (The 'Other' component: absolute points from non-faab waiver pickups/FAs)
      const attributedTotal = draftPoints + keeperPoints + faabPoints + tradePointsReceived;
      const freeAgentPoints = Math.max(0, totalPointsFor - attributedTotal);

      // Standard Display Normalizations
      const totalBasis = Math.max(totalPointsFor, attributedTotal, 1);
      const draftPct = Number(((draftPoints / totalBasis) * 100).toFixed(1));
      const keeperPct = Number(((keeperPoints / totalBasis) * 100).toFixed(1));
      const faabPct = Number(((faabPoints / totalBasis) * 100).toFixed(1));
      const tradePct = Number(((tradePointsReceived / totalBasis) * 100).toFixed(1));
      const otherPct = Number(Math.max(0, 100 - draftPct - keeperPct - faabPct - tradePct).toFixed(1));

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
        // Intermediate numerical stats for relative indexing
        rawDraftScore: draftPoints + keeperPoints,
        rawFaabScore: faabPoints,
        rawTradeScore: tradeNetPoints,
        rawFreeAgentScore: freeAgentPoints
      };
    });

    // Pass 2: Find global min/max to lock to 0-100 index
    const getMax = (key: 'rawDraftScore' | 'rawFaabScore' | 'rawTradeScore' | 'rawFreeAgentScore') => Math.max(...intermediate.map(m => m[key]));
    const getMin = (key: 'rawDraftScore' | 'rawFaabScore' | 'rawTradeScore' | 'rawFreeAgentScore') => Math.min(...intermediate.map(m => m[key]));

    const ranges = {
      draft: { min: getMin('rawDraftScore'), max: getMax('rawDraftScore') },
      faab: { min: getMin('rawFaabScore'), max: getMax('rawFaabScore') },
      trade: { min: getMin('rawTradeScore'), max: getMax('rawTradeScore') },
      free: { min: getMin('rawFreeAgentScore'), max: getMax('rawFreeAgentScore') }
    };

    const normalizeToPercentile = (val: number, bounds: { min: number, max: number }) => {
      const span = bounds.max - bounds.min;
      if (span <= 0) return 50; // tied default
      return ((val - bounds.min) / span) * 100;
    };

    // Pass 3: Apply normalized weights to form the composite index
    const finalProfiles: ManagerProfile[] = intermediate.map(m => {
      const idxDraft = normalizeToPercentile(m.rawDraftScore, ranges.draft);
      const idxFaab = normalizeToPercentile(m.rawFaabScore, ranges.faab);
      const idxTrade = normalizeToPercentile(m.rawTradeScore, ranges.trade);
      const idxFree = normalizeToPercentile(m.rawFreeAgentScore, ranges.free);

      // Handle scenarios where certain channels had ZERO activity (e.g. historic seasons without FAAB)
      // Dynamically detect if variation exists in the data column.
      const hasFaabActivity = ranges.faab.max > 0;
      const hasTradeActivity = ranges.trade.max !== ranges.trade.min;

      // Core Weights configuration
      const wDraft = 0.60;
      const wFaab = hasFaabActivity ? 0.20 : 0;
      const wTrade = hasTradeActivity ? 0.10 : 0;
      const wFree = 0.10;
      const totalBasisWeight = wDraft + wFaab + wTrade + wFree;

      // Calculate and scale up dynamically if weight-basis shrank (preserves 0-100 scale universally)
      const rawIndex = (idxDraft * wDraft) + (idxFaab * wFaab) + (idxTrade * wTrade) + (idxFree * wFree);
      const compositeScore = Number((rawIndex / Math.max(totalBasisWeight, 0.01)).toFixed(1));

      // Omit intermediate variables
      const { rawDraftScore, rawFaabScore, rawTradeScore, rawFreeAgentScore, ...rest } = m;
      return { ...rest, compositeScore };
    });

    setProfiles(finalProfiles.sort((a, b) => b.compositeScore - a.compositeScore));
  }, [selectedSeason, faabData, draftData, tradeData, loading]);

  return { profiles, loading };
}
