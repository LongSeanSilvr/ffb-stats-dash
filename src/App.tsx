import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Managers } from './pages/Managers';
import { Faab } from './pages/Faab';
import { Draft } from './pages/Draft';
import { Trades } from './pages/Trades';
import { FreeAgency } from './pages/FreeAgency';
import { LeagueProvider } from './context/LeagueContext';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <LeagueProvider>
      <Router>
        <div className="app-container relative">
          {/* Mobile Header */}
          <header className="md:hidden sticky top-0 h-16 bg-[#0f1115]/95 backdrop-blur z-50 border-b border-white/10 px-4 flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-white/70 hover:text-white -ml-2">
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <img src="/favicon.svg?v=5" style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="logo" />
              <span className="font-bold text-white">Morty Stats</span>
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
            </Routes>
          </main>
        </div>
      </Router>
    </LeagueProvider>
  );
}

export default App;

