export interface OptimalLineupResult {
  totalPoints: number;
  optimalStarters: { id: string, pts: number, pos: string, fantasyPos: string[], rosterSlot: string }[];
}

export function calculateWeeklyReplacementBaselines(matchups: any[], playersMap: any): Record<string, number> {
  const starterScores: Record<string, number[]> = {};
  const benchScores: Record<string, number[]> = {};

  matchups.forEach(m => {
    const starters = new Set(m.starters);
    const playersPoints = m.players_points || {};
    
    (m.players || []).forEach((pid: string) => {
      const isStarter = starters.has(pid);
      const pts = Number(playersPoints[pid]) || 0;
      
      if (pts <= 0) return;
      
      const pData = playersMap[pid];
      if (pData) {
        const primaryPos = pData.position || '??';
        if (isStarter) {
          if (!starterScores[primaryPos]) starterScores[primaryPos] = [];
          starterScores[primaryPos].push(pts);
        } else {
          if (!benchScores[primaryPos]) benchScores[primaryPos] = [];
          benchScores[primaryPos].push(pts);
        }
      }
    });
  });

  const baselines: Record<string, number> = {};
  const allPositions = new Set([...Object.keys(starterScores), ...Object.keys(benchScores)]);

  allPositions.forEach(pos => {
    const bScores = benchScores[pos] || [];
    const sScores = starterScores[pos] || [];

    if (bScores.length > 0) {
      const avg = bScores.reduce((sum, val) => sum + val, 0) / bScores.length;
      baselines[pos] = Number(avg.toFixed(2));
    } else if (sScores.length > 0) {
      sScores.sort((a, b) => a - b);
      const bottomCount = Math.max(1, Math.floor(sScores.length * 0.25));
      const bottomScores = sScores.slice(0, bottomCount);
      const avg = bottomScores.reduce((sum, val) => sum + val, 0) / bottomScores.length;
      baselines[pos] = Number(avg.toFixed(2));
    } else {
      baselines[pos] = 0;
    }
  });

  return baselines;
}

