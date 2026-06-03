import React, { createContext, useContext } from 'react';
import { useWorldCupMatches } from './useWorldCupMatches';
import type { Match, GroupStanding } from './useWorldCupMatches';

interface WorldCupContextType {
  matches: Match[];
  groups: GroupStanding[];
  starredIds: string[];
  toggleStar: (id: string) => void;
  loading: boolean;
}

const WorldCupContext = createContext<WorldCupContextType>({
  matches: [],
  groups: [],
  starredIds: [],
  toggleStar: () => {},
  loading: true,
});

export const WorldCupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useWorldCupMatches();
  return (
    <WorldCupContext.Provider value={value}>
      {children}
    </WorldCupContext.Provider>
  );
};

export const useWorldCup = () => useContext(WorldCupContext);
