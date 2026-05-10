import React, { useState } from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { useFreeAgencyEfficiency, type AcqFilter, type FreeAgencyResult } from '../hooks/useFreeAgencyEfficiency';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Label, ReferenceLine
} from 'recharts';

// ─── Shared Components ──────────────────────────────────────────────────────

const ChartToggle = ({ value, onChange }: { value: AcqFilter; onChange: (v: AcqFilter) => void }) => (
  <div className="glass-toggle-container" style={{ width: 'fit-content' }}>
    <button onClick={() => onChange('all')} className={`glass-toggle-btn ${value === 'all' ? 'active' : ''}`}>All</button>
    <button onClick={() => onChange('faab')} className={`glass-toggle-btn ${value === 'faab' ? 'active' : ''}`}>FAAB</button>
    <button onClick={() => onChange('street')} className={`glass-toggle-btn ${value === 'street' ? 'active' : ''}`}>$0 Street</button>
  </div>
);

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 28;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  if (!cx || !cy) return null;
  return (
    <svg x={cx - size/2} y={cy - size/2} width={size} height={size}>
      <defs>
        <clipPath id={`clip-fa-${payload.name.replace(/\s/g, '')}`}>
          <circle cx={size/2} cy={size/2} r={size/2} />
        </clipPath>
      </defs>
      {avatarUrl
        ? <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#clip-fa-${payload.name.replace(/\s/g, '')})`} />
        : <circle cx={size/2} cy={size/2} r={size/2} fill="#475569" />
      }
    </svg>
  );
};

const SniperTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <div className="flex items-center gap-3 mb-2">
        {d.avatar
          ? <img src={`https://sleepercdn.com/avatars/thumbs/${d.avatar}`} alt="avatar" className="avatar" width={24} height={24} />
          : <div className="avatar bg-gray-600" style={{ width: 24, height: 24 }} />
        }
        <span className="font-bold text-lg">{d.name}</span>
      </div>
      <div className="text-sm text-muted">Total Pickups: <span className="text-white font-bold ml-1">{d.pickups}</span></div>
      <div className="text-sm text-muted">Points Generated: <span className="text-success-color font-bold ml-1">{d.points}</span></div>
      <div className="text-sm text-muted mt-2 border-t border-white/10 pt-2">Hit Probability: <span className="text-accent-color font-bold ml-1">{d.hitRate}%</span></div>
      <div className="text-xs text-muted">Hits vs 35th Percentile</div>
    </div>
  );
};

// ─── Data helpers ────────────────────────────────────────────────────────────

const getCenteredBounds = (values: number[], avg: number) => {
  if (!values.length) return [0, 100];
  const maxDev = Math.max(...values.map(v => Math.abs(v - avg)), avg * 0.1);
  return [Math.max(0, avg - maxDev * 1.3), avg + maxDev * 1.3];
};

const toScatter = (data: FreeAgencyResult[]) =>
  [...data].sort((a, b) => a.roster_id - b.roster_id).map(d => ({
    name: d.user?.display_name || `Team ${d.roster_id}`,
    avatar: d.user?.avatar,
    pickups: d.totalPickups,
    points: d.pointsGenerated,
    hitRate: d.hitRate,
    winPct: Number(d.winPct.toFixed(1))
  }));

const toPosData = (data: FreeAgencyResult[]) =>
  [...data].sort((a, b) => a.roster_id - b.roster_id).map(d => ({
  name: d.user?.display_name || `Team ${d.roster_id}`,
  QB:  Number((d.positionalPoints['QB']  || 0).toFixed(1)),
  RB:  Number((d.positionalPoints['RB']  || 0).toFixed(1)),
  WR:  Number((d.positionalPoints['WR']  || 0).toFixed(1)),
  TE:  Number((d.positionalPoints['TE']  || 0).toFixed(1)),
  K:   Number((d.positionalPoints['K']   || 0).toFixed(1)),
  DEF: Number((d.positionalPoints['DEF'] || 0).toFixed(1)),
  IDP: Number((d.positionalPoints['IDP'] || 0).toFixed(1)),
}));

// ─── Page ────────────────────────────────────────────────────────────────────

