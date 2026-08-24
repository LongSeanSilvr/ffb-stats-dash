import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Table, Info, Sparkles, X } from 'lucide-react';
import type { ManagerScore } from '../../types/recordBook';
import { Card } from '../Card';

interface MasterLedgerHubProps {
  managers: ManagerScore[];
}

const PowerScoreInfoTooltip: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      top: rect.top - 8,
      left: rect.left + rect.width / 2
    });
    setIsHovered(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenModal();
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        className="inline-flex items-center justify-center p-1 rounded-full text-purple-400/80 hover:text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer ml-1 align-middle"
        title="Click or hover to view Power Score formula"
      >
        <Info size={14} />
      </button>

      {isHovered &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: 'translate(-50%, -100%)',
              zIndex: 9999
            }}
            className="w-64 p-3.5 rounded-xl bg-[#0f1115] border border-purple-500/40 shadow-2xl backdrop-blur-xl text-left text-xs whitespace-normal pointer-events-none animate-fade-in"
          >
            <div className="font-bold text-purple-300 border-b border-white/10 pb-1.5 mb-2 flex items-center gap-1.5">
              <Sparkles size={13} className="text-purple-400 shrink-0" />
              <span>Power Score Formula</span>
            </div>
            <p className="text-muted text-[11px] leading-relaxed mb-2">
              Weighted composite index (0–100) evaluating multi-season performance:
            </p>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between text-yellow-400">
                <span>🏆 Titles:</span> <strong className="font-black">25%</strong>
              </div>
              <div className="flex justify-between text-white">
                <span>📈 Regular Szn Win %:</span> <strong className="font-black">20%</strong>
              </div>
              <div className="flex justify-between text-blue-400">
                <span>🏅 Avg Finish (Inv):</span> <strong className="font-black">20%</strong>
              </div>
              <div className="flex justify-between text-teal-400">
                <span>🎯 Lineup Efficiency:</span> <strong className="font-black">15%</strong>
              </div>
              <div className="flex justify-between text-pink-400">
                <span>⚔️ Playoff Win %:</span> <strong className="font-black">10%</strong>
              </div>
              <div className="flex justify-between text-purple-400">
                <span>⚡ Points / Season:</span> <strong className="font-black">10%</strong>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

const PowerFormulaModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1115] border border-purple-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 my-auto relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">All-Time Power Score</h3>
            <p className="text-xs text-muted">Weighted composite index (0–100 scale)</p>
          </div>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          The Power Score evaluates overall franchise success across 6 core disciplines using normalized percentiles:
        </p>

        <div className="space-y-2 font-mono text-xs pt-1">
          <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex justify-between items-center text-yellow-300">
            <span>🏆 Championship Titles</span>
            <span className="font-black text-sm">25%</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center text-white">
            <span>📈 Regular Season Win %</span>
            <span className="font-black text-sm">20%</span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex justify-between items-center text-blue-300">
            <span>🏅 Average Finish (Inverted)</span>
            <span className="font-black text-sm">20%</span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 flex justify-between items-center text-teal-300">
            <span>🎯 Lineup Coaching Efficiency</span>
            <span className="font-black text-sm">15%</span>
          </div>
          <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 flex justify-between items-center text-pink-300">
            <span>⚔️ Playoff Win %</span>
            <span className="font-black text-sm">10%</span>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex justify-between items-center text-purple-300">
            <span>⚡ Points / Season</span>
            <span className="font-black text-sm">10%</span>
          </div>
        </div>

        <div className="text-[11px] text-muted border-t border-white/10 pt-3 flex items-center justify-between">
          <span>* Single-season samples apply tenure factor</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const MasterLedgerHub: React.FC<MasterLedgerHubProps> = ({ managers }) => {
  const [sortKey, setSortKey] = useState<string>('powerScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedManagerId, setExpandedManagerId] = useState<string | null>(null);
  const [showPowerModal, setShowPowerModal] = useState<boolean>(false);

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
    <>
      <PowerFormulaModal isOpen={showPowerModal} onClose={() => setShowPowerModal(false)} />

      <Card
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Table className="text-blue-400" size={24} />
              <span>All-Time Master Ledger</span>
            </div>
            <button
              onClick={() => setShowPowerModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-500/20 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Info size={14} className="text-purple-400" />
              <span>Power Score Formula</span>
            </button>
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
                      <div className="text-xs text-purple-400 font-bold mt-0.5 flex items-center">
                        <span>{m.powerScore} Power Score</span>
                        <PowerScoreInfoTooltip onOpenModal={() => setShowPowerModal(true)} />
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
                  Power <SortIcon column="powerScore" /> <PowerScoreInfoTooltip onOpenModal={() => setShowPowerModal(true)} />
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
  </>
  );
};
