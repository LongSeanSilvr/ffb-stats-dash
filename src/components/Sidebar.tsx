import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserCircle, Target, DollarSign, Repeat, Zap } from 'lucide-react';
import { useLeagueContext } from '../context/LeagueContext';

export const Sidebar: React.FC = () => {
  const { seasons, selectedSeasonId, setSelectedSeasonId, loading } = useLeagueContext();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo pt-4">
        <LayoutDashboard className="text-accent" />
        <span>Morty Stats</span>
      </div>

      <nav className="sidebar-nav mb-8">

        <NavLink to="/managers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <UserCircle size={20} />
          League Managers
        </NavLink>
        <NavLink to="/draft" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Target size={20} />
          Draft Analysis
        </NavLink>
        <NavLink to="/faab" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <DollarSign size={20} />
          FAAB Analysis
        </NavLink>
        <NavLink to="/trades" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Repeat size={20} />
          Trade Analysis
        </NavLink>
        <NavLink to="/freeagency" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Zap size={20} />
          Free Agency
        </NavLink>
        <NavLink to="/players" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          Player Deep Dives
        </NavLink>
      </nav>

      <div className="seasons-panel flex flex-col min-h-0">
        <h4 className="text-sm text-muted text-uppercase mb-3">Seasons</h4>
        <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: '35vh' }}>
          {seasons.map((season) => (
            <button
              key={season.league.league_id}
              onClick={() => setSelectedSeasonId(season.league.league_id)}
              className={`season-btn ${selectedSeasonId === season.league.league_id ? 'active' : ''
                }`}
            >
              {season.league.season}
            </button>
          ))}
          {loading && <div className="text-sm text-muted py-2">Loading...</div>}
        </div>
      </div>
    </aside>
  );
};
