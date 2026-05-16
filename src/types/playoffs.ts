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
  actualStarters: { id: string; pts: number; name: string; avatar: string; rosterSlot?: string }[];
  hypotheticalStarters: { id: string; pts: number; name: string; avatar: string; rosterSlot?: string }[];
}
