import { useState, useEffect } from 'react';

export interface Team {
  abbreviation: string;
  logo: string;
  score: string;
}

export interface Match {
  id: string;
  name: string;
  shortName: string;
  status: string;
  state: 'pre' | 'in' | 'post'; // pre=not started, in=live, post=finished
  date: string;
  homeTeam: Team;
  awayTeam: Team;
}
export interface StandingTeam {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  played: number;
  wins: number;
  ties: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  points: number;
  rank: number;
}

export interface GroupStanding {
  id: string;
  name: string;
  standings: StandingTeam[];
}

const STORAGE_KEY = 'wc_starred_matches';

export function useWorldCupMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<GroupStanding[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStarred = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setStarredIds(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load starred matches', e);
    }
  };

  // Load starred matches from localStorage on mount and listen to changes
  useEffect(() => {
    loadStarred();
    window.addEventListener('wc_stars_changed', loadStarred);
    return () => window.removeEventListener('wc_stars_changed', loadStarred);
  }, []);

  const toggleStar = (id: string) => {
    setStarredIds(prev => {
      const newIds = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds));
      window.dispatchEvent(new Event('wc_stars_changed'));
      return newIds;
    });
  };

  const fetchMatches = async () => {
    try {
      // URL for FIFA World Cup matches (fetch all 104 matches for the 2026 tournament)
      const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260601-20260731&limit=200');
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();

      const parsedMatches: Match[] = (data.events || []).map((event: any) => {
        const comp = event.competitions[0];
        // competitors[0] is usually Home, competitors[1] is Away (ESPN sometimes puts home first or second, but we just take them)
        const team1 = comp.competitors[0];
        const team2 = comp.competitors[1];

        return {
          id: event.id,
          name: event.name,
          shortName: event.shortName,
          status: event.status.type.shortDetail,
          state: event.status.type.state,
          date: event.date,
          homeTeam: {
            abbreviation: team1.team.abbreviation || team1.team.name?.substring(0, 3).toUpperCase(),
            logo: team1.team.logo,
            score: team1.score || '0'
          },
          awayTeam: {
            abbreviation: team2.team.abbreviation || team2.team.name?.substring(0, 3).toUpperCase(),
            logo: team2.team.logo,
            score: team2.score || '0'
          }
        };
      });

      setMatches(parsedMatches);
    } catch (error) {
      console.error('Failed to fetch World Cup matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStandings = async () => {
    try {
      const res = await fetch('https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings');
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      const parsedGroups: GroupStanding[] = (data.children || []).map((group: any) => {
        return {
          id: group.id || group.uid,
          name: group.name, // e.g. "Group A"
          standings: (group.standings?.entries || []).map((entry: any) => {
            const stats = entry.stats || [];
            const getStat = (type: string) => stats.find((s: any) => s.type === type)?.value || 0;
            
            return {
              id: entry.team.id,
              name: entry.team.name,
              abbreviation: entry.team.abbreviation,
              logo: entry.team.logos?.[0]?.href || '',
              played: getStat('gamesplayed'),
              wins: getStat('wins'),
              ties: getStat('ties'),
              losses: getStat('losses'),
              pointsFor: getStat('pointsfor'),
              pointsAgainst: getStat('pointsagainst'),
              points: getStat('points'),
              rank: getStat('rank') || 0
            };
          }).sort((a: StandingTeam, b: StandingTeam) => a.rank - b.rank)
        };
      });
      setGroups(parsedGroups);
    } catch (error) {
      console.error('Failed to fetch World Cup standings:', error);
    }
  };

  useEffect(() => {
    fetchMatches();
    fetchStandings();
    // Poll every 60 seconds
    const interval = setInterval(() => {
      fetchMatches();
      fetchStandings();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return { matches, groups, starredIds, toggleStar, loading };
}
