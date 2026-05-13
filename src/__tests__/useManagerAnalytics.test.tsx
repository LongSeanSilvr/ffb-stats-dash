import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useManagerAnalytics } from '../hooks/useManagerAnalytics';
import fs from 'fs/promises';
import path from 'path';

let mockSelectedSeason: any = null;
vi.mock('../context/LeagueContext', () => ({ useLeagueContext: () => ({ selectedSeason: mockSelectedSeason, loading: false, error: null }) }));

vi.mock('../api/sleeper', () => ({
  getMatchups: async (l: string, w: number) => { try { const { default: data } = await import(`./mockData/matchups_${w}.json`); return data; } catch { return []; } },
  getPlayers: async () => { try { const { default: data } = await import(`./mockData/players.json`); return data; } catch { return {}; } }
}));

const loadMock = async (f: string) => JSON.parse(await fs.readFile(path.resolve(__dirname, 'mockData', f), 'utf-8'));

describe('Manager Analytics', () => {
  it('calculates all play metrics without crashing', async () => {
    const league = await loadMock('league.json');
    const rosters = await loadMock('rosters.json');
    const users = await loadMock('users.json');
    const rosterToUser: Record<number, any> = {};
    rosters.forEach((r: any) => { const user = users.find((u: any) => u.user_id === r.owner_id); if (user) rosterToUser[r.roster_id] = user; });
    mockSelectedSeason = { league, rosters, rosterToUser };

    const { result } = renderHook(() => useManagerAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 10000 });
    expect(result.current.error).toBeNull();
  });
});
