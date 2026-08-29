import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlayerEvaluation } from '../hooks/usePlayerEvaluation';

vi.mock('../api/sleeper', () => ({
  BASE_URL: 'https://api.sleeper.app/v1',
  getPlayers: async () => ({
    'p1': { player_id: 'p1', full_name: 'Alpha Receiver', position: 'WR', team: 'KC' },
    'p2': { player_id: 'p2', full_name: 'Workhorse Runner', position: 'RB', team: 'BAL' },
    'p3': { player_id: 'p3', full_name: 'Return Dynamo', position: 'WR', team: 'DAL' }
  }),
  getUsers: async () => [
    { user_id: 'u1', display_name: 'Manager One', avatar: null, metadata: {} }
  ],
  getRosters: async () => [
    {
      roster_id: 1,
      owner_id: 'u1',
      players: ['p1'],
      starters: ['p1'],
      settings: { wins: 5, losses: 5, ties: 0, fpts: 100, fpts_decimal: 0, fpts_against: 100, fpts_against_decimal: 0, ppts: 100, ppts_decimal: 0, waiver_budget_used: 0 }
    }
  ],
  getMatchups: async () => []
}));

// Mock global fetch for stats
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.endsWith('/stats/nfl/regular/2025/1')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          'TEAM_KC': {
            pass_att: 35, rec_air_yd: 300, off_snp: 65
          },
          'TEAM_BAL': {
            pass_att: 25, rec_air_yd: 150, off_snp: 60
          },
          'TEAM_DAL': {
            pass_att: 40, rec_air_yd: 350, off_snp: 65
          },
          'p1': {
            team: 'KC', pos: 'WR', off_snp: 50, tm_off_snp: 65,
            rec_tgt: 10, rec: 7, rec_yd: 95, rec_td: 1, rec_fd: 6, rec_air_yd: 110,
            rush_att: 0, rush_yd: 0, rush_td: 0, rush_fd: 0, kr_yd: 0, pr_yd: 0
          },
          'p2': {
            team: 'BAL', pos: 'RB', off_snp: 45, tm_off_snp: 60,
            rush_att: 20, rush_yd: 110, rush_td: 1, rush_fd: 8, rush_rz_att: 4, rush_yac: 60, rush_btkl: 3,
            rec_tgt: 2, rec: 2, rec_yd: 15, rec_td: 0, rec_fd: 1, rec_air_yd: 5, kr_yd: 0, pr_yd: 0
          },
          'p3': {
            team: 'DAL', pos: 'WR', off_snp: 15, tm_off_snp: 65,
            rec_tgt: 2, rec: 2, rec_yd: 20, rec_td: 0, rec_fd: 1, rec_air_yd: 15,
            rush_att: 1, rush_yd: 5, rush_td: 0, rush_fd: 0,
            kr_yd: 90, pr_yd: 30, kr_td: 0, pr_td: 0, st_snp: 12
          }
        })
      });
    }
    return Promise.resolve({ ok: false, json: async () => ({}) });
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('usePlayerEvaluation Hook', () => {
  it('correctly computes custom scoring, WOPR, 1D%, and return floor', async () => {
    const scoringRules = {
      rush_yd: 0.1,
      rec_yd: 0.1,
      rush_td: 6.0,
      rec_td: 6.0,
      rush_fd: 1.0,
      rec_fd: 1.0,
      kr_yd: 1 / 15,
      pr_yd: 1 / 20,
      rec: 0.0
    };

    const { result } = renderHook(() => usePlayerEvaluation('12345', '2025', scoringRules));

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    expect(result.current.error).toBeNull();

    const data = result.current.allPlayersData;
    expect(data.length).toBe(3);

    // Alpha Receiver (p1) is rostered
    const p1 = data.find(p => p.id === 'p1');
    expect(p1).toBeDefined();
    expect(p1?.isRostered).toBe(true);
    expect(p1?.targets).toBe(10);
    expect(p1?.recFd).toBe(6);
    expect(p1?.aDoT).toBe(11.0);
    expect(p1?.wopr).toBeGreaterThan(0);

    // Workhorse Runner (p2) is available
    const p2 = data.find(p => p.id === 'p2');
    expect(p2).toBeDefined();
    expect(p2?.isRostered).toBe(false);
    expect(p2?.rushFd).toBe(8);
    expect(p2?.hvt).toBe(6); // 4 RZ carries + 2 targets

    // Return Dynamo (p3) has high return floor
    const p3 = data.find(p => p.id === 'p3');
    expect(p3).toBeDefined();
    expect(p3?.isRostered).toBe(false);
    expect(p3?.returnFloorPpg).toBeCloseTo(7.5, 1); // 90/15 + 30/20 = 6.0 + 1.5 = 7.5
  });
});
