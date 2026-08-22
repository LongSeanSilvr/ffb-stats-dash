import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Table } from 'lucide-react';
import type { ManagerScore } from '../../types/recordBook';
import { Card } from '../Card';

interface MasterLedgerHubProps {
  managers: ManagerScore[];
}

export const MasterLedgerHub: React.FC<MasterLedgerHubProps> = ({ managers }) => {
  const [sortKey, setSortKey] = useState<string>('powerScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedManagerId, setExpandedManagerId] = useState<string | null>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'averageFinish' || key === 'managerName' ? 'asc' : 'desc');
    }
  };

  const sortedManagers = [...managers].sort((a, b) => {
    let aVal = (a as any)[sortKey];
    let bVal = (b as any)[sortKey];
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <ArrowUpDown size={12} className="inline ml-1 opacity-40 hover:opacity-100" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="inline ml-1 text-purple-400" />
    ) : (
      <ArrowDown size={12} className="inline ml-1 text-purple-400" />
    );
  };

  return (
    <Card
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Table className="text-blue-400" size={24} />
            <span>All-Time Master Ledger</span>
          </div>
          <span className="text-xs text-muted font-normal">
            Complete career totals and efficiency metrics
          </span>
        </div>
      }
      className="stagger-1"
    >
      {/* Mobile Card List (< md) */}
      <div className="block md:hidden space-y-4 pt-2">
        {sortedManagers.map((m, rankIndex) => {
          const isExpanded = expandedManagerId === m.ownerId;
          const avatarUrl = m.avatar ? `https://sleepercdn.com/avatars/thumbs/${m.avatar}` : null;

          return (
            <div
              key={m.ownerId}
              className="glass-card transition-all duration-200"
              style={{ padding: '1.25rem' }}
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedManagerId(isExpanded ? null : m.ownerId)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-muted">#{rankIndex + 1}</span>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-white/20" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white/60">
                      N/A
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-white text-sm">{m.managerName}</h4>
                    <div className="text-xs text-purple-400 font-bold mt-0.5">
                      {m.powerScore} Power Score
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">{m.wins}-{m.losses}</div>
                    <div className="text-[10px] text-muted">{m.winPercentage}%</div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
                </div>
              </div>

              {/* Expandable Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted block">Titles</span>
                    <span className="font-bold text-yellow-400">{m.championships}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Seasons</span>
                    <span className="font-bold text-white">{m.seasonsPlayed}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Avg Finish</span>
                    <span className="font-bold text-blue-400">{m.averageFinish}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Best / Worst</span>
                    <span className="font-bold text-white">{m.bestFinish} / {m.worstFinish}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Points / Season</span>
                    <span className="font-bold text-white">{m.ptsPerSeason.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Lineup Efficiency</span>
                    <span className="font-bold text-teal-400">{m.coachingEfficiency}%</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted block">Playoff Record</span>
                    <span className="font-bold text-pink-400">
                      {m.playoffAppearances > 0 ? `${m.playoffWins}-${m.playoffLosses}` : 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10 mt-3">
        <table className="standings-table w-full whitespace-nowrap">
          <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
            <tr>
              <th className="text-left px-4 py-3.5 cursor-pointer select-none" onClick={() => handleSort('managerName')}>
                Manager <SortIcon column="managerName" />
              </th>
              <th className="text-center px-3 py-3.5 text-purple-400 cursor-pointer select-none" onClick={() => handleSort('powerScore')}>
                Power <SortIcon column="powerScore" />
              </th>
              <th className="text-center px-3 py-3.5 cursor-pointer select-none" onClick={() => handleSort('seasonsPlayed')}>
                Szn <SortIcon column="seasonsPlayed" />
              </th>
              <th className="text-center px-3 py-3.5 text-yellow-400 cursor-pointer select-none" onClick={() => handleSort('championships')}>
                Titles <SortIcon column="championships" />
              </th>
              <th className="text-center px-3 py-3.5 cursor-pointer select-none" onClick={() => handleSort('wins')}>
                Record <SortIcon column="wins" />
              </th>
              <th className="text-center px-3 py-3.5 cursor-pointer select-none" onClick={() => handleSort('winPercentage')}>
                Win % <SortIcon column="winPercentage" />
              </th>
              <th className="text-center px-3 py-3.5 cursor-pointer select-none" onClick={() => handleSort('averageFinish')}>
                Avg Fin <SortIcon column="averageFinish" />
              </th>
              <th className="text-center px-3 py-3.5 cursor-pointer select-none" onClick={() => handleSort('bestFinish')}>
                Best/Worst <SortIcon column="bestFinish" />
              </th>
              <th className="text-center px-3 py-3.5 cursor-pointer select-none" onClick={() => handleSort('ptsPerSeason')}>
                Pts/Szn <SortIcon column="ptsPerSeason" />
              </th>
              <th className="text-center px-3 py-3.5 cursor-pointer select-none" onClick={() => handleSort('coachingEfficiency')}>
                Lineup Eff <SortIcon column="coachingEfficiency" />
              </th>
              <th className="text-center px-3 py-3.5 cursor-pointer select-none" onClick={() => handleSort('playoffWins')}>
                Playoffs <SortIcon column="playoffWins" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedManagers.map((m, i) => {
              const avatarUrl = m.avatar ? `https://sleepercdn.com/avatars/thumbs/${m.avatar}` : null;

              return (
                <tr key={m.ownerId} className="standings-row hover:bg-white/5 transition-colors">
                  <td className="team-cell px-4 py-3.5">
                    <span className="team-rank w-6 inline-block text-muted">{i + 1}.</span>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="team-avatar inline-block w-8 h-8 rounded-full ml-2 mr-3 border border-white/10 object-cover" />
                    ) : (
                      <div className="team-avatar-placeholder inline-block w-8 h-8 rounded-full ml-2 mr-3 bg-slate-700" />
                    )}
                    <span className="font-semibold text-white">{m.managerName}</span>
                  </td>
                  <td className="text-center px-3 py-3.5 font-black text-purple-400">{m.powerScore}</td>
                  <td className="text-center px-3 py-3.5 text-muted">{m.seasonsPlayed}</td>
                  <td className="text-center px-3 py-3.5 font-bold text-yellow-400">{m.championships}</td>
                  <td className="text-center px-3 py-3.5 text-gray-300 font-medium">
                    {m.wins}-{m.losses}{m.ties > 0 ? `-${m.ties}` : ''}
                  </td>
                  <td className="text-center px-3 py-3.5 font-mono text-success-color font-bold">{m.winPercentage}%</td>
                  <td className="text-center px-3 py-3.5 font-mono text-blue-400 font-semibold">{m.averageFinish}</td>
                  <td className="text-center px-3 py-3.5 text-xs text-muted font-mono">
                    {m.bestFinish} / {m.worstFinish}
                  </td>
                  <td className="text-center px-3 py-3.5 font-mono text-white">{m.ptsPerSeason.toFixed(1)}</td>
                  <td className="text-center px-3 py-3.5 font-mono text-teal-400">{m.coachingEfficiency}%</td>
                  <td className="text-center px-3 py-3.5 font-mono text-pink-400">
                    {m.playoffAppearances > 0 ? `${m.playoffWins}-${m.playoffLosses}` : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
