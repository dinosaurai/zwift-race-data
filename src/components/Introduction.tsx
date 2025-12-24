import { useCallback, useState } from 'react';
import './Introduction.css';
import { useRaceData } from '../contexts/RaceDataContext';
import { apiClient } from '../data/apiClient';

const Introduction = () => {
  const [raceId, setRaceId] = useState('');
  const { setData } = useRaceData();


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaceId(e.target.value);
  };

  const handleSubmit = useCallback(async () => {
    const raceData = await apiClient.pullRaceFitFiles(raceId);
    console.log('Fetched race data:', raceData);
    // setData(raceData);
  }, [setData, raceId]);

  return (
    <section className="introduction">
      <h1>Zwift Race Data Viewer</h1>
      <p>
        Welcome to the Zwift Race Data Viewer. This application allows you to visualize and analyze race data 
        from yourself and other competitors. See how a race unfolded and understand what was happening at each 
        point in time. The charts below show distance vs. time and distance vs. power output for multiple riders, 
        helping you identify key moments in the race, compare performance across competitors, and gain insights 
        into race dynamics.
      </p>
      <input placeholder="Enter race ID" value={raceId} onChange={handleInputChange} />
      <button onClick={handleSubmit}>Load Race</button>
    </section>
  );
};

export default Introduction;
