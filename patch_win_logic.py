import re

with open("src/hooks/useTradeEfficiency.ts", "r") as f:
    content = f.read()

new_logic = """              const hypotheticalOptimal = getOptimalLineupPoints(hypotheticalPlayers, hypotheticalPoints, selectedSeason.league.roster_positions || [], playersData);
              
              const actualMargin = myMatchup.points - oppMatchup.points;
              const optimalDelta = actualOptimal - hypotheticalOptimal;
              const hypotheticalMargin = actualMargin - optimalDelta;
              
              const s = record.sides.find(s => s.rosterId === rosterId);
              if (s) {
                // If we won reality, but would have lost hypothetically -> Trade Added a Win
                if (actualMargin > 0 && hypotheticalMargin <= 0) s.matchupsFlippedAdded += 1;
                // If we lost reality, but would have won hypothetically -> Trade Lost a Win
                else if (actualMargin <= 0 && hypotheticalMargin > 0) s.matchupsFlippedLost += 1;
              }"""

old_logic = """              const hypotheticalOptimal = getOptimalLineupPoints(hypotheticalPlayers, hypotheticalPoints, selectedSeason.league.roster_positions || [], playersData);
              
              const actualWin = actualOptimal > oppOptimal;
              const hypoWin = hypotheticalOptimal > oppOptimal;
              
              const s = record.sides.find(s => s.rosterId === rosterId);
              if (s) {
                if (actualWin && !hypoWin) s.matchupsFlippedAdded += 1;
                else if (!actualWin && hypoWin) s.matchupsFlippedLost += 1;
              }"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open("src/hooks/useTradeEfficiency.ts", "w") as f:
        f.write(content)
    print("Patched successfully!")
else:
    print("Old logic not found!")
