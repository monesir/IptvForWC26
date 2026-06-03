import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LiveTV from './pages/LiveTV';
import WorldCup from './pages/WorldCup';
import Settings from './pages/Settings';
import { WorldCupProvider } from './hooks/WorldCupContext';
import { useIspBypass } from './hooks/useIspBypass';
import { usePreconnect } from './hooks/usePreconnect';

const App: React.FC = () => {
  useIspBypass();
  usePreconnect();

  return (
    <WorldCupProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<LiveTV />} />
            <Route path="worldcup" element={<WorldCup />} />
            <Route path="series" element={<div><h2>مسلسلات وأفلام</h2></div>} />
            <Route path="favorites" element={<div><h2>المفضلة</h2></div>} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
    </WorldCupProvider>
  );
};

export default App;
