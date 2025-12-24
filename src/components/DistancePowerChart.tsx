import { useState, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { useRaceData } from '../contexts/RaceDataContext';
import './DistancePowerChart.css';

const DistancePowerChart = () => {
  const { data } = useRaceData();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refAreaLeft, setRefAreaLeft] = useState<string | number>('');
  const [refAreaRight, setRefAreaRight] = useState<string | number>('');
  const [zoomDomain, setZoomDomain] = useState<{ left: number | 'auto'; right: number | 'auto' }>({ left: 'auto', right: 'auto' });
  const [wattsPerKilo, setWattsPerKilo] = useState<boolean>(false);
  const chartRef = useRef<any>(null);

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
    const isZoomed = zoomDomain.left !== 'auto' || zoomDomain.right !== 'auto';
    
    // First, collect all unique distance points across all competitors
    const allDistances = new Set<number>();
    filteredData.forEach(competitor => {
      competitor.xData.forEach(distance => allDistances.add(distance));
    });
    const sortedDistances = Array.from(allDistances).sort((a, b) => a - b);
    
    // Determine if we should reduce points (only when not zoomed and lots of data)
    const shouldReduce = !isZoomed && sortedDistances.length > 200;
    const targetDistances = shouldReduce 
      ? sortedDistances.filter((_, i) => i % Math.ceil(sortedDistances.length / 150) === 0)
      : sortedDistances;
    
    // Build chart data with interpolation for missing points
    const chartMap: { [key: number]: { distance: number; [key: string]: number } } = {};
    
    filteredData.forEach(competitor => {
      const wattsDataset = Object.values(competitor.datasets).find(ds => ds.unit === 'watts');
      if (!wattsDataset) return;

      // Create a map of distance to power for this competitor
      const distanceToPower = new Map<number, number>();
      competitor.xData.forEach((distance, index) => {
        if (index < wattsDataset.data.length) {
          distanceToPower.set(distance, wattsDataset.data[index]);
        }
      });

      // For each target distance, interpolate if needed
      targetDistances.forEach(targetDist => {
        if (!chartMap[targetDist]) {
          chartMap[targetDist] = { distance: targetDist };
        }

        // If we have exact value, use it
        if (distanceToPower.has(targetDist)) {
          const power = distanceToPower.get(targetDist)!;
          chartMap[targetDist][competitor.name] = wattsPerKilo ? power / competitor.weight : power;
        } else {
          // Otherwise, interpolate between nearest points
          const sortedDists = Array.from(distanceToPower.keys()).sort((a, b) => a - b);
          const lowerIdx = sortedDists.findIndex(d => d > targetDist) - 1;
          
          if (lowerIdx >= 0 && lowerIdx < sortedDists.length - 1) {
            const d1 = sortedDists[lowerIdx];
            const d2 = sortedDists[lowerIdx + 1];
            const p1 = distanceToPower.get(d1)!;
            const p2 = distanceToPower.get(d2)!;
            const ratio = (targetDist - d1) / (d2 - d1);
            const power = p1 + (p2 - p1) * ratio;
            chartMap[targetDist][competitor.name] = wattsPerKilo ? power / competitor.weight : power;
          } else if (lowerIdx >= 0) {
            // Use the last known value
            const power = distanceToPower.get(sortedDists[lowerIdx])!;
            chartMap[targetDist][competitor.name] = wattsPerKilo ? power / competitor.weight : power;
          } else if (sortedDists.length > 0) {
            // Use the first known value
            const power = distanceToPower.get(sortedDists[0])!;
            chartMap[targetDist][competitor.name] = wattsPerKilo ? power / competitor.weight : power;
          }
        }
      });
    });

    const result = Object.values(chartMap).sort((a, b) => a.distance - b.distance);
    
    // If zoomed, filter to only show data in the zoomed range
    if (isZoomed) {
      const leftBound = zoomDomain.left === 'auto' ? -Infinity : zoomDomain.left;
      const rightBound = zoomDomain.right === 'auto' ? Infinity : zoomDomain.right;
      return result.filter(d => d.distance >= leftBound && d.distance <= rightBound);
    }
    
    return result;
  }, [filteredData, zoomDomain, wattsPerKilo]);

  // Calculate Y-axis domain based on visible data
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto'];
    
    const allValues: number[] = [];
    chartData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'distance' && typeof point[key] === 'number') {
          allValues.push(point[key]);
        }
      });
    });
    
    if (allValues.length === 0) return ['auto', 'auto'];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;
    
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a28fd6', '#ff6b9d', '#4ecdc4', '#ffe66d'];

  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    // Ensure left is smaller than right
    let left = refAreaLeft as number;
    let right = refAreaRight as number;
    if (left > right) [left, right] = [right, left];

    setZoomDomain({ left, right });
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  const zoomOut = () => {
    setZoomDomain({ left: 'auto', right: 'auto' });
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
            Distance: {Number(label).toFixed(2)} km
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color }}>
              {entry.name}: {Number(entry.value).toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <section className="chart-section">
      <h2>Distance vs. Power</h2>
      <p className="chart-description">
        This chart displays the power output (in watts) for each rider at different distances.
        Higher power output indicates greater effort and speed.
      </p>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="watts-per-kilo"
            checked={wattsPerKilo}
            onChange={(e) => setWattsPerKilo(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="watts-per-kilo" style={{ cursor: 'pointer', fontSize: '14px' }}>
            Watts per kg
          </label>
        </div>
        {(zoomDomain.left !== 'auto' || zoomDomain.right !== 'auto') && (
          <button
            onClick={zoomOut}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#f0f0f0',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Reset Zoom
          </button>
        )}
        <span style={{ fontSize: '12px', color: '#666' }}>
          💡 Click and drag to zoom, scroll to pan
        </span>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          ref={chartRef}
          onMouseDown={(e) => e && e.activeLabel && setRefAreaLeft(e.activeLabel)}
          onMouseMove={(e) => refAreaLeft && e && e.activeLabel && setRefAreaRight(e.activeLabel)}
          onMouseUp={zoom}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="distance" 
            label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
            domain={[zoomDomain.left, zoomDomain.right]}
            type="number"
            allowDataOverflow={true}
            tickFormatter={(value) => Number(value).toFixed(2)}
          />
          <YAxis 
            label={{ value: wattsPerKilo ? 'Power (w/kg)' : 'Power (watts)', angle: -90, position: 'insideLeft' }}
            domain={yAxisDomain}
            tickFormatter={(value) => Number(value).toFixed(2)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {filteredData.map((competitor, index) => (
            <Line
              key={competitor.zwiftId}
              type="monotone"
              dataKey={competitor.name}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {refAreaLeft && refAreaRight && (
            <ReferenceArea
              x1={refAreaLeft}
              x2={refAreaRight}
              strokeOpacity={0.3}
              fill="#8884d8"
              fillOpacity={0.3}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
};

export default DistancePowerChart;
