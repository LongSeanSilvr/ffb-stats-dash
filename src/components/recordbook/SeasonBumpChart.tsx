import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Check, RotateCcw, Users } from 'lucide-react';
import type { ManagerScore } from '../../types/recordBook';
import { Card } from '../Card';

interface SeasonBumpChartProps {
  managers: ManagerScore[];
  seasons: { league: { season: string } }[];
}

const LINE_COLORS = [
  '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f97316',
  '#ef4444', '#06b6d4', '#14b8a6', '#f43f5e', '#d946ef', '#64748b',
];

export const SeasonBumpChart: React.FC<SeasonBumpChartProps> = ({ managers, seasons }) => {
  const [metric, setMetric] = useState<'finish' | 'fpts' | 'winPct'>('finish');
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [hoveredManager, setHoveredManager] = useState<string | null>(null);

  // Sort seasons chronologically
  const sortedSeasons = [...seasons].sort(
    (a, b) => parseInt(a.league.season) - parseInt(b.league.season)
  );

  const chartData = sortedSeasons.map(s => {
    const year = s.league.season;
    const row: Record<string, any> = { season: year };
    managers.forEach(m => {
      const bk = m.seasonBreakdowns?.find(b => b.season === year);
      if (bk) {
        row[m.managerName] = bk[metric];
      }
    });
    return row;
  });

  const toggleManager = (name: string) => {
    setSelectedManagers(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const selectAll = () => {
    setSelectedManagers(managers.map(m => m.managerName));
  };

  const clearSelection = () => {
    setSelectedManagers([]);
  };

  const hasSelection = selectedManagers.length > 0;

  return (
    <Card
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xl font-bold text-white">Season Trajectories</span>
            <div className="text-xs text-muted font-normal mt-0.5">
              Manager performance progression across all recorded seasons
            </div>
          </div>

          {/* Metric Selector */}
          <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/10 shrink-0 self-start sm:self-auto">
            {(['finish', 'fpts', 'winPct'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  metric === m
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-muted hover:text-white'
                }`}
              >
                {m === 'finish' ? 'Finish Rank' : m === 'fpts' ? 'Total Points' : 'Win %'}
              </button>
            ))}
          </div>
        </div>
      }
      className="stagger-3"
    >
      <div className="h-[360px] sm:h-[420px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 25, left: -5, bottom: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="season"
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <YAxis
              reversed={metric === 'finish'}
              domain={metric === 'finish' ? [1, 12] : ['auto', 'auto']}
              tickCount={metric === 'finish' ? 12 : 6}
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 17, 21, 0.95)',
                borderColor: 'var(--card-border)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                fontSize: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            />
            {managers.map((m, i) => {
              const isSelected = selectedManagers.includes(m.managerName);
              const isHovered = hoveredManager === m.managerName;
              const color = LINE_COLORS[i % LINE_COLORS.length];

              let opacity = 1;
              let strokeWidth = 2.5;
              let dotRadius = 3.5;

              if (hasSelection) {
                if (isSelected) {
                  opacity = 1;
                  strokeWidth = 3.5;
                  dotRadius = 5;
                } else {
                  opacity = 0.12;
                  strokeWidth = 1.5;
                  dotRadius = 2;
                }
              } else if (hoveredManager !== null) {
                if (isHovered) {
                  opacity = 1;
                  strokeWidth = 4;
                  dotRadius = 6;
                } else {
                  opacity = 0.2;
                  strokeWidth = 1.5;
                  dotRadius = 2;
                }
              }

              if (isHovered) {
                opacity = 1;
                strokeWidth = 4.5;
                dotRadius = 7;
              }

              return (
                <Line
                  key={m.ownerId}
                  type="monotone"
                  dataKey={m.managerName}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  dot={{ r: dotRadius, strokeWidth: 1, fill: color }}
                  activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 2 }}
                  onMouseEnter={() => setHoveredManager(m.managerName)}
                  onMouseLeave={() => setHoveredManager(null)}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Multi-Select Filter Bar */}
      <div className="mt-6 pt-5 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Users size={14} className="text-blue-400" />
            <span>Click manager badges to pin & compare multiple trajectories:</span>
            {hasSelection && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[11px] border border-blue-500/30">
                {selectedManagers.length} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {hasSelection ? (
              <button
                onClick={clearSelection}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white text-xs font-semibold transition-all cursor-pointer border border-white/10"
              >
                <RotateCcw size={12} />
                <span>Reset View</span>
              </button>
            ) : null}
            <button
              onClick={selectAll}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white text-xs font-semibold transition-all cursor-pointer border border-white/10"
            >
              Select All
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {managers.map((m, i) => {
            const isSelected = selectedManagers.includes(m.managerName);
            const isHovered = hoveredManager === m.managerName;
            const color = LINE_COLORS[i % LINE_COLORS.length];

            return (
              <button
                key={m.ownerId}
                onClick={() => toggleManager(m.managerName)}
                onMouseEnter={() => setHoveredManager(m.managerName)}
                onMouseLeave={() => setHoveredManager(null)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'text-white font-bold shadow-md'
                    : isHovered
                    ? 'bg-white/15 text-white ring-1 ring-white/30'
                    : hasSelection
                    ? 'bg-white/[0.03] text-muted/60 hover:text-white hover:bg-white/10'
                    : 'bg-white/5 text-muted hover:text-white hover:bg-white/10'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: `${color}25`,
                        border: `1.5px solid ${color}`,
                        boxShadow: `0 0 12px ${color}30`,
                      }
                    : {
                        border: '1.5px solid transparent',
                      }
                }
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate max-w-[120px]">{m.managerName}</span>
                {isSelected && <Check size={12} className="text-white shrink-0 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
