import { useState, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { useRaceData } from '../contexts/RaceDataContext';
import './DistanceTimeChart.css';

const DistanceTimeChart = () => {
  const { data } = useRaceData();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refAreaLeft, setRefAreaLeft] = useState<string | number>('');
  const [refAreaRight, setRefAreaRight] = useState<string | number>('');
  const [zoomDomain, setZoomDomain] = useState<{ left: number | 'auto'; right: number | 'auto' }>({ left: 'auto', right: 'auto' });
  const [normalizeTime, setNormalizeTime] = useState<boolean>(false);
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
      // Create a map of distance to time for this competitor
      const distanceToTime = new Map<number, number>();
      competitor.xData.forEach((distance, index) => {
        if (index < competitor.x2Data.length) {
          distanceToTime.set(distance, competitor.x2Data[index] / 60); // Convert to minutes
        }
      });

      // For each target distance, interpolate if needed
      targetDistances.forEach(targetDist => {
        if (!chartMap[targetDist]) {
          chartMap[targetDist] = { distance: targetDist };
        }

        // If we have exact value, use it
        if (distanceToTime.has(targetDist)) {
          chartMap[targetDist][competitor.name] = distanceToTime.get(targetDist)!;
        } else {
          // Otherwise, interpolate between nearest points
          const sortedDists = Array.from(distanceToTime.keys()).sort((a, b) => a - b);
          const lowerIdx = sortedDists.findIndex(d => d > targetDist) - 1;
          
          if (lowerIdx >= 0 && lowerIdx < sortedDists.length - 1) {
            const d1 = sortedDists[lowerIdx];
            const d2 = sortedDists[lowerIdx + 1];
            const t1 = distanceToTime.get(d1)!;
            const t2 = distanceToTime.get(d2)!;
            const ratio = (targetDist - d1) / (d2 - d1);
            chartMap[targetDist][competitor.name] = t1 + (t2 - t1) * ratio;
          } else if (lowerIdx >= 0) {
            // Use the last known value
            chartMap[targetDist][competitor.name] = distanceToTime.get(sortedDists[lowerIdx])!;
          } else if (sortedDists.length > 0) {
            // Use the first known value
            chartMap[targetDist][competitor.name] = distanceToTime.get(sortedDists[0])!;
          }
        }
      });
    });

    let result = Object.values(chartMap).sort((a, b) => a.distance - b.distance);
    
    // If normalize time is enabled, subtract the lead rider's time at each distance point
    if (normalizeTime && result.length > 0) {
      result = result.map(point => {
        // Find the minimum time (two-pass approach for clarity)
        let minTime = Infinity;
        const normalizedPoint: { distance: number; [key: string]: number } = { distance: point.distance };
        
        // First pass: find minimum time
        Object.keys(point).forEach(key => {
          if (key !== 'distance' && typeof point[key] === 'number') {
            minTime = Math.min(minTime, point[key]);
          }
        });
        
        // If no valid times found, return original point
        if (minTime === Infinity) {
          return point;
        }
        
        // Second pass: normalize by subtracting minimum
        Object.keys(point).forEach(key => {
          if (key !== 'distance' && typeof point[key] === 'number') {
            normalizedPoint[key] = point[key] - minTime;
          }
        });
        
        return normalizedPoint;
      });
    }
    
    // If zoomed, filter to only show data in the zoomed range
    if (isZoomed) {
      const leftBound = zoomDomain.left === 'auto' ? -Infinity : zoomDomain.left;
      const rightBound = zoomDomain.right === 'auto' ? Infinity : zoomDomain.right;
      return result.filter(d => d.distance >= leftBound && d.distance <= rightBound);
    }
    
    return result;
  }, [filteredData, zoomDomain, normalizeTime]);

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
      <h2>Distance vs. Time</h2>
      <p className="chart-description">
        This chart shows how much time each rider took to reach various distances throughout the race.
        {normalizeTime 
          ? " Time is normalized to show the gap to the race leader at each distance point."
          : " Lower times indicate faster performance."}
      </p>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="normalize-time"
            checked={normalizeTime}
            onChange={(e) => setNormalizeTime(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="normalize-time" style={{ cursor: 'pointer', fontSize: '14px' }}>
            Normalize by leader
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
            label={{ value: normalizeTime ? 'Time Gap (minutes)' : 'Time (minutes)', angle: -90, position: 'insideLeft' }}
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

export default DistanceTimeChart;
