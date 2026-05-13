import { readFileSync } from 'fs';

function getOptimalLineupPoints(players: string[], playersPoints: Record<string, number>, rosterPositions: string[], playersData: any): number {
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
}

async function test() {
  const url = "https://api.sleeper.app/v1/league/1257065753383800832/matchups/5"; 
  const res = await fetch(url);
  const data = await res.json();
  const matchup = data[0];
  
  const playersDataRes = await fetch("https://api.sleeper.app/v1/players/nfl");
  const playersData = await playersDataRes.json();
  
  const rosterPositions = [
    'QB',   'RB', 'WR',
    'WR',   'TE', 'FLEX',
    'FLEX', 'K',  'DL',
    'LB',   'DB', 'IDP_FLEX',
    'BN',   'BN', 'BN',
    'BN',   'BN'
  ];
  
  const optimal = getOptimalLineupPoints(matchup.players, matchup.players_points, rosterPositions, playersData);
  console.log("Actual points:", matchup.points);
  console.log("Optimal points:", optimal);
}
test();
