import type { MatchupRecord } from '../hooks/useAllTimeMatchups';
import type { MatchupGameLog, RivalrySummary } from '../types/recordBook';

export function getMatchupHistoryBetween(
  matchups: MatchupRecord[],
  owner1Id: string,
  owner2Id: string
): MatchupGameLog[] {
  if (!matchups || !owner1Id || !owner2Id) return [];

  return matchups
    .filter(
      m =>
        (m.ownerA === owner1Id && m.ownerB === owner2Id) ||
        (m.ownerA === owner2Id && m.ownerB === owner1Id)
    )
    .map(m => {
      const isOwner1A = m.ownerA === owner1Id;
      const pts1 = isOwner1A ? m.ptsA : m.ptsB;
      const pts2 = isOwner1A ? m.ptsB : m.ptsA;
      const winnerId = pts1 > pts2 ? owner1Id : pts2 > pts1 ? owner2Id : 'tie';

      return {
        season: m.season,
        week: m.week,
        isPlayoffs: m.isPlayoffs,
        manager1Id: owner1Id,
        manager1Pts: pts1,
        manager2Id: owner2Id,
        manager2Pts: pts2,
        winnerId,
        margin: Math.abs(pts1 - pts2),
      };
    })
    .sort((a, b) => {
      const sDiff = parseInt(b.season) - parseInt(a.season);
      if (sDiff !== 0) return sDiff;
      return b.week - a.week;
    });
}

export function findFeaturedRivalries(
  h2hMatrix: Record<string, Record<string, { wins: number; losses: number }>>,
  matchupList: MatchupRecord[],
  managerMap: Record<string, { name: string; avatar: string | null }>
): {
  closestRivalry: RivalrySummary | null;
  mostOneSided: RivalrySummary | null;
  activeStreak: RivalrySummary | null;
} {
  const pairsSeen = new Set<string>();
  let closestRivalry: RivalrySummary | null = null;
  let minDiff = 999;
  let maxGamesForClosest = 0;

  let mostOneSided: RivalrySummary | null = null;
  let maxDiff = -1;

  Object.entries(h2hMatrix).forEach(([owner1, opponents]) => {
    Object.entries(opponents).forEach(([owner2, record]) => {
      if (owner1 === owner2) return;
      const key = [owner1, owner2].sort().join('::');
      if (pairsSeen.has(key)) return;
      pairsSeen.add(key);

      const totalGames = record.wins + record.losses;
      if (totalGames < 3) return; // Require at least 3 meetings

      const diff = Math.abs(record.wins - record.losses);
      const mgr1 = managerMap[owner1] || { name: 'Manager 1', avatar: null };
      const mgr2 = managerMap[owner2] || { name: 'Manager 2', avatar: null };

      // Closest rivalry check
      if (diff < minDiff || (diff === minDiff && totalGames > maxGamesForClosest)) {
        minDiff = diff;
        maxGamesForClosest = totalGames;
        closestRivalry = {
          owner1Id: owner1,
          owner1Name: mgr1.name,
          owner1Avatar: mgr1.avatar,
          owner2Id: owner2,
          owner2Name: mgr2.name,
          owner2Avatar: mgr2.avatar,
          owner1Wins: record.wins,
          owner2Wins: record.losses,
          marginDiff: diff,
        };
      }

      // Most one-sided check
      if (diff > maxDiff) {
        maxDiff = diff;
        mostOneSided = {
          owner1Id: owner1,
          owner1Name: mgr1.name,
          owner1Avatar: mgr1.avatar,
          owner2Id: owner2,
          owner2Name: mgr2.name,
          owner2Avatar: mgr2.avatar,
          owner1Wins: record.wins,
          owner2Wins: record.losses,
          marginDiff: diff,
          leaderId: record.wins >= record.losses ? owner1 : owner2,
        };
      }
    });
  });

  // Calculate active streak
  let activeStreak: RivalrySummary | null = null;
  let maxStreak = 0;

  pairsSeen.forEach(pairKey => {
    const [idA, idB] = pairKey.split('::');
    const logs = getMatchupHistoryBetween(matchupList, idA, idB);
    if (logs.length === 0) return;

    // Logs are sorted newest to oldest
    const latestWinner = logs[0].winnerId;
    if (latestWinner === 'tie') return;

    let streak = 0;
    for (const log of logs) {
      if (log.winnerId === latestWinner) streak++;
      else break;
    }

    if (streak >= 3 && streak > maxStreak) {
      maxStreak = streak;
      const loserId = latestWinner === idA ? idB : idA;
      const winner = managerMap[latestWinner] || { name: 'Winner', avatar: null };
      const loser = managerMap[loserId] || { name: 'Opponent', avatar: null };

      activeStreak = {
        owner1Id: latestWinner,
        owner1Name: winner.name,
        owner1Avatar: winner.avatar,
        owner2Id: loserId,
        owner2Name: loser.name,
        owner2Avatar: loser.avatar,
        owner1Wins: streak,
        owner2Wins: 0,
        streak,
        leaderId: latestWinner,
      };
    }
  });

  return { closestRivalry, mostOneSided, activeStreak };
}
