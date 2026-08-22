import { describe, it, expect } from 'vitest';
import { computePowerScores, normalize } from '../utils/goatCalculator';
import type { ManagerAllTimeStats } from '../hooks/useAllTimeStats';

describe('goatCalculator', () => {
  it('normalizes values between 0 and 100 properly', () => {
    expect(normalize(50, 0, 100)).toBe(50);
    expect(normalize(100, 0, 100)).toBe(100);
    expect(normalize(0, 0, 100)).toBe(0);
    expect(normalize(1, 1, 12, true)).toBe(100); // 1st place inverted is top score
    expect(normalize(12, 1, 12, true)).toBe(0);  // 12th place inverted is bottom score
  });

  it('computes power scores and sorts descending', () => {
    const mockManagers: ManagerAllTimeStats[] = [
      {
        ownerId: '1',
        managerName: 'Top Champ',
        avatar: null,
        seasonsPlayed: 3,
        wins: 30,
        losses: 9,
        ties: 0,
        totalFpts: 4500,
        totalFptsAgainst: 3800,
        bestSingleSeasonFpts: 1600,
        worstSingleSeasonFpts: 1400,
        playoffAppearances: 3,
        championships: 2,
        championshipAppearances: 2,
        playoffWins: 4,
        playoffLosses: 1,
        averageFinish: 1.5,
        bestFinish: 1,
        worstFinish: 2,
        finishes: [1, 1, 2],
        totalPpts: 5000,
        coachingEfficiency: 90,
        biggestSeasonJump: 1,
        ptsAgainstPerGame: 97.4,
        winPercentage: 76.9,
        seasonBreakdowns: [],
      },
      {
        ownerId: '2',
        managerName: 'Struggler',
        avatar: null,
        seasonsPlayed: 3,
        wins: 10,
        losses: 29,
        ties: 0,
        totalFpts: 3000,
        totalFptsAgainst: 4200,
        bestSingleSeasonFpts: 1100,
        worstSingleSeasonFpts: 900,
        playoffAppearances: 0,
        championships: 0,
        championshipAppearances: 0,
        playoffWins: 0,
        playoffLosses: 0,
        averageFinish: 10.5,
        bestFinish: 9,
        worstFinish: 12,
        finishes: [10, 11, 12],
        totalPpts: 4000,
        coachingEfficiency: 75,
        biggestSeasonJump: 0,
        ptsAgainstPerGame: 107.6,
        winPercentage: 25.6,
        seasonBreakdowns: [],
      },
    ];

    const result = computePowerScores(mockManagers);
    expect(result.length).toBe(2);
    expect(result[0].ownerId).toBe('1');
    expect(result[0].powerScore).toBeGreaterThan(result[1].powerScore);
  });
});
