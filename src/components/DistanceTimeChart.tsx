import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRaceData } from '../contexts/RaceDataContext';
import './DistanceTimeChart.css';

const DistanceTimeChart = () => {
  const { data } = useRaceData();

  // Transform data for Recharts - combine all competitors' data points
  const chartData: { [key: number]: { distance: number; [key: string]: number } } = {};
  
  data.forEach(competitor => {
    competitor.dataPoints.forEach(point => {
      if (!chartData[point.distance]) {
        chartData[point.distance] = { distance: point.distance };
      }
      // Convert time from seconds to minutes for better readability
      chartData[point.distance][competitor.name] = point.time / 60;
    });
  });

  const chartValues = Object.values(chartData);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  return (
    <section className="chart-section">
      <h2>Distance vs. Time</h2>
      <p className="chart-description">
        This chart shows how much time each rider took to reach various distances throughout the race.
        Lower times indicate faster performance.
      </p>
      <ResponsiveContainer width="100%" height={500}>
        <LineChart
          data={chartValues}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="distance" 
            label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            label={{ value: 'Time (minutes)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip />
          <Legend />
          {data.map((competitor, index) => (
            <Line
              key={competitor.id}
              type="monotone"
              dataKey={competitor.name}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
};

export default DistanceTimeChart;
