import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Landing } from './screens/Landing'
import { Intake } from './screens/Intake'
import { OcularTest } from './screens/OcularTest'
import { VocalTest } from './screens/VocalTest'
import { Report } from './screens/Report'
import { Dashboard } from './screens/Dashboard'

type Screen = 'landing' | 'intake' | 'ocular' | 'vocal' | 'report' | 'dashboard'
type Flow = 'preop' | 'postop'

function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [flow, setFlow] = useState<Flow>('preop')

  const go = (next: Screen, nextFlow?: Flow) => {
    if (nextFlow !== undefined) setFlow(nextFlow)
    setScreen(next)
  }

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {screen === 'landing' && (
          <Landing
            key="landing"
            onNavigate={(s, f) => go(s as Screen, f)}
          />
        )}
        {screen === 'intake' && (
          <Intake
            key="intake"
            onNavigate={(s) => go(s as Screen)}
            initialFlow={flow}
          />
        )}
        {screen === 'ocular' && (
          <OcularTest
            key="ocular"
            mode={flow}
            onNavigate={(s) => go(s as Screen)}
          />
        )}
        {screen === 'vocal' && (
          <VocalTest
            key="vocal"
            mode={flow}
            onNavigate={(s) => go(s as Screen)}
          />
        )}
        {screen === 'report' && (
          <Report key="report" onNavigate={(s) => go(s as Screen)} />
        )}
        {screen === 'dashboard' && (
          <Dashboard key="dashboard" onNavigate={(s) => go(s as Screen)} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
