export const BASE_URL = 'https://api.sleeper.app/v1';

export interface League {
  league_id: string;
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  roster_positions: string[];
  previous_league_id: string | null;
  settings: Record<string, any>;
  avatar: string | null;
}

export interface User {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  metadata: Record<string, string>;
}

export interface Roster {
  roster_id: number;
  owner_id: string;
  players: string[] | null;
  starters: string[] | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal: number;
    fpts_against: number;
    fpts_against_decimal: number;
    waiver_budget_used: number;
  };
}

export interface Transaction {
  transaction_id: string;
  type: string; // 'trade', 'free_agent', 'waiver'
  status: string; // 'complete', 'failed', etc.
  roster_ids: number[];
  adds: Record<string, number> | null; // player_id -> roster_id
  drops: Record<string, number> | null; // player_id -> roster_id
  settings: {
    waiver_bid?: number;
  } | null;
  leg: number; // week
}

export interface Matchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  players: string[];
  starters: string[];
  starters_points: number[];
}

export async function getLeague(leagueId: string): Promise<League> {
  const res = await fetch(`${BASE_URL}/league/${leagueId}`);
  if (!res.ok) throw new Error('Failed to fetch league');
  return res.json();
}

export async function getUsers(leagueId: string): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/league/${leagueId}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function getRosters(leagueId: string): Promise<Roster[]> {
  const res = await fetch(`${BASE_URL}/league/${leagueId}/rosters`);
  if (!res.ok) throw new Error('Failed to fetch rosters');
  return res.json();
}

export async function getTransactions(leagueId: string, round: number): Promise<Transaction[]> {
  const res = await fetch(`${BASE_URL}/league/${leagueId}/transactions/${round}`);
  if (!res.ok) throw new Error(`Failed to fetch transactions for round ${round}`);
  return res.json();
}

export async function getMatchups(leagueId: string, week: number): Promise<Matchup[]> {
  const res = await fetch(`${BASE_URL}/league/${leagueId}/matchups/${week}`);
  if (!res.ok) throw new Error(`Failed to fetch matchups for week ${week}`);
  return res.json();
}
