import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Managers } from './pages/Managers';
import { Faab } from './pages/Faab';
import { Draft } from './pages/Draft';
import { Trades } from './pages/Trades';
import { FreeAgency } from './pages/FreeAgency';
import Playoffs from './pages/Playoffs';
import { LeagueProvider } from './context/LeagueContext';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <LeagueProvider>
      <Router>
        <div className="app-container relative">
          {/* Mobile Header */}
          <header className="md:hidden fixed top-0 left-0 right-0 h-16 z-50 flex items-center gap-4 px-5" 
                  style={{ 
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(15, 17, 21, 0.8)', 
                    backdropFilter: 'blur(12px)', 
                    WebkitBackdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    zIndex: 990
                  }}>
            <button 
              onClick={() => setSidebarOpen(true)} 
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                padding: '8px',
                marginLeft: '-8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none'
              }}
            >
              <Menu size={26} strokeWidth={1.5} />
            </button>
            <div className="flex items-center gap-4">
              <img src="/logo_clean.png?v=6" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', objectFit: 'cover' }} alt="logo" />
              <span className="font-bold text-lg tracking-tight text-gradient ml-1">Morty Stats</span>
            </div>
          </header>

          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Managers />} />
              <Route path="/managers" element={<Managers />} />
              <Route path="/draft" element={<Draft />} />
              <Route path="/trades" element={<Trades />} />
              <Route path="/faab" element={<Faab />} />
              <Route path="/freeagency" element={<FreeAgency />} />
              <Route path="/playoffs" element={<Playoffs />} />
            </Routes>
          </main>
        </div>
      </Router>
    </LeagueProvider>
  );
}

export default App;

