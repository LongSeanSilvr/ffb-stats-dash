import { describe, it, expect } from 'vitest';
import { getMatchupHistoryBetween, findFeaturedRivalries } from '../utils/h2hAggregator';
import type { MatchupRecord } from '../hooks/useAllTimeMatchups';

describe('h2hAggregator', () => {
  const mockMatchups: MatchupRecord[] = [
    {
      season: '2023',
      week: 1,
      ownerA: '1',
      ownerB: '2',
      ptsA: 120.5,
      ptsB: 95.0,
      isPlayoffs: false,
    },
    {
      season: '2023',
      week: 8,
      ownerA: '2',
      ownerB: '1',
      ptsA: 110.0,
      ptsB: 115.0,
      isPlayoffs: false,
    },
    {
      season: '2024',
      week: 4,
      ownerA: '1',
      ownerB: '2',
      ptsA: 130.0,
      ptsB: 88.0,
      isPlayoffs: false,
    },
  ];

  it('filters and sorts matchup history between two managers', () => {
    const logs = getMatchupHistoryBetween(mockMatchups, '1', '2');
    expect(logs.length).toBe(3);
    expect(logs[0].season).toBe('2024'); // Newest first
    expect(logs[0].winnerId).toBe('1');
    expect(logs[0].margin).toBe(42);
  });

  it('identifies featured rivalries', () => {
    const h2hMatrix = {
      '1': { '2': { wins: 3, losses: 0 } },
      '2': { '1': { wins: 0, losses: 3 } },
    };
    const managerMap = {
      '1': { name: 'Dominator', avatar: null },
      '2': { name: 'Victim', avatar: null },
    };

    const result = findFeaturedRivalries(h2hMatrix, mockMatchups, managerMap);
    expect(result.mostOneSided?.owner1Id).toBe('1');
    expect(result.activeStreak?.streak).toBe(3);
  });
});
