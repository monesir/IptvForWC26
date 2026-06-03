import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiTv, FiSettings, FiStar } from 'react-icons/fi';
import TopTicker from '../TopTicker';
import './TopBar.css';

const TopBar: React.FC = () => {
  return (
    <div className="topbar">
      <div className="topbar-logo">
        <FiTv size={24} />
        <h2>IPTV Player</h2>
      </div>

      <nav className="topbar-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FiTv /> مباشر
        </NavLink>
        <NavLink to="/worldcup" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <img src="https://flagcdn.com/w20/sa.png" alt="KSA" style={{ width: '20px', borderRadius: '2px' }} /> المونديال
        </NavLink>
        <NavLink to="/favorites" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FiStar /> المفضلة
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FiSettings /> الإعدادات
        </NavLink>
      </nav>

      <div className="topbar-right-area">
        <TopTicker />
      </div>
    </div>
  );
};

export default TopBar;


