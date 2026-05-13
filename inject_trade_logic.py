import re

with open("src/hooks/useTradeEfficiency.ts", "r") as f:
    lines = f.readlines()

# 1. Find where to inject avgPointsBeforeTrade and avgPointsAfterTrade calculation
# Inside: side.received.forEach(asset => {
# Right before: for (let w = week; w <= 18; w++) {
idx_received = -1
for i, line in enumerate(lines):
    if "side.received.forEach(asset => {" in line:
        idx_received = i
        break

if idx_received > -1:
    idx_target = -1
    for i in range(idx_received, idx_received + 20):
        if "for (let w = week; w <= 18; w++) {" in lines[i]:
            idx_target = i
            break
    
    if idx_target > -1:
        injection = """
              if (!asset.isPick && asset.position !== 'FAAB') {
                let ptsBefore = 0;
                let weeksBefore = week - 1;
                for (let w = 1; w < week; w++) {
                  const matchups = weeksData[w - 1]?.[1] || [];
                  let foundPts = 0;
                  matchups.forEach((m: any) => {
                    const playersPoints = m.players_points || {};
                    if (playersPoints[asset.playerId] !== undefined) {
                      foundPts = Number(playersPoints[asset.playerId]);
                    }
                  });
                  ptsBefore += foundPts;
                }
                asset.avgPointsBeforeTrade = weeksBefore > 0 ? Number((ptsBefore / weeksBefore).toFixed(2)) : 0;

                let ptsAfter = 0;
                let weeksAfter = 18 - week + 1;
                for (let w = week; w <= 18; w++) {
                  const matchups = weeksData[w - 1]?.[1] || [];
                  let foundPts = 0;
                  matchups.forEach((m: any) => {
                    const playersPoints = m.players_points || {};
                    if (playersPoints[asset.playerId] !== undefined) {
                      foundPts = Number(playersPoints[asset.playerId]);
                    }
                  });
                  ptsAfter += foundPts;
                }
                asset.avgPointsAfterTrade = weeksAfter > 0 ? Number((ptsAfter / weeksAfter).toFixed(2)) : 0;
              }
"""
        lines.insert(idx_target, injection)

# 2. Inject optimal Matchups Flipped Logic
# Right after: record.sides.push({ ... }); });
idx_push = -1
for i, line in enumerate(lines):
    if "record.sides.push({" in line:
        # find the closing bracket
        for j in range(i, i+15):
            if "});" in lines[j] and "rosterId" in lines[j-4]: # very specific
                idx_push = j
                break
        if idx_push > -1:
            break

if idx_push > -1:
    # Need to go one line down to exit the push block, and one more to exit the forEach
    idx_inject_flipped = idx_push + 2
    
    injection_flipped = """
          // Calculate Matchups Flipped
          Object.entries(rosterSides).forEach(([rosterIdStr, side]) => {
            const rosterId = Number(rosterIdStr);
            for (let w = week; w <= 18; w++) {
              const matchups = weeksData[w - 1]?.[1] || [];
              const myMatchup = matchups.find((m: any) => m.roster_id === rosterId);
              if (!myMatchup) continue;
              
              const oppMatchup = matchups.find((m: any) => m.matchup_id === myMatchup.matchup_id && m.roster_id !== rosterId);
              if (!oppMatchup) continue;
              
              if (myMatchup.points === 0 && oppMatchup.points === 0) continue;
              
              const actualOptimal = getOptimalLineupPoints(myMatchup.players || [], myMatchup.players_points || {}, selectedSeason.league.roster_positions || [], playersData);
              const oppOptimal = getOptimalLineupPoints(oppMatchup.players || [], oppMatchup.players_points || {}, selectedSeason.league.roster_positions || [], playersData);
              
              const hypotheticalPlayers = [...(myMatchup.players || [])];
              side.received.forEach(asset => {
                const idx = hypotheticalPlayers.indexOf(asset.playerId);
                if (idx > -1) hypotheticalPlayers.splice(idx, 1);
              });
              side.gave.forEach(asset => {
                if (!asset.isPick && asset.position !== 'FAAB' && !hypotheticalPlayers.includes(asset.playerId)) {
                  hypotheticalPlayers.push(asset.playerId);
                }
              });
              
              const hypotheticalPoints = { ...(myMatchup.players_points || {}) };
              side.gave.forEach(asset => {
                let pts = 0;
                matchups.forEach((m: any) => {
                  if (m.players_points && m.players_points[asset.playerId] !== undefined) {
                    pts = m.players_points[asset.playerId];
                  }
                });
                hypotheticalPoints[asset.playerId] = pts;
              });
              
              const hypotheticalOptimal = getOptimalLineupPoints(hypotheticalPlayers, hypotheticalPoints, selectedSeason.league.roster_positions || [], playersData);
              
              const actualWin = actualOptimal > oppOptimal;
              const hypoWin = hypotheticalOptimal > oppOptimal;
              
              const s = record.sides.find(s => s.rosterId === rosterId);
              if (s) {
                if (actualWin && !hypoWin) s.optimalMatchupsFlipped += 1;
                else if (!actualWin && hypoWin) s.optimalMatchupsFlipped -= 1;
              }
            }
          });
"""
    lines.insert(idx_inject_flipped, injection_flipped)


# 3. Aggregate stats in the final loop
# Inside: tradeRecords.forEach(record => {
# Right after: rd.totalTrades++;
idx_total_trades = -1
for i, line in enumerate(lines):
    if "rd.totalTrades++;" in line:
        idx_total_trades = i
        break

if idx_total_trades > -1:
    injection_aggregate = """
              rd.totalAssetsGiven += side.gave.filter(a => a.position !== 'FAAB').length;
              rd.totalAssetsReceived += side.received.filter(a => a.position !== 'FAAB').length;
              if (side.optimalMatchupsFlipped > 0) {
                rd.totalMatchupsFlippedAdded += side.optimalMatchupsFlipped;
              } else if (side.optimalMatchupsFlipped < 0) {
                rd.totalMatchupsFlippedLost += Math.abs(side.optimalMatchupsFlipped);
              }
"""
    lines.insert(idx_total_trades + 1, injection_aggregate)

with open("src/hooks/useTradeEfficiency.ts", "w") as f:
    f.writelines(lines)
    
print("Injection complete.")