export function getOptimalLineupPoints(
  players: string[], 
  playersPoints: Record<string, number>, 
  rosterPositions: string[], 
  playersData: any, 
  forcedStarters: string[] = [],
  replacementBaselines?: Record<string, number>
): OptimalLineupResult {
  if (!players || players.length === 0) return { totalPoints: 0, optimalStarters: [] };
  
  const availablePlayers = players.map(pid => {
    const pData = playersData[pid] || {};
    const fantasyPos = pData.fantasy_positions || [pData.position];
    return {
      id: pid,
      pts: Number(playersPoints[pid]) || 0,
      pos: pData.position || '??',
      fantasyPos: fantasyPos
    };
  }).sort((a, b) => {
    const aForced = forcedStarters.includes(a.id);
    const bForced = forcedStarters.includes(b.id);
    if (aForced && !bForced) return -1;
    if (!aForced && bForced) return 1;
    return b.pts - a.pts;
  });

  let totalPoints = 0;
  const usedPlayerIds = new Set<string>();
  const optimalStarters: { id: string, pts: number, pos: string, fantasyPos: string[], rosterSlot: string }[] = [];

  const useBestPlayer = (validPositions: string[], isIdpFlex = false, slotName: string) => {
    for (const p of availablePlayers) {
      if (!usedPlayerIds.has(p.id)) {
        if (p.pts <= 0 && !forcedStarters.includes(p.id)) continue;

        if (isIdpFlex && p.fantasyPos.some((fp: string) => ['DL', 'LB', 'DB'].includes(fp))) {
          usedPlayerIds.add(p.id);
          totalPoints += p.pts;
          optimalStarters.push({ ...p, rosterSlot: slotName });
          return true;
        }
        if (p.fantasyPos.some((fp: string) => validPositions.includes(fp)) || validPositions.includes(p.pos)) {
          usedPlayerIds.add(p.id);
          totalPoints += p.pts;
          optimalStarters.push({ ...p, rosterSlot: slotName });
          return true;
        }
      }
    }
    return false;
  };

  const standardSlots = rosterPositions.filter(p => !['BN', 'IR', 'TAXI'].includes(p));
  const strictSlots = standardSlots.filter(p => !['FLEX', 'SUPER_FLEX', 'REC_FLEX', 'WRRB_FLEX', 'IDP_FLEX', 'IDP'].includes(p));
  const idpSlots = standardSlots.filter(p => p === 'IDP');
  const flexSlots = standardSlots.filter(p => ['FLEX', 'SUPER_FLEX', 'REC_FLEX', 'WRRB_FLEX', 'IDP_FLEX'].includes(p));

  // Process strictly required slots first, in the order they appear
  strictSlots.forEach(slotPos => {
    const filled = useBestPlayer([slotPos], false, slotPos);
    if (!filled && replacementBaselines) {
      const fallbackPts = replacementBaselines[slotPos] || 0;
      totalPoints += fallbackPts;
      optimalStarters.push({ id: `REP_${slotPos}`, pts: fallbackPts, pos: slotPos, fantasyPos: [slotPos], rosterSlot: slotPos });
    }
  });

  idpSlots.forEach(() => {
    const filled = useBestPlayer([], true, 'IDP');
    if (!filled && replacementBaselines) {
       const validPos = ['DL', 'LB', 'DB'];
       let maxFallback = 0;
       let maxPos = 'IDP';
       validPos.forEach(pos => {
         if ((replacementBaselines[pos] || 0) > maxFallback) {
             maxFallback = replacementBaselines[pos];
             maxPos = pos;
         }
       });
       totalPoints += maxFallback;
       optimalStarters.push({ id: `REP_${maxPos}`, pts: maxFallback, pos: maxPos, fantasyPos: [maxPos], rosterSlot: 'IDP' });
    }
  });

  flexSlots.forEach(flexType => {
    let validPos: string[] = [];
    if (flexType === 'FLEX') validPos = ['RB', 'WR', 'TE'];
    else if (flexType === 'SUPER_FLEX') validPos = ['QB', 'RB', 'WR', 'TE'];
    else if (flexType === 'REC_FLEX') validPos = ['WR', 'TE'];
    else if (flexType === 'WRRB_FLEX') validPos = ['WR', 'RB'];
    
    let filled = false;
    if (flexType === 'IDP_FLEX') {
      filled = useBestPlayer([], true, flexType);
      validPos = ['DL', 'LB', 'DB'];
    } else {
      filled = useBestPlayer(validPos, false, flexType);
    }
    
    if (!filled && replacementBaselines) {
      let maxFallback = 0;
      let maxPos = validPos[0] || 'FLEX';
      validPos.forEach(pos => {
         if ((replacementBaselines[pos] || 0) > maxFallback) {
             maxFallback = replacementBaselines[pos];
             maxPos = pos;
         }
      });
      totalPoints += maxFallback;
      optimalStarters.push({ id: `REP_${maxPos}`, pts: maxFallback, pos: maxPos, fantasyPos: [maxPos], rosterSlot: flexType });
    }
  });

  // Re-sort optimalStarters to match the order of rosterPositions as much as possible
  const sortedOptimal: typeof optimalStarters = [];
  const remainingStarters = [...optimalStarters];
  
  rosterPositions.filter(p => !['BN', 'IR', 'TAXI'].includes(p)).forEach(slot => {
     const idx = remainingStarters.findIndex(s => s.rosterSlot === slot);
     if (idx > -1) {
         sortedOptimal.push(remainingStarters[idx]);
         remainingStarters.splice(idx, 1);
     }
  });
  
  // push any remaining (shouldn't happen, but just in case)
  sortedOptimal.push(...remainingStarters);

  return {
    totalPoints: Number(totalPoints.toFixed(2)),
    optimalStarters: sortedOptimal
  };
}
