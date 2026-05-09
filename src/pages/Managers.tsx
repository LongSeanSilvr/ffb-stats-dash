import React from 'react';
import { Card } from '../components/Card';
import { useLeagueContext } from '../context/LeagueContext';

export const Managers: React.FC = () => {
  const { loading, error, selectedSeason } = useLeagueContext();

  if (loading && !selectedSeason) {
    return (
      <div className="flex justify-center items-center h-full min-h-[60vh]">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !selectedSeason) return null;

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl text-gradient mt-4 mb-10">League Managers ({selectedSeason.league.season})</h1>

      <Card title={`Team Standings`} className="stagger-1 mb-8">
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

      <Card className="stagger-2 text-center py-12 mb-8" style={{ borderStyle: 'dashed' }}>
        <h2 className="text-2xl font-semibold mb-2 text-gradient">Manager Analytics Coming Soon</h2>
        <p className="text-muted text-lg max-w-2xl mx-auto">
          We will soon add deep dives into manager performance across all seasons: PPG, PPG per position, draft value, playoff performance, and more!
        </p>
      </Card>
    </div>
  );
};
