import type { ManagerAllTimeStats } from '../hooks/useAllTimeStats';
import type { ManagerScore } from '../types/recordBook';

export interface PowerScoreWeights {
  championships: number;
  winPercentage: number;
  averageFinish: number;
  coachingEfficiency: number;
  playoffWinPct: number;
  ptsPerSeason: number;
}

export const DEFAULT_POWER_WEIGHTS: PowerScoreWeights = {
  championships: 0.25,
  winPercentage: 0.20,
  averageFinish: 0.20,
  coachingEfficiency: 0.15,
  playoffWinPct: 0.10,
  ptsPerSeason: 0.10,
};

export function normalize(value: number, min: number, max: number, invert = false): number {
  if (max === min) return 50;
  const ratio = (value - min) / (max - min);
  const clamped = Math.max(0, Math.min(1, ratio));
  const score = clamped * 100;
  return invert ? 100 - score : score;
}

export function computePowerScores(
  managers: ManagerAllTimeStats[],
  weights: PowerScoreWeights = DEFAULT_POWER_WEIGHTS
): ManagerScore[] {
  if (!managers || managers.length === 0) return [];

  const maxChamps = Math.max(1, ...managers.map(m => m.championships));
  const minWins = Math.min(...managers.map(m => m.winPercentage));
  const maxWins = Math.max(...managers.map(m => m.winPercentage));
  
  const finishes = managers.map(m => m.averageFinish).filter(f => f > 0);
  const minAvgF = finishes.length > 0 ? Math.min(...finishes) : 1;
  const maxAvgF = finishes.length > 0 ? Math.max(...finishes) : 12;

  const minEff = Math.min(...managers.map(m => m.coachingEfficiency));
  const maxEff = Math.max(...managers.map(m => m.coachingEfficiency));

  const poWinPcts = managers.map(m => 
    (m.playoffWins + m.playoffLosses) > 0 ? (m.playoffWins / (m.playoffWins + m.playoffLosses)) * 100 : 0
  );
  const minPoW = Math.min(...poWinPcts);
  const maxPoW = Math.max(...poWinPcts);

  const ptsPerSzn = managers.map(m => m.totalFpts / Math.max(1, m.seasonsPlayed));
  const minPts = Math.min(...ptsPerSzn);
  const maxPts = Math.max(...ptsPerSzn);

  const maxSeasons = Math.max(1, ...managers.map(m => m.seasonsPlayed));

  return managers.map(m => {
    const totalPlayoffGames = m.playoffWins + m.playoffLosses;
    const poWinPct = totalPlayoffGames > 0 ? (m.playoffWins / totalPlayoffGames) * 100 : 0;
    const ptsPerSeason = m.totalFpts / Math.max(1, m.seasonsPlayed);

    const normChamps = normalize(m.championships, 0, maxChamps);
    const normWins = normalize(m.winPercentage, minWins, maxWins);
    const normFinish = normalize(m.averageFinish, minAvgF, maxAvgF, true);
    const normEff = normalize(m.coachingEfficiency, minEff, maxEff);
    const normPoW = normalize(poWinPct, minPoW, maxPoW);
    const normPts = normalize(ptsPerSeason, minPts, maxPts);

    const rawScore =
      normChamps * weights.championships +
      normWins * weights.winPercentage +
      normFinish * weights.averageFinish +
      normEff * weights.coachingEfficiency +
      normPoW * weights.playoffWinPct +
      normPts * weights.ptsPerSeason;

    // Apply modest tenure dampening only for single-season sample sizes
    const tenureFactor = Math.min(1, 0.75 + (0.25 * (m.seasonsPlayed / maxSeasons)));
    const finalScore = Number((rawScore * tenureFactor).toFixed(1));

    return {
      ...m,
      powerScore: finalScore,
      poWinPct: Number(poWinPct.toFixed(1)),
      ptsPerSeason: Number(ptsPerSeason.toFixed(1)),
    };
  }).sort((a, b) => b.powerScore - a.powerScore);
}
