import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';

const Layout: React.FC = () => {
  return (
    <div className="app-container">
      <TopBar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
