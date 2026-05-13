import re

with open("src/pages/Trades.tsx", "r") as f:
    content = f.read()

# 1. Add useState to imports
if "useState" not in content:
    content = content.replace("import React from 'react';", "import React, { useState } from 'react';")

# 2. Add flippedMatchups to matchupsFlippedData
old_map = """    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      Added: d.totalMatchupsFlippedAdded || 0,
      Lost: d.totalMatchupsFlippedLost || 0
    }));"""
new_map = """    .map(d => ({
      name: d.user?.display_name || `Team ${d.roster_id}`,
      rosterId: d.roster_id,
      Added: d.totalMatchupsFlippedAdded || 0,
      Lost: d.totalMatchupsFlippedLost || 0,
      flippedMatchups: d.flippedMatchups || []
    }));"""
content = content.replace(old_map, new_map)

# 3. Add useState for selectedDrilldown inside the component
if "const [selectedDrilldown" not in content:
    content = content.replace("export const Trades: React.FC = () => {", "export const Trades: React.FC = () => {\n  const [selectedDrilldown, setSelectedDrilldown] = useState<any>(null);")

# 4. Add onClick and cursor to the bars
content = content.replace('<Bar dataKey="Added" fill="var(--success-color)" radius={[0, 4, 4, 0]} />', '<Bar dataKey="Added" fill="var(--success-color)" radius={[0, 4, 4, 0]} onClick={(data) => setSelectedDrilldown(data.payload || data)} style={{ cursor: "pointer" }} />')
content = content.replace('<Bar dataKey="Lost" fill="var(--danger-color)" radius={[0, 4, 4, 0]} />', '<Bar dataKey="Lost" fill="var(--danger-color)" radius={[0, 4, 4, 0]} onClick={(data) => setSelectedDrilldown(data.payload || data)} style={{ cursor: "pointer" }} />')

# 5. Add Modal JSX at the end of the return
modal_jsx = """      {/* Drill-down Modal */}
      {selectedDrilldown && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '2rem' }} onClick={() => setSelectedDrilldown(null)}>
          <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Flipped Matchups: {selectedDrilldown.name}</h2>
              <button onClick={() => setSelectedDrilldown(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            
            {selectedDrilldown.flippedMatchups && selectedDrilldown.flippedMatchups.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[...selectedDrilldown.flippedMatchups].sort((a, b) => a.week - b.week).map((fm: any, idx: number) => {
                  const oppName = selectedSeason?.rosterToUser[fm.oppRosterId]?.display_name || `Team ${fm.oppRosterId}`;
                  const isAdded = fm.type === 'added';
                  return (
                    <div key={idx} style={{ background: isAdded ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${isAdded ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`, borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isAdded ? 'var(--success-color)' : 'var(--danger-color)', backgroundColor: isAdded ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                            {isAdded ? '+ WIN ADDED' : '- WIN LOST'}
                          </span>
                          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>Week {fm.week}</span>
                        </div>
                        <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>vs <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{oppName}</span></span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                        {isAdded ? (
                          <>You won this matchup by <span style={{ fontWeight: 600 }}>{fm.actualMargin.toFixed(1)} pts</span>. Without your trades, you would have scored <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>{Math.abs(fm.hypotheticalMargin).toFixed(1)} pts LESS</span> than your opponent, resulting in a loss.</>
                        ) : (
                          <>You lost this matchup by <span style={{ fontWeight: 600 }}>{Math.abs(fm.actualMargin).toFixed(1)} pts</span>. Without your trades, you would have scored <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>{fm.hypotheticalMargin.toFixed(1)} pts MORE</span> than your opponent, resulting in a win.</>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>No flipped matchups found for this manager.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};"""

content = content.replace("    </div>\n  );\n};", modal_jsx)

with open("src/pages/Trades.tsx", "w") as f:
    f.write(content)
