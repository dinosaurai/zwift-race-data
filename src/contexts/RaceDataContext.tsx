/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react';
import { type CompetitorData, sampleRaceData } from '../data/sampleData';

interface RaceDataContextType {
  competitors: CompetitorData[];
}

const RaceDataContext = createContext<RaceDataContextType | undefined>(undefined);

export const RaceDataProvider = ({ children }: { children: ReactNode }) => {
  const value = {
    competitors: sampleRaceData,
  };

  return (
    <RaceDataContext.Provider value={value}>
      {children}
    </RaceDataContext.Provider>
  );
};

export const useRaceData = () => {
  const context = useContext(RaceDataContext);
  if (context === undefined) {
    throw new Error('useRaceData must be used within a RaceDataProvider');
  }
  return context;
};
