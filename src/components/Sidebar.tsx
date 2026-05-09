import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserCircle } from 'lucide-react';
import { useLeagueContext } from '../context/LeagueContext';

export const Sidebar: React.FC = () => {
  const { seasons, selectedSeasonId, setSelectedSeasonId, loading } = useLeagueContext();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <LayoutDashboard className="text-accent" />
        <span>Sleeper Dash</span>
      </div>
      
      <nav className="sidebar-nav mb-8">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>
        <NavLink to="/teams" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          Teams & FAAB
        </NavLink>
        <NavLink to="/players" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <UserCircle size={20} />
          Players
        </NavLink>
      </nav>

      <div className="mt-auto">
        <h4 className="text-sm text-muted text-uppercase mb-3">Loaded Seasons</h4>
        <div className="flex flex-col gap-2">
          {seasons.map((season) => (
            <button
              key={season.league.league_id}
              onClick={() => setSelectedSeasonId(season.league.league_id)}
              className={`nav-item text-left w-full cursor-pointer ${
                selectedSeasonId === season.league.league_id ? 'active' : ''
              }`}
            >
              {season.league.season} Season
            </button>
          ))}
          {loading && <div className="text-sm text-muted px-4 py-2">Loading seasons...</div>}
        </div>
      </div>
    </aside>
  );
};
