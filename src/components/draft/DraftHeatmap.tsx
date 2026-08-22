import React, { useState, useRef } from 'react';
import type { DraftEfficiencyResult } from '../../hooks/useDraftEfficiency';

interface Props {
  draftData: DraftEfficiencyResult[];
}

export const DraftHeatmap: React.FC<Props> = ({ draftData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{ round: number; mgr: string; x: number; y: number } | null>(null);

  const managers = draftData.map(d => ({
    name: d.user?.display_name || `Team ${d.roster_id}`,
    avatar: d.user?.avatar,
    rosterId: d.roster_id,
  }));

  const maxRounds = Math.max(
    ...draftData.flatMap(d => (d.draftPicks ? d.draftPicks.map(p => p.round) : [1]))
  );

  // Build per-cell data: accumulate ALL players per round per manager
  const cellData: Record<
    string,
    { totalPts: number; avgPts: number; players: { name: string; pts: number; isKeeper: boolean }[] }
  > = {};

  draftData.forEach(d => {
    const mgrName = d.user?.display_name || `Team ${d.roster_id}`;
    d.draftPicks.forEach(pick => {
      const key = `${pick.round}-${mgrName}`;
      if (!cellData[key]) cellData[key] = { totalPts: 0, avgPts: 0, players: [] };
      const pts = pick.starterPoints + pick.benchPoints;
      cellData[key].totalPts += pts;
      cellData[key].players.push({
        name: pick.playerName,
        pts,
        isKeeper: pick.isKeeper,
      });
    });
  });

  // Compute average per pick within each cell
  Object.values(cellData).forEach(cell => {
    cell.players.sort((a, b) => b.pts - a.pts);
    cell.avgPts = cell.players.length > 0 ? cell.totalPts / cell.players.length : 0;
  });

  // Compute per-round league average
  const roundAvg: Record<number, number> = {};
  for (let round = 1; round <= maxRounds; round++) {
    let totalPts = 0;
    let totalPicks = 0;
    managers.forEach(m => {
      const cell = cellData[`${round}-${m.name}`];
      if (cell) {
        totalPts += cell.totalPts;
        totalPicks += cell.players.length;
      }
    });
    roundAvg[round] = totalPicks > 0 ? totalPts / totalPicks : 0;
  }

  // Diverging color formula
  const getCellColor = (pts: number, avg: number, hasPicks: boolean) => {
    if (!hasPicks) return 'rgba(255,255,255,0.02)';
    if (avg <= 0) return pts > 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.02)';
    if (pts <= 0) return 'rgba(239, 68, 68, 0.4)';

    const ratio = pts / avg;
    if (ratio >= 1) {
      const intensity = Math.min((ratio - 1) / 1.5, 1);
      const r = Math.round(16 * (1 - intensity) + 16 * intensity);
      const g = Math.round(185 * (1 - intensity) + 220 * intensity);
      const b = Math.round(129 * (1 - intensity) + 140 * intensity);
      const alpha = 0.15 + intensity * 0.55;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      const intensity = Math.min((1 - ratio) / 0.8, 1);
      const r = Math.round(239 * (1 - intensity) + 244 * intensity);
      const g = Math.round(68 * (1 - intensity) + 63 * intensity);
      const b = Math.round(68 * (1 - intensity) + 94 * intensity);
      const alpha = 0.15 + intensity * 0.5;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  };

  const handleCellHover = (round: number, mgr: string, el: HTMLElement) => {
    if (!containerRef.current) return;
    const cellRect = el.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setHovered({
      round,
      mgr,
      x: cellRect.left - containerRect.left + cellRect.width / 2,
      y: cellRect.top - containerRect.top - 8,
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <table className="w-full border-separate border-spacing-1.5 min-w-[900px]">
          <thead>
            <tr>
              <th className="w-14 p-2 text-left text-xs font-bold text-muted uppercase tracking-wider">
                Round
              </th>
              <th className="w-12 p-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider bg-white/[0.02] rounded-lg">
                Avg
              </th>
              {managers.map(m => (
                <th
                  key={m.rosterId}
                  className="p-2 text-center text-xs font-semibold text-gray-300 max-w-[90px] truncate"
                >
                  <div className="flex flex-col items-center gap-1">
                    {m.avatar ? (
                      <img
                        src={`https://sleepercdn.com/avatars/thumbs/${m.avatar}`}
                        alt=""
                        className="w-5 h-5 rounded-full border border-white/20 object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-white/50">
                        N/A
                      </div>
                    )}
                    <span className="truncate w-full text-[11px] font-medium text-gray-300">
                      {m.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRounds }, (_, i) => i + 1).map(round => {
              const avg = roundAvg[round];
              return (
                <tr key={round}>
                  <td className="p-2 text-xs font-bold font-mono text-muted">
                    Rd {round}
                  </td>
                  <td className="p-2 text-center text-xs font-mono font-bold text-slate-400 bg-white/[0.03] rounded-lg border border-white/5">
                    {avg > 0 ? avg.toFixed(0) : '—'}
                  </td>
                  {managers.map(m => {
                    const key = `${round}-${m.name}`;
                    const cell = cellData[key];
                    const pts = cell ? Number(cell.avgPts.toFixed(1)) : 0;
                    const players = cell?.players || [];
                    const hasPicks = players.length > 0;

                    return (
                      <td
                        key={m.rosterId}
                        onMouseEnter={e => {
                          if (hasPicks) {
                            handleCellHover(round, m.name, e.currentTarget);
                          }
                        }}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          background: getCellColor(cell?.avgPts || 0, avg, hasPicks),
                        }}
                        className={`rounded-lg p-2 text-center text-xs transition-all border border-white/5 ${
                          hasPicks ? 'cursor-pointer hover:scale-105 hover:z-10' : 'opacity-40'
                        }`}
                      >
                        <div className="font-mono font-bold text-white">
                          {hasPicks ? pts : '—'}
                        </div>
                        {hasPicks && (
                          <div className="text-[10px] text-white/60 truncate max-w-[85px] mx-auto mt-0.5 font-sans">
                            {players.length === 1 ? players[0].name.split(' ').pop() : `${players.length} picks`}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hover Tooltip (Anchored right above the hovered cell) */}
      {hovered && (() => {
        const cell = cellData[`${hovered.round}-${hovered.mgr}`];
        if (!cell || cell.players.length === 0) return null;
        const avg = roundAvg[hovered.round];
        const pctOfAvg = avg > 0 ? ((cell.avgPts / avg) * 100).toFixed(0) : '—';
        return (
          <div
            style={{
              position: 'absolute',
              left: Math.max(120, Math.min(hovered.x, (containerRef.current?.offsetWidth || 900) - 120)),
              top: hovered.y,
              transform: 'translate(-50%, -100%)',
            }}
            className="bg-[#0f1115]/95 border border-white/15 rounded-xl p-3.5 z-[999] min-w-[220px] shadow-2xl pointer-events-none backdrop-blur-md animate-fade-in"
          >
            <div className="font-bold text-white text-xs border-b border-white/10 pb-1.5 mb-2">
              {hovered.mgr} · Round {hovered.round}
            </div>
            <div className="space-y-1.5">
              {cell.players.map((p, i) => (
                <div key={i} className="text-xs flex justify-between gap-4">
                  <span className="text-muted truncate max-w-[140px] flex items-center gap-1">
                    {p.name}
                    {p.isKeeper && (
                      <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded font-bold">
                        K
                      </span>
                    )}
                  </span>
                  <span className="font-bold font-mono text-white">{p.pts.toFixed(1)} pts</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 mt-2 pt-2 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-muted">
                <span>Round Avg:</span>
                <span>{avg.toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>vs Round Avg:</span>
                <span className={cell.avgPts >= avg ? 'text-emerald-400' : 'text-rose-400'}>
                  {pctOfAvg}%
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
