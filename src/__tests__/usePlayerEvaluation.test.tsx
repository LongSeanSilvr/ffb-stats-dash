import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlayerEvaluation } from '../hooks/usePlayerEvaluation';

vi.mock('../api/sleeper', () => ({
  BASE_URL: 'https://api.sleeper.app/v1',
  getPlayers: async () => ({
    'p1': { player_id: 'p1', full_name: 'Alpha Receiver', position: 'WR', team: 'KC' },
    'p2': { player_id: 'p2', full_name: 'Workhorse Runner', position: 'RB', team: 'BAL' },
    'p3': { player_id: 'p3', full_name: 'Return Dynamo', position: 'WR', team: 'DAL' },
    'idp1': { player_id: 'idp1', full_name: 'Elite Linebacker', position: 'LB', fantasy_positions: ['LB'], team: 'SF' },
    'idp2': { player_id: 'idp2', full_name: 'Dominant Edge', position: 'DE', fantasy_positions: ['DL', 'LB'], team: 'DET' },
    'idp3': { player_id: 'idp3', full_name: 'Ballhawk Safety', position: 'S', fantasy_positions: ['DB'], team: 'BAL' },
    'def1': { player_id: 'def1', full_name: 'Buffalo Bills', position: 'DEF', team: 'BUF' }
  }),
  getUsers: async () => [
    { user_id: 'u1', display_name: 'Manager One', avatar: null, metadata: {} }
  ],
  getRosters: async () => [
    {
      roster_id: 1,
      owner_id: 'u1',
      players: ['p1', 'idp1'],
      starters: ['p1', 'idp1'],
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
          },
          'idp1': {
            team: 'SF', pos: 'LB', def_snp: 60, tm_def_snp: 60,
            idp_tkl_solo: 8, idp_tkl_ast: 4, idp_tkl_loss: 2, idp_sack: 1, idp_qb_hit: 1, idp_pass_def: 1,
            idp_int: 0, idp_ff: 1, idp_fum_rec: 0
          },
          'idp2': {
            team: 'DET', pos: 'DE', def_snp: 48, tm_def_snp: 64,
            idp_tkl_solo: 4, idp_tkl_ast: 1, idp_tkl_loss: 3, idp_sack: 2.5, idp_qb_hit: 3, idp_pass_def: 0,
            idp_int: 0, idp_ff: 1, idp_fum_rec: 1
          },
          'idp3': {
            team: 'BAL', pos: 'S', def_snp: 62, tm_def_snp: 62,
            idp_tkl_solo: 6, idp_tkl_ast: 2, idp_tkl_loss: 0, idp_sack: 0, idp_qb_hit: 0, idp_pass_def: 3,
            idp_int: 1, idp_int_ret_yd: 25, idp_ff: 0, idp_fum_rec: 0
          },
          'def1': {
            team: 'BUF', pos: 'DEF', pts_std: 10
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
  const scoringRules = {
    rush_yd: 0.1,
    rec_yd: 0.1,
    rush_td: 6.0,
    rec_td: 6.0,
    rush_fd: 1.0,
    rec_fd: 1.0,
    kr_yd: 1 / 15,
    pr_yd: 1 / 20,
    rec: 0.0,

    idp_tkl_solo: 1.0,
    idp_tkl_ast: 0.5,
    idp_tkl_loss: 2.0,
    idp_sack: 3.0,
    idp_qb_hit: 0.5,
    idp_pass_def: 3.0,
    idp_int: 3.0,
    idp_int_ret_yd: 0.05,
    idp_ff: 3.0,
    idp_fum_rec: 3.0,
    idp_def_td: 6.0,
    idp_safe: 2.0,
    idp_blk_kick: 3.0
  };

  it('correctly computes custom scoring, WOPR, 1D%, and return floor for offense', async () => {
    const { result } = renderHook(() => usePlayerEvaluation('12345', '2025', scoringRules));

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    expect(result.current.error).toBeNull();

    const data = result.current.allPlayersData;

    // Team defense 'def1' should be excluded
    const def1 = data.find(p => p.id === 'def1');
    expect(def1).toBeUndefined();

    // Alpha Receiver (p1) is rostered
    const p1 = data.find(p => p.id === 'p1');
    expect(p1).toBeDefined();
    expect(p1?.isRostered).toBe(true);
    expect(p1?.isIdp).toBe(false);
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
    expect(p3?.returnFloorPpg).toBeCloseTo(7.5, 1);
  });

  it('correctly ingests, categorizes, and calculates advanced IDP metrics', async () => {
    const { result } = renderHook(() => usePlayerEvaluation('12345', '2025', scoringRules));

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });

    const data = result.current.allPlayersData;

    // 1. Linebacker (idp1)
    const idp1 = data.find(p => p.id === 'idp1');
    expect(idp1).toBeDefined();
    expect(idp1?.isIdp).toBe(true);
    expect(idp1?.idpPos).toBe('LB');
    expect(idp1?.isRostered).toBe(true);
    expect(idp1?.defSnaps).toBe(60);
    expect(idp1?.defSnapPct).toBe(100);
    expect(idp1?.soloTkl).toBe(8);
    expect(idp1?.astTkl).toBe(4);
    expect(idp1?.totalTkl).toBe(12);
    expect(idp1?.tklRate).toBeCloseTo((12 / 60) * 100, 1); // 20.0%
    // Custom pts: 8*1 + 4*0.5 + 2*2 + 1*3 + 1*0.5 + 1*3 + 1*3 = 8 + 2 + 4 + 3 + 0.5 + 3 + 3 = 23.5
    expect(idp1?.totalCustomPts).toBeCloseTo(23.5, 1);
    expect(idp1?.mortyEdgeIndex).toBeGreaterThan(60);

    // 2. Defensive Lineman (idp2)
    const idp2 = data.find(p => p.id === 'idp2');
    expect(idp2).toBeDefined();
    expect(idp2?.isIdp).toBe(true);
    expect(idp2?.idpPos).toBe('DL');
    expect(idp2?.isRostered).toBe(false);
    expect(idp2?.sacks).toBe(2.5);
    expect(idp2?.tfl).toBe(3);
    expect(idp2?.qbHits).toBe(3);
    expect(idp2?.passRushImpact).toBe(8.5); // 2.5 sk + 3 qbh + 3 tfl
    expect(idp2?.havocPlays).toBe(10.5); // 3 tfl + 2.5 sk + 3 qbh + 1 ff + 1 fr
    expect(idp2?.mortyEdgeIndex).toBeGreaterThan(70);

    // 3. Defensive Back (idp3)
    const idp3 = data.find(p => p.id === 'idp3');
    expect(idp3).toBeDefined();
    expect(idp3?.isIdp).toBe(true);
    expect(idp3?.idpPos).toBe('DB');
    expect(idp3?.passDef).toBe(3);
    expect(idp3?.interceptions).toBe(1);
    // Custom pts: 6*1 + 2*0.5 + 3*3 (PD) + 1*3 (INT) + 25*0.05 (ret yd) = 6 + 1 + 9 + 3 + 1.25 = 20.25
    expect(idp3?.totalCustomPts).toBeCloseTo(20.25, 2);
  });
});
