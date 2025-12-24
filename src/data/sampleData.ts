export interface DatasetItem {
  unit: string;
  data: number[];
}

export interface CompetitorData {
  zwiftId: string;
  name: string;
  category: string;
  flag: string;
  ftp: number;
  weight: number;
  age: string;
  vars: { start: number };
  xData: number[]; // distance in km
  x2Data: number[]; // time in seconds
  datasets: DatasetItem[];
}
