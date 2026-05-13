import re

with open("src/hooks/useTradeEfficiency.ts", "r") as f:
    content = f.read()

# 1. Add FlippedMatchup interface
flipped_matchup_interface = """export interface FlippedMatchup {
  week: number;
  type: 'added' | 'lost';
  actualMargin: number;
  hypotheticalMargin: number;
  oppRosterId: number;
}

export interface TradeEfficiencyResult {"""
content = content.replace("export interface TradeEfficiencyResult {", flipped_matchup_interface)

# 2. Add flippedMatchups to TradeEfficiencyResult
content = content.replace("totalMatchupsFlippedLost: number;", "totalMatchupsFlippedLost: number;\n  flippedMatchups: FlippedMatchup[];")

# 3. Add flippedMatchups to TradeRecord side
content = content.replace("matchupsFlippedLost: number", "matchupsFlippedLost: number;\n    flippedMatchups: FlippedMatchup[];")

# 4. Initialize it in the rd object
content = content.replace("totalMatchupsFlippedLost: 0,", "totalMatchupsFlippedLost: 0,\n            flippedMatchups: [],")

# 5. Initialize it in the record side
content = content.replace("matchupsFlippedLost: 0", "matchupsFlippedLost: 0,\n              flippedMatchups: []")

# 6. Push to flippedMatchups in the actualWin && !hypoWin logic
old_logic = """                // If we won reality, but would have lost hypothetically -> Trade Added a Win
                if (actualMargin > 0 && hypotheticalMargin <= 0) s.matchupsFlippedAdded += 1;
                // If we lost reality, but would have won hypothetically -> Trade Lost a Win
                else if (actualMargin <= 0 && hypotheticalMargin > 0) s.matchupsFlippedLost += 1;"""

new_logic = """                // If we won reality, but would have lost hypothetically -> Trade Added a Win
                if (actualMargin > 0 && hypotheticalMargin <= 0) {
                  s.matchupsFlippedAdded += 1;
                  s.flippedMatchups.push({ week: w, type: 'added', actualMargin, hypotheticalMargin, oppRosterId: oppMatchup.roster_id });
                }
                // If we lost reality, but would have won hypothetically -> Trade Lost a Win
                else if (actualMargin <= 0 && hypotheticalMargin > 0) {
                  s.matchupsFlippedLost += 1;
                  s.flippedMatchups.push({ week: w, type: 'lost', actualMargin, hypotheticalMargin, oppRosterId: oppMatchup.roster_id });
                }"""
content = content.replace(old_logic, new_logic)

# 7. Aggregate flippedMatchups into rd object
old_agg = """              rd.totalMatchupsFlippedAdded += side.matchupsFlippedAdded;
              rd.totalMatchupsFlippedLost += side.matchupsFlippedLost;"""

new_agg = """              rd.totalMatchupsFlippedAdded += side.matchupsFlippedAdded;
              rd.totalMatchupsFlippedLost += side.matchupsFlippedLost;
              if (side.flippedMatchups) rd.flippedMatchups.push(...side.flippedMatchups);"""
content = content.replace(old_agg, new_agg)

with open("src/hooks/useTradeEfficiency.ts", "w") as f:
    f.write(content)
