import { useState, useEffect } from 'react';
import { useLeagueContext } from '../context/LeagueContext';
import { useFaabEfficiency } from './useFaabEfficiency';
import { useDraftEfficiency } from './useDraftEfficiency';
import { useTradeEfficiency } from './useTradeEfficiency';
import { useCoachingAnalytics } from './useCoachingAnalytics';
import { useFreeAgencyEfficiency } from './useFreeAgencyEfficiency';
import type { User } from '../api/sleeper';

export interface ManagerProfile {
  roster_id: number;
  user: User;
  wins: number;
  losses: number;
  totalPointsFor: number;
  
  // Coaching & Luck
  allPlayWins: number;
  allPlayLosses: number;
  allPlayTies: number;
  coachingEfficiency: number;
  pointsLeftOnBench: number;
  positionalPoints: Record<string, number>;

  // Acquisition channel contributions (starter points)
  draftPoints: number;
  keeperPoints: number;
  faabPoints: number;
  tradeNetPoints: number;
  tradePointsReceived: number;
  waiverPoints: number;

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
  idxDraft: number;
  idxAcq: number;
  idxTrade: number;

  // Schedule Luck & Expected Wins
  expectedWins: number;
  wae: number;
  allPlayWinPct: number;
}

export function useManagerAnalytics() {
  const { selectedSeason } = useLeagueContext();
  const { data: faabData, loading: faabLoading } = useFaabEfficiency();
  const { data: draftData, loading: draftLoading } = useDraftEfficiency();
  const { data: tradeData, loading: tradeLoading } = useTradeEfficiency();
  const { data: coachingData, loading: coachingLoading } = useCoachingAnalytics();
  const { views: faViews, loading: faLoading } = useFreeAgencyEfficiency();

  const [profiles, setProfiles] = useState<ManagerProfile[]>([]);
  const loading = faabLoading || draftLoading || tradeLoading || coachingLoading || faLoading;

  useEffect(() => {
    if (!selectedSeason || loading) return;

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

      // 2. FAAB Sourcing (Calculates both explicit FAAB and holistic acquisition efficiency)
      const faab = faabData.find(d => d.roster_id === rosterId);
      const faabPoints = faab?.pointsGenerated || 0;
      
      // Fetch COMPOSITE hits/busts across ALL free agency (FAAB + Street pickups)
      const combinedFaData = faViews?.all || [];
      const combinedFa = combinedFaData.find((d: any) => d.roster_id === rosterId);
      const combinedHits = combinedFa?.hits || 0;
      const combinedBusts = combinedFa?.busts || 0;
      const faabHitRate = (combinedHits + combinedBusts) > 0 ? (combinedHits / (combinedHits + combinedBusts)) * 100 : 0;

      // 3. Trade Sourcing
      const trade = tradeData.find(d => d.roster_id === rosterId);
      const tradePointsReceived = trade?.totalPointsReceived || 0;
      const tradeNetPoints = trade?.totalNetPoints || 0;
      const tradesWon = trade?.tradesWon || 0;
      const totalTrades = trade?.totalTrades || 0;
      const tradeWinRate = totalTrades > 0 ? (tradesWon / totalTrades) * 100 : 0;

      // 4. Free Agency / Waivers Sourcing (Pure non-faab pickups)
      const streetData = faViews?.street || [];
      const freeAgent = streetData.find((d: any) => d.roster_id === rosterId);
      const waiverPoints = freeAgent?.pointsGenerated || 0;

      const attributedTotal = draftPoints + keeperPoints + faabPoints + tradePointsReceived + waiverPoints;

      // Standard Display Normalizations
      const totalBasis = Math.max(totalPointsFor, attributedTotal, 1);
      const draftPct = Number(((draftPoints / totalBasis) * 100).toFixed(1));
      const keeperPct = Number(((keeperPoints / totalBasis) * 100).toFixed(1));
      const faabPct = Number(((faabPoints / totalBasis) * 100).toFixed(1));
      const tradePct = Number(((tradePointsReceived / totalBasis) * 100).toFixed(1));
      const otherPct = Number(((waiverPoints / totalBasis) * 100).toFixed(1));

      // 5. Coaching & All-Play Metrics
      const coach = coachingData.find(d => d.roster_id === rosterId);
      const allPlayWins = coach?.allPlayWins || 0;
      const allPlayLosses = coach?.allPlayLosses || 0;
      const allPlayTies = coach?.allPlayTies || 0;
      const positionalPoints = coach?.positionalPoints || {};

      // Use SLEEPER NATIVE Potential Points (ppts) for the source of truth on efficiency!
      const totalMaxPoints = roster.settings.ppts + (roster.settings.ppts_decimal / 100);
      const coachingEfficiency = totalMaxPoints > 0 
        ? Number(((totalPointsFor / totalMaxPoints) * 100).toFixed(1)) 
        : coach?.efficiency || 0;
      
      const pointsLeftOnBench = totalMaxPoints > 0 
        ? Number((totalMaxPoints - totalPointsFor).toFixed(1)) 
        : coach?.plob || 0;

      const totalGames = wins + losses;
      const totalAllPlay = allPlayWins + allPlayLosses + allPlayTies;
      const allPlayWinPct = totalAllPlay > 0 ? Number(((allPlayWins / totalAllPlay) * 100).toFixed(1)) : 50;
      const expectedWins = totalAllPlay > 0 ? Number(((allPlayWins / totalAllPlay) * totalGames).toFixed(1)) : Number((totalGames * 0.5).toFixed(1));
      const wae = Number((wins - expectedWins).toFixed(1));

      return {
        roster_id: rosterId,
        user,
        wins,
        losses,
        totalPointsFor: Number(totalPointsFor.toFixed(2)),
        
        allPlayWins,
        allPlayLosses,
        allPlayTies,
        allPlayWinPct,
        expectedWins,
        wae,
        coachingEfficiency,
        pointsLeftOnBench,
        positionalPoints,

        draftPoints: Number(draftPoints.toFixed(2)),
        keeperPoints: Number(keeperPoints.toFixed(2)),
        faabPoints: Number(faabPoints.toFixed(2)),
        tradeNetPoints: Number(tradeNetPoints.toFixed(2)),
        tradePointsReceived: Number(tradePointsReceived.toFixed(2)),
        waiverPoints: Number(waiverPoints.toFixed(2)),
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
        rawAcqScore: faabPoints + waiverPoints,
        rawTradeScore: tradeNetPoints
      };
    });

    // Pass 2: Global min/max across performance pillars
    const ptsList = intermediate.map(m => m.totalPointsFor);
    const minPts = Math.min(...ptsList);
    const maxPts = Math.max(...ptsList);

    const winPcts = intermediate.map(m => (m.wins / Math.max(1, m.wins + m.losses)) * 100);
    const minWinPct = Math.min(...winPcts);
    const maxWinPct = Math.max(...winPcts);

    const allPlayPcts = intermediate.map(m => {
      const total = m.allPlayWins + m.allPlayLosses + m.allPlayTies;
      return total > 0 ? (m.allPlayWins / total) * 100 : 50;
    });
    const minAllPlay = Math.min(...allPlayPcts);
    const maxAllPlay = Math.max(...allPlayPcts);

    const effList = intermediate.map(m => m.coachingEfficiency);
    const minEff = Math.min(...effList);
    const maxEff = Math.max(...effList);

    // Acquisition Sub-indices
    const getMax = (key: 'rawDraftScore' | 'rawAcqScore' | 'rawTradeScore') => Math.max(...intermediate.map(m => m[key]));
    const getMin = (key: 'rawDraftScore' | 'rawAcqScore' | 'rawTradeScore') => Math.min(...intermediate.map(m => m[key]));

    const ranges = {
      draft: { min: getMin('rawDraftScore'), max: getMax('rawDraftScore') },
      acq: { min: getMin('rawAcqScore'), max: getMax('rawAcqScore') },
      trade: { min: getMin('rawTradeScore'), max: getMax('rawTradeScore') }
    };

    const normalizeToPercentile = (val: number, bounds: { min: number, max: number }) => {
      const span = bounds.max - bounds.min;
      if (span <= 0) return 50; 
      return Math.max(0, Math.min(100, ((val - bounds.min) / span) * 100));
    };

    // Pass 3: Apply grounded Power Score weighting matching the site-wide standard:
    // 30% Points For (Offensive firepower)
    // 25% All-Play Win % (Schedule-independent roster strength)
    // 25% Matchup Win % (Standings success)
    // 20% Coaching Efficiency (% optimal points started)
    const finalProfiles: ManagerProfile[] = intermediate.map((m, idx) => {
      const normPts = normalizeToPercentile(m.totalPointsFor, { min: minPts, max: maxPts });
      const normWinPct = normalizeToPercentile(winPcts[idx], { min: minWinPct, max: maxWinPct });
      const normAllPlay = normalizeToPercentile(allPlayPcts[idx], { min: minAllPlay, max: maxAllPlay });
      const normEff = normalizeToPercentile(m.coachingEfficiency, { min: minEff, max: maxEff });

      const rawPower = (normPts * 0.30) + (normAllPlay * 0.25) + (normWinPct * 0.25) + (normEff * 0.20);
      const compositeScore = Number(rawPower.toFixed(1));

      const idxDraft = normalizeToPercentile(m.rawDraftScore, ranges.draft);
      const idxAcq = normalizeToPercentile(m.rawAcqScore, ranges.acq);
      const idxTrade = normalizeToPercentile(m.rawTradeScore, ranges.trade);

      // Clean up and finalize
      const { rawDraftScore, rawAcqScore, rawTradeScore, ...rest } = m;
      return { 
        ...rest, 
        compositeScore,
        idxDraft: Number(idxDraft.toFixed(1)),
        idxAcq: Number(idxAcq.toFixed(1)),
        idxTrade: Number(idxTrade.toFixed(1))
      };
    });

    setProfiles(finalProfiles.sort((a, b) => b.compositeScore - a.compositeScore));
  }, [selectedSeason, faabData, draftData, tradeData, coachingData, loading]);

  return { profiles, loading };
}
