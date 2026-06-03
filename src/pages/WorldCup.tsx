import React, { useState } from 'react';
import { useWorldCup } from '../hooks/WorldCupContext';
import './WorldCup.css';

const WorldCup: React.FC = () => {
  const { matches, groups, starredIds, toggleStar, loading } = useWorldCup();
  const [activeTab, setActiveTab] = useState<'matches' | 'groups' | 'knockouts'>('groups');

  const getKnockoutRound = (dateStr: string) => {
    const d = new Date(dateStr);
    const m = d.getMonth() + 1; // 1-12
    const day = d.getDate();
    if (m === 7 && day === 19) return '🏆 النهائي';
    if (m === 7 && day === 18) return '🥉 المركز الثالث';
    if (m === 7 && (day >= 14 && day <= 15)) return '🔻 نصف النهائي';
    if (m === 7 && (day >= 9 && day <= 11)) return '🔻 ربع النهائي';
    if (m === 7 && (day >= 4 && day <= 7)) return '🔻 دور الـ 16';
    if ((m === 6 && day >= 28) || (m === 7 && day <= 3)) return '🔻 دور الـ 32';
    return null;
  };

  const knockoutGroupsRecord: Record<string, typeof matches> = {
    '🏆 النهائي': [],
    '🥉 المركز الثالث': [],
    '🔻 نصف النهائي': [],
    '🔻 ربع النهائي': [],
    '🔻 دور الـ 16': [],
    '🔻 دور الـ 32': []
  };

  matches.forEach(m => {
    const round = getKnockoutRound(m.date);
    if (round) knockoutGroupsRecord[round].push(m);
  });

  const knockoutGroupKeys = ['🏆 النهائي', '🥉 المركز الثالث', '🔻 نصف النهائي', '🔻 ربع النهائي', '🔻 دور الـ 16', '🔻 دور الـ 32'];
  const hasKnockouts = knockoutGroupKeys.some(k => knockoutGroupsRecord[k].length > 0);

  if (loading) {
    return <div className="status-screen">جاري تحميل مباريات كأس العالم...</div>;
  }

  return (
    <div className="worldcup-page">
      <div className="wc-header">
        <h2>مباريات كأس العالم 2026</h2>
        <p>اضغط على النجمة لمتابعة نتائج مبارياتك المفضلة لحظة بلحظة عبر الشريط العلوي.</p>
      </div>

      <div className="wc-tabs">
        <button 
          className={`wc-tab-btn ${activeTab === 'knockouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('knockouts')}
        >
          الأدوار الإقصائية
        </button>
        <button 
          className={`wc-tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          المجموعات
        </button>
        <button 
          className={`wc-tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          المباريات
        </button>
      </div>

      {activeTab === 'matches' ? (
        matches.length === 0 ? (
          <div className="status-screen">لا توجد مباريات لكأس العالم اليوم.</div>
        ) : (
          <div className="wc-matches-grid">
            {matches.map(m => (
              <div key={m.id} className={`wc-match-card ${starredIds.includes(m.id) ? 'starred' : ''}`}>
                <div className="match-card-header">
                  <span className={`match-status-badge ${m.state === 'in' ? 'live' : ''}`}>
                    {m.state === 'in' ? `مباشر | ${m.status}` : m.state === 'pre' ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', direction: 'rtl' }}>
                        <span>{new Date(m.date).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh', month: 'short', day: 'numeric' })}</span>
                        <span style={{ opacity: 0.7 }}>|</span>
                        <span dir="ltr">{new Date(m.date).toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ) : m.status}
                  </span>
                  <button className="star-btn-large" onClick={() => toggleStar(m.id)} title="إضافة للشريط العلوي">
                    {starredIds.includes(m.id) ? '⭐' : '☆'}
                  </button>
                </div>
                
                <div className="match-card-body">
                  <div className="team-col">
                    {m.homeTeam.logo ? <img src={m.homeTeam.logo} alt={m.homeTeam.abbreviation} className="team-logo"/> : <div className="team-logo-ph">{m.homeTeam.abbreviation[0]}</div>}
                    <span className="team-name">{m.homeTeam.abbreviation}</span>
                  </div>
                  
                  <div className="score-col">
                    {m.state === 'pre' ? (
                      <span className="score" style={{ color: 'var(--text-secondary)' }}>VS</span>
                    ) : (
                      <span className="score" dir="ltr">{m.homeTeam.score} - {m.awayTeam.score}</span>
                    )}
                  </div>

                  <div className="team-col">
                    {m.awayTeam.logo ? <img src={m.awayTeam.logo} alt={m.awayTeam.abbreviation} className="team-logo"/> : <div className="team-logo-ph">{m.awayTeam.abbreviation[0]}</div>}
                    <span className="team-name">{m.awayTeam.abbreviation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'knockouts' ? (
        !hasKnockouts ? (
          <div className="status-screen">لا توجد مباريات للأدوار الإقصائية حالياً.</div>
        ) : (
          <div className="wc-knockouts-container">
            {['🔻 دور الـ 32', '🔻 دور الـ 16', '🔻 ربع النهائي', '🔻 نصف النهائي', '🥉 المركز الثالث', '🏆 النهائي'].map(roundTitle => {
              const roundMatches = knockoutGroupsRecord[roundTitle];
              if (!roundMatches || roundMatches.length === 0) return null;
              
              return (
                <div key={roundTitle} className="wc-knockout-round">
                  <h3 className="wc-round-title">{roundTitle}</h3>
                  <div className="wc-matches-grid">
                    {roundMatches.map(m => (
                      <div key={m.id} className={`wc-match-card ${starredIds.includes(m.id) ? 'starred' : ''}`}>
                        <div className="match-card-header">
                          <span className={`match-status-badge ${m.state === 'in' ? 'live' : ''}`}>
                            {m.state === 'in' ? `مباشر | ${m.status}` : m.state === 'pre' ? (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', direction: 'rtl' }}>
                                <span>{new Date(m.date).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh', month: 'short', day: 'numeric' })}</span>
                                <span style={{ opacity: 0.7 }}>|</span>
                                <span dir="ltr">{new Date(m.date).toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ) : m.status}
                          </span>
                          <button className="star-btn-large" onClick={() => toggleStar(m.id)} title="إضافة للشريط العلوي">
                            {starredIds.includes(m.id) ? '⭐' : '☆'}
                          </button>
                        </div>
                        
                        <div className="match-card-body">
                          <div className="team-col">
                            {m.homeTeam.logo ? <img src={m.homeTeam.logo} alt={m.homeTeam.abbreviation} className="team-logo"/> : <div className="team-logo-ph">{m.homeTeam.abbreviation[0] || '?'}</div>}
                            <span className="team-name">{m.homeTeam.abbreviation || 'TBD'}</span>
                          </div>
                          
                          <div className="score-col">
                            {m.state === 'pre' ? (
                              <span className="score" style={{ color: 'var(--text-secondary)' }}>VS</span>
                            ) : (
                              <span className="score" dir="ltr">{m.homeTeam.score} - {m.awayTeam.score}</span>
                            )}
                          </div>

                          <div className="team-col">
                            {m.awayTeam.logo ? <img src={m.awayTeam.logo} alt={m.awayTeam.abbreviation} className="team-logo"/> : <div className="team-logo-ph">{m.awayTeam.abbreviation[0] || '?'}</div>}
                            <span className="team-name">{m.awayTeam.abbreviation || 'TBD'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        groups.length === 0 ? (
          <div className="status-screen">لا توجد بيانات للمجموعات حالياً.</div>
        ) : (
          <div className="wc-groups-grid">
            {groups.map(g => (
              <div key={g.id} className="wc-group-card">
                <div className="wc-group-header">{g.name}</div>
                <table className="wc-group-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th style={{ textAlign: 'right' }}>المنتخب</th>
                      <th title="لعب">P</th>
                      <th title="فاز">W</th>
                      <th title="تعادل">D</th>
                      <th title="خسر">L</th>
                      <th title="فارق الأهداف">GD</th>
                      <th title="النقاط">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.standings.map((team, idx) => (
                      <tr key={team.id}>
                        <td>{idx + 1}</td>
                        <td className="team-cell">
                          {team.logo && <img src={team.logo} alt={team.abbreviation} className="team-logo" />}
                          <span>{team.abbreviation}</span>
                        </td>
                        <td>{team.played}</td>
                        <td>{team.wins}</td>
                        <td>{team.ties}</td>
                        <td>{team.losses}</td>
                        <td dir="ltr">{team.pointsFor - team.pointsAgainst > 0 ? `+${team.pointsFor - team.pointsAgainst}` : team.pointsFor - team.pointsAgainst}</td>
                        <td style={{ fontWeight: 'bold' }}>{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default WorldCup;
