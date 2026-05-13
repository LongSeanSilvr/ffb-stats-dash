import re

with open("src/hooks/useTradeEfficiency.ts", "r") as f:
    content = f.read()

new_algo = """function getOptimalLineupPoints(players: string[], playersPoints: Record<string, number>, rosterPositions: string[], playersData: any): number {
  if (!players || players.length === 0) return 0;
  
  const availablePlayers = players.map(pid => {
    const pData = playersData[pid] || {};
    const fantasyPos = pData.fantasy_positions || [pData.position];
    return {
      id: pid,
      pts: Number(playersPoints[pid]) || 0,
      pos: pData.position || '??',
      fantasyPos: fantasyPos
    };
  }).sort((a, b) => b.pts - a.pts);

  let totalPoints = 0;
  const usedPlayerIds = new Set<string>();

  const useBestPlayer = (validPositions: string[], isIdpFlex = false) => {
    for (const p of availablePlayers) {
      if (!usedPlayerIds.has(p.id)) {
        if (isIdpFlex && p.fantasyPos.some((fp: string) => ['DL', 'LB', 'DB'].includes(fp))) {
          usedPlayerIds.add(p.id);
          totalPoints += p.pts;
          return true;
        }
        if (p.fantasyPos.some((fp: string) => validPositions.includes(fp)) || validPositions.includes(p.pos)) {
          usedPlayerIds.add(p.id);
          totalPoints += p.pts;
          return true;
        }
      }
    }
    return false;
  };

  const standardSlots = rosterPositions.filter(p => !['BN', 'IR', 'TAXI', 'FLEX', 'SUPER_FLEX', 'REC_FLEX', 'WRRB_FLEX', 'IDP_FLEX'].includes(p));
  const flexSlots = rosterPositions.filter(p => ['FLEX', 'SUPER_FLEX', 'REC_FLEX', 'WRRB_FLEX', 'IDP_FLEX'].includes(p));

  const idpSlots = standardSlots.filter(p => p === 'IDP');
  const strictSlots = standardSlots.filter(p => p !== 'IDP');

  strictSlots.forEach(slotPos => {
    useBestPlayer([slotPos]);
  });

  idpSlots.forEach(() => {
    useBestPlayer([], true);
  });

  flexSlots.forEach(flexType => {
    if (flexType === 'FLEX') useBestPlayer(['RB', 'WR', 'TE']);
    else if (flexType === 'SUPER_FLEX') useBestPlayer(['QB', 'RB', 'WR', 'TE']);
    else if (flexType === 'REC_FLEX') useBestPlayer(['WR', 'TE']);
    else if (flexType === 'WRRB_FLEX') useBestPlayer(['WR', 'RB']);
    else if (flexType === 'IDP_FLEX') useBestPlayer([], true);
  });

  return Number(totalPoints.toFixed(2));
}"""

# Find the old function
start_idx = content.find("function getOptimalLineupPoints")
end_idx = content.find("export function useTradeEfficiency")
if start_idx > -1 and end_idx > -1:
    content = content[:start_idx] + new_algo + "\n\n" + content[end_idx:]
    with open("src/hooks/useTradeEfficiency.ts", "w") as f:
        f.write(content)
