import { RaceDataProvider } from './contexts/RaceDataContext'
import Introduction from './components/Introduction'
import DistanceTimeChart from './components/DistanceTimeChart'
import DistancePowerChart from './components/DistancePowerChart'
import './App.css'

function App() {
  return (
    <RaceDataProvider>
      <div className="app">
        <Introduction />
        <DistanceTimeChart />
        <DistancePowerChart />
      </div>
    </RaceDataProvider>
  )
}

export default App
