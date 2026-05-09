import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Managers } from './pages/Managers';
import { Faab } from './pages/Faab';
import { Players } from './pages/Players';
import { LeagueProvider } from './context/LeagueContext';

function App() {
  return (
    <LeagueProvider>
      <Router>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/managers" element={<Managers />} />
              <Route path="/faab" element={<Faab />} />
              <Route path="/players" element={<Players />} />
            </Routes>
          </main>
        </div>
      </Router>
    </LeagueProvider>
  );
}

export default App;
