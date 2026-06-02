import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LiveTV from './pages/LiveTV';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LiveTV />} />
          <Route path="series" element={<div><h2>مسلسلات وأفلام</h2></div>} />
          <Route path="favorites" element={<div><h2>المفضلة</h2></div>} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
