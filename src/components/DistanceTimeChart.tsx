import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRaceData } from '../contexts/RaceDataContext';
import './DistanceTimeChart.css';

const DistanceTimeChart = () => {
  const { data } = useRaceData();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(data.map(competitor => competitor.category)));
    return ['all', ...cats.sort()];
  }, [data]);

  // Filter data by category
  const filteredData = useMemo(() => {
    if (selectedCategory === 'all') return data;
    return data.filter(competitor => competitor.category === selectedCategory);
  }, [data, selectedCategory]);

  // Transform data for Recharts - combine all competitors' data points
  const chartData = useMemo(() => {
    const chartMap: { [key: number]: { distance: number; [key: string]: number } } = {};
    
    filteredData.forEach(competitor => {
      // Combine xData (distance in km) with x2Data (time in seconds)
      competitor.xData.forEach((distance, index) => {
        if (!chartMap[distance]) {
          chartMap[distance] = { distance };
        }
        if (index < competitor.x2Data.length) {
          // Convert time from seconds to minutes for better readability
          chartMap[distance][competitor.name] = competitor.x2Data[index] / 60;
        }
      });
    });

    return Object.values(chartMap).sort((a, b) => a.distance - b.distance);
  }, [filteredData]);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a28fd6', '#ff6b9d', '#4ecdc4', '#ffe66d'];

  return (
    <section className="chart-section">
      <h2>Distance vs. Time</h2>
      <p className="chart-description">
        This chart shows how much time each rider took to reach various distances throughout the race.
        Lower times indicate faster performance.
      </p>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="category-filter-time" style={{ marginRight: '10px', fontWeight: 'bold' }}>
          Filter by Category:
        </label>
        <select
          id="category-filter-time"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : `Category ${cat}`}
            </option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <LineChart
          data={chartData}
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
          {filteredData.map((competitor, index) => (
            <Line
              key={competitor.zwiftId}
              type="monotone"
              dataKey={competitor.name}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
};

export default DistanceTimeChart;
