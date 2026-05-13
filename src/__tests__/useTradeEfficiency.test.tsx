import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTradeEfficiency } from '../hooks/useTradeEfficiency';
import fs from 'fs/promises';
import path from 'path';

let mockSelectedSeason: any = null;
vi.mock('../context/LeagueContext', () => ({
  useLeagueContext: () => ({
    selectedSeason: mockSelectedSeason,
    loading: false,
    error: null
  })
}));

vi.mock('../api/sleeper', () => ({
  getTransactions: async (l: string, w: number) => { try { const { default: data } = await import(`./mockData/transactions_${w}.json`); return data; } catch { return []; } },
  getMatchups: async (l: string, w: number) => { try { const { default: data } = await import(`./mockData/matchups_${w}.json`); return data; } catch { return []; } },
  getPlayers: async () => { try { const { default: data } = await import(`./mockData/players.json`); return data; } catch { return {}; } },
  getDraft: async () => [],
  getDraftPicks: async () => []
}));

const loadMock = async (filename: string) => JSON.parse(await fs.readFile(path.resolve(__dirname, 'mockData', filename), 'utf-8'));

describe('Trade Efficiency', () => {
  it('calculates trade efficiency without crashing', async () => {
    const league = await loadMock('league.json');
    const rosters = await loadMock('rosters.json');
    const users = await loadMock('users.json');
    const rosterToUser: Record<number, any> = {};
    rosters.forEach((r: any) => { const user = users.find((u: any) => u.user_id === r.owner_id); if (user) rosterToUser[r.roster_id] = user; });
    mockSelectedSeason = { league, rosters, rosterToUser };

    const { result } = renderHook(() => useTradeEfficiency());
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 10000 });
    expect(result.current.error).toBeNull();

    const roster11 = result.current.data.find(d => d.roster_id === 11);
    expect(roster11).toBeDefined();

    // Verify Market Timing logic for a specific trade (Player 8110 in Week 4)
    // This locks in the dynamic `lastPlayedWeek` average division
    const week4Trade = roster11?.trades.find(t => t.week === 4);
    const side11 = week4Trade?.sides.find(s => s.rosterId === 11);
    const asset8110 = side11?.received.find(a => a.playerId === "8110");
    
    expect(asset8110).toBeDefined();
    expect(asset8110?.avgPointsBeforeTrade).toBe(3.4);
    expect(asset8110?.avgPointsAfterTrade).toBe(8.38);
  });
});
