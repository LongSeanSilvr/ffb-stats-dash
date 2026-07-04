import React, { useState } from 'react';
import { Trophy, Medal, Award, Crown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie, Legend, ReferenceLine, Label } from 'recharts';
import { Card } from '../components/Card';
import { MobileTapHint } from '../components/MobileTapHint';
import { useLeagueContext } from '../context/LeagueContext';
import { useAllTimeStats } from '../hooks/useAllTimeStats';

export const RecordBook: React.FC = () => {
  const { loading: ctxLoading, error: ctxError, seasons } = useLeagueContext();
  const { managers, loading: statsLoading, error: statsError } = useAllTimeStats(seasons);
  
  const [sortKey, setSortKey] = useState<string>('totalFpts');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  const loading = ctxLoading || statsLoading;
  const error = ctxError || statsError;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
        <div className="text-muted mt-4">Aggregating all-time history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error loading record book: {error}</p>
      </div>
    );
  }

  if (!managers || managers.length === 0) {
    return (
      <div className="p-8 text-center text-white">
        <p>No managers found or stats are empty.</p>
      </div>
    );
  }

  // Calculate year range
  const sortedSeasons = [...seasons].sort((a, b) => parseInt(a.league.season) - parseInt(b.league.season));
  const minYear = sortedSeasons.length > 0 ? sortedSeasons[0].league.season : '';
  const maxYear = sortedSeasons.length > 0 ? sortedSeasons[sortedSeasons.length - 1].league.season : '';

  // Find the top champions
  const maxChampionships = Math.max(...managers.map(m => m.championships));
  const topChampions = managers.filter(m => m.championships === maxChampionships && maxChampionships > 0);

  // Find extreme records
  const mostWins = Math.max(...managers.map(m => m.wins));
  const highestWinPct = Math.max(...managers.map(m => m.winPercentage));
  const mostFpts = Math.max(...managers.map(m => m.totalFpts));
  const mostPlayoffs = Math.max(...managers.map(m => m.playoffAppearances));
  const highestSingleSeason = Math.max(...managers.map(m => m.bestSingleSeasonFpts));
  const bestAvgFinish = Math.min(...managers.map(m => m.averageFinish).filter(f => f > 0));

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
    if (sortKey !== column) return <ArrowUpDown size={14} className="inline ml-1 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" />;
    return sortDir === 'asc' ? <ArrowUp size={14} className="inline ml-1 text-accent-color cursor-pointer" /> : <ArrowDown size={14} className="inline ml-1 text-accent-color cursor-pointer" />;
  };

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-white/10 p-3 rounded-lg shadow-xl min-w-[150px]">
          <div className="flex items-center gap-2 mb-2">
            {data.avatar && (
              <img src={`https://sleepercdn.com/avatars/thumbs/${data.avatar}`} alt="avatar" className="w-6 h-6 rounded-full" />
            )}
            <p className="font-bold text-white">{data.managerName}</p>
          </div>
          <p className="text-muted text-xs">Win %: <span className="text-blue-400 font-bold">{data.winPercentage}%</span></p>
          <p className="text-muted text-xs">Avg Pts/Season: <span className="text-purple-400 font-bold">{(data.totalFpts / Math.max(1, data.seasonsPlayed)).toFixed(1)}</span></p>
          <p className="text-muted text-xs">Avg Finish: <span className="text-yellow-400 font-bold">{data.averageFinish}</span></p>
          <p className="text-muted text-xs">Best Season: <span className="text-orange-400 font-bold">{data.bestSingleSeasonFpts.toFixed(1)}</span></p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/10 p-3 rounded-lg shadow-xl">
          <p className="font-bold text-white mb-1">{payload[0].name}</p>
          <p className="text-yellow-400 font-bold">{payload[0].value} Championships</p>
        </div>
      );
    }
    return null;
  };

  const CustomAvatarDot = (props: any) => {
    const { cx, cy, payload } = props;
    const size = 28;
    const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
    
    if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) return null;
    
    return (
      <svg x={cx - size/2} y={cy - size/2} width={size} height={size}>
        <defs>
          <clipPath id={`clip-${payload.managerName.replace(/\s+/g, '-')}`}>
            <circle cx={size/2} cy={size/2} r={size/2} />
          </clipPath>
        </defs>
        {avatarUrl ? (
          <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#clip-${payload.managerName.replace(/\s+/g, '-')})`} />
        ) : (
          <circle cx={size/2} cy={size/2} r={size/2} fill="#475569" />
        )}
      </svg>
    );
  };



  const RecordCard = ({ title, value, subtext, icon: Icon, manager, color }: any) => {
    if (!manager) return null;
    
    return (
      <div className="flex flex-col justify-between h-full relative overflow-hidden box-border" style={{ padding: '1.5rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: `1px solid ${color}`, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">{title}</h3>
            <Icon size={20} color={color} className="shrink-0 ml-2" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            {manager.avatar ? (
              <img src={`https://sleepercdn.com/avatars/thumbs/${manager.avatar}`} alt="avatar" className="shrink-0" style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${color}` }} />
            ) : (
              <div className="bg-slate-700 flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: '50%' }}>
                <span className="text-white/50 text-xs">N/A</span>
              </div>
            )}
            <span className="font-bold text-lg text-white truncate">{manager.managerName}</span>
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-gradient" style={{ color: color }}>{value}</div>
          <div className="text-xs text-muted mt-1">{subtext}</div>
        </div>
      </div>
    );
  };

  // Chart Data Preparation
  const scatterData = managers.map(m => ({
    ...m,
    avgPtsPerSeason: Number((m.totalFpts / Math.max(1, m.seasonsPlayed)).toFixed(1))
  }));
  
  const avgPtsMean = scatterData.reduce((sum, m) => sum + m.avgPtsPerSeason, 0) / (scatterData.length || 1);
  const winPctMean = scatterData.reduce((sum, m) => sum + m.winPercentage, 0) / (scatterData.length || 1);
  const avgFinishMean = scatterData.reduce((sum, m) => sum + m.averageFinish, 0) / (scatterData.length || 1);
  const peakMean = scatterData.reduce((sum, m) => sum + m.bestSingleSeasonFpts, 0) / (scatterData.length || 1);

  const champsData = [...managers].filter(m => m.championships > 0).sort((a, b) => b.championships - a.championships);
  const pieColors = ['#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f97316'];

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mt-4 mb-1">Hall of Fame</h1>
      <p className="text-muted mb-8">All-time records and history (Sleeper Era: {minYear}-{maxYear})</p>

      {/* Trophy Case */}
      {topChampions.length > 0 && (
        <Card title="The Dynasty Leaders" className="stagger-1 mb-8" style={{ background: 'linear-gradient(145deg, rgba(251, 191, 36, 0.05) 0%, rgba(15, 17, 21, 0.8) 100%)', borderColor: 'rgba(251, 191, 36, 0.2)' }}>
           <div className="flex flex-wrap gap-6 justify-center py-6">
              {topChampions.map(champ => (
                 <div key={champ.ownerId} className="flex flex-col items-center justify-center">
                    <div className="relative mb-3">
                       <Crown size={48} className="text-yellow-400 absolute -top-8 -left-4 -rotate-12 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                       <img src={`https://sleepercdn.com/avatars/thumbs/${champ.avatar}`} alt="avatar" className="shadow-2xl" style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid rgba(251,191,36,0.6)' }} />
                    </div>
                    <div className="font-bold text-xl">{champ.managerName}</div>
                    <div className="text-yellow-400 font-bold tracking-widest uppercase text-sm mt-1">{champ.championships}x Champion</div>
                 </div>
              ))}
           </div>
        </Card>
      )}

      {/* Hall of Records */}
      <h2 className="text-2xl text-white mt-12 mb-6 stagger-2">Hall of Records</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 stagger-2">
        <RecordCard 
           title="Most Wins" 
           value={`${mostWins} Wins`} 
           subtext="Regular season & playoffs"
           icon={Medal} 
           color="#10b981" 
           manager={managers.find(m => m.wins === mostWins)} 
        />
        <RecordCard 
           title="Highest Win %" 
           value={`${highestWinPct}%`} 
           subtext="Min 1 season played"
           icon={Trophy} 
           color="#3b82f6" 
           manager={managers.find(m => m.winPercentage === highestWinPct)} 
        />
        <RecordCard 
           title="Most Points Scored" 
           value={mostFpts.toFixed(1)} 
           subtext="All-time career points"
           icon={Award} 
           color="#8b5cf6" 
           manager={managers.find(m => m.totalFpts === mostFpts)} 
        />
        <RecordCard 
           title="Playoff Beast" 
           value={`${mostPlayoffs} Apps`} 
           subtext="Total playoff appearances"
           icon={Crown} 
           color="#ec4899" 
           manager={managers.find(m => m.playoffAppearances === mostPlayoffs)} 
        />
        <RecordCard 
           title="Best Single Season" 
           value={highestSingleSeason.toFixed(1)} 
           subtext="Most points in a single year"
           icon={Medal} 
           color="#f97316" 
           manager={managers.find(m => m.bestSingleSeasonFpts === highestSingleSeason)} 
        />
        <RecordCard 
           title="Best Avg Finish" 
           value={`${bestAvgFinish.toFixed(1)}`} 
           subtext="Average final standing"
           icon={Trophy} 
           color="#fbbf24" 
           manager={managers.find(m => m.averageFinish === bestAvgFinish)} 
        />
      </div>

      {/* Charts Section */}
      <h2 className="text-2xl text-white mt-12 mb-6 stagger-3">Advanced Visualizations</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 stagger-3">
        
        <Card title="Luck vs Skill Matrix" className="col-span-1 lg:col-span-2">
          <div className="relative h-[400px] mt-2 w-full">
            {/* Quadrant Watermarks */}
            <div className="absolute top-8 left-24 text-muted text-sm font-bold opacity-30 pointer-events-none uppercase tracking-widest">Lucky</div>
            <div className="absolute top-8 right-12 text-muted text-sm font-bold opacity-30 pointer-events-none uppercase tracking-widest text-right">Juggernauts</div>
            <div className="absolute bottom-20 left-24 text-muted text-sm font-bold opacity-30 pointer-events-none uppercase tracking-widest">Bottom Feeders</div>
            <div className="absolute bottom-20 right-12 text-muted text-sm font-bold opacity-30 pointer-events-none uppercase tracking-widest text-right">Unlucky</div>

            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  type="number" 
                  dataKey="avgPtsPerSeason" 
                  name="Avg Pts/Season" 
                  stroke="rgba(255,255,255,0.4)" 
                  domain={['dataMin - 100', 'dataMax + 100']}
                  height={50}
                  label={{ value: 'Avg Pts / Season', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 13, style: { textAnchor: 'middle' } }}
                />
                <YAxis 
                  type="number" 
                  dataKey="winPercentage" 
                  name="Win %" 
                  stroke="rgba(255,255,255,0.4)" 
                  domain={['dataMin - 5', 'dataMax + 5']}
                  width={60}
                  label={{ value: 'Win %', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 13, offset: 0, style: { textAnchor: 'middle' } }}
                />
                <ZAxis type="number" range={[100, 100]} />
                <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <ReferenceLine x={avgPtsMean} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <ReferenceLine y={winPctMean} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <Scatter name="Managers" data={scatterData} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Ring Distribution */}
        <Card title="Championship Distribution">
          <div className="h-[300px] mt-4 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie
                  data={champsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={105}
                  paddingAngle={2}
                  dataKey="championships"
                  nameKey="managerName"
                >
                  {champsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                  <Label value={champsData.reduce((sum, m) => sum + m.championships, 0)} position="center" fill="#ffffff" style={{ fontSize: '32px', fontWeight: 'bold' }} dy={-8} />
                  <Label value="RINGS" position="center" fill="#94a3b8" style={{ fontSize: '10px', letterSpacing: '1px' }} dy={14} />
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ paddingRight: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Peak vs Consistency Matrix">
          <div className="relative h-[320px] mt-2 w-full">
            {/* Quadrant Watermarks */}
            <div className="absolute z-10 top-4 left-28 text-muted text-sm font-bold opacity-30 pointer-events-none uppercase tracking-widest">One-Hit Wonders</div>
            <div className="absolute z-10 top-4 right-8 text-muted text-sm font-bold opacity-30 pointer-events-none uppercase tracking-widest text-right">Dynasty Builders</div>
            <div className="absolute z-10 bottom-20 left-28 text-muted text-sm font-bold opacity-30 pointer-events-none uppercase tracking-widest">Perennial Losers</div>
            <div className="absolute z-10 bottom-20 right-8 text-muted text-sm font-bold opacity-30 pointer-events-none uppercase tracking-widest text-right">Steady Eddies</div>

            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  type="number" 
                  dataKey="averageFinish" 
                  name="Avg Finish" 
                  reversed
                  stroke="rgba(255,255,255,0.4)" 
                  domain={[1, 12]}
                  height={50}
                  label={{ value: 'Avg Finish (Lower is Better)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 13, style: { textAnchor: 'middle' } }}
                />
                <YAxis 
                  type="number" 
                  dataKey="bestSingleSeasonFpts" 
                  name="Peak Pts" 
                  stroke="rgba(255,255,255,0.4)" 
                  domain={['dataMin - 100', 'dataMax + 100']}
                  width={90}
                  label={{ value: 'Peak Pts', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 13, offset: 10, style: { textAnchor: 'middle' } }}
                />
                <ZAxis type="number" range={[100, 100]} />
                <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <ReferenceLine x={avgFinishMean} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <ReferenceLine y={peakMean} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <Scatter name="Managers" data={scatterData} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>

      {/* Leaderboard Table */}
      <Card title="All-Time Leaderboard" className="stagger-4 mb-12">
        <MobileTapHint text="Scroll horizontally to view all stats" />
        
        <div className="overflow-x-auto mt-4 rounded-lg" style={{ border: '1px solid var(--card-border)' }}>
          <table className="standings-table w-full whitespace-nowrap">
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr>
                <th className="text-left px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('managerName')}>
                  Manager <SortIcon column="managerName" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('seasonsPlayed')}>
                  Seasons <SortIcon column="seasonsPlayed" />
                </th>
                <th className="text-center px-4 py-3 text-yellow-400 cursor-pointer select-none group" onClick={() => handleSort('championships')}>
                  Rings <SortIcon column="championships" />
                </th>
                <th className="text-center px-4 py-3 text-pink-400 cursor-pointer select-none group" onClick={() => handleSort('playoffAppearances')}>
                  Playoffs <SortIcon column="playoffAppearances" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('wins')}>
                  Record <SortIcon column="wins" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('winPercentage')}>
                  Win % <SortIcon column="winPercentage" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('averageFinish')}>
                  Avg Finish <SortIcon column="averageFinish" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('totalFpts')}>
                  Points For <SortIcon column="totalFpts" />
                </th>
                <th className="text-center px-4 py-3 cursor-pointer select-none group" onClick={() => handleSort('totalFptsAgainst')}>
                  Points Against <SortIcon column="totalFptsAgainst" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedManagers.map((m, i) => (
                <tr 
                  key={m.ownerId} 
                  className="standings-row hover:bg-white/5 transition-colors"
                  style={{ 
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <td className="team-cell px-4 py-3">
                    <span className="team-rank w-6 inline-block">{i + 1}.</span>
                    {m.avatar ? (
                      <img src={`https://sleepercdn.com/avatars/thumbs/${m.avatar}`} alt="avatar" className="team-avatar inline-block w-8 h-8 rounded-full ml-2 mr-3 border border-white/10" />
                    ) : (
                      <div className="team-avatar-placeholder inline-block w-8 h-8 rounded-full ml-2 mr-3 bg-slate-700"></div>
                    )}
                    <span className="font-medium text-white">{m.managerName}</span>
                  </td>
                  <td className="text-center px-4 py-3 text-muted">{m.seasonsPlayed}</td>
                  <td className="text-center px-4 py-3 font-bold text-yellow-400">{m.championships}</td>
                  <td className="text-center px-4 py-3 font-bold text-pink-400">{m.playoffAppearances}</td>
                  <td className="text-center px-4 py-3 text-gray-300">
                    {m.wins}-{m.losses}{m.ties > 0 ? `-${m.ties}` : ''}
                  </td>
                  <td className="text-center px-4 py-3 font-mono text-accent-color font-bold">{m.winPercentage}%</td>
                  <td className="text-center px-4 py-3 font-mono font-medium">{m.averageFinish}</td>
                  <td className="text-center px-4 py-3 font-mono text-white">{m.totalFpts.toFixed(1)}</td>
                  <td className="text-center px-4 py-3 font-mono text-muted">{m.totalFptsAgainst.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
