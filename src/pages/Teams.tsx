import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { useLeagueData, calculateFaabEfficiency } from '../hooks/useLeagueData';
import type { FaabEfficiency } from '../hooks/useLeagueData';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Teams: React.FC = () => {
  const LEAGUE_ID = import.meta.env.VITE_LEAGUE_ID as string;
  const { loading, error, seasons } = useLeagueData(LEAGUE_ID);
  const [faabData, setFaabData] = useState<FaabEfficiency[]>([]);

  useEffect(() => {
    if (seasons.length > 0) {
      const currentSeason = seasons[0];
      calculateFaabEfficiency(currentSeason.league.league_id, currentSeason.rosters, currentSeason.rosterToUser)
        .then(setFaabData);
    }
  }, [seasons]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || seasons.length === 0) return null;

  const currentSeason = seasons[0];

  // Prepare data for Scatter Chart (Wins vs FAAB Spent)
  const scatterData = currentSeason.rosters.map(r => {
    const user = currentSeason.rosterToUser[r.roster_id];
    return {
      name: user?.display_name || `Team ${r.roster_id}`,
      wins: r.settings.wins,
      faabSpent: r.settings.waiver_budget_used || 0,
      points: r.settings.fpts
    };
  });

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mb-6">Teams & FAAB Analysis</h1>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card title="FAAB Spent vs Wins" className="stagger-1">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" dataKey="faabSpent" name="FAAB Spent" stroke="#94a3b8" />
                <YAxis type="number" dataKey="wins" name="Wins" stroke="#94a3b8" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Scatter name="Teams" data={scatterData} fill="var(--success-color)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Highest FAAB Spenders" className="stagger-2">
          <div className="flex flex-col gap-4">
            {faabData.slice(0, 5).map((d, i) => (
              <div key={d.roster_id} className="flex justify-between items-center p-3" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div className="flex items-center gap-3">
                  <div className="text-muted font-bold w-4">{i + 1}</div>
                  {d.user?.avatar ? (
                    <img src={`https://sleepercdn.com/avatars/thumbs/${d.user.avatar}`} alt="avatar" className="avatar" width={32} height={32} />
                  ) : (
                    <div className="avatar bg-gray-600" style={{ width: 32, height: 32 }}></div>
                  )}
                  <span>{d.user?.display_name || `Team ${d.roster_id}`}</span>
                </div>
                <div className="font-bold text-success-color">${d.totalFaabSpent}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Team Standings (Current Season)" className="stagger-3">
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
              <th className="p-3 text-muted">Team</th>
              <th className="p-3 text-muted">Record</th>
              <th className="p-3 text-muted">PF</th>
              <th className="p-3 text-muted">PA</th>
            </tr>
          </thead>
          <tbody>
            {[...currentSeason.rosters].sort((a,b) => b.settings.wins - a.settings.wins || b.settings.fpts - a.settings.fpts).map(r => (
              <tr key={r.roster_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td className="p-3 font-semibold">{currentSeason.rosterToUser[r.roster_id]?.display_name || `Team ${r.roster_id}`}</td>
                <td className="p-3">{r.settings.wins}-{r.settings.losses}{r.settings.ties > 0 ? `-${r.settings.ties}` : ''}</td>
                <td className="p-3">{r.settings.fpts + (r.settings.fpts_decimal/100)}</td>
                <td className="p-3">{r.settings.fpts_against + (r.settings.fpts_against_decimal/100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
