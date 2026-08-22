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
  const [focusedManager, setFocusedManager] = useState<string | null>(null);

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
              const isDimmed = focusedManager !== null && focusedManager !== m.managerName;
              const isHighlight = focusedManager === m.managerName;
              return (
                <Line
                  key={m.ownerId}
                  type="monotone"
                  dataKey={m.managerName}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={isHighlight ? 4 : 2.5}
                  strokeOpacity={isDimmed ? 0.15 : 1}
                  dot={{ r: isHighlight ? 6 : 3.5, strokeWidth: 1 }}
                  activeDot={{ r: 8 }}
                  onMouseEnter={() => setFocusedManager(m.managerName)}
                  onMouseLeave={() => setFocusedManager(null)}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Badges */}
      <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-white/10">
        {managers.map((m, i) => (
          <button
            key={m.ownerId}
            onClick={() =>
              setFocusedManager(focusedManager === m.managerName ? null : m.managerName)
            }
            onMouseEnter={() => setFocusedManager(m.managerName)}
            onMouseLeave={() => setFocusedManager(null)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
              focusedManager === m.managerName
                ? 'bg-white/20 text-white font-bold ring-1 ring-white/40'
                : 'bg-white/5 text-muted hover:text-white hover:bg-white/10'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
            />
            <span className="truncate max-w-[120px]">{m.managerName}</span>
          </button>
        ))}
      </div>
    </Card>
  );
};
