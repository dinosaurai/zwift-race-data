import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRaceData } from '../contexts/RaceDataContext';
import './DistancePowerChart.css';

const DistancePowerChart = () => {
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
      // Find the watts dataset
      const wattsDataset = Object.values(competitor.datasets).find(ds => ds.unit === 'watts');
      if (!wattsDataset) return;

      // Combine xData (distance) with watts yData
      competitor.xData.forEach((distance, index) => {
        if (!chartMap[distance]) {
          chartMap[distance] = { distance };
        }
        if (index < wattsDataset.data.length) {
          chartMap[distance][competitor.name] = wattsDataset.data[index];
        }
      });
    });

    return Object.values(chartMap).sort((a, b) => a.distance - b.distance);
  }, [filteredData]);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a28fd6', '#ff6b9d', '#4ecdc4', '#ffe66d'];

  return (
    <section className="chart-section">
      <h2>Distance vs. Power</h2>
      <p className="chart-description">
        This chart displays the power output (in watts) for each rider at different distances.
        Higher power output indicates greater effort and speed.
      </p>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="category-filter-power" style={{ marginRight: '10px', fontWeight: 'bold' }}>
          Filter by Category:
        </label>
        <select
          id="category-filter-power"
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
            label={{ value: 'Power (watts)', angle: -90, position: 'insideLeft' }}
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

export default DistancePowerChart;
