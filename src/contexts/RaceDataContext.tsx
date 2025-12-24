/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { type CompetitorData, sampleRaceData } from '../data/sampleData';

interface RaceDataContextType {
  data: CompetitorData[];
  setData: React.Dispatch<React.SetStateAction<CompetitorData[]>>;
}

const RaceDataContext = createContext<RaceDataContextType | undefined>(undefined);

export const RaceDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<CompetitorData[]>(sampleRaceData);

  return (
    <RaceDataContext.Provider value={{data, setData}}>
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
