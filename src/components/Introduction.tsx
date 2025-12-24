import { useCallback, useState } from 'react';
import './Introduction.css';
import { useRaceData } from '../contexts/RaceDataContext';
import { apiClient } from '../data/apiClient';

const Introduction = () => {
  const [raceId, setRaceId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoadingRace, setIsLoadingRace] = useState(false);
  const { setData } = useRaceData();

  const handleLogin = useCallback(async () => {
    if (!username || !password) {
      setLoginMessage('Please enter both username and password');
      return;
    }

    setIsLoggingIn(true);
    setLoginMessage('');
    
    try {
      const result = await apiClient.login(username, password);
      
      if (result.success) {
        setIsLoggedIn(true);
        setLoginMessage('Successfully logged in to ZwiftPower!');
        setPassword(''); // Clear password for security
      } else {
        setLoginMessage(`Login failed: ${result.message}`);
      }
    } catch (error) {
      setLoginMessage('An error occurred during login');
      console.error('Login error:', error);
    } finally {
      setIsLoggingIn(false);
    }
  }, [username, password]);

  const handleLogout = useCallback(() => {
    apiClient.logout();
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setLoginMessage('Logged out successfully');
  }, []);

  const handleRaceIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaceId(e.target.value);
  };

  const handleLoadRace = useCallback(async () => {
    if (!raceId) {
      return;
    }

    setIsLoadingRace(true);
    try {
      const raceData = await apiClient.pullRaceFitFiles(raceId);
      setData(raceData);
    } catch (error) {
      console.error('Error loading race data:', error);
    } finally {
      setIsLoadingRace(false);
    }
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

      <div className="login-section">
        {!isLoggedIn ? (
          <>
            <h2>Login to ZwiftPower</h2>
            <p className="login-info">
              Login with your ZwiftPower credentials to access race data. Your credentials are sent 
              securely to the backend server and are not stored.
            </p>
            <div className="login-form">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoggingIn}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                disabled={isLoggingIn}
              />
              <button 
                onClick={handleLogin} 
                disabled={isLoggingIn || !username || !password}
              >
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </button>
            </div>
            {loginMessage && (
              <p className={`login-message ${loginMessage.includes('Successfully') ? 'success' : 'error'}`}>
                {loginMessage}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="logged-in-status">
              <p className="login-message success">✓ Logged in to ZwiftPower</p>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          </>
        )}
      </div>

      <div className="race-section">
        <h2>Load Race Data</h2>
        <div className="race-form">
          <input 
            placeholder="Enter race ID" 
            value={raceId} 
            onChange={handleRaceIdChange}
            disabled={isLoadingRace}
          />
          <button 
            onClick={handleLoadRace}
            disabled={isLoadingRace || !raceId}
          >
            {isLoadingRace ? 'Loading...' : 'Load Race'}
          </button>
        </div>
        {!isLoggedIn && (
          <p className="login-info">
            Note: Some races may require login to access full data.
          </p>
        )}
      </div>
    </section>
  );
};

export default Introduction;
