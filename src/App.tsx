import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Managers } from './pages/Managers';
import { Faab } from './pages/Faab';
import { Draft } from './pages/Draft';
import { Trades } from './pages/Trades';
import { Players } from './pages/Players';
import { FreeAgency } from './pages/FreeAgency';
import { LeagueProvider } from './context/LeagueContext';

function App() {
  return (
    <LeagueProvider>
      <Router>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Managers />} />
              <Route path="/managers" element={<Managers />} />
              <Route path="/draft" element={<Draft />} />
              <Route path="/trades" element={<Trades />} />
              <Route path="/faab" element={<Faab />} />
              <Route path="/freeagency" element={<FreeAgency />} />
              <Route path="/players" element={<Players />} />
            </Routes>
          </main>
        </div>
      </Router>
    </LeagueProvider>
  );
}

export default App;

