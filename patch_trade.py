import re

with open("src/hooks/useTradeEfficiency.ts", "r") as f:
    content = f.read()

# Replace optimalMatchupsFlipped with Added and Lost
content = content.replace("optimalMatchupsFlipped: 0", "matchupsFlippedAdded: 0,\n              matchupsFlippedLost: 0")
content = content.replace("if (actualWin && !hypoWin) s.optimalMatchupsFlipped += 1;", "if (actualWin && !hypoWin) s.matchupsFlippedAdded += 1;")
content = content.replace("else if (!actualWin && hypoWin) s.optimalMatchupsFlipped -= 1;", "else if (!actualWin && hypoWin) s.matchupsFlippedLost += 1;")

content = content.replace("""if (side.optimalMatchupsFlipped > 0) {
                rd.totalMatchupsFlippedAdded += side.optimalMatchupsFlipped;
              } else if (side.optimalMatchupsFlipped < 0) {
                rd.totalMatchupsFlippedLost += Math.abs(side.optimalMatchupsFlipped);
              }""", """rd.totalMatchupsFlippedAdded += side.matchupsFlippedAdded;
              rd.totalMatchupsFlippedLost += side.matchupsFlippedLost;""")

with open("src/hooks/useTradeEfficiency.ts", "w") as f:
    f.write(content)
