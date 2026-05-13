import { describe, it, expect, vi } from 'vitest';
import { calculateFaabMetrics } from '../hooks/useFaabEfficiency';
import fs from 'fs/promises';
import path from 'path';

// Mock sleeper API so we don't hit the network and tests are deterministic
vi.mock('../api/sleeper', () => {
  return {
    getTransactions: async (leagueId: string, week: number) => {
      // Using dynamic imports for mock JSON
      const { default: data } = await import(`./mockData/transactions_${week}.json`);
      return data;
    },
    getMatchups: async (leagueId: string, week: number) => {
      const { default: data } = await import(`./mockData/matchups_${week}.json`);
      return data;
    },
    getPlayers: async () => {
      const { default: data } = await import(`./mockData/players.json`);
      return data;
    }
  };
});

// Helper to load static league structure data
const loadMock = async (filename: string) => {
  const p = path.resolve(__dirname, 'mockData', filename);
  const data = await fs.readFile(p, 'utf-8');
  return JSON.parse(data);
};

describe('FAAB Efficiency Calculations', () => {
  it('correctly calculates wasted FAAB and prevents regression on zero dollar bids', async () => {
    const league = await loadMock('league.json');
    const rosters = await loadMock('rosters.json');
    const users = await loadMock('users.json');
    
    const rosterToUser: Record<number, any> = {};
    rosters.forEach((r: any) => {
      const user = users.find((u: any) => u.user_id === r.owner_id);
      if (user) rosterToUser[r.roster_id] = user;
    });

    const selectedSeason = { league, rosters, rosterToUser };
    const metrics = await calculateFaabMetrics(selectedSeason);
    
    const seanMetrics = metrics.find(m => m.user?.display_name?.toLowerCase().includes('sean'));
    
    expect(seanMetrics).toBeDefined();
    
    // The regression target: if $0 FAAB and free agent pickups are properly tracked,
    // Sean's wasted FAAB should correctly resolve to exactly $121.
    // If it regresses to $160, it means we are incorrectly dropping zero-dollar tracking tenures.
    expect(seanMetrics?.wastedFaab).toBe(121);
    
    // General sanity checks on math aggregations
    expect(seanMetrics?.totalFaabSpent).toBe(rosters.find((r: any) => r.owner_id === seanMetrics?.user?.user_id)?.settings?.waiver_budget_used || 0);
    expect(seanMetrics?.totalPaidBids).toBeGreaterThan(0);
    expect(seanMetrics?.averageBidAmount).toBeGreaterThan(0);
  });
});
