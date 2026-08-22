import type { ManagerScore, SuperlativeBadge } from '../types/recordBook';

export function calculateStdDev(values: number[]): number {
  if (!values || values.length <= 1) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

export function computeSuperlatives(managers: ManagerScore[]): SuperlativeBadge[] {
  if (!managers || managers.length === 0) return [];

  const badges: SuperlativeBadge[] = [];

  // 1. Most Consistent (Lowest Finish StdDev, min 2 seasons)
  const multiSeason = managers.filter(m => m.finishes && m.finishes.length > 1);
  if (multiSeason.length > 0) {
    const withStdDev = multiSeason.map(m => ({
      manager: m,
      stdDev: calculateStdDev(m.finishes),
    }));

    const mostConsistent = withStdDev.reduce((min, cur) => cur.stdDev < min.stdDev ? cur : min, withStdDev[0]);
    badges.push({
      id: 'most-consistent',
      title: 'Most Consistent Finishes',
      category: 'consistency',
      managerId: mostConsistent.manager.ownerId,
      managerName: mostConsistent.manager.managerName,
      avatar: mostConsistent.manager.avatar,
      highlightValue: `±${mostConsistent.stdDev.toFixed(1)} Spots`,
      subtext: `Average Finish: ${mostConsistent.manager.averageFinish.toFixed(1)}`,
      iconName: 'TrendingUp',
    });

    const mostVolatile = withStdDev.reduce((max, cur) => cur.stdDev > max.stdDev ? cur : max, withStdDev[0]);
    badges.push({
      id: 'most-volatile',
      title: 'Most Volatile Finishes',
      category: 'consistency',
      managerId: mostVolatile.manager.ownerId,
      managerName: mostVolatile.manager.managerName,
      avatar: mostVolatile.manager.avatar,
      highlightValue: `±${mostVolatile.stdDev.toFixed(1)} Spots`,
      subtext: `Best: ${mostVolatile.manager.bestFinish} | Worst: ${mostVolatile.manager.worstFinish}`,
      iconName: 'Activity',
    });
  }

  // 2. Biggest One-Year Jump
  const withJumps = managers.filter(m => m.biggestSeasonJump > 0);
  if (withJumps.length > 0) {
    const biggestJump = withJumps.reduce((max, cur) => cur.biggestSeasonJump > max.biggestSeasonJump ? cur : max, withJumps[0]);
    badges.push({
      id: 'biggest-jump',
      title: 'Biggest One-Year Jump',
      category: 'trend',
      managerId: biggestJump.ownerId,
      managerName: biggestJump.managerName,
      avatar: biggestJump.avatar,
      highlightValue: `+${biggestJump.biggestSeasonJump} Spots`,
      subtext: `Best single-season turnaround`,
      iconName: 'ArrowUpRight',
    });
  }

  // 3. Schedule Difficulty (Lowest & Highest Points Against Per Game)
  const withSchedule = managers.filter(m => m.ptsAgainstPerGame > 0);
  if (withSchedule.length > 0) {
    const easiestSchedule = withSchedule.reduce((min, cur) => cur.ptsAgainstPerGame < min.ptsAgainstPerGame ? cur : min, withSchedule[0]);
    badges.push({
      id: 'easiest-schedule',
      title: 'Lowest Points Against',
      category: 'schedule',
      managerId: easiestSchedule.ownerId,
      managerName: easiestSchedule.managerName,
      avatar: easiestSchedule.avatar,
      highlightValue: `${easiestSchedule.ptsAgainstPerGame.toFixed(1)} PPG`,
      subtext: `Easiest opposing schedule all-time`,
      iconName: 'ShieldCheck',
    });

    const toughestSchedule = withSchedule.reduce((max, cur) => cur.ptsAgainstPerGame > max.ptsAgainstPerGame ? cur : max, withSchedule[0]);
    badges.push({
      id: 'toughest-schedule',
      title: 'Highest Points Against',
      category: 'schedule',
      managerId: toughestSchedule.ownerId,
      managerName: toughestSchedule.managerName,
      avatar: toughestSchedule.avatar,
      highlightValue: `${toughestSchedule.ptsAgainstPerGame.toFixed(1)} PPG`,
      subtext: `Toughest opposing matchups all-time`,
      iconName: 'ShieldAlert',
    });
  }

  // 4. Playoff Overperformer vs Regular Season Specialist
  const playoffTeams = managers.filter(m => m.playoffAppearances > 0 && (m.playoffWins + m.playoffLosses) >= 2);
  if (playoffTeams.length > 0) {
    const playoffPerformer = playoffTeams.reduce((best, cur) => {
      const diff = cur.poWinPct - cur.winPercentage;
      const bestDiff = best.poWinPct - best.winPercentage;
      return diff > bestDiff ? cur : best;
    }, playoffTeams[0]);

    if (playoffPerformer.poWinPct > playoffPerformer.winPercentage) {
      badges.push({
        id: 'playoff-performer',
        title: 'Playoff Overperformer',
        category: 'clutch',
        managerId: playoffPerformer.ownerId,
        managerName: playoffPerformer.managerName,
        avatar: playoffPerformer.avatar,
        highlightValue: `${playoffPerformer.poWinPct.toFixed(1)}% Playoff`,
        subtext: `vs ${playoffPerformer.winPercentage.toFixed(1)}% Regular Season`,
        iconName: 'Trophy',
      });
    }
  }

  return badges;
}
