import re

with open("src/pages/Trades.tsx", "r") as f:
    content = f.read()

# Replace the text
old_text_added = "<>You won this matchup by <span style={{ fontWeight: 600 }}>{fm.actualMargin.toFixed(1)} pts</span>. Without your trades, you would have scored <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>{Math.abs(fm.hypotheticalMargin).toFixed(1)} pts LESS</span> than your opponent, resulting in a loss.</>"
new_text_added = "<>You won this matchup by <span style={{ fontWeight: 600 }}>{fm.actualMargin.toFixed(1)} pts</span>. Without your trades, you would have scored <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>{Math.abs(fm.actualMargin - fm.hypotheticalMargin).toFixed(1)} fewer points</span>, resulting in a loss.</>"

old_text_lost = "<>You lost this matchup by <span style={{ fontWeight: 600 }}>{Math.abs(fm.actualMargin).toFixed(1)} pts</span>. Without your trades, you would have scored <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>{fm.hypotheticalMargin.toFixed(1)} pts MORE</span> than your opponent, resulting in a win.</>"
new_text_lost = "<>You lost this matchup by <span style={{ fontWeight: 600 }}>{Math.abs(fm.actualMargin).toFixed(1)} pts</span>. Without your trades, you would have scored <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>{Math.abs(fm.actualMargin - fm.hypotheticalMargin).toFixed(1)} more points</span>, resulting in a win.</>"

content = content.replace(old_text_added, new_text_added)
content = content.replace(old_text_lost, new_text_lost)

with open("src/pages/Trades.tsx", "w") as f:
    f.write(content)

