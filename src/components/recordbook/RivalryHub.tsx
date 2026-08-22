import React, { useState } from 'react';
import { Users, Flame, Swords, ArrowRightLeft } from 'lucide-react';
import type { ManagerScore } from '../../types/recordBook';
import type { AllTimeMatchupData } from '../../hooks/useAllTimeMatchups';
import { Card } from '../Card';
import { findFeaturedRivalries, getMatchupHistoryBetween } from '../../utils/h2hAggregator';
import { H2HMatchupDrawer } from './H2HMatchupDrawer';

interface RivalryHubProps {
  managers: ManagerScore[];
  matchups: AllTimeMatchupData;
}

export const RivalryHub: React.FC<RivalryHubProps> = ({ managers, matchups }) => {
  const [selectedM1, setSelectedM1] = useState<string>(managers[0]?.ownerId || '');
  const [selectedM2, setSelectedM2] = useState<string>(managers[1]?.ownerId || '');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerManagers, setActiveDrawerManagers] = useState<{
    m1: { id: string; name: string; avatar: string | null };
    m2: { id: string; name: string; avatar: string | null };
  }>({
    m1: { id: managers[0]?.ownerId || '', name: managers[0]?.managerName || '', avatar: managers[0]?.avatar || null },
    m2: { id: managers[1]?.ownerId || '', name: managers[1]?.managerName || '', avatar: managers[1]?.avatar || null },
  });

  const managerMap = Object.fromEntries(
    managers.map(m => [m.ownerId, { name: m.managerName, avatar: m.avatar }])
  );

  const allMatchupRecords = matchups.matchupList || [];

  const { closestRivalry, mostOneSided, activeStreak } = findFeaturedRivalries(
    matchups.h2hMatrix,
    allMatchupRecords,
    managerMap
  );

  const openDrawerFor = (id1: string, id2: string) => {
    const m1 = managers.find(m => m.ownerId === id1);
    const m2 = managers.find(m => m.ownerId === id2);
    if (!m1 || !m2) return;

    setActiveDrawerManagers({
      m1: { id: m1.ownerId, name: m1.managerName, avatar: m1.avatar },
      m2: { id: m2.ownerId, name: m2.managerName, avatar: m2.avatar },
    });
    setDrawerOpen(true);
  };

  const getHeatmapClass = (wins: number, losses: number) => {
    const diff = wins - losses;
    if (diff > 3) return 'positive-3';
    if (diff > 1) return 'positive-2';
    if (diff > 0) return 'positive-1';
    if (diff < -3) return 'negative-3';
    if (diff < -1) return 'negative-2';
    if (diff < 0) return 'negative-1';
    return 'neutral';
  };

  // Quick Matchup Record
  const quickRecord = matchups.h2hMatrix[selectedM1]?.[selectedM2] || { wins: 0, losses: 0 };
  const quickLogs = getMatchupHistoryBetween(allMatchupRecords, selectedM1, selectedM2);

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Featured Rivalries */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Swords className="text-amber-400" size={24} />
            Featured Rivalries
          </h2>
          <p className="text-sm text-muted mt-1">
            Historical head-to-head records and dominance streaks
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {closestRivalry && (
            <div
              onClick={() => openDrawerFor(closestRivalry.owner1Id, closestRivalry.owner2Id)}
              className="glass-card flex flex-col justify-between transition-all duration-300 hover:border-amber-500/50 cursor-pointer shadow-md"
              style={{ padding: '1.5rem' }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Closest Lifetime Series
                  </span>
                  <Users size={18} className="text-amber-400 shrink-0" />
                </div>
                <div className="font-bold text-white text-base sm:text-lg mb-2 leading-snug break-words">
                  {closestRivalry.owner1Name} vs {closestRivalry.owner2Name}
                </div>
              </div>
              <div className="pt-2">
                <div className="text-3xl font-black text-amber-400">
                  {closestRivalry.owner1Wins} - {closestRivalry.owner2Wins}
                </div>
                <div className="text-xs text-muted mt-1.5">Tap to view game logs</div>
              </div>
            </div>
          )}

          {mostOneSided && (
            <div
              onClick={() => openDrawerFor(mostOneSided.owner1Id, mostOneSided.owner2Id)}
              className="glass-card flex flex-col justify-between transition-all duration-300 hover:border-emerald-500/50 cursor-pointer shadow-md"
              style={{ padding: '1.5rem' }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Most One-Sided Series
                  </span>
                  <Swords size={18} className="text-emerald-400 shrink-0" />
                </div>
                <div className="font-bold text-white text-base sm:text-lg mb-2 leading-snug break-words">
                  {mostOneSided.owner1Name} vs {mostOneSided.owner2Name}
                </div>
              </div>
              <div className="pt-2">
                <div className="text-3xl font-black text-emerald-400">
                  {mostOneSided.owner1Wins} - {mostOneSided.owner2Wins}
                </div>
                <div className="text-xs text-muted mt-1.5">Tap to view game logs</div>
              </div>
            </div>
          )}

          {activeStreak && (
            <div
              onClick={() => openDrawerFor(activeStreak.owner1Id, activeStreak.owner2Id)}
              className="glass-card flex flex-col justify-between transition-all duration-300 hover:border-purple-500/50 cursor-pointer shadow-md"
              style={{ padding: '1.5rem' }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Active Win Streak
                  </span>
                  <Flame size={18} className="text-purple-400 shrink-0" />
                </div>
                <div className="font-bold text-white text-base sm:text-lg mb-2 leading-snug break-words">
                  {activeStreak.owner1Name} over {activeStreak.owner2Name}
                </div>
              </div>
              <div className="pt-2">
                <div className="text-3xl font-black text-purple-400">
                  {activeStreak.streak} In A Row
                </div>
                <div className="text-xs text-muted mt-1.5">Tap to view game logs</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Direct Matchup Explorer Picker */}
      <div
        className="glass-card p-6 md:p-8"
        style={{ background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(15, 17, 21, 0.85) 100%)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <ArrowRightLeft className="text-blue-400" size={22} />
          <div>
            <h3 className="text-lg font-bold text-white">Direct Matchup Lookup</h3>
            <p className="text-xs text-muted">Select any two managers to view their historical head-to-head records</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
              Manager 1
            </label>
            <select
              value={selectedM1}
              onChange={e => setSelectedM1(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white font-semibold text-sm focus:outline-none focus:border-blue-500 min-h-[44px]"
            >
              {managers.map(m => (
                <option key={m.ownerId} value={m.ownerId} disabled={m.ownerId === selectedM2}>
                  {m.managerName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
              Manager 2
            </label>
            <select
              value={selectedM2}
              onChange={e => setSelectedM2(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white font-semibold text-sm focus:outline-none focus:border-blue-500 min-h-[44px]"
            >
              {managers.map(m => (
                <option key={m.ownerId} value={m.ownerId} disabled={m.ownerId === selectedM1}>
                  {m.managerName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-black/40 border border-white/10 mt-6">
          <div>
            <span className="text-xs text-muted uppercase tracking-wider font-bold">
              Lifetime Series Record
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {managers.find(m => m.ownerId === selectedM1)?.managerName}:{' '}
              <span className="text-success-color font-black">{quickRecord.wins}</span> -{' '}
              <span className="text-danger-color font-black">{quickRecord.losses}</span>
            </div>
          </div>

          <button
            onClick={() => openDrawerFor(selectedM1, selectedM2)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg transition-all min-h-[44px] cursor-pointer"
          >
            View Complete Game Logs ({quickLogs.length})
          </button>
        </div>
      </div>

      {/* Desktop Head-to-Head Matrix Grid */}
      <Card
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Full Head-to-Head Matrix</span>
            <span className="text-xs text-muted font-normal">
              Click any cell to open matchup game logs
            </span>
          </div>
        }
        className="stagger-3"
      >
        <div className="heatmap-scroll-container pb-2 pt-2">
          <div
            className="heatmap-grid"
            style={{ gridTemplateColumns: `140px repeat(${managers.length}, 1fr)` }}
          >
            {/* Header Row */}
            <div className="heatmap-header heatmap-row-label bg-slate-900 border-b border-white/10 z-10 text-left">
              Matchup
            </div>
            {managers.map(m => (
              <div key={m.ownerId} className="heatmap-header border-b border-white/10 pb-2 truncate" title={m.managerName}>
                {m.avatar ? (
                  <img src={`https://sleepercdn.com/avatars/thumbs/${m.avatar}`} className="w-6 h-6 rounded-full mx-auto" alt="" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-700 mx-auto" />
                )}
              </div>
            ))}

            {/* Matrix Rows */}
            {managers.map(mRow => (
              <React.Fragment key={mRow.ownerId}>
                <div className="heatmap-row-label flex items-center gap-2 border-b border-white/5 py-1.5 truncate">
                  {mRow.avatar && (
                    <img src={`https://sleepercdn.com/avatars/thumbs/${mRow.avatar}`} className="w-5 h-5 rounded-full shrink-0" alt="" />
                  )}
                  <span className="font-medium text-white text-xs sm:text-sm truncate w-24">{mRow.managerName}</span>
                </div>

                {managers.map(mCol => {
                  if (mRow.ownerId === mCol.ownerId) {
                    return (
                      <div key={mCol.ownerId} className="heatmap-cell diagonal border-b border-white/5 flex items-center justify-center">
                        —
                      </div>
                    );
                  }

                  const rec = matchups.h2hMatrix[mRow.ownerId]?.[mCol.ownerId] || { wins: 0, losses: 0 };
                  const colorClass = getHeatmapClass(rec.wins, rec.losses);

                  return (
                    <div
                      key={mCol.ownerId}
                      onClick={() => openDrawerFor(mRow.ownerId, mCol.ownerId)}
                      className={`heatmap-cell border-b border-white/5 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${colorClass}`}
                      title={`${mRow.managerName} vs ${mCol.managerName}: ${rec.wins}-${rec.losses} (Click to open)`}
                    >
                      {rec.wins}-{rec.losses}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Card>

      {/* Slide-Up Drawer */}
      <H2HMatchupDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        manager1={activeDrawerManagers.m1}
        manager2={activeDrawerManagers.m2}
        gameLogs={getMatchupHistoryBetween(allMatchupRecords, activeDrawerManagers.m1.id, activeDrawerManagers.m2.id)}
      />
    </div>
  );
};
