export interface CompetitorData {
  id: string;
  name: string;
  dataPoints: DataPoint[];
}

export interface DataPoint {
  distance: number; // in km
  time: number; // in seconds
  power: number; // in watts
}

// Sample data for demonstration
export const sampleRaceData: CompetitorData[] = [
  {
    id: '1',
    name: 'Rider A',
    dataPoints: [
      { distance: 0, time: 0, power: 0 },
      { distance: 5, time: 480, power: 250 },
      { distance: 10, time: 960, power: 265 },
      { distance: 15, time: 1470, power: 240 },
      { distance: 20, time: 1980, power: 255 },
      { distance: 25, time: 2520, power: 235 },
      { distance: 30, time: 3060, power: 245 },
    ],
  },
  {
    id: '2',
    name: 'Rider B',
    dataPoints: [
      { distance: 0, time: 0, power: 0 },
      { distance: 5, time: 490, power: 240 },
      { distance: 10, time: 980, power: 255 },
      { distance: 15, time: 1500, power: 230 },
      { distance: 20, time: 2020, power: 245 },
      { distance: 25, time: 2560, power: 225 },
      { distance: 30, time: 3120, power: 235 },
    ],
  },
  {
    id: '3',
    name: 'Rider C',
    dataPoints: [
      { distance: 0, time: 0, power: 0 },
      { distance: 5, time: 470, power: 270 },
      { distance: 10, time: 940, power: 285 },
      { distance: 15, time: 1440, power: 260 },
      { distance: 20, time: 1960, power: 275 },
      { distance: 25, time: 2500, power: 255 },
      { distance: 30, time: 3040, power: 265 },
    ],
  },
  {
    id: '4',
    name: 'Rider D',
    dataPoints: [
      { distance: 0, time: 0, power: 0 },
      { distance: 5, time: 495, power: 235 },
      { distance: 10, time: 1000, power: 250 },
      { distance: 15, time: 1520, power: 225 },
      { distance: 20, time: 2040, power: 240 },
      { distance: 25, time: 2580, power: 220 },
      { distance: 30, time: 3140, power: 230 },
    ],
  },
];
