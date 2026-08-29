import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { UserCircle, Target, DollarSign, Repeat, Zap, Trophy, BookOpen, MessageSquarePlus, Crosshair } from 'lucide-react';
import { useLeagueContext } from '../context/LeagueContext';
import { FeedbackModal } from './FeedbackModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { seasons, selectedSeasonId, setSelectedSeasonId, loading } = useLeagueContext();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo pt-4">
          <img src="/logo_clean.png?v=6" style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="logo" />
          <span>Morty Stats</span>
        </div>

        <nav className="sidebar-nav mb-6">
          <NavLink to="/" end onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <UserCircle size={20} />
            League Managers
          </NavLink>
          <NavLink to="/playoffs" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Trophy size={20} />
            Playoffs
          </NavLink>
          <NavLink to="/draft" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Target size={20} />
            Draft Analysis
          </NavLink>
          <NavLink to="/faab" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <DollarSign size={20} />
            FAAB Analysis
          </NavLink>
          <NavLink to="/trades" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Repeat size={20} />
            Trade Analysis
          </NavLink>
          <NavLink to="/freeagency" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Zap size={20} />
            Free Agency
          </NavLink>
          <NavLink to="/recordbook" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BookOpen size={20} />
            Record Book
          </NavLink>
          <NavLink to="/players" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Crosshair size={20} />
            Player Evaluation
          </NavLink>
        </nav>

        <div className="seasons-panel flex flex-col min-h-0 mb-4">
          <h4 className="text-sm text-muted text-uppercase mb-3">Seasons</h4>
          <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: '28vh' }}>
            {seasons.map((season) => (
              <button
                key={season.league.league_id}
                onClick={() => { setSelectedSeasonId(season.league.league_id); onClose(); }}
                className={`season-btn ${selectedSeasonId === season.league.league_id ? 'active' : ''}`}
              >
                {season.league.season}
              </button>
            ))}
            {loading && <div className="text-sm text-muted py-2">Loading...</div>}
          </div>
        </div>

        {/* Feedback & Feature Requests Action */}
        <div className="mt-auto pt-3 border-t border-white/10">
          <button
            onClick={() => {
              setIsFeedbackOpen(true);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-xs font-semibold text-muted hover:text-white transition-all cursor-pointer group shadow-sm"
          >
            <MessageSquarePlus size={15} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Feedback & Requests</span>
          </button>
        </div>
      </aside>

      {/* Portaled Feedback Modal */}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </>
  );
};
