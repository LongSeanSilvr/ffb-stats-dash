export interface ManagerScore {
  ownerId: string;
  managerName: string;
  avatar: string | null;
  seasonsPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;
  totalFpts: number;
  totalFptsAgainst: number;
  bestSingleSeasonFpts: number;
  worstSingleSeasonFpts: number;
  playoffAppearances: number;
  championships: number;
  championshipAppearances: number;
  playoffWins: number;
  playoffLosses: number;
  averageFinish: number;
  bestFinish: number;
  worstFinish: number;
  coachingEfficiency: number;
  ptsAgainstPerGame: number;
  biggestSeasonJump: number;
  finishes: number[];
  seasonBreakdowns: SeasonBreakdown[];
  // Calculated power score fields
  powerScore: number;
  poWinPct: number;
  ptsPerSeason: number;
}

export interface SeasonBreakdown {
  season: string;
  fpts: number;
  wins: number;
  losses: number;
  finish: number;
  winPct: number;
  ppts: number;
  coachingEff: number;
}

export interface SingleGameRecord {
  ownerId: string;
  managerName: string;
  avatar: string | null;
  points: number;
  season: string;
  week: number;
  opponentId?: string;
  opponentName?: string;
  opponentPts?: number;
  margin?: number;
}

export interface RivalrySummary {
  owner1Id: string;
  owner1Name: string;
  owner1Avatar: string | null;
  owner2Id: string;
  owner2Name: string;
  owner2Avatar: string | null;
  owner1Wins: number;
  owner2Wins: number;
  ties?: number;
  marginDiff?: number;
  streak?: number;
  leaderId?: string;
}

export interface MatchupGameLog {
  season: string;
  week: number;
  isPlayoffs: boolean;
  manager1Id: string;
  manager1Pts: number;
  manager2Id: string;
  manager2Pts: number;
  winnerId: string;
  margin: number;
}

export interface SuperlativeBadge {
  id: string;
  title: string;
  category: 'consistency' | 'trend' | 'schedule' | 'clutch';
  managerId: string;
  managerName: string;
  avatar: string | null;
  highlightValue: string;
  subtext: string;
  iconName: string;
}

export interface SeasonLuckRecord {
  season: string;
  actualWins: number;
  actualLosses: number;
  allPlayWins: number;
  allPlayLosses: number;
  allPlayWinPct: number;
  expectedWins: number;
  scheduleLuckWins: number;
  pointsFor: number;
  pointsAgainst: number;
  ppg: number;
  papg: number;
}

export interface ManagerLuckStats {
  ownerId: string;
  managerName: string;
  avatar: string | null;
  seasonsPlayed: number;
  actualWins: number;
  actualLosses: number;
  actualWinPct: number;
  allPlayWins: number;
  allPlayLosses: number;
  allPlayWinPct: number;
  expectedWins: number;
  scheduleLuckWins: number; // Wins Above Expectation (WAE)
  totalPointsAgainst: number;
  papg: number;
  ppg: number;
  seasonLuckList: SeasonLuckRecord[];
}

export interface SingleSeasonLuckExtreme {
  ownerId: string;
  managerName: string;
  avatar: string | null;
  season: string;
  actualRecord: string;
  expectedWins: number;
  scheduleLuckWins: number;
  allPlayRecord: string;
  ppg: number;
  papg: number;
}

export type RecordBookTab = 'rankings' | 'scoring' | 'rivalries' | 'luck';
