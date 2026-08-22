import { describe, it, expect } from 'vitest';
import { calculateStdDev, computeSuperlatives } from '../utils/superlativesCalculator';
import type { ManagerScore } from '../types/recordBook';

describe('superlativesCalculator', () => {
  it('calculates standard deviation accurately', () => {
    expect(calculateStdDev([2, 2, 2])).toBe(0);
    expect(calculateStdDev([1, 5])).toBe(2);
  });

  it('computes superlative badges for managers', () => {
    const mockManagers: ManagerScore[] = [
      {
        ownerId: '1',
        managerName: 'Steady Eddy',
        avatar: null,
        seasonsPlayed: 3,
        wins: 20,
        losses: 19,
        ties: 0,
        totalFpts: 4000,
        totalFptsAgainst: 3800,
        bestSingleSeasonFpts: 1400,
        worstSingleSeasonFpts: 1300,
        playoffAppearances: 2,
        championships: 1,
        championshipAppearances: 1,
        playoffWins: 2,
        playoffLosses: 1,
        averageFinish: 3.0,
        bestFinish: 3,
        worstFinish: 3,
        finishes: [3, 3, 3],
        coachingEfficiency: 88,
        ptsAgainstPerGame: 95.0,
        biggestSeasonJump: 2,
        winPercentage: 51.2,
        poWinPct: 66.7,
        ptsPerSeason: 1333.3,
        powerScore: 85,
        seasonBreakdowns: [],
      },
      {
        ownerId: '2',
        managerName: 'Roller Coaster',
        avatar: null,
        seasonsPlayed: 3,
        wins: 15,
        losses: 24,
        ties: 0,
        totalFpts: 3500,
        totalFptsAgainst: 4500,
        bestSingleSeasonFpts: 1600,
        worstSingleSeasonFpts: 900,
        playoffAppearances: 1,
        championships: 1,
        championshipAppearances: 1,
        playoffWins: 2,
        playoffLosses: 0,
        averageFinish: 6.0,
        bestFinish: 1,
        worstFinish: 11,
        finishes: [1, 11, 6],
        coachingEfficiency: 79,
        ptsAgainstPerGame: 115.0,
        biggestSeasonJump: 10,
        winPercentage: 38.5,
        poWinPct: 100.0,
        ptsPerSeason: 1166.7,
        powerScore: 60,
        seasonBreakdowns: [],
      },
    ];

    const badges = computeSuperlatives(mockManagers);
    expect(badges.length).toBeGreaterThan(0);
    
    const consistent = badges.find(b => b.id === 'most-consistent');
    expect(consistent?.managerId).toBe('1');

    const volatile = badges.find(b => b.id === 'most-volatile');
    expect(volatile?.managerId).toBe('2');

    const easiest = badges.find(b => b.id === 'easiest-schedule');
    expect(easiest?.managerId).toBe('1');

    const hardest = badges.find(b => b.id === 'toughest-schedule');
    expect(hardest?.managerId).toBe('2');
  });
});
