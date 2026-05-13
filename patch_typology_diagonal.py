import re

with open("src/pages/Trades.tsx", "r") as f:
    content = f.read()

# Add maxTypologyVal calculation
old_calc = "  const medReceived = getMedian(typologyData.map(d => d.received));"
new_calc = """  const medReceived = getMedian(typologyData.map(d => d.received));
  
  const maxTypologyVal = Math.max(
    ...typologyData.flatMap(d => [d.given, d.received]),
    10
  );"""
content = content.replace(old_calc, new_calc)

# Replace ReferenceLines with Scatter line
old_lines = """                <Scatter name="Teams" data={typologyData} shape={<CustomAvatarDot />} />
                <ReferenceLine x={medGiven} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                <ReferenceLine y={medReceived} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />"""
new_lines = """                <Scatter
                  name="Breakeven"
                  data={[{ given: 0, received: 0 }, { given: maxTypologyVal, received: maxTypologyVal }]}
                  line={{ stroke: 'rgba(255,255,255,0.25)', strokeDasharray: '5 5', strokeWidth: 1.5 }}
                  shape={() => null}
                  legendType="none"
                  tooltipType="none"
                />
                <Scatter name="Teams" data={typologyData} shape={<CustomAvatarDot />} />"""
content = content.replace(old_lines, new_lines)

# Also update the legend text since we are removing the 4 quadrants
old_legend = """              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '380px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '0 16px 8px 0', borderRight: '2px solid rgba(255,255,255,0.15)', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
                  📦 <strong style={{ color: '#fff', fontWeight: 500 }}>Depth Builders (Gave 1, Got 3)</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '0 0 8px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
                  🎲 <strong style={{ color: '#fff', fontWeight: 500 }}>High Rollers (Gave 3, Got 3)</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '8px 16px 0 0', borderRight: '2px solid rgba(255,255,255,0.15)' }}>
                  👀 <strong style={{ color: '#fff', fontWeight: 500 }}>Window Shoppers</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '8px 0 0 16px' }}>
                  💎 <strong style={{ color: '#fff', fontWeight: 500 }}>Consolidators (Gave 3, Got 1)</strong>
                </div>
              </div>"""

new_legend = """              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📦 <strong style={{ color: '#fff', fontWeight: 500 }}>Depth Builders</strong> (Above Line)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💎 <strong style={{ color: '#fff', fontWeight: 500 }}>Consolidators</strong> (Below Line)
                </div>
              </div>"""
content = content.replace(old_legend, new_legend)

with open("src/pages/Trades.tsx", "w") as f:
    f.write(content)

