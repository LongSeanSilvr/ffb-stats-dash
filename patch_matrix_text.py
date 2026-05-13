import re

with open("src/pages/Trades.tsx", "r") as f:
    content = f.read()

old_text = """        <Card title="The Market Timing Matrix" className="stagger-2">
          <div style={{ fontSize: "0.875rem", marginBottom: "1rem" }} className="text-muted">
            <span className="block text-xs opacity-75 mt-2">Did you buy low or sell high? Compares a player's avg production BEFORE the trade vs AFTER.</span>
            <span className="block text-xs opacity-75 mt-2"><strong style={{ color: '#fff', fontWeight: 500 }}>Above Line (Breakout):</strong> Acquired before an upward trend. <strong style={{ color: '#fff', fontWeight: 500 }}>Below Line (Regression):</strong> Traded away before a downward trend.</span>
          </div>"""

new_text = """        <Card title="The Market Timing Matrix" className="stagger-2">
          <div style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }} className="text-muted">
            <div style={{ marginBottom: "12px", opacity: 0.85, lineHeight: "1.5" }}>
              Did you buy low or sell high? Compares a player's avg production BEFORE the trade vs AFTER.
            </div>
            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--success-color)', fontSize: '1rem' }}>📈</span> <strong style={{ color: '#f8fafc', fontWeight: 500 }}>Above Line (Breakout):</strong> Acquired before an upward trend
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--danger-color)', fontSize: '1rem' }}>📉</span> <strong style={{ color: '#f8fafc', fontWeight: 500 }}>Below Line (Regression):</strong> Traded away before a downward trend
              </div>
            </div>
          </div>"""

if old_text in content:
    content = content.replace(old_text, new_text)
    with open("src/pages/Trades.tsx", "w") as f:
        f.write(content)
    print("Patched Successfully!")
else:
    print("Old text not found!")

