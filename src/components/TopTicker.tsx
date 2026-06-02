import React from 'react';
import { useWorldCupMatches } from '../hooks/useWorldCupMatches';
import './TopTicker.css';

const TopTicker: React.FC = () => {
  const { matches, starredIds } = useWorldCupMatches();
  
  const starredMatches = matches.filter(m => starredIds.includes(m.id));

  if (starredMatches.length === 0) {
    return null;
  }

  return (
    <div className="topbar-ticker-wrapper">
      {starredMatches.map(m => (
        <div key={m.id} className="ticker-static-item">
          {m.homeTeam.logo ? (
            <img src={m.homeTeam.logo} alt={m.homeTeam.abbreviation} className="ticker-logo" />
          ) : (
            <span className="ticker-abbr">{m.homeTeam.abbreviation}</span>
          )}
          
          {m.state === 'pre' ? (
            <span className="ticker-time">
              {new Date(m.date).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <>
              <span className="ticker-score">{m.homeTeam.score}</span>
              <span className="ticker-time">{m.status}</span>
              <span className="ticker-score">{m.awayTeam.score}</span>
            </>
          )}
          
          {m.awayTeam.logo ? (
            <img src={m.awayTeam.logo} alt={m.awayTeam.abbreviation} className="ticker-logo" />
          ) : (
            <span className="ticker-abbr">{m.awayTeam.abbreviation}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default TopTicker;
