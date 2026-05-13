import re

with open("src/pages/Trades.tsx", "r") as f:
    content = f.read()

old_text = """          <div className="text-sm text-muted mb-4 flex flex-col gap-2">
            <span>Every trade this season, evaluated by post-trade starter performance.</span>
            <span className="text-xs opacity-80 border-l-2 border-white/10 pl-3 py-1">
              <strong>How points are calculated:</strong><br />
              • <strong>Players:</strong> Points scored in active starting slots after the trade.<br />
              • <strong>Draft Picks:</strong> Points scored by the player eventually drafted with the pick (but only points scored in an active starting slot for the receiving manager before that player was traded/dropped). Future picks from upcoming drafts are estimated based on the average points scored by drafted players in that round during the current season.<br />
              • <strong>FAAB:</strong> Evaluated using overall League Average Points per FAAB Dollar for accounting. The (Est. Personal Value) displays the specific projected impact based on that individual manager's personal FAAB efficiency.<br />
            </span>
          </div>"""

new_text = """          <div style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }} className="text-muted">
            <div style={{ marginBottom: "16px", opacity: 0.85, lineHeight: "1.5" }}>
              Every trade this season, evaluated by post-trade starter performance.
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>How points are calculated</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1rem' }}>🏈</span> <strong style={{ color: '#f8fafc', fontWeight: 500 }}>Players</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>Points scored in active starting slots after the trade.</div>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1rem' }}>🎯</span> <strong style={{ color: '#f8fafc', fontWeight: 500 }}>Draft Picks</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>Points scored by the drafted player while starting for the receiving manager. Future picks use round averages.</div>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1rem' }}>💰</span> <strong style={{ color: '#f8fafc', fontWeight: 500 }}>FAAB</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>Evaluated using League Average Points per FAAB Dollar. Personal FAAB efficiency is used for projected impact.</div>
                </div>
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
