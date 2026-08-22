export interface PlayerRosterItem {
  id: string;
  pts: number;
  name: string;
  avatar: string;
  rosterSlot?: string;
  position?: string;
}

export interface MatchupFlipped {
  rosterId: number;
  managerName: string;
  managerAvatar: string | null;
  playerAvatar?: string;
  week: number;
  playerName: string;
  acquisitionType: string;
  pointsScored: number;
  margin: number;
  actualPoints: number;
  hypotheticalPoints: number;
  opponentPoints: number;
  opponentName: string;
  opponentAvatar: string | null;
  actualStarters: PlayerRosterItem[];
  actualBench?: PlayerRosterItem[];
  hypotheticalStarters: PlayerRosterItem[];
  hypotheticalBench?: PlayerRosterItem[];
  transactionDetails?: {
    type: string;
    week: number;
    tradedBy?: string;
    gaveUp?: string[];
    received?: string[];
    bid?: number;
  };
}