export const FreeAgency: React.FC = () => {
  const { selectedSeason } = useLeagueContext();
  const { views, topAssets, loading, error } = useFreeAgencyEfficiency();

  // Per-chart filter states — toggling never re-fetches
  const [macroFilter, setMacroFilter]   = useState<AcqFilter>('all');
  const [matrixFilter, setMatrixFilter] = useState<AcqFilter>('all');
  const [posFilter, setPosFilter]       = useState<AcqFilter>('all');
  const [hitFilter, setHitFilter]       = useState<AcqFilter>('all');
  const [ledgerFilter, setLedgerFilter] = useState<AcqFilter>('all');

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4">Analyzing the waiver wire...</div>
      </div>
    );
  }

  if (error || !selectedSeason) {
    return <div className="text-danger-color text-center p-10">Failed to load free agency data.</div>;
  }

  // Derived chart data — instant, no fetch
  const macroData  = toScatter(views[macroFilter]);
  const matrixData = toScatter(views[matrixFilter]);
  const posData    = toPosData(views[posFilter]);
  const hitData = [...views[hitFilter]].sort((a, b) => b.hitRate - a.hitRate);
  const ledger     = topAssets[ledgerFilter];

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);

  const avgPointsMacro  = avg(macroData.map(d => d.points));
  const avgWinPct       = avg(macroData.map(d => d.winPct));
  const avgPickups      = avg(matrixData.map(d => d.pickups));
  const avgPointsMatrix = avg(matrixData.map(d => d.points));

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl text-gradient mb-1">Waiver Wire & Talent Evaluation ({selectedSeason.league.season})</h1>
        <p className="text-muted text-sm">Each chart can be filtered independently — no re-fetch required.</p>
      </header>

      {/* Grid 1: Macro + Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

        <Card className="stagger-1">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-semibold">Waiver Points vs. Win Rate</h2>
            <ChartToggle value={macroFilter} onChange={setMacroFilter} />
          </div>
          <div className="text-xs text-muted mb-5">Acquisition points vs win %. Top-right = Kingmakers.</div>
          <div style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="points" name="Points" stroke="#94a3b8"
                  domain={getCenteredBounds(macroData.map(d => d.points), avgPointsMacro)} tick={{ fontSize: 12 }} allowDecimals={false}>
                  <Label value="Starter Points Generated" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.8rem' }} />
                </XAxis>
                <YAxis type="number" dataKey="winPct" name="Win %" stroke="#94a3b8"
                  domain={getCenteredBounds(macroData.map(d => d.winPct), avgWinPct)} tick={{ fontSize: 12 }} width={55} allowDecimals={false}>
                  <Label value="Win %" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.8rem' }} offset={10} />
                </YAxis>
                <ReferenceLine x={avgPointsMacro} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                <ReferenceLine y={avgWinPct} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Scatter name="Managers" data={macroData} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="stagger-1">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-semibold">Volume vs. Output</h2>
            <ChartToggle value={matrixFilter} onChange={setMatrixFilter} />
          </div>
          <div className="text-xs text-muted mb-5">Volume vs points. Bubble size = Hit Rate vs pos. baseline.</div>
          <div style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="pickups" name="Pickups" stroke="#94a3b8"
                  domain={getCenteredBounds(matrixData.map(d => d.pickups), avgPickups)} tick={{ fontSize: 12 }} allowDecimals={false}>
                  <Label value="Total Pickups" position="insideBottom" offset={-15} fill="#64748b" style={{ fontSize: '0.8rem' }} />
                </XAxis>
                <YAxis type="number" dataKey="points" name="Points" stroke="#94a3b8"
                  domain={getCenteredBounds(matrixData.map(d => d.points), avgPointsMatrix)} tick={{ fontSize: 12 }} width={55} allowDecimals={false}>
                  <Label value="Starter Points" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#64748b', fontSize: '0.8rem' }} offset={10} />
                </YAxis>
                <ZAxis type="number" dataKey="hitRate" range={[50, 600]} name="Hit Rate %" />
                <ReferenceLine x={avgPickups} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                <ReferenceLine y={avgPointsMatrix} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                <RechartsTooltip content={<SniperTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Managers" data={matrixData} shape={<CustomAvatarDot />} fill="#10b981" fillOpacity={0.2} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Grid 2: Positional + Hit Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

        <Card className="stagger-2">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-semibold">Points by Position</h2>
            <ChartToggle value={posFilter} onChange={setPosFilter} />
          </div>
          <div className="text-xs text-muted mb-5">Starter points generated per position from acquisitions.</div>
          <div style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={posData} layout="vertical" margin={{ left: 60, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false}>
                  <Label value="Starter Points" position="insideBottom" offset={-10} fill="#64748b" style={{ fontSize: '0.8rem' }} />
                </XAxis>
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
                <Bar dataKey="RB"  stackId="a" fill="#3b82f6" />
                <Bar dataKey="WR"  stackId="a" fill="#8b5cf6" />
                <Bar dataKey="TE"  stackId="a" fill="#ec4899" />
                <Bar dataKey="QB"  stackId="a" fill="#eab308" />
                <Bar dataKey="DEF" stackId="a" fill="#10b981" />
                <Bar dataKey="K"   stackId="a" fill="#f97316" />
                <Bar dataKey="IDP" stackId="a" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="stagger-2">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-semibold">Hit Rate vs. 35th Percentile</h2>
            <ChartToggle value={hitFilter} onChange={setHitFilter} />
          </div>
          <div className="text-xs text-muted mb-5">% of pickups above the 35th percentile weekly avg at their position.</div>
          <div style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hitData} layout="vertical" margin={{ left: 60, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%">
                  <Label value="Hit Probability (%)" position="insideBottom" offset={-10} fill="#64748b" style={{ fontSize: '0.8rem' }} />
                </XAxis>
                <YAxis type="category" dataKey="user.display_name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value}%`, 'Hit Rate']} />
                <Bar dataKey="hitRate" fill="var(--accent-color)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* The Acquisition Ledger - full width */}
      <Card className="stagger-3 mb-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-base font-semibold mb-1">Top Pickups by Starter Points</h2>
            <p className="text-xs text-muted">Highest single-season starter point producers acquired in-season.</p>
          </div>
          <ChartToggle value={ledgerFilter} onChange={setLedgerFilter} />
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto pr-2 pb-4" style={{ maxHeight: '580px' }}>
          {ledger.map((asset, idx) => {
            const isTop3 = idx < 3;
            const rankColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : undefined;
            return (
              <div key={`${asset.playerId}-${idx}`}
                className="flex justify-between items-center transition-all hover:bg-white/[0.03]"
                style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isTop3 ? rankColor + '25' : 'rgba(255,255,255,0.05)'}`, borderRadius: '12px', padding: '12px 24px' }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm font-bold text-center shrink-0" style={{ minWidth: '1.25rem', color: rankColor || 'var(--text-secondary)' }}>{idx + 1}</div>
                  {asset.managerAvatar
                    ? <img src={`https://sleepercdn.com/avatars/thumbs/${asset.managerAvatar}`} alt="avatar" className="avatar shrink-0" width={32} height={32} />
                    : <div className="avatar bg-slate-700 shrink-0" style={{ width: 32, height: 32 }} />
                  }
                  <div>
                    <div className="font-semibold text-sm">{asset.playerName}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {asset.position} · <span style={{ color: 'var(--accent-color)' }}>{asset.managerName}</span> · Wk {asset.weekAcquired} · {asset.weeksStarted} starts ·{' '}
                      {asset.acqType === 'faab'
                        ? <span style={{ color: '#4ade80' }}>${asset.cost} FAAB</span>
                        : <span className="opacity-60">$0 Street</span>
                      }
                    </div>
                  </div>
                </div>
                <div className="font-bold text-lg font-mono shrink-0 ml-4" style={{ color: 'var(--success-color)' }}>+{asset.starterPoints.toFixed(1)}</div>
              </div>
            );
          })}
          {ledger.length === 0 && (
            <div className="p-12 text-center text-muted italic bg-white/[0.01] rounded-xl border border-dashed border-white/10">
              No significant acquisition output recorded yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
