import React from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const { loading, error, selectedSeason, seasons } = useLeagueContext();

  if (loading && !selectedSeason) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !selectedSeason) {
    return <div className="text-danger-color">Error loading data: {error}</div>;
  }

  const { league, rosters, rosterToUser } = selectedSeason;

  // Prepare data for chart
  const pointsData = rosters.map(r => ({
    name: rosterToUser[r.roster_id]?.display_name || `Team ${r.roster_id}`,
    points: r.settings.fpts + (r.settings.fpts_decimal / 100),
  })).sort((a, b) => b.points - a.points);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mb-6">{league.name} - {league.season} Season</h1>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="stagger-1 text-center">
          <div className="text-muted text-sm text-uppercase">Total Teams</div>
          <div className="stat-value">{league.total_rosters}</div>
        </Card>
        <Card className="stagger-2 text-center">
          <div className="text-muted text-sm text-uppercase">Status</div>
          <div className="stat-value capitalize">{league.status}</div>
        </Card>
        <Card className="stagger-3 text-center">
          <div className="text-muted text-sm text-uppercase">Historical Seasons Loaded</div>
          <div className="stat-value">{seasons.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card title={`Total Points Scored (${league.season} Season)`} className="stagger-1">
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pointsData}>
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(15,17,21,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="points" fill="var(--accent-color)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
