import { RaceDataProvider } from './contexts/RaceDataContext'
import Introduction from './components/Introduction'
import DistanceTimeChart from './components/DistanceTimeChart'
import DistancePowerChart from './components/DistancePowerChart'
import ThemeToggle from './components/ThemeToggle'
import './App.css'

function App() {
  return (
    <RaceDataProvider>
      <div className="app">
        <ThemeToggle />
        <Introduction />
        <DistanceTimeChart />
        <DistancePowerChart />
      </div>
    </RaceDataProvider>
  )
}

export default App
