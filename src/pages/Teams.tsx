import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { calculateFaabEfficiency } from '../hooks/useLeagueData';
import { useLeagueContext } from '../context/LeagueContext';
import type { FaabEfficiency } from '../hooks/useLeagueData';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 28;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  
  if (!cx || !cy) return null;
  
  return (
    <svg x={cx - size/2} y={cy - size/2} width={size} height={size}>
      <defs>
        <clipPath id={`clip-${payload.name}`}>
          <circle cx={size/2} cy={size/2} r={size/2} />
        </clipPath>
      </defs>
      {avatarUrl ? (
        <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#clip-${payload.name})`} />
      ) : (
        <circle cx={size/2} cy={size/2} r={size/2} fill="#475569" />
      )}
    </svg>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-3 mb-2">
          {data.avatar ? (
            <img src={`https://sleepercdn.com/avatars/thumbs/${data.avatar}`} alt="avatar" className="avatar" width={24} height={24} />
          ) : (
             <div className="avatar bg-gray-600" style={{ width: 24, height: 24 }}></div>
          )}
          <span className="font-bold text-lg">{data.name}</span>
        </div>
        <div className="text-sm text-muted">Wins: <span className="text-success-color font-bold ml-1">{data.wins}</span></div>
        <div className="text-sm text-muted">FAAB Spent: <span className="text-white font-bold ml-1">${data.faabSpent}</span></div>
      </div>
    );
  }
  return null;
};

export const Teams: React.FC = () => {
  const { loading, error, selectedSeason } = useLeagueContext();
  const [faabData, setFaabData] = useState<FaabEfficiency[]>([]);

  useEffect(() => {
    if (selectedSeason) {
      calculateFaabEfficiency(selectedSeason.league.league_id, selectedSeason.rosters, selectedSeason.rosterToUser)
        .then(setFaabData);
    }
  }, [selectedSeason]);

  if (loading && !selectedSeason) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !selectedSeason) return null;

  // Prepare data for Scatter Chart (Wins vs FAAB Spent)
  const scatterData = selectedSeason.rosters.map(r => {
    const user = selectedSeason.rosterToUser[r.roster_id];
    return {
      name: user?.display_name || `Team ${r.roster_id}`,
      avatar: user?.avatar,
      wins: r.settings.wins,
      faabSpent: r.settings.waiver_budget_used || 0,
      points: r.settings.fpts
    };
  });

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mt-4 mb-10">Teams & FAAB Analysis</h1>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <Card title="FAAB Spent vs Wins" className="stagger-1">
          <div style={{ height: 350, marginTop: '2rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="faabSpent" name="FAAB Spent" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis type="number" dataKey="wins" name="Wins" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter name="Teams" data={scatterData} shape={<CustomAvatarDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="FAAB Spending Breakdown" className="stagger-2">
          <div className="flex flex-col gap-4 overflow-y-auto pr-4 mt-6" style={{ height: '350px' }}>
            {faabData.map((d, i) => (
              <div key={d.roster_id} className="flex justify-between items-center p-4 transition-all" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <div className="flex items-center gap-4">
                  <div className="text-muted font-bold w-6 text-right">{i + 1}.</div>
                  {d.user?.avatar ? (
                    <img src={`https://sleepercdn.com/avatars/thumbs/${d.user.avatar}`} alt="avatar" className="avatar shadow-lg" width={36} height={36} />
                  ) : (
                    <div className="avatar bg-gray-600 shadow-lg" style={{ width: 36, height: 36 }}></div>
                  )}
                  <span className="font-semibold text-lg">{d.user?.display_name || `Team ${d.roster_id}`}</span>
                </div>
                <div className="font-bold text-success-color text-lg">${d.totalFaabSpent}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title={`Team Standings (${selectedSeason.league.season} Season)`} className="stagger-3 mt-8">
        <div className="overflow-hidden rounded-lg mt-6" style={{ border: '1px solid var(--card-border)' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr>
                <th className="p-4 text-muted text-sm text-uppercase">Team</th>
                <th className="p-4 text-muted text-sm text-uppercase">Record</th>
                <th className="p-4 text-muted text-sm text-uppercase">PF</th>
                <th className="p-4 text-muted text-sm text-uppercase">PA</th>
              </tr>
            </thead>
            <tbody>
              {[...selectedSeason.rosters].sort((a,b) => b.settings.wins - a.settings.wins || b.settings.fpts - a.settings.fpts).map((r, i) => (
                <tr key={r.roster_id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td className="p-4 font-semibold flex items-center gap-3">
                    <span className="text-muted text-sm w-4">{i + 1}.</span>
                    {selectedSeason.rosterToUser[r.roster_id]?.display_name || `Team ${r.roster_id}`}
                  </td>
                  <td className="p-4 text-lg">{r.settings.wins}-{r.settings.losses}{r.settings.ties > 0 ? `-${r.settings.ties}` : ''}</td>
                  <td className="p-4 font-mono text-accent-color">{(r.settings.fpts + (r.settings.fpts_decimal/100)).toFixed(2)}</td>
                  <td className="p-4 font-mono text-muted">{(r.settings.fpts_against + (r.settings.fpts_against_decimal/100)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
